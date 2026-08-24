require("dotenv").config({ path: ".env.local" });
const { Client } = require("pg");

async function updateFacultySecurityTrigger() {
  const client = new Client({
    host: "aws-1-ap-southeast-2.pooler.supabase.com",
    user: "postgres.faxzubfvjsekizeiiocg",
    password: process.env.SUPABASE_DB_PASSWORD || "tF3cfdc3FQ7fWEdB",
    database: "postgres",
    port: 6543,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    console.log("Connected to Supabase PostgreSQL database...");

    const triggerSql = `
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
        v_status text;
        v_auto_approved boolean;
      BEGIN
        v_user_role := COALESCE(NEW.raw_user_meta_data->>'role', 'student');
        v_first_name := COALESCE(NEW.raw_user_meta_data->>'first_name', '');
        v_last_name := COALESCE(NEW.raw_user_meta_data->>'last_name', '');
        v_auto_approved := COALESCE((NEW.raw_user_meta_data->>'auto_approved')::boolean, false);

        -- Parse UUIDs safely with NULLIF
        v_campus_id := NULLIF(NEW.raw_user_meta_data->>'campus_id', '')::uuid;
        v_college_id := NULLIF(NEW.raw_user_meta_data->>'college_id', '')::uuid;
        v_dept_id := NULLIF(NEW.raw_user_meta_data->>'department_id', '')::uuid;
        v_prog_id := NULLIF(NEW.raw_user_meta_data->>'program_id', '')::uuid;
        v_major_id := NULLIF(NEW.raw_user_meta_data->>'major_id', '')::uuid;

        -- Fallback campus
        IF v_campus_id IS NULL THEN
          SELECT id INTO v_campus_id FROM public.campuses LIMIT 1;
        END IF;

        -- Faculty Approval Gate:
        -- Students are auto-approved so they can submit their capstone projects.
        -- Faculty (adviser, panelist, coordinator, sys_admin) are quarantined as 'pending'
        -- unless created/pre-approved by an authorized Administrator.
        IF v_auto_approved OR v_user_role = 'student' THEN
          v_status := 'approved';
        ELSE
          v_status := 'pending';
        END IF;

        -- Insert profile record with explicit status
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
          v_status::user_status,
          NOW(),
          NOW()
        )
        ON CONFLICT (id) DO UPDATE SET
          first_name = EXCLUDED.first_name,
          last_name = EXCLUDED.last_name,
          campus_id = EXCLUDED.campus_id,
          college_id = EXCLUDED.college_id,
          department_id = EXCLUDED.department_id,
          status = EXCLUDED.status,
          updated_at = NOW();

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
          ) VALUES (
            NEW.id,
            COALESCE(NEW.raw_user_meta_data->>'student_number', 'UNASSIGNED'),
            COALESCE((NEW.raw_user_meta_data->>'year_level')::integer, 4),
            v_campus_id,
            v_college_id,
            v_dept_id,
            v_prog_id,
            v_major_id
          )
          ON CONFLICT (profile_id) DO NOTHING;
        ELSE
          INSERT INTO public.faculty (
            profile_id, employee_number, department_id, academic_rank, specialization, max_advising_load
          ) VALUES (
            NEW.id,
            COALESCE(NEW.raw_user_meta_data->>'employee_number', 'FACULTY-' || substr(NEW.id::text, 1, 8)),
            v_dept_id,
            COALESCE(NEW.raw_user_meta_data->>'academic_rank', 'Assistant Professor'),
            COALESCE(NEW.raw_user_meta_data->>'specialization', 'General'),
            10
          )
          ON CONFLICT (profile_id) DO NOTHING;
        END IF;

        RETURN NEW;
      END;
      $$;
    `;

    await client.query(triggerSql);
    console.log("SUCCESS: handle_new_user() updated with Faculty Approval Gate!");

    // Verify existing demo and admin profiles are in approved status
    const updateDemoSql = `
      UPDATE public.profiles
      SET status = 'approved'
      WHERE email IN (
        'admin@aurora.test',
        'coordinator@aurora.test',
        'adviser@aurora.test',
        'panelist1@aurora.test',
        'panelist2@aurora.test',
        'panelist3@aurora.test',
        'student@aurora.test'
      );
    `;
    await client.query(updateDemoSql);
    console.log("SUCCESS: Demo accounts confirmed as approved.");

  } catch (err) {
    console.error("Error updating trigger:", err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

updateFacultySecurityTrigger();
