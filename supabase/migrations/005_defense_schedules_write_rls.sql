-- ============================================================
-- AURORA Migration: 005_defense_schedules_write_rls.sql
-- Sprint 2B — Security Fix
--
-- Problem: `defense_schedules` has a SELECT RLS policy but is
-- missing explicit INSERT/UPDATE/DELETE policies. Supabase with
-- RLS enabled defaults to DENY for non-SELECT operations when no
-- matching policy exists — however, the missing explicit policy
-- means the intent is ambiguous and may silently allow SECURITY
-- DEFINER bypass paths.
--
-- Fix: Add explicit coordinator/sys_admin write policies.
-- ============================================================

-- PRE-CHECK: Check current policies on defense_schedules
SELECT
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'defense_schedules'
ORDER BY cmd;

-- MIGRATION: Add write policies

-- INSERT: only coordinators and sys_admins can create schedules
CREATE POLICY "defense_schedules_insert"
  ON defense_schedules
  FOR INSERT
  WITH CHECK (
    has_role('coordinator') OR has_role('sys_admin')
  );

-- UPDATE: only coordinators and sys_admins can modify schedules
CREATE POLICY "defense_schedules_update"
  ON defense_schedules
  FOR UPDATE
  USING (
    has_role('coordinator') OR has_role('sys_admin')
  )
  WITH CHECK (
    has_role('coordinator') OR has_role('sys_admin')
  );

-- DELETE: only coordinators and sys_admins can cancel/remove schedules
CREATE POLICY "defense_schedules_delete"
  ON defense_schedules
  FOR DELETE
  USING (
    has_role('coordinator') OR has_role('sys_admin')
  );

-- VERIFICATION
SELECT
  policyname,
  cmd
FROM pg_policies
WHERE tablename = 'defense_schedules'
ORDER BY cmd;
