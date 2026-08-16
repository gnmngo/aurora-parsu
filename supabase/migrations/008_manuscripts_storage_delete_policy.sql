-- ============================================================
-- AURORA Migration: 008_manuscripts_storage_delete_policy.sql
-- Sprint 2B — BUG-H1
--
-- Problem: The `manuscripts` Supabase Storage bucket has no DELETE
-- policy. When a document version is replaced or a project is
-- abandoned, the old PDF file cannot be deleted from storage —
-- creating storage orphans that accumulate over time and waste
-- storage quota.
--
-- Fix: Add a storage DELETE policy that allows:
--   - The file uploader (project participant) to delete their own files
--   - Coordinators and sys_admins to delete any manuscript
--
-- NOTE: Supabase Storage bucket policies are managed through the
-- Supabase Dashboard or via the Management API. This script
-- documents the required policy configuration.
--
-- For Supabase SQL Editor execution, use storage.policies table.
-- ============================================================

-- PRE-CHECK: List current storage policies for manuscripts bucket
SELECT
  id,
  name,
  definition
FROM storage.policies
WHERE bucket_id = 'manuscripts';

-- MIGRATION: Add DELETE policy for manuscripts bucket

-- Policy 1: Uploader (project participant) can delete their own uploaded files
-- The path structure is: {project_id}/{stage_id}/{filename}
-- We identify ownership by checking if the user is a project participant
-- using the project_id embedded in the storage path.
INSERT INTO storage.policies (id, name, bucket_id, definition)
VALUES (
  gen_random_uuid(),
  'manuscripts_delete_participant',
  'manuscripts',
  'owner = auth.uid() OR (
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.profile_id = auth.uid()
        AND pm.project_id::text = (storage.foldername(name))[1]
    )
  )'
)
ON CONFLICT DO NOTHING;

-- Policy 2: Coordinators and system admins can delete any manuscript
INSERT INTO storage.policies (id, name, bucket_id, definition)
VALUES (
  gen_random_uuid(),
  'manuscripts_delete_admin',
  'manuscripts',
  '(
    SELECT has_role(''coordinator'') OR has_role(''sys_admin'')
  )'
)
ON CONFLICT DO NOTHING;

-- VERIFICATION
SELECT
  id,
  name,
  definition
FROM storage.policies
WHERE bucket_id = 'manuscripts'
ORDER BY name;
