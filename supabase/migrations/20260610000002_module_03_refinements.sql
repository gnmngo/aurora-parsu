-- ============================================================
-- AURORA Module 03: Flagship Workspace & Analytics Refinements
-- ============================================================

-- 1. Extend annotation_status enum for closed-loop revision workflow
ALTER TYPE annotation_status ADD VALUE IF NOT EXISTS 'in_progress';
ALTER TYPE annotation_status ADD VALUE IF NOT EXISTS 'addressed';
ALTER TYPE annotation_status ADD VALUE IF NOT EXISTS 'verified';

-- 2. Extend document_versions for manuscript comparison
ALTER TABLE document_versions ADD COLUMN IF NOT EXISTS change_summary TEXT DEFAULT 'Initial upload';

-- 3. Extend audit_logs for deep project and stage routing
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE CASCADE;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS stage_id UUID REFERENCES defense_stages(id) ON DELETE CASCADE;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS session_id TEXT;

-- 4. Create performance indexes for database optimizations
CREATE INDEX IF NOT EXISTS idx_audit_logs_project_stage ON audit_logs(project_id, stage_id);
CREATE INDEX IF NOT EXISTS idx_annotations_status_doc ON annotations(document_version_id, status);
CREATE INDEX IF NOT EXISTS idx_evaluations_project_stage ON evaluations(project_id, stage_id);
CREATE INDEX IF NOT EXISTS idx_document_versions_document_uploaded ON document_versions(document_id, uploaded_by);

-- 5. Panel Consensus Engine View
-- Computes highest score, lowest score, average score, difference, consensus level, and alerts
CREATE OR REPLACE VIEW panel_consensus_summary AS
SELECT 
  project_id,
  stage_id,
  max(total_score) as highest_score,
  min(total_score) as lowest_score,
  avg(total_score) as average_score,
  (max(total_score) - min(total_score)) as score_difference,
  CASE 
    WHEN (max(total_score) - min(total_score)) <= 5.00 THEN 'High'
    WHEN (max(total_score) - min(total_score)) <= 15.00 THEN 'Moderate'
    ELSE 'Low'
  END as consensus_level,
  CASE
    WHEN (max(total_score) - min(total_score)) > 15.00 THEN TRUE
    ELSE FALSE
  END as discrepancy_alert
FROM public.evaluations
WHERE status = 'submitted'
GROUP BY project_id, stage_id;

-- 6. Revision Compliance Metrics View
-- Generates statistics for resolved vs unresolved annotative comments
CREATE OR REPLACE VIEW revision_compliance_metrics AS
SELECT 
  p.id as project_id,
  p.title as project_title,
  count(a.id) as total_comments,
  sum(case when a.status = 'addressed' then 1 else 0 end) as addressed_count,
  sum(case when a.status = 'verified' then 1 else 0 end) as verified_count,
  sum(case when a.status = 'in_progress' then 1 else 0 end) as in_progress_count,
  CASE 
    WHEN count(a.id) = 0 THEN 100.00
    ELSE round((sum(case when a.status = 'verified' then 1 else 0 end)::decimal / count(a.id)) * 100, 2)
  END as compliance_rate
FROM public.projects p
LEFT JOIN public.documents d ON d.project_id = p.id
LEFT JOIN public.document_versions dv ON dv.document_id = d.id
LEFT JOIN public.annotations a ON a.document_version_id = dv.id
GROUP BY p.id, p.title;

-- 7. Defense Readiness Status Scoring View
-- Dynamically calculates readiness (Ready, Almost Ready, Needs Revision, Not Ready)
CREATE OR REPLACE VIEW project_readiness_status AS
WITH stats AS (
  SELECT 
    p.id as project_id,
    COALESCE(rc.compliance_rate, 100.00) as compliance_rate,
    COALESCE(avg(e.total_score), 0.00) as avg_rubric_score,
    COUNT(a.id) FILTER (WHERE a.status != 'verified' AND a.severity IN ('major', 'critical')) as major_unresolved_comments
  FROM public.projects p
  LEFT JOIN public.evaluations e ON e.project_id = p.id AND e.status = 'submitted'
  LEFT JOIN revision_compliance_metrics rc ON rc.project_id = p.id
  LEFT JOIN public.documents d ON d.project_id = p.id
  LEFT JOIN public.document_versions dv ON dv.document_id = d.id
  LEFT JOIN public.annotations a ON a.document_version_id = dv.id
  GROUP BY p.id, rc.compliance_rate
)
SELECT 
  project_id,
  compliance_rate,
  avg_rubric_score,
  major_unresolved_comments,
  CASE
    WHEN compliance_rate >= 90.00 AND avg_rubric_score >= 85.00 AND major_unresolved_comments = 0 THEN 'Ready'
    WHEN compliance_rate >= 70.00 AND avg_rubric_score >= 75.00 AND major_unresolved_comments <= 2 THEN 'Almost Ready'
    WHEN compliance_rate < 70.00 OR major_unresolved_comments > 2 THEN 'Needs Revision'
    ELSE 'Not Ready'
  END as readiness_level
FROM stats;
