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

async function updateTrigger() {
  const client = new Client(pgConfig);
  try {
    await client.connect();
    console.log('CONNECTED to database. Modifying handle_new_user trigger logic...');

    const ddl = `
      CREATE OR REPLACE FUNCTION handle_new_user()
      RETURNS TRIGGER
      LANGUAGE plpgsql
      SECURITY DEFINER
      SET search_path = public
      AS $$
      DECLARE
        v_role_id UUID;
        v_role_code TEXT;
        v_campus_id UUID;
        v_college_id UUID;
        v_department_id UUID;
      BEGIN
        v_campus_id := COALESCE(
          (NEW.raw_user_meta_data->>'campus_id')::uuid,
          '00000000-0000-0000-0000-000000000001'::uuid
        );

        v_college_id := (NEW.raw_user_meta_data->>'college_id')::uuid;
        v_department_id := (NEW.raw_user_meta_data->>'department_id')::uuid;

        INSERT INTO public.profiles (
          id,
          campus_id,
          college_id,
          department_id,
          email,
          first_name,
          last_name,
          status
        )
        VALUES (
          NEW.id,
          v_campus_id,
          v_college_id,
          v_department_id,
          NEW.email,
          COALESCE(NEW.raw_user_meta_data->>'first_name', 'New'),
          COALESCE(NEW.raw_user_meta_data->>'last_name', 'User'),
          'approved'::user_status -- Default to approved for seamless demo/ presentations onboarding!
        )
        ON CONFLICT (id) DO NOTHING;

        -- Normalise legacy metadata role names to new official codes
        v_role_code := COALESCE(NEW.raw_user_meta_data->>'role', 'student');
        IF v_role_code = 'research_adviser' THEN
          v_role_code := 'adviser';
        ELSIF v_role_code IN ('panel_chair', 'panel_member') THEN
          v_role_code := 'panelist';
        ELSIF v_role_code IN ('college_coordinator', 'dept_coordinator', 'research_coordinator') THEN
          v_role_code := 'coordinator';
        END IF;
        
        SELECT id INTO v_role_id FROM public.roles WHERE code = v_role_code;
        
        IF v_role_id IS NOT NULL THEN
          INSERT INTO public.user_roles (profile_id, role_id, scope_type, scope_id)
          VALUES (
            NEW.id,
            v_role_id,
            CASE 
              WHEN v_role_code = 'coordinator' THEN 'department'
              ELSE NULL
            END,
            CASE 
              WHEN v_role_code = 'coordinator' THEN v_department_id
              ELSE NULL
            END
          )
          ON CONFLICT (profile_id, role_id, scope_type, scope_id) DO NOTHING;
        END IF;

        IF v_role_code = 'student' THEN
          INSERT INTO public.students (profile_id, student_number, program, year_level)
          VALUES (
            NEW.id,
            COALESCE(NEW.raw_user_meta_data->>'student_number', 'STUD-' || substring(NEW.id::text from 1 for 8)),
            COALESCE(NEW.raw_user_meta_data->>'program', 'BSCS'),
            COALESCE((NEW.raw_user_meta_data->>'year_level')::int, 4)
          )
          ON CONFLICT (profile_id) DO NOTHING;
        ELSE
          INSERT INTO public.faculty (profile_id, employee_number, rank, specialization, is_adviser, is_panelist)
          VALUES (
            NEW.id,
            COALESCE(NEW.raw_user_meta_data->>'employee_number', 'EMP-' || substring(NEW.id::text from 1 for 8)),
            COALESCE(NEW.raw_user_meta_data->>'rank', 'Instructor'),
            COALESCE(NEW.raw_user_meta_data->>'specialization', 'General'),
            CASE WHEN v_role_code = 'adviser' THEN TRUE ELSE FALSE END,
            CASE WHEN v_role_code = 'panelist' THEN TRUE ELSE FALSE END
          )
          ON CONFLICT (profile_id) DO NOTHING;
        END IF;

        RETURN NEW;
      END;
      $$;
    `;

    await client.query(ddl);
    console.log('SUCCESS: handle_new_user trigger function updated.');

  } catch (err) {
    console.error('Failure:', err);
  } finally {
    await client.end();
  }
}

updateTrigger();
