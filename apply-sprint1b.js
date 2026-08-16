const { Client } = require('pg');
const client = new Client({
  host: 'aws-1-ap-southeast-2.pooler.supabase.com',
  user: 'postgres.faxzubfvjsekizeiiocg',
  password: 'tF3cfdc3FQ7fWEdB',
  database: 'postgres', port: 6543, ssl: { rejectUnauthorized: false }
});

const migration = `
BEGIN;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- projects
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DROP POLICY IF EXISTS projects_insert          ON public.projects;
DROP POLICY IF EXISTS projects_insert_policy   ON public.projects;
DROP POLICY IF EXISTS projects_select          ON public.projects;
DROP POLICY IF EXISTS projects_select_policy   ON public.projects;
DROP POLICY IF EXISTS projects_update          ON public.projects;
DROP POLICY IF EXISTS projects_update_policy   ON public.projects;
DROP POLICY IF EXISTS projects_delete          ON public.projects;

CREATE POLICY projects_select ON public.projects
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (
    student_id IN (SELECT s.id FROM students s WHERE s.profile_id = auth.uid())
    OR EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = projects.id AND pm.profile_id = auth.uid())
    OR EXISTS (SELECT 1 FROM defense_panels dp WHERE dp.project_id = projects.id AND dp.profile_id = auth.uid())
    OR has_role('coordinator'::text)
    OR has_role('college_dean'::text)
    OR has_role('sys_admin'::text)
  );

CREATE POLICY projects_insert ON public.projects
  AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (
    student_id IN (SELECT s.id FROM students s WHERE s.profile_id = auth.uid())
    OR has_role('coordinator'::text)
    OR has_role('sys_admin'::text)
  );

CREATE POLICY projects_update ON public.projects
  AS PERMISSIVE FOR UPDATE TO authenticated
  USING (
    student_id IN (SELECT s.id FROM students s WHERE s.profile_id = auth.uid())
    OR EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = projects.id AND pm.profile_id = auth.uid())
    OR has_role('coordinator'::text)
    OR has_role('sys_admin'::text)
  )
  WITH CHECK (
    student_id IN (SELECT s.id FROM students s WHERE s.profile_id = auth.uid())
    OR EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = projects.id AND pm.profile_id = auth.uid())
    OR has_role('coordinator'::text)
    OR has_role('sys_admin'::text)
  );

CREATE POLICY projects_delete ON public.projects
  AS PERMISSIVE FOR DELETE TO authenticated
  USING (has_role('sys_admin'::text));

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- project_members
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DROP POLICY IF EXISTS project_members_modify_policy  ON public.project_members;
DROP POLICY IF EXISTS project_members_insert         ON public.project_members;
DROP POLICY IF EXISTS project_members_select_policy  ON public.project_members;
DROP POLICY IF EXISTS project_members_select         ON public.project_members;
DROP POLICY IF EXISTS project_members_update         ON public.project_members;
DROP POLICY IF EXISTS project_members_delete         ON public.project_members;

CREATE POLICY project_members_select ON public.project_members
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (
    is_project_participant(project_id)
    OR has_role('coordinator'::text)
    OR has_role('college_dean'::text)
    OR has_role('sys_admin'::text)
  );

CREATE POLICY project_members_insert ON public.project_members
  AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (
    profile_id = auth.uid()
    OR has_role('coordinator'::text)
    OR has_role('sys_admin'::text)
  );

CREATE POLICY project_members_update ON public.project_members
  AS PERMISSIVE FOR UPDATE TO authenticated
  USING (has_role('coordinator'::text) OR has_role('sys_admin'::text))
  WITH CHECK (has_role('coordinator'::text) OR has_role('sys_admin'::text));

CREATE POLICY project_members_delete ON public.project_members
  AS PERMISSIVE FOR DELETE TO authenticated
  USING (has_role('coordinator'::text) OR has_role('sys_admin'::text));

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- students
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DROP POLICY IF EXISTS students_read_all                 ON public.students;
DROP POLICY IF EXISTS students_select_all_authenticated ON public.students;
DROP POLICY IF EXISTS students_select_authenticated     ON public.students;
DROP POLICY IF EXISTS students_select_staff             ON public.students;
DROP POLICY IF EXISTS students_select                   ON public.students;
DROP POLICY IF EXISTS students_update_own               ON public.students;
DROP POLICY IF EXISTS students_update                   ON public.students;

CREATE POLICY students_select ON public.students
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (
    profile_id = auth.uid()
    OR has_role('coordinator'::text)
    OR has_role('adviser'::text)
    OR has_role('panelist'::text)
    OR has_role('college_dean'::text)
    OR has_role('sys_admin'::text)
  );

CREATE POLICY students_update ON public.students
  AS PERMISSIVE FOR UPDATE TO authenticated
  USING (profile_id = auth.uid() OR has_role('coordinator'::text) OR has_role('sys_admin'::text))
  WITH CHECK (profile_id = auth.uid() OR has_role('coordinator'::text) OR has_role('sys_admin'::text));

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- evaluations
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DROP POLICY IF EXISTS evaluations_coordinator_read ON public.evaluations;
DROP POLICY IF EXISTS evaluations_participant_read  ON public.evaluations;

CREATE POLICY evaluations_coordinator_read ON public.evaluations
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (has_role('coordinator'::text) OR has_role('college_dean'::text) OR has_role('sys_admin'::text));

CREATE POLICY evaluations_participant_read ON public.evaluations
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (is_project_participant(project_id) AND status = 'submitted');

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- audit_logs
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DROP POLICY IF EXISTS audit_read ON public.audit_logs;

CREATE POLICY audit_read ON public.audit_logs
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (has_role('coordinator'::text) OR has_role('college_dean'::text) OR has_role('sys_admin'::text));

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- defense_panels
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DROP POLICY IF EXISTS defense_panels_select ON public.defense_panels;
DROP POLICY IF EXISTS defense_panels_modify  ON public.defense_panels;

CREATE POLICY defense_panels_select ON public.defense_panels
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (
    is_project_participant(project_id)
    OR has_role('coordinator'::text)
    OR has_role('college_dean'::text)
    OR has_role('sys_admin'::text)
  );

CREATE POLICY defense_panels_modify ON public.defense_panels
  AS PERMISSIVE FOR ALL TO authenticated
  USING (has_role('coordinator'::text) OR has_role('sys_admin'::text))
  WITH CHECK (has_role('coordinator'::text) OR has_role('sys_admin'::text));

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- defense_schedules
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DROP POLICY IF EXISTS defense_schedules_select ON public.defense_schedules;

CREATE POLICY defense_schedules_select ON public.defense_schedules
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (
    is_project_participant(project_id)
    OR has_role('coordinator'::text)
    OR has_role('college_dean'::text)
    OR has_role('sys_admin'::text)
  );

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- documents
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DROP POLICY IF EXISTS documents_select ON public.documents;

CREATE POLICY documents_select ON public.documents
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (
    is_project_participant(project_id)
    OR has_role('coordinator'::text)
    OR has_role('college_dean'::text)
    OR has_role('sys_admin'::text)
  );

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- document_versions
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DROP POLICY IF EXISTS document_versions_select        ON public.document_versions;
DROP POLICY IF EXISTS document_versions_insert_policy ON public.document_versions;
DROP POLICY IF EXISTS document_versions_insert        ON public.document_versions;

CREATE POLICY document_versions_select ON public.document_versions
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM documents d
      WHERE d.id = document_versions.document_id
        AND (is_project_participant(d.project_id) OR has_role('coordinator'::text) OR has_role('college_dean'::text) OR has_role('sys_admin'::text))
    )
  );

CREATE POLICY document_versions_insert ON public.document_versions
  AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM documents d
      WHERE d.id = document_versions.document_id
        AND (is_project_participant(d.project_id) OR has_role('coordinator'::text) OR has_role('sys_admin'::text))
    )
  );

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- annotations
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DROP POLICY IF EXISTS annotations_select ON public.annotations;
DROP POLICY IF EXISTS annotations_update ON public.annotations;
DROP POLICY IF EXISTS annotations_delete ON public.annotations;

CREATE POLICY annotations_select ON public.annotations
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM document_versions dv
      JOIN documents d ON d.id = dv.document_id
      WHERE dv.id = annotations.document_version_id
        AND (is_project_participant(d.project_id) OR has_role('coordinator'::text) OR has_role('sys_admin'::text))
    )
  );

CREATE POLICY annotations_update ON public.annotations
  AS PERMISSIVE FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM document_versions dv
      JOIN documents d ON d.id = dv.document_id
      WHERE dv.id = annotations.document_version_id
        AND (is_project_participant(d.project_id) OR has_role('coordinator'::text) OR has_role('sys_admin'::text))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM document_versions dv
      JOIN documents d ON d.id = dv.document_id
      WHERE dv.id = annotations.document_version_id
        AND (is_project_participant(d.project_id) OR has_role('coordinator'::text) OR has_role('sys_admin'::text))
    )
  );

CREATE POLICY annotations_delete ON public.annotations
  AS PERMISSIVE FOR DELETE TO authenticated
  USING (created_by = auth.uid() OR has_role('coordinator'::text) OR has_role('sys_admin'::text));

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- reports
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DROP POLICY IF EXISTS reports_select ON public.reports;

CREATE POLICY reports_select ON public.reports
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (
    generated_by = auth.uid()
    OR has_role('coordinator'::text)
    OR has_role('college_dean'::text)
    OR has_role('sys_admin'::text)
  );

COMMIT;
`;

async function run() {
  await client.connect();
  console.log('Applying Sprint 1B RLS Migration...');

  try {
    await client.query(migration);
    console.log('✓ Migration applied successfully');
  } catch (e) {
    console.error('✗ Migration FAILED:', e.message);
    process.exit(1);
  }

  // ── POST-MIGRATION VERIFICATION ─────────────────────────────────────
  console.log('\n=== POST-MIGRATION VERIFICATION ===\n');

  // 1. Confirm no invalid roles remain
  const invalid = await client.query(`
    SELECT tablename, policyname, cmd
    FROM pg_policies
    WHERE schemaname = 'public'
      AND (
        qual       LIKE '%dept_coordinator%' OR qual       LIKE '%college_coordinator%' OR
        with_check LIKE '%dept_coordinator%' OR with_check LIKE '%college_coordinator%'
      )
  `);
  console.log(`Invalid role references remaining: ${invalid.rows.length === 0 ? '0 ✓' : invalid.rows.length + ' ← PROBLEM'}`);
  invalid.rows.forEach(r => console.log(`  ⚠ [${r.tablename}] ${r.policyname} (${r.cmd})`));

  // 2. Confirm no self-references remain
  const selfref = await client.query(`
    SELECT tablename, policyname, cmd
    FROM pg_policies
    WHERE schemaname = 'public'
      AND (
        qual       LIKE '%pm.project_id = pm.id%' OR qual       LIKE '%dp.project_id = dp.id%' OR
        with_check LIKE '%pm.project_id = pm.id%' OR with_check LIKE '%dp.project_id = dp.id%'
      )
  `);
  console.log(`Self-reference bugs remaining: ${selfref.rows.length === 0 ? '0 ✓' : selfref.rows.length + ' ← PROBLEM'}`);

  // 3. Check all key policies exist
  const keyPolicies = [
    ['projects', 'projects_select'],
    ['projects', 'projects_insert'],
    ['projects', 'projects_update'],
    ['projects', 'projects_delete'],
    ['project_members', 'project_members_select'],
    ['project_members', 'project_members_insert'],
    ['project_members', 'project_members_update'],
    ['project_members', 'project_members_delete'],
    ['students', 'students_select'],
    ['students', 'students_update'],
    ['evaluations', 'evaluations_coordinator_read'],
    ['evaluations', 'evaluations_participant_read'],
    ['audit_logs', 'audit_read'],
    ['defense_panels', 'defense_panels_select'],
    ['defense_panels', 'defense_panels_modify'],
    ['defense_schedules', 'defense_schedules_select'],
    ['documents', 'documents_select'],
    ['document_versions', 'document_versions_select'],
    ['document_versions', 'document_versions_insert'],
    ['annotations', 'annotations_select'],
    ['annotations', 'annotations_update'],
    ['annotations', 'annotations_delete'],
    ['reports', 'reports_select'],
  ];

  console.log('\nKey policy existence check:');
  for (const [tbl, pol] of keyPolicies) {
    const r = await client.query(
      `SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename=$1 AND policyname=$2`,
      [tbl, pol]
    );
    const status = r.rows.length > 0 ? '✓' : '✗ MISSING';
    console.log(`  ${status}  ${tbl}.${pol}`);
  }

  // 4. Confirm no remaining duplicates
  const dups = await client.query(`
    SELECT tablename, cmd, COUNT(*) as cnt, string_agg(policyname, ', ') as names
    FROM pg_policies WHERE schemaname='public'
    GROUP BY tablename, cmd
    HAVING COUNT(*) > 1
    ORDER BY tablename, cmd
  `);
  console.log(`\nDuplicate (table, cmd) combinations: ${dups.rows.length === 0 ? '0 ✓' : dups.rows.length + ' remaining'}`);
  dups.rows.forEach(r => console.log(`  [${r.tablename}] ${r.cmd}: ${r.cnt} — ${r.names}`));

  // 5. Final policy summary per table
  console.log('\nFinal policy count per affected table:');
  const summary = await client.query(`
    SELECT tablename, COUNT(*) as cnt,
           string_agg(policyname || ' (' || cmd || ')', ', ' ORDER BY cmd, policyname) as policies
    FROM pg_policies WHERE schemaname='public'
      AND tablename IN ('projects','project_members','students','evaluations','audit_logs',
                        'defense_panels','defense_schedules','documents','document_versions',
                        'annotations','reports')
    GROUP BY tablename ORDER BY tablename
  `);
  summary.rows.forEach(r => {
    console.log(`\n  ${r.tablename} [${r.cnt} policies]:`);
    r.policies.split(', ').forEach(p => console.log(`    ${p}`));
  });

  await client.end();
  console.log('\n=== Sprint 1B COMPLETE ===');
}

run().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
