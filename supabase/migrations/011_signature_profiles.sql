-- ============================================================
-- AURORA Migration: 011_signature_profiles.sql
-- Sprint 2D — Verified Electronic Signature System (Part 1)
--
-- Creates the `signature_profiles` table for persistent panelist
-- signature registration. Each panelist registers their official
-- signature ONCE, which is then referenced every time they sign
-- an evaluation.
--
-- Storage: Signature images are stored in Supabase Storage
-- (bucket: `signatures`). Only the storage path is persisted here.
-- Base64 images are NEVER stored in PostgreSQL columns.
--
-- hash_algorithm: Configurable — default SHA-256. Never hardcoded
-- in application logic.
-- ============================================================

-- PRE-CHECK
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' AND table_name = 'signature_profiles';

-- Create `digital_signature_status` enum (shared by digital_signatures)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'digital_signature_status'
  ) THEN
    CREATE TYPE digital_signature_status AS ENUM ('active', 'revoked', 'superseded');
  END IF;
END$$;

-- Create signature_profiles table
CREATE TABLE IF NOT EXISTS signature_profiles (
  id                   uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id           uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  full_name            text        NOT NULL,
  academic_rank        text        NOT NULL DEFAULT '',
  department_id        uuid        REFERENCES departments(id),
  employee_number      text,
  official_email       text        NOT NULL,

  -- Supabase Storage path only — e.g., "signatures/2026/08/SIG-PSU-2026-000001.png"
  signature_storage_path text,
  public_signature_id  text        UNIQUE,   -- e.g., "SIG-PSU-2026-000001"

  -- Cryptographic fingerprint of the signature image
  fingerprint_sha256   text,
  hash_algorithm       text        NOT NULL DEFAULT 'SHA-256',

  -- Verification state
  verification_method  text        DEFAULT 'admin_verified'
                                   CHECK (verification_method IN (
                                     'admin_verified', 'email_otp', 'institutional_sso', 'self_declared'
                                   )),
  is_verified          boolean     DEFAULT false,
  verified_at          timestamptz,
  verified_by          uuid        REFERENCES profiles(id),

  created_at           timestamptz DEFAULT now() NOT NULL,
  updated_at           timestamptz DEFAULT now() NOT NULL,

  -- One signature profile per panelist
  CONSTRAINT signature_profiles_profile_unique UNIQUE (profile_id)
);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION tr_signature_profiles_updated()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER tr_signature_profiles_updated
  BEFORE UPDATE ON signature_profiles
  FOR EACH ROW
  EXECUTE FUNCTION tr_signature_profiles_updated();

-- Enable RLS
ALTER TABLE signature_profiles ENABLE ROW LEVEL SECURITY;

-- Own profile: panelist can view and update their own signature profile
CREATE POLICY "signature_profiles_own_select"
  ON signature_profiles FOR SELECT
  USING (profile_id = auth.uid());

CREATE POLICY "signature_profiles_own_insert"
  ON signature_profiles FOR INSERT
  WITH CHECK (profile_id = auth.uid());

CREATE POLICY "signature_profiles_own_update"
  ON signature_profiles FOR UPDATE
  USING (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());

-- Coordinators and admins: full access (for verification workflow)
CREATE POLICY "signature_profiles_coordinator_access"
  ON signature_profiles FOR ALL
  USING (has_role('coordinator') OR has_role('sys_admin'));

-- College Dean and project participants can read signatures on evaluations they can see
CREATE POLICY "signature_profiles_read_for_evaluation"
  ON signature_profiles FOR SELECT
  USING (
    has_role('college_dean')
    OR EXISTS (
      SELECT 1 FROM evaluations e
      WHERE e.panelist_id = signature_profiles.profile_id
        AND is_project_participant(e.project_id)
    )
  );

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_signature_profiles_profile ON signature_profiles (profile_id);
CREATE INDEX IF NOT EXISTS idx_signature_profiles_public_id ON signature_profiles (public_signature_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE signature_profiles;

-- VERIFICATION
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'signature_profiles' ORDER BY ordinal_position;
