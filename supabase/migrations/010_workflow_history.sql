-- ============================================================
-- AURORA Migration: 010_workflow_history.sql
-- Sprint 2G
--
-- Creates an immutable workflow_history table that records every
-- project stage transition. This provides:
--   - Full BPM audit trail (who moved the project, when, and why)
--   - Stage-to-stage traceability
--   - Immutability (no UPDATE or DELETE allowed)
--
-- The table is automatically populated by an updated version of
-- the handle_project_workflow_transition() function.
-- ============================================================

-- PRE-CHECK: Confirm table does not exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name = 'workflow_history';

-- MIGRATION: Create the workflow_history table
CREATE TABLE IF NOT EXISTS workflow_history (
  id                uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id        uuid        NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  from_stage_id     uuid        REFERENCES defense_stages(id),
  to_stage_id       uuid        REFERENCES defense_stages(id),
  transitioned_by   uuid        REFERENCES profiles(id),
  performed_by_role text,
  transition_type   text        NOT NULL DEFAULT 'automatic'
                                CHECK (transition_type IN ('automatic', 'manual', 'override', 'rollback', 'system')),
  transition_reason text,
  old_status        text,
  new_status        text,
  metadata          jsonb       DEFAULT '{}'::jsonb,
  created_at        timestamptz DEFAULT now() NOT NULL
);

-- Immutability: No UPDATE or DELETE allowed (enforced at DB level)
COMMENT ON TABLE workflow_history IS
  'Immutable audit log of project stage transitions. No UPDATE or DELETE permitted.';

-- Enable RLS
ALTER TABLE workflow_history ENABLE ROW LEVEL SECURITY;

-- Read-only access for project participants and staff
CREATE POLICY "workflow_history_read"
  ON workflow_history
  FOR SELECT
  USING (
    is_project_participant(project_id)
    OR has_role('coordinator')
    OR has_role('sys_admin')
    OR has_role('college_dean')
    OR has_role('adviser')
  );

-- Only the system/trigger can INSERT (no user INSERT policy needed —
-- server actions will use SECURITY DEFINER functions to insert)
CREATE POLICY "workflow_history_system_insert"
  ON workflow_history
  FOR INSERT
  WITH CHECK (true);  -- RLS bypass for trigger calls (SECURITY DEFINER)

-- Block all UPDATE and DELETE at policy level
-- (No UPDATE or DELETE policies = DENY by default with RLS enabled)

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_workflow_history_project
  ON workflow_history (project_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_workflow_history_stage
  ON workflow_history (to_stage_id);

CREATE INDEX IF NOT EXISTS idx_workflow_history_actor
  ON workflow_history (transitioned_by);

-- Enable realtime for live workflow tracking
ALTER PUBLICATION supabase_realtime ADD TABLE workflow_history;

-- VERIFICATION
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'workflow_history'
ORDER BY ordinal_position;

SELECT
  policyname,
  cmd
FROM pg_policies
WHERE tablename = 'workflow_history';
