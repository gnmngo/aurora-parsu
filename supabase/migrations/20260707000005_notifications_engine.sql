-- ============================================================
-- AURORA Module 8: Event-Driven Realtime Notifications Engine
-- Partido State University – Goa Campus
-- ============================================================

CREATE OR REPLACE FUNCTION process_realtime_notifications()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_project_id UUID;
  v_project_title VARCHAR;
  v_stage_id UUID;
  v_student_id UUID;
  v_student_profile_id UUID;
  v_adviser_profile_id UUID;
  v_coord_row RECORD;
  v_panel_row RECORD;
  v_notif_title VARCHAR(200);
  v_notif_msg TEXT;
BEGIN
  -- 1. Identify details based on trigger table
  IF TG_TABLE_NAME = 'document_versions' THEN
    SELECT d.project_id, d.stage_id INTO v_project_id, v_stage_id
    FROM public.documents d
    WHERE d.id = NEW.document_id;
  ELSIF TG_TABLE_NAME = 'defense_schedules' THEN
    v_project_id := NEW.project_id;
    v_stage_id := NEW.stage_id;
  ELSIF TG_TABLE_NAME = 'evaluations' THEN
    v_project_id := NEW.project_id;
    v_stage_id := NEW.stage_id;
  ELSIF TG_TABLE_NAME = 'annotations' THEN
    SELECT d.project_id, d.stage_id INTO v_project_id, v_stage_id
    FROM public.documents d
    JOIN public.document_versions dv ON dv.document_id = d.id
    WHERE dv.id = NEW.document_version_id
    LIMIT 1;
  END IF;

  IF v_project_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Get project title and student profile ID
  SELECT p.title, p.student_id, s.profile_id INTO v_project_title, v_student_id, v_student_profile_id
  FROM public.projects p
  LEFT JOIN public.students s ON s.id = p.student_id
  WHERE p.id = v_project_id;

  -- Get adviser profile ID
  SELECT profile_id INTO v_adviser_profile_id
  FROM public.project_members
  WHERE project_id = v_project_id AND member_role = 'adviser'
  LIMIT 1;

  -- 2. Generate Event-specific Notifications
  -- A. Document upload trigger
  IF TG_TABLE_NAME = 'document_versions' AND TG_OP = 'INSERT' THEN
    v_notif_title := 'Manuscript Uploaded';
    v_notif_msg := 'A new manuscript version was uploaded for project: "' || v_project_title || '".';

    -- Notify Adviser
    IF v_adviser_profile_id IS NOT NULL THEN
      INSERT INTO public.notifications (profile_id, title, message, type, link)
      VALUES (v_adviser_profile_id, v_notif_title, v_notif_msg, 'comment', '/workspace/' || v_project_id || '/' || v_stage_id);
    END IF;

    -- Notify Coordinators
    FOR v_coord_row IN 
      SELECT ur.profile_id FROM public.user_roles ur 
      JOIN public.roles r ON r.id = ur.role_id 
      WHERE r.code = 'coordinator'
    LOOP
      INSERT INTO public.notifications (profile_id, title, message, type, link)
      VALUES (v_coord_row.profile_id, v_notif_title, v_notif_msg, 'system', '/workspace/' || v_project_id || '/' || v_stage_id);
    END LOOP;

    -- Notify Panelists
    FOR v_panel_row IN 
      SELECT profile_id FROM public.defense_panels 
      WHERE project_id = v_project_id AND stage_id = v_stage_id
    LOOP
      INSERT INTO public.notifications (profile_id, title, message, type, link)
      VALUES (v_panel_row.profile_id, v_notif_title, v_notif_msg, 'comment', '/workspace/' || v_project_id || '/' || v_stage_id);
    END LOOP;

  -- B. Defense Schedule Trigger
  ELSIF TG_TABLE_NAME = 'defense_schedules' AND TG_OP = 'INSERT' THEN
    v_notif_title := 'Defense Scheduled';
    v_notif_msg := 'A defense session has been scheduled for project: "' || v_project_title || '" at ' || NEW.room || '.';

    -- Notify Student
    IF v_student_profile_id IS NOT NULL THEN
      INSERT INTO public.notifications (profile_id, title, message, type, link)
      VALUES (v_student_profile_id, v_notif_title, v_notif_msg, 'schedule', '/dashboard/defenses');
    END IF;

    -- Notify Adviser
    IF v_adviser_profile_id IS NOT NULL THEN
      INSERT INTO public.notifications (profile_id, title, message, type, link)
      VALUES (v_adviser_profile_id, v_notif_title, v_notif_msg, 'schedule', '/workspace/' || v_project_id || '/' || v_stage_id);
    END IF;

    -- Notify Panelists
    FOR v_panel_row IN 
      SELECT profile_id FROM public.defense_panels 
      WHERE project_id = v_project_id AND stage_id = v_stage_id
    LOOP
      INSERT INTO public.notifications (profile_id, title, message, type, link)
      VALUES (v_panel_row.profile_id, v_notif_title, v_notif_msg, 'schedule', '/workspace/' || v_project_id || '/' || v_stage_id);
    END LOOP;

  -- C. Evaluation Submitted Trigger
  ELSIF TG_TABLE_NAME = 'evaluations' AND TG_OP = 'UPDATE' THEN
    IF OLD.status = 'draft' AND NEW.status = 'submitted' THEN
      v_notif_title := 'Evaluation Submitted';
      v_notif_msg := 'A panel member has signed off their evaluation for project: "' || v_project_title || '".';

      -- Notify Student
      IF v_student_profile_id IS NOT NULL THEN
        INSERT INTO public.notifications (profile_id, title, message, type, link)
        VALUES (v_student_profile_id, v_notif_title, v_notif_msg, 'grade_released', '/dashboard/grades');
      END IF;

      -- Notify Adviser
      IF v_adviser_profile_id IS NOT NULL THEN
        INSERT INTO public.notifications (profile_id, title, message, type, link)
        VALUES (v_adviser_profile_id, v_notif_title, v_notif_msg, 'grade_released', '/workspace/' || v_project_id || '/' || v_stage_id);
      END IF;

      -- Notify Coordinators
      FOR v_coord_row IN 
        SELECT ur.profile_id FROM public.user_roles ur 
        JOIN public.roles r ON r.id = ur.role_id 
        WHERE r.code = 'coordinator'
      LOOP
        INSERT INTO public.notifications (profile_id, title, message, type, link)
        VALUES (v_coord_row.profile_id, v_notif_title, v_notif_msg, 'system', '/workspace/' || v_project_id || '/' || v_stage_id);
      END LOOP;
    END IF;

  -- D. Revision Verified Trigger
  ELSIF TG_TABLE_NAME = 'annotations' AND TG_OP = 'UPDATE' THEN
    IF OLD.status != NEW.status AND NEW.status = 'verified' THEN
      v_notif_title := 'Revision Verified';
      v_notif_msg := 'A feedback annotation on page ' || NEW.page_number || ' has been verified as addressed for project: "' || v_project_title || '".';

      -- Notify Student
      IF v_student_profile_id IS NOT NULL THEN
        INSERT INTO public.notifications (profile_id, title, message, type, link)
        VALUES (v_student_profile_id, v_notif_title, v_notif_msg, 'revision_requested', '/workspace/' || v_project_id || '/' || v_stage_id);
      END IF;
    END IF;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create triggers
DROP TRIGGER IF EXISTS tr_notification_doc_upload ON public.document_versions;
CREATE TRIGGER tr_notification_doc_upload
  AFTER INSERT ON public.document_versions
  FOR EACH ROW EXECUTE FUNCTION process_realtime_notifications();

DROP TRIGGER IF EXISTS tr_notification_scheduled ON public.defense_schedules;
CREATE TRIGGER tr_notification_scheduled
  AFTER INSERT ON public.defense_schedules
  FOR EACH ROW EXECUTE FUNCTION process_realtime_notifications();

DROP TRIGGER IF EXISTS tr_notification_evaluation ON public.evaluations;
CREATE TRIGGER tr_notification_evaluation
  AFTER UPDATE ON public.evaluations
  FOR EACH ROW EXECUTE FUNCTION process_realtime_notifications();

DROP TRIGGER IF EXISTS tr_notification_annotation ON public.annotations;
CREATE TRIGGER tr_notification_annotation
  AFTER UPDATE ON public.annotations
  FOR EACH ROW EXECUTE FUNCTION process_realtime_notifications();
