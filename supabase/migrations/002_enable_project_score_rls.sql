-- ============================================================
-- AURORA Migration: 002_enable_project_score_rls.sql
-- Sprint 2B — BUG-M6
--
-- Problem: `project_score_cache` has RLS disabled (confirmed by
-- sprint2-db-audit.js output). Any authenticated user can read
-- or write aggregate scores, violating least-privilege access.
--
-- Fix: Enable RLS. Grant SELECT to project participants and staff.
-- The table is maintained by the `compute_evaluation_score()` trigger
-- (SECURITY DEFINER), so no INSERT/UPDATE policy is needed for users.
-- ============================================================

-- PRE-CHECK: Confirm RLS is currently disabled
SELECT
  relname AS table_name,
  relrowsecurity AS rls_enabled
FROM pg_class
WHERE relname = 'project_score_cache';

-- MIGRATION
ALTER TABLE project_score_cache ENABLE ROW LEVEL SECURITY;

-- Allow project participants and authorized staff to SELECT aggregate scores
CREATE POLICY "project_score_cache_read"
  ON project_score_cache
  FOR SELECT
  USING (
    is_project_participant(project_id)
    OR has_role('coordinator')
    OR has_role('sys_admin')
    OR has_role('college_dean')
  );

-- No INSERT/UPDATE policy for users — maintained by SECURITY DEFINER trigger only

-- VERIFICATION
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'project_score_cache';
