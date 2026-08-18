require("dotenv").config({ path: ".env.local" });
const { Client } = require("pg");

async function fixStatusTransitionFunction() {
  const client = new Client({
    host: "aws-1-ap-southeast-2.pooler.supabase.com",
    user: "postgres.faxzubfvjsekizeiiocg",
    password: process.env.SUPABASE_DB_PASSWORD || "tF3cfdc3FQ7fWEdB",
    database: "postgres",
    port: 6543,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();
  console.log("Connected to PostgreSQL for status transition fix...");

  const sql = `
    CREATE OR REPLACE FUNCTION validate_project_status_transition()
    RETURNS TRIGGER
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public, extensions
    AS $$
    DECLARE
      v_caller_is_admin BOOLEAN := FALSE;
    BEGIN
      -- 1. Bypass check if status hasn't changed
      IF OLD.status = NEW.status THEN
        RETURN NEW;
      END IF;

      -- 2. Check if the active caller is a System Administrator
      SELECT EXISTS (
        SELECT 1 
        FROM public.user_roles ur
        JOIN public.roles r ON r.id = ur.role_id
        WHERE ur.profile_id = auth.uid() AND r.code = 'sys_admin'
      ) INTO v_caller_is_admin;

      -- Administrators have override privileges to correct state loops
      IF v_caller_is_admin THEN
        RETURN NEW;
      END IF;

      -- 3. Enforce state transitions checklist path rules (using valid enum values)
      IF OLD.status = 'draft' AND NEW.status NOT IN ('submitted', 'archived') THEN
        RAISE EXCEPTION 'Workflow Transition Error: Draft projects can only move to Submitted status.';
      END IF;

      IF OLD.status = 'submitted' AND NEW.status NOT IN ('under_review', 'scheduled', 'archived') THEN
        RAISE EXCEPTION 'Workflow Transition Error: Submitted papers can only move to Under Review or Scheduled.';
      END IF;

      IF OLD.status = 'under_review' AND NEW.status NOT IN ('revision_required', 'scheduled', 'submitted', 'archived') THEN
        RAISE EXCEPTION 'Workflow Transition Error: Under Review papers can only move to Revision Required or Scheduled.';
      END IF;

      IF OLD.status = 'scheduled' AND NEW.status NOT IN ('in_progress', 'archived') THEN
        RAISE EXCEPTION 'Workflow Transition Error: Scheduled defenses can only transition to In Progress.';
      END IF;

      IF OLD.status = 'in_progress' AND NEW.status NOT IN ('revision_required', 'passed', 'passed_minor', 'passed_major', 'conditional', 'failed') THEN
        RAISE EXCEPTION 'Workflow Transition Error: In Progress evaluations must resolve to Passed/Failed/Revision.';
      END IF;

      IF OLD.status = 'revision_required' AND NEW.status NOT IN ('submitted', 'passed', 'passed_minor', 'passed_major') THEN
        RAISE EXCEPTION 'Workflow Transition Error: Revisions required must resubmit or pass panel review.';
      END IF;

      IF OLD.status IN ('passed', 'passed_minor', 'passed_major', 'conditional', 'failed') AND NEW.status NOT IN ('archived') THEN
        RAISE EXCEPTION 'Workflow Transition Error: Completed verdicts can only transition to Archived state.';
      END IF;

      RETURN NEW;
    END;
    $$;
  `;

  await client.query(sql);
  console.log("validate_project_status_transition successfully updated.");
  await client.end();
}

fixStatusTransitionFunction();
