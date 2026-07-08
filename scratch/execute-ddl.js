const { Client } = require('pg');

const pgConfig = {
  host: 'db.faxzubfvjsekizeiiocg.supabase.co',
  user: 'postgres',
  password: 'tF3cfdc3FQ7fWEdB',
  database: 'postgres',
  port: 5432,
  ssl: {
    rejectUnauthorized: false
  }
};

const ddlStatements = [
  // 1. validate_evaluation_immutable function & trigger
  `CREATE OR REPLACE FUNCTION validate_evaluation_immutable()
   RETURNS TRIGGER
   LANGUAGE plpgsql
   AS $$
   BEGIN
     IF OLD.status = 'submitted' THEN
       RAISE EXCEPTION 'This evaluation has already been signed and submitted. It is locked and cannot be modified. Create a new version instead.';
     END IF;
     RETURN NEW;
   END;
   $$;`,
  `DROP TRIGGER IF EXISTS tr_evaluations_immutable ON public.evaluations;`,
  `CREATE TRIGGER tr_evaluations_immutable
     BEFORE UPDATE ON public.evaluations
     FOR EACH ROW EXECUTE FUNCTION validate_evaluation_immutable();`,

  // 2. process_evaluation_event function
  `CREATE OR REPLACE FUNCTION process_evaluation_event()
   RETURNS TRIGGER
   LANGUAGE plpgsql
   SECURITY DEFINER
   SET search_path = public
   AS $$
   DECLARE
     v_stage_id UUID;
     v_avg_score NUMERIC(5,2);
     v_compliance_rate NUMERIC(5,2);
     v_major_unresolved INT;
     v_readiness_level TEXT;
     v_threshold_pass NUMERIC(5,2) := 75.00;
     v_threshold_excellent NUMERIC(5,2) := 85.00;
     v_threshold_target_compliance NUMERIC(5,2) := 90.00;
     v_threshold_min_compliance NUMERIC(5,2) := 70.00;
     v_threshold_max_major INT := 2;
     v_eval_row RECORD;
   BEGIN
     v_stage_id := NEW.stage_id;
     IF v_stage_id IS NULL THEN
       IF NEW.payload ? 'stage_id' THEN
         v_stage_id := (NEW.payload->>'stage_id')::uuid;
       END IF;
     END IF;
     IF v_stage_id IS NULL AND NEW.payload ? 'document_version_id' THEN
       SELECT d.stage_id INTO v_stage_id
       FROM public.documents d
       JOIN public.document_versions dv ON dv.document_id = d.id
       WHERE dv.id = (NEW.payload->>'document_version_id')::uuid
       LIMIT 1;
     END IF;
     IF v_stage_id IS NULL AND NEW.payload ? 'annotation_id' THEN
       SELECT d.stage_id INTO v_stage_id
       FROM public.documents d
       JOIN public.document_versions dv ON dv.document_id = d.id
       JOIN public.annotations a ON a.document_version_id = dv.id
       WHERE a.id = (NEW.payload->>'annotation_id')::uuid
       LIMIT 1;
     END IF;
     IF v_stage_id IS NULL THEN
       SELECT stage_id INTO v_stage_id
       FROM public.evaluations
       WHERE project_id = NEW.project_id
       ORDER BY updated_at DESC
       LIMIT 1;
     END IF;
     SELECT 
       COALESCE(passing_score, 75.00),
       COALESCE(excellent_score, 85.00),
       COALESCE(target_compliance_rate, 90.00),
       COALESCE(min_compliance_rate, 70.00),
       COALESCE(max_major_unresolved, 2)
     INTO
       v_threshold_pass,
       v_threshold_excellent,
       v_threshold_target_compliance,
       v_threshold_min_compliance,
       v_threshold_max_major
     FROM public.rubric_templates
     WHERE project_id = NEW.project_id
     LIMIT 1;
     SELECT 
       CASE 
         WHEN count(a.id) = 0 THEN 100.00
         ELSE round((sum(case when a.status = 'verified' then 1 else 0 end)::decimal / count(a.id)) * 100, 2)
       END INTO v_compliance_rate
     FROM public.projects p
     LEFT JOIN public.documents d ON d.project_id = p.id
     LEFT JOIN public.document_versions dv ON dv.document_id = d.id
     LEFT JOIN public.annotations a ON a.document_version_id = dv.id
     WHERE p.id = NEW.project_id;
     IF v_stage_id IS NOT NULL THEN
       SELECT COALESCE(round(avg(e.total_score), 2), 0.00) INTO v_avg_score
       FROM (
         SELECT DISTINCT ON (panelist_id) total_score
         FROM public.evaluations
         WHERE project_id = NEW.project_id AND stage_id = v_stage_id AND status = 'submitted'
         ORDER BY panelist_id, version DESC
       ) e;
     ELSE
       SELECT COALESCE(round(avg(e.total_score), 2), 0.00) INTO v_avg_score
       FROM (
         SELECT DISTINCT ON (stage_id, panelist_id) total_score
         FROM public.evaluations
         WHERE project_id = NEW.project_id AND status = 'submitted'
         ORDER BY stage_id, panelist_id, version DESC
       ) e;
     END IF;
     SELECT COUNT(a.id) INTO v_major_unresolved
     FROM public.documents d
     JOIN public.document_versions dv ON dv.document_id = d.id
     JOIN public.annotations a ON a.document_version_id = dv.id
     WHERE d.project_id = NEW.project_id 
       AND a.status != 'verified' 
       AND a.severity IN ('major', 'critical');
     IF v_compliance_rate >= v_threshold_target_compliance AND v_avg_score >= v_threshold_excellent AND v_major_unresolved = 0 THEN
       v_readiness_level := 'Ready';
     ELSIF v_compliance_rate >= v_threshold_min_compliance AND v_avg_score >= v_threshold_pass AND v_major_unresolved <= v_threshold_max_major THEN
       v_readiness_level := 'Almost Ready';
     ELSIF v_compliance_rate < v_threshold_min_compliance OR v_major_unresolved > v_threshold_max_major THEN
       v_readiness_level := 'Needs Revision';
     ELSE
       v_readiness_level := 'Not Ready';
     END IF;
     INSERT INTO public.project_score_cache (project_id, stage_id, avg_score, compliance_rate, readiness_level, last_updated)
     VALUES (NEW.project_id, v_stage_id, v_avg_score, v_compliance_rate, v_readiness_level, NOW())
     ON CONFLICT (project_id) DO UPDATE SET
       stage_id = EXCLUDED.stage_id,
       avg_score = EXCLUDED.avg_score,
       compliance_rate = EXCLUDED.compliance_rate,
       readiness_level = EXCLUDED.readiness_level,
       last_updated = NOW();
     RETURN NEW;
   END;
   $$;`,

  // 3. Recreate views to handle versioned evaluations (Drop old ones first to prevent "cannot drop columns from view")
  `DROP VIEW IF EXISTS public.panel_consensus_summary CASCADE;`,
  `CREATE OR REPLACE VIEW public.panel_consensus_summary AS
   WITH latest_evals AS (
     SELECT DISTINCT ON (project_id, stage_id, panelist_id) 
       project_id,
       stage_id,
       total_score
     FROM public.evaluations
     WHERE status = 'submitted'
     ORDER BY project_id, stage_id, panelist_id, version DESC
   ),
   raw_calc AS (
     SELECT 
       project_id,
       stage_id,
       max(total_score) as highest_score,
       min(total_score) as lowest_score,
       avg(total_score) as average_score,
       (max(total_score) - min(total_score)) as score_difference
     FROM latest_evals
     GROUP BY project_id, stage_id
   )
   SELECT 
     project_id,
     stage_id,
     highest_score,
     lowest_score,
     average_score,
     score_difference
   FROM raw_calc;`,

  `DROP VIEW IF EXISTS public.project_readiness_status CASCADE;`,
  `CREATE OR REPLACE VIEW public.project_readiness_status AS
   WITH latest_evals AS (
     SELECT DISTINCT ON (project_id, stage_id, panelist_id) 
       project_id,
       stage_id,
       total_score
     FROM public.evaluations
     WHERE status = 'submitted'
     ORDER BY project_id, stage_id, panelist_id, version DESC
   ),
   stats AS (
     SELECT
       p.id AS project_id,
       COALESCE(rc.compliance_rate, 100.00) AS compliance_rate,
       COALESCE(AVG(le.total_score), 0.00) AS avg_rubric_score,
       COUNT(a.id) FILTER (
         WHERE a.status != 'verified' AND a.severity IN ('major', 'critical')
       ) AS major_unresolved_comments
     FROM public.projects p
     LEFT JOIN latest_evals le ON le.project_id = p.id
     LEFT JOIN public.revision_compliance_metrics rc ON rc.project_id = p.id
     LEFT JOIN public.documents d ON d.project_id = p.id
     LEFT JOIN public.document_versions dv ON dv.document_id = d.id
     LEFT JOIN public.annotations a ON a.document_version_id = dv.id
     GROUP BY p.id, rc.compliance_rate
   ),
   thresholds AS (
     SELECT DISTINCT ON (project_id)
       project_id,
       COALESCE(passing_score, 75.00) AS passing_score,
       COALESCE(excellent_score, 85.00) AS excellent_score,
       COALESCE(target_compliance_rate, 90.00) AS target_compliance_rate,
       COALESCE(min_compliance_rate, 70.00) AS min_compliance_rate,
       COALESCE(max_major_unresolved, 2) AS max_major_unresolved
     FROM public.rubric_templates
     ORDER BY project_id, created_at DESC
   )
   SELECT
     s.project_id,
     s.compliance_rate,
     s.avg_rubric_score,
     s.major_unresolved_comments,
     CASE
       WHEN s.compliance_rate >= COALESCE(t.target_compliance_rate, 90.00)
         AND s.avg_rubric_score >= COALESCE(t.excellent_score, 85.00)
         AND s.major_unresolved_comments = 0 THEN 'Ready'
       WHEN s.compliance_rate >= COALESCE(t.min_compliance_rate, 70.00)
         AND s.avg_rubric_score >= COALESCE(t.passing_score, 75.00)
         AND s.major_unresolved_comments <= COALESCE(t.max_major_unresolved, 2) THEN 'Almost Ready'
       WHEN s.compliance_rate < COALESCE(t.min_compliance_rate, 70.00)
         OR s.major_unresolved_comments > COALESCE(t.max_major_unresolved, 2) THEN 'Needs Revision'
       ELSE 'Not Ready'
     END AS readiness_level
   FROM stats s
   LEFT JOIN thresholds t ON t.project_id = s.project_id;`,

  // 4. RLS policies with new role mapping
  `DROP POLICY IF EXISTS students_select_staff ON public.students;`,
  `CREATE POLICY students_select_staff ON public.students
     FOR SELECT TO authenticated
     USING (
       profile_id = auth.uid()
       OR has_role('coordinator')
       OR has_role('adviser')
       OR has_role('panelist')
       OR has_role('sys_admin')
     );`,

  `DROP POLICY IF EXISTS profiles_select_staff ON public.profiles;`,
  `CREATE POLICY profiles_select_staff ON public.profiles
     FOR SELECT TO authenticated
     USING (
       id = auth.uid()
       OR has_role('coordinator')
       OR has_role('adviser')
       OR has_role('panelist')
       OR has_role('sys_admin')
     );`,

  `DROP POLICY IF EXISTS projects_insert ON public.projects;`,
  `CREATE POLICY projects_insert ON public.projects
     FOR INSERT TO authenticated
     WITH CHECK (
       has_role('coordinator')
       OR has_role('sys_admin')
     );`,

  `DROP POLICY IF EXISTS projects_update ON public.projects;`,
  `CREATE POLICY projects_update ON public.projects
     FOR UPDATE TO authenticated
     USING (
       has_role('coordinator')
       OR has_role('sys_admin')
     );`,

  `DROP POLICY IF EXISTS projects_select ON public.projects;`,
  `CREATE POLICY projects_select ON public.projects
     FOR SELECT TO authenticated
     USING (
       is_project_participant(id)
       OR has_role('coordinator')
       OR has_role('sys_admin')
       OR EXISTS (
         SELECT 1 FROM public.students s
         WHERE s.id = projects.student_id
           AND s.profile_id = auth.uid()
       )
     );`,

  // 5. process_audit_trigger and audit triggers
  `CREATE OR REPLACE FUNCTION process_audit_trigger()
   RETURNS TRIGGER
   LANGUAGE plpgsql
   SECURITY DEFINER
   AS $$
   DECLARE
     v_profile_id UUID := auth.uid();
     v_user_email VARCHAR(255) := 'system';
     v_user_role VARCHAR(50) := 'system';
     v_action_type audit_action;
     v_description TEXT;
     v_old_val JSONB := NULL;
     v_new_val JSONB := NULL;
     v_entity_id UUID;
     v_ip INET;
     v_ua TEXT;
   BEGIN
     BEGIN
       v_ip := (current_setting('request.headers', true)::jsonb->>'x-forwarded-for')::inet;
       v_ua := current_setting('request.headers', true)::jsonb->>'user-agent';
     EXCEPTION WHEN OTHERS THEN
       v_ip := NULL;
       v_ua := NULL;
     END;

     IF v_profile_id IS NOT NULL THEN
       SELECT email INTO v_user_email FROM public.profiles WHERE id = v_profile_id LIMIT 1;
       SELECT r.code INTO v_user_role 
       FROM public.user_roles ur 
       JOIN public.roles r ON r.id = ur.role_id 
       WHERE ur.profile_id = v_profile_id 
       LIMIT 1;
     END IF;

     IF (TG_OP = 'INSERT') THEN
       v_action_type := 'CREATE';
       v_new_val := to_jsonb(NEW);
       v_entity_id := COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);
       v_description := TG_TABLE_NAME || ' created';
     ELSIF (TG_OP = 'UPDATE') THEN
       v_action_type := 'UPDATE';
       v_old_val := to_jsonb(OLD);
       v_new_val := to_jsonb(NEW);
       v_entity_id := COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);
       v_description := TG_TABLE_NAME || ' updated';
     ELSIF (TG_OP = 'DELETE') THEN
       v_action_type := 'DELETE';
       v_old_val := to_jsonb(OLD);
       v_entity_id := COALESCE(OLD.id, '00000000-0000-0000-0000-000000000000'::uuid);
       v_description := TG_TABLE_NAME || ' deleted';
     END IF;

     IF TG_TABLE_NAME = 'projects' THEN
       IF (TG_OP = 'INSERT') THEN
         v_description := 'Project Created: ' || NEW.title;
       ELSIF (TG_OP = 'UPDATE') THEN
         IF OLD.status != NEW.status AND NEW.status = 'archived' THEN
           v_description := 'Project Archived: ' || NEW.title;
         ELSE
           v_description := 'Project Updated: ' || NEW.title;
         END IF;
       END IF;
     ELSIF TG_TABLE_NAME = 'students' THEN
       v_description := 'Student Registered: ' || NEW.student_number;
     ELSIF TG_TABLE_NAME = 'faculty' THEN
       v_description := 'Faculty Registered: ' || NEW.employee_number;
     ELSIF TG_TABLE_NAME = 'rubric_templates' THEN
       IF (TG_OP = 'INSERT') THEN
         v_description := 'Rubric Created: ' || NEW.title;
       ELSIF (TG_OP = 'UPDATE') THEN
         v_description := 'Rubric Updated: ' || NEW.title;
       ELSIF (TG_OP = 'DELETE') THEN
         v_description := 'Rubric Deleted: ' || OLD.title;
       END IF;
     ELSIF TG_TABLE_NAME = 'document_versions' THEN
       v_action_type := 'UPLOAD';
       v_description := 'PDF Uploaded: ' || NEW.file_name;
     ELSIF TG_TABLE_NAME = 'annotations' THEN
       IF (TG_OP = 'INSERT') THEN
         v_description := 'Annotation Created: p.' || NEW.page_number;
       ELSIF (TG_OP = 'UPDATE') THEN
         IF OLD.status != NEW.status THEN
           v_description := 'Annotation Resolved: p.' || NEW.page_number || ' to ' || NEW.status;
         ELSE
           v_description := 'Annotation Edited: p.' || NEW.page_number;
         END IF;
       END IF;
     ELSIF TG_TABLE_NAME = 'evaluations' THEN
       IF (TG_OP = 'INSERT') THEN
         v_description := 'Evaluation Version Created: v' || NEW.version;
       ELSIF (TG_OP = 'UPDATE') THEN
         IF OLD.status = 'draft' AND NEW.status = 'submitted' THEN
           v_action_type := 'GRADE';
           v_description := 'Evaluation Signed: v' || NEW.version;
         ELSE
           v_description := 'Evaluation Draft Saved: v' || NEW.version;
         END IF;
       END IF;
     ELSIF TG_TABLE_NAME = 'user_roles' THEN
       v_description := 'Role Assigned: Profile ' || NEW.profile_id || ' role ' || NEW.role_id;
     ELSIF TG_TABLE_NAME = 'notifications' THEN
       v_description := 'Notification Sent: ' || NEW.title;
     END IF;

     INSERT INTO public.audit_logs (
       profile_id,
       user_email,
       user_role,
       action_type,
       module,
       entity_type,
       entity_id,
       description,
       old_value,
       new_value,
       ip_address,
       user_agent,
       academic_year
     ) VALUES (
       v_profile_id,
       v_user_email,
       v_user_role,
       COALESCE(v_action_type, 'UPDATE'::audit_action),
       TG_TABLE_NAME,
       TG_TABLE_NAME,
       v_entity_id,
       v_description,
       v_old_val,
       v_new_val,
       v_ip,
       v_ua,
       '2025-2026'
     );

     RETURN NEW;
   END;
   $$;`,

  `DROP TRIGGER IF EXISTS tr_audit_projects ON public.projects;`,
  `CREATE TRIGGER tr_audit_projects AFTER INSERT OR UPDATE OR DELETE ON public.projects FOR EACH ROW EXECUTE FUNCTION process_audit_trigger();`,
  `DROP TRIGGER IF EXISTS tr_audit_students ON public.students;`,
  `CREATE TRIGGER tr_audit_students AFTER INSERT ON public.students FOR EACH ROW EXECUTE FUNCTION process_audit_trigger();`,
  `DROP TRIGGER IF EXISTS tr_audit_faculty ON public.faculty;`,
  `CREATE TRIGGER tr_audit_faculty AFTER INSERT ON public.faculty FOR EACH ROW EXECUTE FUNCTION process_audit_trigger();`,
  `DROP TRIGGER IF EXISTS tr_audit_rubric_templates ON public.rubric_templates;`,
  `CREATE TRIGGER tr_audit_rubric_templates AFTER INSERT OR UPDATE OR DELETE ON public.rubric_templates FOR EACH ROW EXECUTE FUNCTION process_audit_trigger();`,
  `DROP TRIGGER IF EXISTS tr_audit_document_versions ON public.document_versions;`,
  `CREATE TRIGGER tr_audit_document_versions AFTER INSERT ON public.document_versions FOR EACH ROW EXECUTE FUNCTION process_audit_trigger();`,
  `DROP TRIGGER IF EXISTS tr_audit_annotations ON public.annotations;`,
  `CREATE TRIGGER tr_audit_annotations AFTER INSERT OR UPDATE ON public.annotations FOR EACH ROW EXECUTE FUNCTION process_audit_trigger();`,
  `DROP TRIGGER IF EXISTS tr_audit_evaluations ON public.evaluations;`,
  `CREATE TRIGGER tr_audit_evaluations AFTER INSERT OR UPDATE ON public.evaluations FOR EACH ROW EXECUTE FUNCTION process_audit_trigger();`,
  `DROP TRIGGER IF EXISTS tr_audit_user_roles ON public.user_roles;`,
  `CREATE TRIGGER tr_audit_user_roles AFTER INSERT ON public.user_roles FOR EACH ROW EXECUTE FUNCTION process_audit_trigger();`,
  `DROP TRIGGER IF EXISTS tr_audit_notifications ON public.notifications;`,
  `CREATE TRIGGER tr_audit_notifications AFTER INSERT ON public.notifications FOR EACH ROW EXECUTE FUNCTION process_audit_trigger();`
];

async function applyRemaining() {
  const client = new Client(pgConfig);
  try {
    await client.connect();
    console.log('CONNECTED TO DATABASE. RUNNING REMAINING RBAC STATEMENTS...');

    for (let i = 0; i < ddlStatements.length; i++) {
      try {
        console.log(`Executing statement ${i + 1}...`);
        await client.query(ddlStatements[i]);
        console.log(`Statement ${i + 1}: SUCCESS.`);
      } catch (err) {
        console.error(`Statement ${i + 1}: FAILED.`);
        console.error(err.message);
      }
    }

    console.log('\nRemaining RBAC migration completed.');

  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

applyRemaining();
