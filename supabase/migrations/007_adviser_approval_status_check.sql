-- ============================================================
-- AURORA Migration: 007_adviser_approval_status_check.sql
-- Sprint 2B — BUG-M8
--
-- Problem: `documents.adviser_approval_status` has no CHECK
-- constraint — any string value can be inserted. This allows
-- invalid status strings to bypass application-level validation.
--
-- Fix: Add a CHECK constraint matching the application's
-- valid status values: 'pending', 'approved', 'rejected'.
-- ============================================================

-- PRE-CHECK: Check current constraint and data distribution
SELECT
  adviser_approval_status,
  COUNT(*) AS count
FROM documents
GROUP BY adviser_approval_status;

-- Identify any invalid values that would block the constraint
SELECT id, adviser_approval_status
FROM documents
WHERE adviser_approval_status NOT IN ('pending', 'approved', 'rejected')
  AND adviser_approval_status IS NOT NULL;

-- MIGRATION: Add CHECK constraint
-- Safe: does not fail if no invalid values exist (verified by pre-check above)
ALTER TABLE documents
  ADD CONSTRAINT IF NOT EXISTS documents_adviser_approval_status_check
  CHECK (
    adviser_approval_status IS NULL
    OR adviser_approval_status IN ('pending', 'approved', 'rejected')
  );

-- VERIFICATION
SELECT
  conname AS constraint_name,
  pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid = 'documents'::regclass
  AND contype = 'c'
ORDER BY conname;
