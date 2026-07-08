const { Client } = require('pg');
const HOST = 'aws-1-ap-southeast-2.pooler.supabase.com';
const USER = 'postgres.faxzubfvjsekizeiiocg';
const DATABASE = 'postgres';
const PORT = 6543;
const PASSWORD = 'tF3cfdc3FQ7fWEdB';

async function fix() {
  const client = new Client({ host: HOST, user: USER, password: PASSWORD, database: DATABASE, port: PORT, ssl: { rejectUnauthorized: false } });
  await client.connect();
  
  // We just rewrite the function.
  const sql = `
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  v_role_id uuid;
  v_user_role text;
  v_first_name text;
  v_last_name text;
BEGIN
  v_user_role := COALESCE(NEW.raw_user_meta_data->>'role', 'student');
  v_first_name := COALESCE(NEW.raw_user_meta_data->>'first_name', '');
  v_last_name := COALESCE(NEW.raw_user_meta_data->>'last_name', '');

  INSERT INTO public.profiles (
    id, email, first_name, last_name, status, created_at, updated_at
  ) VALUES (
    NEW.id, NEW.email, v_first_name, v_last_name, 'pending', NOW(), NOW()
  );

  SELECT id INTO v_role_id FROM public.roles WHERE code = v_user_role;
  IF FOUND THEN
    INSERT INTO public.user_roles (profile_id, role_id, assigned_by)
    VALUES (NEW.id, v_role_id, NEW.id);
  END IF;

  IF v_user_role = 'student' THEN
    INSERT INTO public.students (profile_id, student_number, program_id, year_level)
    VALUES (
      NEW.id,
      NEW.raw_user_meta_data->>'student_number',
      (NEW.raw_user_meta_data->>'program_id')::uuid,
      (NEW.raw_user_meta_data->>'year_level')::integer
    );
  ELSIF v_user_role IN ('adviser', 'panelist') THEN
    INSERT INTO public.faculty (profile_id, employee_number, specialization, is_adviser, is_panelist)
    VALUES (
      NEW.id,
      NEW.raw_user_meta_data->>'employee_number',
      NEW.raw_user_meta_data->>'specialization',
      v_user_role = 'adviser',
      v_user_role = 'panelist'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
  `;
  await client.query(sql);
  await client.end();
}
fix().catch(console.error);
