-- ============================================================
-- AURORA Auth & RLS Hardening
-- Removes USING(true) debug policies; adds missing SELECT policies
-- ============================================================

-- Helper: approved authenticated user (not anon, not pending)
CREATE OR REPLACE FUNCTION public.is_approved_user()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.status = 'approved'
  );
$$;

-- ── Reference tables: approved users only (no USING true) ──
DROP POLICY IF EXISTS departments_select_auth ON public.departments;
CREATE POLICY departments_select_approved ON public.departments
  FOR SELECT TO authenticated
  USING (public.is_approved_user());

DROP POLICY IF EXISTS colleges_select_auth ON public.colleges;
CREATE POLICY colleges_select_approved ON public.colleges
  FOR SELECT TO authenticated
  USING (public.is_approved_user());

DROP POLICY IF EXISTS defense_stages_select_auth ON public.defense_stages;
CREATE POLICY defense_stages_select_approved ON public.defense_stages
  FOR SELECT TO authenticated
  USING (public.is_approved_user());

-- ── Profiles: own row always; staff read scoped by role ──
DROP POLICY IF EXISTS profiles_select_own ON public.profiles;
CREATE POLICY profiles_select_own ON public.profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid());

-- profiles_select_staff from migration 06 remains for coordinator dropdowns

DROP POLICY IF EXISTS profiles_update_own ON public.profiles;
CREATE POLICY profiles_update_own ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid());

-- ── Faculty (RLS was enabled with NO policies — blocked all reads) ──
DROP POLICY IF EXISTS faculty_select_own ON public.faculty;
CREATE POLICY faculty_select_own ON public.faculty
  FOR SELECT TO authenticated
  USING (
    profile_id = auth.uid()
    OR has_role('sys_admin')
    OR has_role('dept_coordinator')
    OR has_role('college_coordinator')
    OR has_role('research_coordinator')
  );

-- ── user_roles (auth provider reads own roles) ──
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_roles_select_own ON public.user_roles;
CREATE POLICY user_roles_select_own ON public.user_roles
  FOR SELECT TO authenticated
  USING (
    profile_id = auth.uid()
    OR has_role('sys_admin')
    OR has_role('college_coordinator')
  );

-- ── roles + role_permissions (RBAC lookups during login) ──
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS roles_select_approved ON public.roles;
CREATE POLICY roles_select_approved ON public.roles
  FOR SELECT TO authenticated
  USING (public.is_approved_user());

DROP POLICY IF EXISTS role_permissions_select_approved ON public.role_permissions;
CREATE POLICY role_permissions_select_approved ON public.role_permissions
  FOR SELECT TO authenticated
  USING (public.is_approved_user());

-- permissions table (joined from role_permissions)
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS permissions_select_approved ON public.permissions;
CREATE POLICY permissions_select_approved ON public.permissions
  FOR SELECT TO authenticated
  USING (public.is_approved_user());

-- ── document_upload_history (replace USING true) ──
DROP POLICY IF EXISTS document_upload_history_select ON public.document_upload_history;
CREATE POLICY document_upload_history_select ON public.document_upload_history
  FOR SELECT TO authenticated
  USING (
    performed_by = auth.uid()
    OR has_role('dept_coordinator')
    OR has_role('college_coordinator')
    OR has_role('sys_admin')
    OR has_role('research_coordinator')
  );

-- ── projects SELECT (ensure student participants included) ──
DROP POLICY IF EXISTS projects_select ON public.projects;
CREATE POLICY projects_select ON public.projects
  FOR SELECT TO authenticated
  USING (
    is_project_participant(id)
    OR has_role('dept_coordinator')
    OR has_role('college_coordinator')
    OR has_role('research_coordinator')
    OR has_role('sys_admin')
    OR EXISTS (
      SELECT 1 FROM public.students s
      WHERE s.id = projects.student_id
        AND s.profile_id = auth.uid()
    )
  );
