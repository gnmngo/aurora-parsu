-- ============================================================
-- AURORA Migration: 001_fix_evaluations_unique_constraint.sql
-- Sprint 2B — BUG-C3
--
-- Problem: The UNIQUE(project_id, stage_id, panelist_id) constraint
-- on `evaluations` blocks revision workflows. When a coordinator
-- asks a panelist to revise their evaluation, the new version
-- INSERT fails because a row with the same (project, stage, panelist)
-- already exists.
--
-- Fix: Drop the UNIQUE constraint. Immutability is already enforced
-- by the `tr_evaluations_immutable` trigger. Revision versioning
-- is tracked via the `version` column + ordering.
--
-- Safety: The existing immutability trigger still prevents updates
-- to submitted evaluations, so the business rule is preserved.
-- ============================================================

-- PRE-CHECK: Identify if any duplicate rows already exist
-- (should return 0 rows if the constraint has been in place)
SELECT
  project_id,
  stage_id,
  panelist_id,
  COUNT(*) AS cnt
FROM evaluations
GROUP BY project_id, stage_id, panelist_id
HAVING COUNT(*) > 1;

-- MIGRATION
ALTER TABLE evaluations
  DROP CONSTRAINT IF EXISTS evaluations_project_id_stage_id_panelist_id_key;

-- Also drop any unnamed unique index that may have been created instead
DROP INDEX IF EXISTS evaluations_project_id_stage_id_panelist_id_key;

-- Create a partial unique index instead: only one ACTIVE/SUBMITTED evaluation per panelist/stage
-- This allows draft revisions but prevents duplicate submissions.
CREATE UNIQUE INDEX IF NOT EXISTS idx_evaluations_active_per_panelist
  ON evaluations (project_id, stage_id, panelist_id)
  WHERE status IN ('submitted', 'locked');

-- VERIFICATION
SELECT
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'evaluations'
  AND indexname LIKE '%panelist%';
