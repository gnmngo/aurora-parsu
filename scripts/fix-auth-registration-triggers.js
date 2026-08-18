require("dotenv").config({ path: ".env.local" });
const { Client } = require("pg");

async function fixAuthRegistrationTriggers() {
  const client = new Client({
    host: "aws-1-ap-southeast-2.pooler.supabase.com",
    user: "postgres.faxzubfvjsekizeiiocg",
    password: process.env.SUPABASE_DB_PASSWORD || "tF3cfdc3FQ7fWEdB",
    database: "postgres",
    port: 6543,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();
  console.log("Connected to DB to harden handle_new_user and process_audit_trigger...\n");

  // 1. Update process_audit_trigger with search_path and safe exception handling
  const auditSql = `
    CREATE OR REPLACE FUNCTION public.process_audit_trigger()
    RETURNS TRIGGER
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public, extensions, auth
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
          v_description := 'Student Registered: ' || COALESCE(NEW.student_number, '');
        ELSIF TG_TABLE_NAME = 'faculty' THEN
          v_description := 'Faculty Registered: ' || COALESCE(NEW.employee_number, '');
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
          '2026-2027'
        );
      EXCEPTION WHEN OTHERS THEN
        -- Safely catch and ignore audit insert errors so primary transactions never fail
        RAISE WARNING 'process_audit_trigger warning: %', SQLERRM;
      END;

      RETURN NEW;
    END;
    $$;
  `;

  await client.query(auditSql);
  console.log("1. process_audit_trigger updated with SECURITY DEFINER and search_path.");

  // 2. Update handle_new_user with search_path and robust fallback
  const userSql = `
    CREATE OR REPLACE FUNCTION public.handle_new_user()
    RETURNS trigger
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public, extensions, auth
    AS $$
    DECLARE
      v_role_id uuid;
      v_user_role text;
      v_first_name text;
      v_last_name text;
      v_campus_id uuid;
      v_college_id uuid;
      v_dept_id uuid;
      v_prog_id uuid;
      v_major_id uuid;
    BEGIN
      v_user_role := COALESCE(NEW.raw_user_meta_data->>'role', 'student');
      v_first_name := COALESCE(NEW.raw_user_meta_data->>'first_name', '');
      v_last_name := COALESCE(NEW.raw_user_meta_data->>'last_name', '');

      -- Parse UUIDs safely with NULLIF
      v_campus_id := NULLIF(NEW.raw_user_meta_data->>'campus_id', '')::uuid;
      v_college_id := NULLIF(NEW.raw_user_meta_data->>'college_id', '')::uuid;
      v_dept_id := NULLIF(NEW.raw_user_meta_data->>'department_id', '')::uuid;
      v_prog_id := NULLIF(NEW.raw_user_meta_data->>'program_id', '')::uuid;
      v_major_id := NULLIF(NEW.raw_user_meta_data->>'major_id', '')::uuid;

      -- If campus_id is null, fallback to primary campus
      IF v_campus_id IS NULL THEN
        SELECT id INTO v_campus_id FROM public.campuses LIMIT 1;
      END IF;

      -- Insert profile record
      INSERT INTO public.profiles (
        id, email, first_name, last_name, campus_id, college_id, department_id, status, created_at, updated_at
      ) VALUES (
        NEW.id,
        NEW.email,
        v_first_name,
        v_last_name,
        v_campus_id,
        v_college_id,
        v_dept_id,
        'approved', -- Auto-approve newly registered accounts for seamless onboarding
        NOW(),
        NOW()
      );

      -- Assign role
      SELECT id INTO v_role_id FROM public.roles WHERE code = v_user_role LIMIT 1;
      IF v_role_id IS NOT NULL THEN
        INSERT INTO public.user_roles (profile_id, role_id, assigned_by)
        VALUES (NEW.id, v_role_id, NEW.id)
        ON CONFLICT DO NOTHING;
      END IF;

      -- Insert specialized profile
      IF v_user_role = 'student' THEN
        INSERT INTO public.students (
          profile_id, student_number, year_level,
          campus_id, college_id, department_id, program_id, major_id
        )
        VALUES (
          NEW.id,
          COALESCE(NEW.raw_user_meta_data->>'student_number', 'STU-' || SUBSTRING(NEW.id::text, 1, 8)),
          COALESCE((NEW.raw_user_meta_data->>'year_level')::integer, 1),
          v_campus_id,
          v_college_id,
          v_dept_id,
          v_prog_id,
          v_major_id
        );
      ELSIF v_user_role IN ('adviser', 'panelist', 'coordinator') THEN
        INSERT INTO public.faculty (
          profile_id, employee_number, specialization, is_adviser, is_panelist
        )
        VALUES (
          NEW.id,
          COALESCE(NEW.raw_user_meta_data->>'employee_number', 'EMP-' || SUBSTRING(NEW.id::text, 1, 8)),
          NEW.raw_user_meta_data->>'specialization',
          v_user_role IN ('adviser', 'coordinator'),
          v_user_role IN ('panelist', 'coordinator')
        );
      END IF;

      RETURN NEW;
    END;
    $$;
  `;

  await client.query(userSql);
  console.log("2. handle_new_user updated with SECURITY DEFINER, search_path, and auto-approval.");

  await client.end();
}

fixAuthRegistrationTriggers();
