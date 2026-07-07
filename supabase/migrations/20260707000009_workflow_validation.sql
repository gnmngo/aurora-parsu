-- ============================================================
-- AURORA Module 4.3: Secure Workflow Transition Validation
-- Partido State University – Goa Campus
-- ============================================================

CREATE OR REPLACE FUNCTION validate_project_status_transition()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

  -- 3. Enforce state transitions checklist path rules
  IF OLD.status = 'draft' AND NEW.status NOT IN ('submitted', 'archived') THEN
    RAISE EXCEPTION 'Workflow Transition Error: Draft projects can only move to Submitted status.';
  END IF;

  IF OLD.status = 'submitted' AND NEW.status NOT IN ('under_review', 'scheduled', 'archived') THEN
    RAISE EXCEPTION 'Workflow Transition Error: Submitted papers can only move to Under Review or Scheduled.';
  END IF;

  IF OLD.status = 'scheduled' AND NEW.status NOT IN ('in_progress', 'cancelled', 'postponed') THEN
    RAISE EXCEPTION 'Workflow Transition Error: Scheduled defenses can only transition to In Progress.';
  END IF;

  IF OLD.status = 'in_progress' AND NEW.status NOT IN ('revision_required', 'passed', 'passed_minor', 'passed_major', 'conditional', 'failed') THEN
    RAISE EXCEPTION 'Workflow Transition Error: In Progress evaluations must resolve to Passed/Failed/Revision.';
  END IF;

  IF OLD.status = 'revision_required' AND NEW.status NOT IN ('submitted', 'passed', 'passed_minor', 'passed_major') THEN
    RAISE EXCEPTION 'Workflow Transition Error: Revisions required must resubmit or pass panel review.';
  END IF;

  IF OLD.status IN ('passed', 'passed_minor', 'passed_major', 'failed') AND NEW.status NOT IN ('archived') THEN
    RAISE EXCEPTION 'Workflow Transition Error: Completed verdicts can only transition to Archived state.';
  END IF;

  RETURN NEW;
END;
$$;

-- Create BEFORE UPDATE trigger on projects
DROP TRIGGER IF EXISTS tr_validate_project_status ON public.projects;
CREATE TRIGGER tr_validate_project_status
  BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION validate_project_status_transition();
