-- AURORA Security Fix: Remove overly permissive RLS policy on profiles
-- Bug #5: profiles_debug_select_all has qual: true which exposes ALL profiles to ALL users

-- Step 1: Remove the debug SELECT ALL policy
DROP POLICY IF EXISTS profiles_debug_select_all ON public.profiles;

-- Step 2: Ensure the proper staff-access policy exists
-- This was already in place: profiles_select_staff
-- (id = auth.uid()) OR coordinator OR adviser OR panelist OR sys_admin

-- Step 3: Add a policy for students to view profiles of their project members
-- Students need to see their adviser and fellow project members' names
DROP POLICY IF EXISTS profiles_select_project_members ON public.profiles;
CREATE POLICY profiles_select_project_members ON public.profiles
  FOR SELECT
  USING (
    -- Own profile
    id = auth.uid()
    OR
    -- Profiles of people in the same project
    id IN (
      SELECT pm.profile_id
      FROM public.project_members pm
      WHERE pm.project_id IN (
        SELECT p.id FROM public.projects p
        WHERE p.student_id IN (
          SELECT s.id FROM public.students s WHERE s.profile_id = auth.uid()
        )
        UNION
        SELECT pm2.project_id FROM public.project_members pm2 WHERE pm2.profile_id = auth.uid()
      )
    )
    OR
    -- Staff roles can see all profiles
    has_role('coordinator'::text)
    OR has_role('adviser'::text)
    OR has_role('panelist'::text)
    OR has_role('sys_admin'::text)
  );

-- Step 4: Also drop the duplicate profiles_select_staff if it exists to avoid conflicts
DROP POLICY IF EXISTS profiles_select_staff ON public.profiles;
