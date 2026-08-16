-- ============================================================
-- AURORA Migration: 003_certificate_serial_sequence.sql
-- Sprint 2B — BUG-M5
--
-- Problem: `certificate_serial` on `evaluations` is computed
-- client-side (timestamp-based) causing race conditions when
-- multiple panelists sign at the same millisecond. Serials may
-- collide or be non-sequential.
--
-- Fix: Create a PostgreSQL sequence for serials. Serials will be
-- generated as: AURORA-YYYY-NNNNNN (e.g., AURORA-2026-000001)
-- The sequence is global and monotonically increasing.
-- ============================================================

-- PRE-CHECK: Confirm sequence does not already exist
SELECT
  sequencename,
  start_value,
  last_value
FROM pg_sequences
WHERE sequencename = 'evaluation_serial_seq';

-- MIGRATION: Create the serial sequence
CREATE SEQUENCE IF NOT EXISTS evaluation_serial_seq
  START 1
  INCREMENT 1
  MINVALUE 1
  NO MAXVALUE
  CACHE 1;

-- Create a helper function to generate formatted serial numbers
CREATE OR REPLACE FUNCTION generate_certificate_serial()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  seq_val bigint;
  year_part text;
BEGIN
  seq_val := nextval('evaluation_serial_seq');
  year_part := extract(year FROM now())::text;
  RETURN 'AURORA-' || year_part || '-' || lpad(seq_val::text, 6, '0');
END;
$$;

-- VERIFICATION
SELECT generate_certificate_serial() AS sample_serial;
SELECT generate_certificate_serial() AS sample_serial_2;
-- Expected: AURORA-2026-000001, AURORA-2026-000002
