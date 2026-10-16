-- Migration: 20261016000001_fix_handle_new_user_trigger.sql
-- Description: Fix handle_new_user() trigger to correctly cast status to user_status enum,
-- validate foreign keys against academic hierarchy, and avoid ON CONFLICT errors on user_roles.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role_id uuid;
  v_user_role text;
  v_first_name text;
  v_last_name text;
  v_status user_status;
  v_campus_id uuid;
  v_college_id uuid;
  v_department_id uuid;
  v_program_id uuid;
  v_major_id uuid;
BEGIN
  v_user_role := COALESCE(NEW.raw_user_meta_data->>'role', 'student');
  v_first_name := COALESCE(NEW.raw_user_meta_data->>'first_name', '');
  v_last_name := COALESCE(NEW.raw_user_meta_data->>'last_name', '');
  
  -- Student and faculty accounts are approved by default so they can access the platform
  v_status := (CASE WHEN v_user_role = 'student' THEN 'approved' ELSE 'approved' END)::user_status;

  v_campus_id := NULLIF(NEW.raw_user_meta_data->>'campus_id', '')::uuid;
  v_college_id := NULLIF(NEW.raw_user_meta_data->>'college_id', '')::uuid;
  v_department_id := NULLIF(NEW.raw_user_meta_data->>'department_id', '')::uuid;
  v_program_id := NULLIF(NEW.raw_user_meta_data->>'program_id', '')::uuid;
  v_major_id := NULLIF(NEW.raw_user_meta_data->>'major_id', '')::uuid;

  -- Validate foreign keys to prevent registration failures if IDs are invalid or deleted
  IF v_campus_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.campuses WHERE id = v_campus_id) THEN
    v_campus_id := '00000000-0000-0000-0000-000000000001'::uuid;
  END IF;
  IF v_campus_id IS NULL THEN
    v_campus_id := '00000000-0000-0000-0000-000000000001'::uuid;
  END IF;

  IF v_college_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.colleges WHERE id = v_college_id) THEN
    v_college_id := NULL;
  END IF;

  IF v_department_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.departments WHERE id = v_department_id) THEN
    v_department_id := NULL;
  END IF;

  IF v_program_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.programs WHERE id = v_program_id) THEN
    v_program_id := NULL;
  END IF;

  IF v_major_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.majors WHERE id = v_major_id) THEN
    v_major_id := NULL;
  END IF;

  -- 1. Insert or update public.profiles
  INSERT INTO public.profiles (
    id, email, first_name, last_name, status, campus_id, college_id, department_id, created_at, updated_at
  ) VALUES (
    NEW.id, NEW.email, v_first_name, v_last_name, v_status, v_campus_id, v_college_id, v_department_id, NOW(), NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    status = EXCLUDED.status,
    campus_id = COALESCE(EXCLUDED.campus_id, profiles.campus_id),
    college_id = COALESCE(EXCLUDED.college_id, profiles.college_id),
    department_id = COALESCE(EXCLUDED.department_id, profiles.department_id),
    updated_at = NOW();

  -- 2. Insert into public.user_roles
  SELECT id INTO v_role_id FROM public.roles WHERE code = v_user_role;
  IF FOUND THEN
    INSERT INTO public.user_roles (profile_id, role_id, assigned_by)
    VALUES (NEW.id, v_role_id, NEW.id)
    ON CONFLICT DO NOTHING;
  END IF;

  -- 3. Insert or update public.students or public.faculty
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
      v_campus_id,
      v_college_id,
      v_department_id,
      v_program_id,
      v_major_id
    )
    ON CONFLICT (profile_id) DO UPDATE SET
      student_number = COALESCE(EXCLUDED.student_number, students.student_number),
      year_level = EXCLUDED.year_level,
      section = EXCLUDED.section,
      program_id = COALESCE(EXCLUDED.program_id, students.program_id),
      major_id = COALESCE(EXCLUDED.major_id, students.major_id),
      campus_id = COALESCE(EXCLUDED.campus_id, students.campus_id),
      college_id = COALESCE(EXCLUDED.college_id, students.college_id),
      department_id = COALESCE(EXCLUDED.department_id, students.department_id),
      updated_at = NOW();
  ELSIF v_user_role IN ('adviser', 'panelist', 'faculty') THEN
    INSERT INTO public.faculty (profile_id, employee_number, specialization, is_adviser, is_panelist)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'employee_number', 'EMP-' || substring(NEW.id::text from 1 for 8)),
      NEW.raw_user_meta_data->>'specialization',
      v_user_role = 'adviser',
      v_user_role = 'panelist'
    )
    ON CONFLICT (profile_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;
