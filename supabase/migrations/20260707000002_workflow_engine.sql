-- ============================================================
-- AURORA Module 1: Academic Workflow Engine State Machine
-- Partido State University – Goa Campus
-- ============================================================

-- Trigger function to handle project workflow state transitions automatically
CREATE OR REPLACE FUNCTION handle_project_workflow_transition()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_project_id UUID;
  v_current_status project_status;
  v_new_status project_status;
  v_total_panelists INT;
  v_submitted_evals INT;
  v_has_failed_verdict BOOLEAN := FALSE;
  v_unresolved_major INT := 0;
  v_eval_row RECORD;
BEGIN
  -- 1. Identify project ID from trigger source table
  IF TG_TABLE_NAME = 'document_versions' THEN
    SELECT project_id INTO v_project_id 
    FROM public.documents 
    WHERE id = NEW.document_id;
  ELSIF TG_TABLE_NAME = 'defense_schedules' THEN
    v_project_id := NEW.project_id;
  ELSIF TG_TABLE_NAME = 'evaluations' THEN
    v_project_id := NEW.project_id;
  ELSIF TG_TABLE_NAME = 'annotations' THEN
    SELECT d.project_id INTO v_project_id
    FROM public.documents d
    JOIN public.document_versions dv ON dv.document_id = d.id
    WHERE dv.id = NEW.document_version_id
    LIMIT 1;
  END IF;

  IF v_project_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Get current project status
  SELECT status INTO v_current_status 
  FROM public.projects 
  WHERE id = v_project_id;

  v_new_status := v_current_status;

  -- 2. State Machine Rules
  -- A. Student manuscript upload event
  IF TG_TABLE_NAME = 'document_versions' AND TG_OP = 'INSERT' THEN
    IF v_current_status = 'draft' THEN
      v_new_status := 'submitted';
    ELSIF v_current_status = 'revision_required' THEN
      v_new_status := 'submitted'; -- Marks student resubmission
    END IF;

  -- B. Coordinator scheduling event
  ELSIF TG_TABLE_NAME = 'defense_schedules' AND TG_OP = 'INSERT' THEN
    IF v_current_status IN ('draft', 'submitted', 'under_review') THEN
      v_new_status := 'scheduled'; -- Defense Scheduled
    END IF;

  -- C. Panelist grade submission event
  ELSIF TG_TABLE_NAME = 'evaluations' AND (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
    IF NEW.status = 'submitted' THEN
      -- If project was just scheduled, mark in_progress (Under Evaluation)
      IF v_current_status = 'scheduled' THEN
        v_new_status := 'in_progress';
      END IF;

      -- Check if all panelists assigned to this stage have submitted
      SELECT COUNT(*) INTO v_total_panelists
      FROM public.defense_panels
      WHERE project_id = NEW.project_id AND stage_id = NEW.stage_id;

      SELECT COUNT(*) INTO v_submitted_evals
      FROM public.evaluations
      WHERE project_id = NEW.project_id 
        AND stage_id = NEW.stage_id 
        AND status = 'submitted'
        AND version = NEW.version;

      -- If all evaluations for this version are in, compute verdict status
      IF v_submitted_evals >= COALESCE(v_total_panelists, 1) THEN
        FOR v_eval_row IN 
          SELECT verdict_code FROM public.evaluations
          WHERE project_id = NEW.project_id AND stage_id = NEW.stage_id AND status = 'submitted' AND version = NEW.version
        LOOP
          IF v_eval_row.verdict_code = 'failed' THEN
            v_has_failed_verdict := TRUE;
          END IF;
        END LOOP;

        -- Count unresolved annotations on this project stage
        SELECT COUNT(a.id) INTO v_unresolved_major
        FROM public.documents d
        JOIN public.document_versions dv ON dv.document_id = d.id
        JOIN public.annotations a ON a.document_version_id = dv.id
        WHERE d.project_id = NEW.project_id 
          AND d.stage_id = NEW.stage_id
          AND a.status != 'verified' 
          AND a.severity IN ('major', 'critical');

        -- Transition depending on evaluations & comment severity check
        IF v_has_failed_verdict OR v_unresolved_major > 0 THEN
          v_new_status := 'revision_required';
        ELSE
          v_new_status := 'passed'; -- Approved!
        END IF;
      END IF;
    END IF;

  -- D. Annotation verification event
  ELSIF TG_TABLE_NAME = 'annotations' AND TG_OP = 'UPDATE' THEN
    IF OLD.status != NEW.status AND NEW.status = 'verified' THEN
      -- Recalculate remaining unresolved comments
      SELECT COUNT(a.id) INTO v_unresolved_major
      FROM public.documents d
      JOIN public.document_versions dv ON dv.document_id = d.id
      JOIN public.annotations a ON a.document_version_id = dv.id
      WHERE d.project_id = v_project_id 
        AND a.status != 'verified' 
        AND a.severity IN ('major', 'critical');

      -- If all major items resolved and evaluations are already submitted, move to passed
      IF v_unresolved_major = 0 AND v_current_status = 'revision_required' THEN
        v_new_status := 'passed';
      END IF;
    END IF;
  END IF;

  -- 3. Perform update if status changed
  IF v_new_status != v_current_status THEN
    -- Insert workflow transition history record to track changes
    INSERT INTO public.project_workflow_history (
      project_id,
      from_status,
      to_status,
      reason,
      created_by
    ) VALUES (
      v_project_id,
      v_current_status,
      v_new_status,
      'State machine automatic transition via ' || TG_TABLE_NAME || ' ' || TG_OP,
      auth.uid()
    );

    UPDATE public.projects
    SET status = v_new_status,
        updated_at = NOW()
    WHERE id = v_project_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create Triggers
DROP TRIGGER IF EXISTS tr_workflow_doc_versions ON public.document_versions;
CREATE TRIGGER tr_workflow_doc_versions
  AFTER INSERT ON public.document_versions
  FOR EACH ROW EXECUTE FUNCTION handle_project_workflow_transition();

DROP TRIGGER IF EXISTS tr_workflow_schedules ON public.defense_schedules;
CREATE TRIGGER tr_workflow_schedules
  AFTER INSERT ON public.defense_schedules
  FOR EACH ROW EXECUTE FUNCTION handle_project_workflow_transition();

DROP TRIGGER IF EXISTS tr_workflow_evaluations ON public.evaluations;
CREATE TRIGGER tr_workflow_evaluations
  AFTER INSERT OR UPDATE ON public.evaluations
  FOR EACH ROW EXECUTE FUNCTION handle_project_workflow_transition();

DROP TRIGGER IF EXISTS tr_workflow_annotations ON public.annotations;
CREATE TRIGGER tr_workflow_annotations
  AFTER UPDATE ON public.annotations
  FOR EACH ROW EXECUTE FUNCTION handle_project_workflow_transition();
