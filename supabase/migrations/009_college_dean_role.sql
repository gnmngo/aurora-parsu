-- ============================================================
-- AURORA Migration: 009_college_dean_role.sql
-- Sprint 2C — MISS-1
--
-- Problem: The `audit_logs` table has an RLS policy referencing
-- `has_role('college_dean')` but this role code DOES NOT EXIST
-- in the `roles` table. The RLS condition can never be satisfied,
-- making college-level oversight non-functional.
--
-- Additionally: Chapter 2 (institutional hierarchy) specifies:
--   Student (10) → Adviser (20) → Panelist (30) →
--   Coordinator (40) → College Dean (50) → Sys Admin (100)
--
-- Fix: Insert the `college_dean` role with hierarchy value 50.
-- ============================================================

-- PRE-CHECK: Confirm college_dean does not yet exist
SELECT id, name, code, hierarchy
FROM roles
ORDER BY hierarchy;

-- MIGRATION: Insert college_dean role
INSERT INTO roles (id, name, code, description, hierarchy)
VALUES (
  gen_random_uuid(),
  'College Dean',
  'college_dean',
  'Read-only institutional oversight of all college-level defenses, grades, and audit logs.',
  50
)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  hierarchy = EXCLUDED.hierarchy;

-- VERIFICATION
SELECT id, name, code, hierarchy
FROM roles
ORDER BY hierarchy;
-- Expected: college_dean appears between coordinator (40) and sys_admin (100)
