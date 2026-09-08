-- ============================================================
-- AURORA Migration: 013_fix_adviser_approval_default.sql
-- Fix premature adviser endorsement status
--
-- Problem: Migration 20260707000008_phase4_hardening.sql added
-- `adviser_approval_status` with `DEFAULT 'approved'`.
-- Newly uploaded manuscripts were automatically marked as approved
-- without adviser review.
--
-- Fix: Set default to 'pending' and reset unreviewed documents.
-- ============================================================

-- 1. Alter column default to 'pending'
ALTER TABLE public.documents 
  ALTER COLUMN adviser_approval_status SET DEFAULT 'pending';

-- 2. Update existing documents that were erroneously marked 'approved' by default
UPDATE public.documents
SET adviser_approval_status = 'pending'
WHERE adviser_approval_status = 'approved' 
  AND approval_remarks IS NULL;
