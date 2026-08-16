-- ============================================================
-- AURORA Migration: 004_notification_index.sql
-- Sprint 2B — BUG-L4
--
-- Problem: The `notifications` table is missing a composite index
-- on (profile_id, created_at DESC). Every notification page load
-- performs a sequential scan filtered by profile_id, which is O(n)
-- over all notification rows — extremely slow at scale.
--
-- Fix: Create a composite index. Also add a partial index for
-- unread notifications (most common query pattern).
-- ============================================================

-- PRE-CHECK: Check existing indexes on notifications
SELECT
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'notifications'
ORDER BY indexname;

-- MIGRATION: Primary composite index for profile-scoped queries
CREATE INDEX IF NOT EXISTS idx_notifications_profile_created
  ON notifications (profile_id, created_at DESC);

-- Partial index for unread-only queries (most frequent access pattern)
CREATE INDEX IF NOT EXISTS idx_notifications_profile_unread
  ON notifications (profile_id, created_at DESC)
  WHERE is_read = false;

-- VERIFICATION
SELECT
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'notifications'
ORDER BY indexname;

-- Expected: at least 2 new indexes appear
