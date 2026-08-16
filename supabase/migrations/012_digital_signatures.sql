-- ============================================================
-- AURORA Migration: 012_digital_signatures.sql
-- Sprint 2D — Verified Electronic Signature System (Part 2)
--
-- Creates the `digital_signatures` table — the immutable record
-- of each evaluation signing event.
--
-- Rules:
--   - No UPDATE ever (immutable)
--   - No DELETE ever (immutable)
--   - Only one ACTIVE signature per evaluation (partial unique index)
--   - All hashes are stored alongside the hash_algorithm used
--   - Signature image is stored in Supabase Storage only
--
-- Also creates the `certificate_verifications` table for tracking
-- public certificate verification lookups (analytics only).
-- ============================================================

-- PRE-CHECK: Confirm digital_signatures doesn't exist
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' AND table_name = 'digital_signatures';

-- Create digital_signatures table
CREATE TABLE IF NOT EXISTS digital_signatures (
  id                     uuid         DEFAULT gen_random_uuid() PRIMARY KEY,
  evaluation_id          uuid         NOT NULL REFERENCES evaluations(id),
  signature_profile_id   uuid         REFERENCES signature_profiles(id),
  panelist_id            uuid         NOT NULL REFERENCES profiles(id),

  -- Certificate identification
  certificate_serial     text         NOT NULL UNIQUE,

  -- Cryptographic hashes
  payload_hash           text         NOT NULL,    -- SHA-256 of signing_payload JSON
  certificate_hash       text,                     -- SHA-256 of certificate document
  signature_hash         text,                     -- SHA-256 of signature image file
  signed_pdf_hash        text,                     -- SHA-256 of the signed manuscript PDF
  hash_algorithm         text         NOT NULL DEFAULT 'SHA-256',

  -- The complete payload that was hashed (for verification replay)
  signing_payload        jsonb        NOT NULL,

  -- Supabase Storage path to signature image snapshot
  -- Format: "signatures/{year}/{month}/{serial}.png"
  -- NEVER store base64 in this column
  signature_storage_path text,

  -- Signing context
  signed_at              timestamptz  DEFAULT now() NOT NULL,
  ip_address             text,
  user_agent             text,
  device_info            jsonb        DEFAULT '{}'::jsonb,

  -- Signature lifecycle status
  status                 digital_signature_status NOT NULL DEFAULT 'active',
  revoked_at             timestamptz,
  revoked_by             uuid         REFERENCES profiles(id),
  revocation_reason      text,

  created_at             timestamptz  DEFAULT now() NOT NULL
  -- NO updated_at: records are immutable
);

-- Immutability comment
COMMENT ON TABLE digital_signatures IS
  'Immutable digital signature records for evaluation signing events. No UPDATE or DELETE permitted.';

-- Partial unique index: only one ACTIVE signature per evaluation
-- (revoked/superseded signatures are retained for audit trail)
CREATE UNIQUE INDEX IF NOT EXISTS idx_digital_signatures_active_evaluation
  ON digital_signatures (evaluation_id)
  WHERE status = 'active';

-- Enable RLS
ALTER TABLE digital_signatures ENABLE ROW LEVEL SECURITY;

-- Panelist can read their own signatures
CREATE POLICY "digital_signatures_own_read"
  ON digital_signatures FOR SELECT
  USING (panelist_id = auth.uid());

-- Project participants can read signatures for evaluations on their project
CREATE POLICY "digital_signatures_participant_read"
  ON digital_signatures FOR SELECT
  USING (
    is_project_participant(
      (SELECT project_id FROM evaluations WHERE id = digital_signatures.evaluation_id)
    )
  );

-- Coordinators, sys_admin, college_dean: full read access
CREATE POLICY "digital_signatures_staff_read"
  ON digital_signatures FOR SELECT
  USING (
    has_role('coordinator')
    OR has_role('sys_admin')
    OR has_role('college_dean')
  );

-- INSERT: only the panelist themselves can create their signature record
CREATE POLICY "digital_signatures_panelist_insert"
  ON digital_signatures FOR INSERT
  WITH CHECK (panelist_id = auth.uid());

-- No UPDATE or DELETE policies = implicitly DENIED for all users

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_digital_signatures_evaluation
  ON digital_signatures (evaluation_id);

CREATE INDEX IF NOT EXISTS idx_digital_signatures_serial
  ON digital_signatures (certificate_serial);

CREATE INDEX IF NOT EXISTS idx_digital_signatures_panelist
  ON digital_signatures (panelist_id);

CREATE INDEX IF NOT EXISTS idx_digital_signatures_signed_at
  ON digital_signatures (signed_at DESC);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE digital_signatures;

-- ============================================================
-- Create certificate_verifications table (analytics/logging only)
-- ============================================================
CREATE TABLE IF NOT EXISTS certificate_verifications (
  id               uuid         DEFAULT gen_random_uuid() PRIMARY KEY,
  serial           text         NOT NULL,
  verified_at      timestamptz  DEFAULT now() NOT NULL,
  ip_address       text,
  country          text,
  browser          text,
  device           text,
  purpose          text         DEFAULT 'web_verification',
  is_valid         boolean      NOT NULL,
  hash_matched     boolean      NOT NULL
);

ALTER TABLE certificate_verifications ENABLE ROW LEVEL SECURITY;

-- Only coordinators/admins can read verification logs
CREATE POLICY "certificate_verifications_staff_read"
  ON certificate_verifications FOR SELECT
  USING (has_role('coordinator') OR has_role('sys_admin') OR has_role('college_dean'));

-- Public INSERT (verification page is unauthenticated)
CREATE POLICY "certificate_verifications_public_insert"
  ON certificate_verifications FOR INSERT
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_cert_verif_serial ON certificate_verifications (serial);
CREATE INDEX IF NOT EXISTS idx_cert_verif_date ON certificate_verifications (verified_at DESC);

-- VERIFICATION
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name IN ('digital_signatures', 'certificate_verifications')
ORDER BY table_name, ordinal_position;
