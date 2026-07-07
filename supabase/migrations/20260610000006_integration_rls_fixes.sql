-- ============================================================
-- AURORA Integration Fix: RLS policies for end-to-end UI flows
-- Does NOT change schema — only unblocks INSERT/SELECT paths
-- ============================================================

-- Reference data readable by all authenticated users
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.defense_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.colleges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS departments_select_auth ON public.departments;
CREATE POLICY departments_select_auth ON public.departments
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS defense_stages_select_auth ON public.defense_stages;
CREATE POLICY defense_stages_select_auth ON public.defense_stages
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS colleges_select_auth ON public.colleges;
CREATE POLICY colleges_select_auth ON public.colleges
  FOR SELECT TO authenticated USING (true);

-- Students list for project creation dropdown
DROP POLICY IF EXISTS students_select_staff ON public.students;
CREATE POLICY students_select_staff ON public.students
  FOR SELECT TO authenticated
  USING (
    profile_id = auth.uid()
    OR has_role('dept_coordinator')
    OR has_role('college_coordinator')
    OR has_role('sys_admin')
    OR has_role('research_coordinator')
    OR has_role('research_adviser')
    OR has_role('panel_chair')
    OR has_role('panel_member')
  );

-- Staff can read profiles for dropdowns (student names)
DROP POLICY IF EXISTS profiles_select_staff ON public.profiles;
CREATE POLICY profiles_select_staff ON public.profiles
  FOR SELECT TO authenticated
  USING (
    id = auth.uid()
    OR has_role('dept_coordinator')
    OR has_role('college_coordinator')
    OR has_role('sys_admin')
    OR has_role('research_coordinator')
    OR has_role('research_adviser')
    OR has_role('panel_chair')
    OR has_role('panel_member')
  );

-- Project creation by coordinators/admins
DROP POLICY IF EXISTS projects_insert ON public.projects;
CREATE POLICY projects_insert ON public.projects
  FOR INSERT TO authenticated
  WITH CHECK (
    has_role('dept_coordinator')
    OR has_role('college_coordinator')
    OR has_role('sys_admin')
    OR has_role('research_coordinator')
  );

DROP POLICY IF EXISTS projects_update ON public.projects;
CREATE POLICY projects_update ON public.projects
  FOR UPDATE TO authenticated
  USING (
    has_role('dept_coordinator')
    OR has_role('college_coordinator')
    OR has_role('sys_admin')
  );

-- Documents: coordinators can upload for any project
DROP POLICY IF EXISTS documents_insert ON public.documents;
CREATE POLICY documents_insert ON public.documents
  FOR INSERT TO authenticated
  WITH CHECK (
    is_project_participant(project_id)
    OR has_role('dept_coordinator')
    OR has_role('college_coordinator')
    OR has_role('sys_admin')
    OR has_role('research_coordinator')
  );

DROP POLICY IF EXISTS documents_update ON public.documents;
CREATE POLICY documents_update ON public.documents
  FOR UPDATE TO authenticated
  USING (
    is_project_participant(project_id)
    OR has_role('dept_coordinator')
    OR has_role('college_coordinator')
    OR has_role('sys_admin')
  );

-- Document versions insert/update
DROP POLICY IF EXISTS document_versions_insert ON public.document_versions;
CREATE POLICY document_versions_insert ON public.document_versions
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.documents d
      WHERE d.id = document_versions.document_id
        AND (
          is_project_participant(d.project_id)
          OR has_role('dept_coordinator')
          OR has_role('college_coordinator')
          OR has_role('sys_admin')
          OR has_role('research_coordinator')
        )
    )
  );

DROP POLICY IF EXISTS document_versions_update ON public.document_versions;
CREATE POLICY document_versions_update ON public.document_versions
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.documents d
      WHERE d.id = document_versions.document_id
        AND (
          is_project_participant(d.project_id)
          OR has_role('dept_coordinator')
          OR has_role('college_coordinator')
          OR has_role('sys_admin')
        )
    )
  );

-- Upload history
ALTER TABLE public.document_upload_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS document_upload_history_insert ON public.document_upload_history;
CREATE POLICY document_upload_history_insert ON public.document_upload_history
  FOR INSERT TO authenticated
  WITH CHECK (performed_by = auth.uid());

DROP POLICY IF EXISTS document_upload_history_select ON public.document_upload_history;
CREATE POLICY document_upload_history_select ON public.document_upload_history
  FOR SELECT TO authenticated
  USING (true);

-- Rubric creation: expand roles for coordinators
DROP POLICY IF EXISTS rubric_templates_insert ON public.rubric_templates;
CREATE POLICY rubric_templates_insert ON public.rubric_templates
  FOR INSERT TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND (
      has_role('panel_member')
      OR has_role('panel_chair')
      OR has_role('research_adviser')
      OR has_role('dept_coordinator')
      OR has_role('college_coordinator')
      OR has_role('research_coordinator')
      OR has_role('sys_admin')
    )
  );

-- Coordinators can see all projects for management UI
DROP POLICY IF EXISTS projects_select ON public.projects;
CREATE POLICY projects_select ON public.projects
  FOR SELECT TO authenticated
  USING (
    is_project_participant(id)
    OR has_role('dept_coordinator')
    OR has_role('college_coordinator')
    OR has_role('research_coordinator')
    OR has_role('sys_admin')
  );

-- Project members (link student on project creation)
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS project_members_select ON public.project_members;
CREATE POLICY project_members_select ON public.project_members
  FOR SELECT TO authenticated
  USING (
    profile_id = auth.uid()
    OR is_project_participant(project_id)
    OR has_role('dept_coordinator')
    OR has_role('college_coordinator')
    OR has_role('sys_admin')
  );

DROP POLICY IF EXISTS project_members_insert ON public.project_members;
CREATE POLICY project_members_insert ON public.project_members
  FOR INSERT TO authenticated
  WITH CHECK (
    has_role('dept_coordinator')
    OR has_role('college_coordinator')
    OR has_role('sys_admin')
    OR has_role('research_coordinator')
  );

-- Annotation update/delete for reviewers
DROP POLICY IF EXISTS annotations_update ON public.annotations;
CREATE POLICY annotations_update ON public.annotations
  FOR UPDATE TO authenticated
  USING (
    created_by = auth.uid()
    OR NOT has_role('student')
  );

DROP POLICY IF EXISTS annotations_delete ON public.annotations;
CREATE POLICY annotations_delete ON public.annotations
  FOR DELETE TO authenticated
  USING (
    created_by = auth.uid()
    OR has_role('dept_coordinator')
    OR has_role('college_coordinator')
    OR has_role('sys_admin')
  );
