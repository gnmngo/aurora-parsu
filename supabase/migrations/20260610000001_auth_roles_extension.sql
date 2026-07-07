-- ============================================================
-- AURORA Module 02: Auth & Role-Based Access Control Extensions
-- ============================================================

-- 1. Adjust user_status enum to support pending, approved, rejected, suspended.
-- In Postgres, ADD VALUE cannot run in a transaction with other commands if they use the type.
-- So we use IF NOT EXISTS to avoid errors.
ALTER TYPE user_status ADD VALUE IF NOT EXISTS 'pending';
ALTER TYPE user_status ADD VALUE IF NOT EXISTS 'approved';
ALTER TYPE user_status ADD VALUE IF NOT EXISTS 'rejected';

-- Set default status on profiles to 'pending'
ALTER TABLE profiles ALTER COLUMN status SET DEFAULT 'pending'::user_status;

-- 2. Add any new roles to the system
INSERT INTO roles (id, name, code, description, hierarchy) VALUES
  ('20000000-0000-0000-0000-000000000009', 'College Dean', 'college_dean', 'Dean of college', 85),
  ('20000000-0000-0000-0000-000000000010', 'Research Coordinator', 'research_coordinator', 'Coordinates research programs', 75)
ON CONFLICT (code) DO NOTHING;

-- Map some default role permissions
-- For College Dean (college_dean)
INSERT INTO role_permissions (role_id, permission_id)
SELECT '20000000-0000-0000-0000-000000000009'::uuid, id
FROM permissions
WHERE code IN ('project:read', 'document:download', 'audit:read', 'report:generate')
ON CONFLICT DO NOTHING;

-- For Research Coordinator (research_coordinator)
INSERT INTO role_permissions (role_id, permission_id)
SELECT '20000000-0000-0000-0000-000000000010'::uuid, id
FROM permissions
WHERE code IN ('project:read', 'document:download', 'grading:manage', 'report:generate')
ON CONFLICT DO NOTHING;

-- 3. Update the trigger function on user signup to handle roles, students, and faculty automatically
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
  -- Determine default campus (Goa Campus)
  v_campus_id := COALESCE(
    (NEW.raw_user_meta_data->>'campus_id')::uuid,
    '00000000-0000-0000-0000-000000000001'::uuid
  );

  -- Determine default college and department from metadata if provided
  v_college_id := (NEW.raw_user_meta_data->>'college_id')::uuid;
  v_department_id := (NEW.raw_user_meta_data->>'department_id')::uuid;

  -- Insert profile with 'pending' status
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
    'pending'::user_status
  )
  ON CONFLICT (id) DO NOTHING;

  -- Read role code from metadata, default to 'student'
  v_role_code := COALESCE(NEW.raw_user_meta_data->>'role', 'student');
  
  -- Find matching role in our DB
  SELECT id INTO v_role_id FROM public.roles WHERE code = v_role_code;
  
  IF v_role_id IS NOT NULL THEN
    -- Assign role to user_roles
    INSERT INTO public.user_roles (profile_id, role_id, scope_type, scope_id)
    VALUES (
      NEW.id,
      v_role_id,
      CASE 
        WHEN v_role_code = 'dept_coordinator' THEN 'department'
        WHEN v_role_code = 'college_coordinator' THEN 'college'
        ELSE NULL
      END,
      CASE 
        WHEN v_role_code = 'dept_coordinator' THEN v_department_id
        WHEN v_role_code = 'college_coordinator' THEN v_college_id
        ELSE NULL
      END
    )
    ON CONFLICT (profile_id, role_id, scope_type, scope_id) DO NOTHING;
  END IF;

  -- Create subprofile records
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
      CASE WHEN v_role_code = 'research_adviser' THEN TRUE ELSE FALSE END,
      CASE WHEN v_role_code IN ('panel_chair', 'panel_member') THEN TRUE ELSE FALSE END
    )
    ON CONFLICT (profile_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

-- Re-establish trigger (just in case)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- 4. Implement has_permission(permission_code text) helper
CREATE OR REPLACE FUNCTION has_permission(permission_code TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM user_roles ur
    JOIN role_permissions rp ON rp.role_id = ur.role_id
    JOIN permissions p ON p.id = rp.permission_id
    WHERE ur.profile_id = auth.uid()
      AND p.code = permission_code
  );
$$;

-- 5. Implement log_auth_event to audit logins/logouts/failures
CREATE OR REPLACE FUNCTION log_auth_event(
  p_user_email TEXT,
  p_profile_id UUID,
  p_action TEXT,
  p_description TEXT,
  p_ip_address INET,
  p_user_agent TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.audit_logs (
    user_email,
    profile_id,
    action_type,
    module,
    entity_type,
    entity_id,
    description,
    ip_address,
    user_agent,
    academic_year
  ) VALUES (
    p_user_email,
    p_profile_id,
    CASE 
      WHEN p_action = 'LOGIN' THEN 'LOGIN'::audit_action
      WHEN p_action = 'LOGOUT' THEN 'LOGOUT'::audit_action
      WHEN p_action = 'ASSIGN' THEN 'ASSIGN'::audit_action
      ELSE 'UPDATE'::audit_action
    END,
    'auth',
    'profile',
    COALESCE(p_profile_id, '00000000-0000-0000-0000-000000000000'::uuid),
    p_description,
    p_ip_address,
    p_user_agent,
    '2025-2026'
  );
END;
$$;

-- 6. Create notifications_compat view
CREATE OR REPLACE VIEW notifications_compat AS
SELECT 
  id,
  profile_id AS user_id,
  title,
  message,
  type::text AS type,
  (read_at IS NOT NULL) AS is_read,
  created_at
FROM public.notifications;
