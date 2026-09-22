`
-- 1. Add section column to public.students
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS section TEXT DEFAULT 'A';

-- 2. Create program_sections table to map Section Advisers
CREATE TABLE IF NOT EXISTS public.program_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID NOT NULL REFERENCES public.programs(id) ON DELETE CASCADE,
  year_level INTEGER NOT NULL DEFAULT 4,
  section TEXT NOT NULL DEFAULT 'A',
  academic_year TEXT NOT NULL DEFAULT '2026-2027',
  adviser_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT program_sections_unique UNIQUE (program_id, year_level, section, academic_year)
);

CREATE INDEX IF NOT EXISTS idx_program_sections_lookup 
  ON public.program_sections (program_id, year_level, section, academic_year);

-- 3. Enable RLS
ALTER TABLE public.program_sections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access to program_sections" ON public.program_sections;
CREATE POLICY "Allow public read access to program_sections"
  ON public.program_sections FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Allow coordinators and admins to modify program_sections" ON public.program_sections;
CREATE POLICY "Allow coordinators and admins to modify program_sections"
  ON public.program_sections FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON ur.role_id = r.id
      WHERE ur.profile_id = auth.uid()
        AND r.code IN ('coordinator', 'sys_admin')
    )
  );

-- 4. Update the handle_new_user trigger to save year_level and section
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $func$
DECLARE
  v_role_id uuid;
  v_user_role text;
  v_first_name text;
  v_last_name text;
  v_status text;
BEGIN
  v_user_role := COALESCE(NEW.raw_user_meta_data->>'role', 'student');
  v_first_name := COALESCE(NEW.raw_user_meta_data->>'first_name', '');
  v_last_name := COALESCE(NEW.raw_user_meta_data->>'last_name', '');
  v_status := CASE WHEN v_user_role = 'student' THEN 'approved' ELSE 'pending' END;

  INSERT INTO public.profiles (
    id, email, first_name, last_name, status, created_at, updated_at
  ) VALUES (
    NEW.id, NEW.email, v_first_name, v_last_name, v_status, NOW(), NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    updated_at = NOW();

  SELECT id INTO v_role_id FROM public.roles WHERE code = v_user_role;
  IF FOUND THEN
    INSERT INTO public.user_roles (profile_id, role_id, assigned_by)
    VALUES (NEW.id, v_role_id, NEW.id)
    ON CONFLICT DO NOTHING;
  END IF;

  IF v_user_role = 'student' THEN
    INSERT INTO public.students (
      profile_id, student_number, year_level, section,
      campus_id, college_id, department_id, program_id, major_id
    )
    VALUES (
      NEW.id,
      NEW.raw_user_meta_data->>'student_number',
      COALESCE((NEW.raw_user_meta_data->>'year_level')::integer, 4),
      COALESCE(NULLIF(NEW.raw_user_meta_data->>'section', ''), 'A'),
      NULLIF(NEW.raw_user_meta_data->>'campus_id', '')::uuid,
      NULLIF(NEW.raw_user_meta_data->>'college_id', '')::uuid,
      NULLIF(NEW.raw_user_meta_data->>'department_id', '')::uuid,
      NULLIF(NEW.raw_user_meta_data->>'program_id', '')::uuid,
      NULLIF(NEW.raw_user_meta_data->>'major_id', '')::uuid
    )
    ON CONFLICT (profile_id) DO UPDATE SET
      year_level = EXCLUDED.year_level,
      section = EXCLUDED.section,
      program_id = EXCLUDED.program_id,
      updated_at = NOW();
  ELSIF v_user_role IN ('adviser', 'panelist', 'faculty') THEN
    INSERT INTO public.faculty (profile_id, employee_number, specialization, is_adviser, is_panelist)
    VALUES (
      NEW.id,
      NEW.raw_user_meta_data->>'employee_number',
      NEW.raw_user_meta_data->>'specialization',
      v_user_role = 'adviser',
      v_user_role = 'panelist'
    )
    ON CONFLICT (profile_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$func$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Seed default section adviser for all active programs using demo adviser
-- Demo adviser ID: 6f9c27b6-5f28-4469-abc5-a2141e92b706
INSERT INTO public.program_sections (program_id, year_level, section, academic_year, adviser_id)
SELECT 
  p.id AS program_id,
  4 AS year_level,
  'A' AS section,
  '2026-2027' AS academic_year,
  '6f9c27b6-5f28-4469-abc5-a2141e92b706'::uuid AS adviser_id
FROM public.programs p
ON CONFLICT (program_id, year_level, section, academic_year) DO NOTHING;

-- Also seed Section B for BSIT
INSERT INTO public.program_sections (program_id, year_level, section, academic_year, adviser_id)
VALUES (
  '80000000-0000-0000-0000-000000000001',
  4,
  'B',
  '2026-2027',
  '6f9c27b6-5f28-4469-abc5-a2141e92b706'
)
ON CONFLICT (program_id, year_level, section, academic_year) DO NOTHING;
`;

async function run() {
  const client = new Client({ host: HOST, user: USER, password: PASSWORD, database: DATABASE, port: PORT, ssl: { rejectUnauthorized: false } });
  try {
    await client.connect();
    console.log('Applying Section Advisers migration...');
    await client.query(sql);
    console.log('SUCCESS: Section Advisers table, trigger, and default seeds created successfully!');
  } catch (err) {
    console.error('ERROR applying migration:', err.message);
  } finally {
    await client.end();
  }
}
run()