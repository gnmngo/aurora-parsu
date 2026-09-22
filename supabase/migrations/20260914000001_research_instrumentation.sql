-- Migration: 20260914000001_research_instrumentation.sql
-- Description: Adds tables for Research Objective 2 (System Performance & Architectural Telemetry)
--              and Research Objective 3 (ISO/IEC 25010 Software Quality Evaluation & Operational Metrics).

-- 1. System Telemetry & Performance Logs (RO2)
CREATE TABLE IF NOT EXISTS system_telemetry_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_type VARCHAR(100) NOT NULL,
    duration_ms NUMERIC(10, 2) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'success',
    payload_size_bytes INTEGER,
    route VARCHAR(255),
    client_ip VARCHAR(100),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_telemetry_type_created 
    ON system_telemetry_logs(transaction_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_telemetry_status 
    ON system_telemetry_logs(status);

-- Enable RLS
ALTER TABLE system_telemetry_logs ENABLE ROW LEVEL SECURITY;

-- Telemetry Policies:
-- Any authenticated user can insert telemetry measurements
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'system_telemetry_logs' AND policyname = 'telemetry_insert_authenticated'
    ) THEN
        CREATE POLICY "telemetry_insert_authenticated"
            ON system_telemetry_logs
            FOR INSERT
            TO authenticated
            WITH CHECK (true);
    END IF;
END $$;

-- Admins, Coordinators, and Deans can view all telemetry logs
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'system_telemetry_logs' AND policyname = 'telemetry_select_admin'
    ) THEN
        CREATE POLICY "telemetry_select_admin"
            ON system_telemetry_logs
            FOR SELECT
            TO authenticated
            USING (
                EXISTS (
                    SELECT 1 FROM user_roles ur
                    JOIN roles r ON ur.role_id = r.id
                    WHERE ur.profile_id = auth.uid()
                    AND r.code IN ('sys_admin', 'coordinator', 'college_dean')
                )
            );
    END IF;
END $$;

-- 2. ISO/IEC 25010 Software Quality Evaluations (RO3)
CREATE TABLE IF NOT EXISTS iso_evaluations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    respondent_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    respondent_role VARCHAR(50) NOT NULL,
    college_id UUID REFERENCES colleges(id) ON DELETE SET NULL,
    ratings JSONB NOT NULL,
    overall_score NUMERIC(4, 2),
    comments TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_iso_evaluation_respondent UNIQUE (respondent_id)
);

CREATE INDEX IF NOT EXISTS idx_iso_evaluations_role 
    ON iso_evaluations(respondent_role);

CREATE INDEX IF NOT EXISTS idx_iso_evaluations_created 
    ON iso_evaluations(created_at DESC);

-- Enable RLS
ALTER TABLE iso_evaluations ENABLE ROW LEVEL SECURITY;

-- Users can view their own evaluation, while admins/coordinators/deans can view all evaluations
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'iso_evaluations' AND policyname = 'iso_evaluations_select'
    ) THEN
        CREATE POLICY "iso_evaluations_select"
            ON iso_evaluations
            FOR SELECT
            TO authenticated
            USING (
                respondent_id = auth.uid() OR
                EXISTS (
                    SELECT 1 FROM user_roles ur
                    JOIN roles r ON ur.role_id = r.id
                    WHERE ur.profile_id = auth.uid()
                    AND r.code IN ('sys_admin', 'coordinator', 'college_dean')
                )
            );
    END IF;
END $$;

-- Users can insert their own evaluation
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'iso_evaluations' AND policyname = 'iso_evaluations_insert'
    ) THEN
        CREATE POLICY "iso_evaluations_insert"
            ON iso_evaluations
            FOR INSERT
            TO authenticated
            WITH CHECK (respondent_id = auth.uid());
    END IF;
END $$;

-- Users can update their own evaluation
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'iso_evaluations' AND policyname = 'iso_evaluations_update'
    ) THEN
        CREATE POLICY "iso_evaluations_update"
            ON iso_evaluations
            FOR UPDATE
            TO authenticated
            USING (respondent_id = auth.uid())
            WITH CHECK (respondent_id = auth.uid());
    END IF;
END $$;

-- Grants
GRANT SELECT, INSERT ON system_telemetry_logs TO authenticated, anon;
GRANT SELECT, INSERT, UPDATE ON iso_evaluations TO authenticated;
GRANT ALL ON system_telemetry_logs TO service_role;
GRANT ALL ON iso_evaluations TO service_role;
