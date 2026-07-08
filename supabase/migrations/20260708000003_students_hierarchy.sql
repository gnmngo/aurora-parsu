-- Alter Students to add full hierarchy
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS campus_id UUID REFERENCES public.campuses(id);
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS college_id UUID REFERENCES public.colleges(id);
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES public.departments(id);

-- Also add major_id just in case it was missed
DO $$
BEGIN
  ALTER TABLE public.students ADD COLUMN major_id UUID REFERENCES public.majors(id);
EXCEPTION
  WHEN duplicate_column THEN
    -- Column already exists
END $$;

-- Update the handle_new_user trigger to save these!
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
    INSERT INTO public.students (
      profile_id, student_number, year_level,
      campus_id, college_id, department_id, program_id, major_id
    )
    VALUES (
      NEW.id,
      NEW.raw_user_meta_data->>'student_number',
      COALESCE((NEW.raw_user_meta_data->>'year_level')::integer, 1),
      NULLIF(NEW.raw_user_meta_data->>'campus_id', '')::uuid,
      NULLIF(NEW.raw_user_meta_data->>'college_id', '')::uuid,
      NULLIF(NEW.raw_user_meta_data->>'department_id', '')::uuid,
      NULLIF(NEW.raw_user_meta_data->>'program_id', '')::uuid,
      NULLIF(NEW.raw_user_meta_data->>'major_id', '')::uuid
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
