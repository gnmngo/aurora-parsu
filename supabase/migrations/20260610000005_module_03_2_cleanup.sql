-- ============================================================
-- AURORA Module 03.2: Real-data cleanup & rubric-driven views
-- ============================================================

-- 1. file_url on document_versions (signed/public URL cache)
ALTER TABLE public.document_versions
  ADD COLUMN IF NOT EXISTS file_url TEXT;

-- 2. RLS for rubric_templates
ALTER TABLE public.rubric_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY rubric_templates_select ON public.rubric_templates
  FOR SELECT USING (
    is_project_participant(project_id)
    OR has_role('dept_coordinator')
    OR has_role('college_coordinator')
    OR has_role('sys_admin')
  );

CREATE POLICY rubric_templates_insert ON public.rubric_templates
  FOR INSERT WITH CHECK (
    created_by = auth.uid()
    AND (
      has_role('panel_member')
      OR has_role('panel_chair')
      OR has_role('research_adviser')
      OR has_role('dept_coordinator')
      OR has_role('college_coordinator')
      OR has_role('sys_admin')
    )
  );

CREATE POLICY rubric_templates_update ON public.rubric_templates
  FOR UPDATE USING (
    has_role('dept_coordinator')
    OR has_role('college_coordinator')
    OR has_role('sys_admin')
  );

-- 3. RLS for evaluation_events (insert by participants, read by coordinators+)
ALTER TABLE public.evaluation_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY evaluation_events_insert ON public.evaluation_events
  FOR INSERT WITH CHECK (
    is_project_participant(project_id)
    OR has_role('dept_coordinator')
    OR has_role('sys_admin')
  );

CREATE POLICY evaluation_events_select ON public.evaluation_events
  FOR SELECT USING (
    is_project_participant(project_id)
    OR has_role('dept_coordinator')
    OR has_role('college_coordinator')
    OR has_role('sys_admin')
  );

-- 4. RLS for project_score_cache
ALTER TABLE public.project_score_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY project_score_cache_select ON public.project_score_cache
  FOR SELECT USING (
    is_project_participant(project_id)
    OR has_role('dept_coordinator')
    OR has_role('college_coordinator')
    OR has_role('sys_admin')
  );

-- 5. Rewrite project_readiness_status to use rubric_templates thresholds
CREATE OR REPLACE VIEW public.project_readiness_status AS
WITH stats AS (
  SELECT
    p.id AS project_id,
    COALESCE(rc.compliance_rate, 100.00) AS compliance_rate,
    COALESCE(AVG(e.total_score), 0.00) AS avg_rubric_score,
    COUNT(a.id) FILTER (
      WHERE a.status != 'verified' AND a.severity IN ('major', 'critical')
    ) AS major_unresolved_comments
  FROM public.projects p
  LEFT JOIN public.evaluations e ON e.project_id = p.id AND e.status = 'submitted'
  LEFT JOIN public.revision_compliance_metrics rc ON rc.project_id = p.id
  LEFT JOIN public.documents d ON d.project_id = p.id
  LEFT JOIN public.document_versions dv ON dv.document_id = d.id
  LEFT JOIN public.annotations a ON a.document_version_id = dv.id
  GROUP BY p.id, rc.compliance_rate
),
thresholds AS (
  SELECT DISTINCT ON (project_id)
    project_id,
    COALESCE(passing_score, 75.00) AS passing_score,
    COALESCE(excellent_score, 85.00) AS excellent_score,
    COALESCE(target_compliance_rate, 90.00) AS target_compliance_rate,
    COALESCE(min_compliance_rate, 70.00) AS min_compliance_rate,
    COALESCE(max_major_unresolved, 2) AS max_major_unresolved
  FROM public.rubric_templates
  ORDER BY project_id, created_at DESC
)
SELECT
  s.project_id,
  s.compliance_rate,
  s.avg_rubric_score,
  s.major_unresolved_comments,
  CASE
    WHEN s.compliance_rate >= COALESCE(t.target_compliance_rate, 90.00)
      AND s.avg_rubric_score >= COALESCE(t.excellent_score, 85.00)
      AND s.major_unresolved_comments = 0 THEN 'Ready'
    WHEN s.compliance_rate >= COALESCE(t.min_compliance_rate, 70.00)
      AND s.avg_rubric_score >= COALESCE(t.passing_score, 75.00)
      AND s.major_unresolved_comments <= COALESCE(t.max_major_unresolved, 2) THEN 'Almost Ready'
    WHEN s.compliance_rate < COALESCE(t.min_compliance_rate, 70.00)
      OR s.major_unresolved_comments > COALESCE(t.max_major_unresolved, 2) THEN 'Needs Revision'
    ELSE 'Not Ready'
  END AS readiness_level
FROM stats s
LEFT JOIN thresholds t ON t.project_id = s.project_id;
