-- ============================================================
-- AURORA Module 03: Option B Event-Driven & Scalable Scoring Upgrade
-- ============================================================

-- 1. Create evaluation_events table
CREATE TABLE IF NOT EXISTS public.evaluation_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  stage_id UUID REFERENCES public.defense_stages(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT chk_event_type CHECK (event_type IN (
    'annotation_created',
    'annotation_updated',
    'annotation_verified',
    'evaluation_submitted',
    'document_version_uploaded'
  ))
);

-- 2. Create project_score_cache table
CREATE TABLE IF NOT EXISTS public.project_score_cache (
  project_id UUID PRIMARY KEY REFERENCES public.projects(id) ON DELETE CASCADE,
  stage_id UUID REFERENCES public.defense_stages(id) ON DELETE CASCADE,
  avg_score NUMERIC(5,2),
  compliance_rate NUMERIC(5,2),
  readiness_level TEXT,
  last_updated TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create process_evaluation_event() trigger function
CREATE OR REPLACE FUNCTION process_evaluation_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_stage_id UUID;
  v_avg_score NUMERIC(5,2);
  v_compliance_rate NUMERIC(5,2);
  v_major_unresolved INT;
  v_readiness_level TEXT;
BEGIN
  -- Resolve stage_id if not directly provided
  v_stage_id := NEW.stage_id;
  IF v_stage_id IS NULL THEN
    -- Try to resolve from payload if stage_id is there
    IF NEW.payload ? 'stage_id' THEN
      v_stage_id := (NEW.payload->>'stage_id')::uuid;
    END IF;
  END IF;
  
  -- If still null, try to resolve from documents table if document_version_id is in payload
  IF v_stage_id IS NULL AND NEW.payload ? 'document_version_id' THEN
    SELECT d.stage_id INTO v_stage_id
    FROM public.documents d
    JOIN public.document_versions dv ON dv.document_id = d.id
    WHERE dv.id = (NEW.payload->>'document_version_id')::uuid
    LIMIT 1;
  END IF;

  -- If still null, try to resolve from annotation_id if present
  IF v_stage_id IS NULL AND NEW.payload ? 'annotation_id' THEN
    SELECT d.stage_id INTO v_stage_id
    FROM public.documents d
    JOIN public.document_versions dv ON dv.document_id = d.id
    JOIN public.annotations a ON a.document_version_id = dv.id
    WHERE a.id = (NEW.payload->>'annotation_id')::uuid
    LIMIT 1;
  END IF;

  -- If still null, just fallback to the latest stage evaluated or the first stage of the project
  IF v_stage_id IS NULL THEN
    SELECT stage_id INTO v_stage_id
    FROM public.evaluations
    WHERE project_id = NEW.project_id
    ORDER BY updated_at DESC
    LIMIT 1;
  END IF;

  -- A. Recompute compliance rate for the project
  SELECT 
    CASE 
      WHEN count(a.id) = 0 THEN 100.00
      ELSE round((sum(case when a.status = 'verified' then 1 else 0 end)::decimal / count(a.id)) * 100, 2)
    END INTO v_compliance_rate
  FROM public.projects p
  LEFT JOIN public.documents d ON d.project_id = p.id
  LEFT JOIN public.document_versions dv ON dv.document_id = d.id
  LEFT JOIN public.annotations a ON a.document_version_id = dv.id
  WHERE p.id = NEW.project_id;

  -- B. Recompute average rubric score for the project & stage
  IF v_stage_id IS NOT NULL THEN
    SELECT COALESCE(round(avg(total_score), 2), 0.00) INTO v_avg_score
    FROM public.evaluations
    WHERE project_id = NEW.project_id AND stage_id = v_stage_id AND status = 'submitted';
  ELSE
    SELECT COALESCE(round(avg(total_score), 2), 0.00) INTO v_avg_score
    FROM public.evaluations
    WHERE project_id = NEW.project_id AND status = 'submitted';
  END IF;

  -- C. Recompute major/critical unresolved comments
  SELECT COUNT(a.id) INTO v_major_unresolved
  FROM public.documents d
  JOIN public.document_versions dv ON dv.document_id = d.id
  JOIN public.annotations a ON a.document_version_id = dv.id
  WHERE d.project_id = NEW.project_id 
    AND a.status != 'verified' 
    AND a.severity IN ('major', 'critical');

  -- D. Recompute readiness level based on stats
  IF v_compliance_rate >= 90.00 AND v_avg_score >= 85.00 AND v_major_unresolved = 0 THEN
    v_readiness_level := 'Ready';
  ELSIF v_compliance_rate >= 70.00 AND v_avg_score >= 75.00 AND v_major_unresolved <= 2 THEN
    v_readiness_level := 'Almost Ready';
  ELSIF v_compliance_rate < 70.00 OR v_major_unresolved > 2 THEN
    v_readiness_level := 'Needs Revision';
  ELSE
    v_readiness_level := 'Not Ready';
  END IF;

  -- E. Upsert cache table
  INSERT INTO public.project_score_cache (project_id, stage_id, avg_score, compliance_rate, readiness_level, last_updated)
  VALUES (NEW.project_id, v_stage_id, v_avg_score, v_compliance_rate, v_readiness_level, NOW())
  ON CONFLICT (project_id) DO UPDATE SET
    stage_id = EXCLUDED.stage_id,
    avg_score = EXCLUDED.avg_score,
    compliance_rate = EXCLUDED.compliance_rate,
    readiness_level = EXCLUDED.readiness_level,
    last_updated = NOW();

  RETURN NEW;
END;
$$;

-- 4. Set up the trigger
DROP TRIGGER IF EXISTS tr_process_evaluation_event ON public.evaluation_events;
CREATE TRIGGER tr_process_evaluation_event
  AFTER INSERT ON public.evaluation_events
  FOR EACH ROW EXECUTE FUNCTION process_evaluation_event();

-- 5. Updated Views with Fallbacks

-- A. Panel Consensus Summary View
CREATE OR REPLACE VIEW panel_consensus_summary AS
WITH raw_calc AS (
  SELECT 
    project_id,
    stage_id,
    max(total_score) as highest_score,
    min(total_score) as lowest_score,
    avg(total_score) as average_score,
    (max(total_score) - min(total_score)) as score_difference
  FROM public.evaluations
  WHERE status = 'submitted'
  GROUP BY project_id, stage_id
)
SELECT 
  r.project_id,
  r.stage_id,
  r.highest_score,
  r.lowest_score,
  COALESCE(c.avg_score, r.average_score) as average_score,
  r.score_difference,
  CASE 
    WHEN r.score_difference <= 5.00 THEN 'High'
    WHEN r.score_difference <= 15.00 THEN 'Moderate'
    ELSE 'Low'
  END as consensus_level,
  CASE
    WHEN r.score_difference > 15.00 THEN TRUE
    ELSE FALSE
  END as discrepancy_alert
FROM raw_calc r
LEFT JOIN public.project_score_cache c ON c.project_id = r.project_id AND c.stage_id = r.stage_id;

-- B. Revision Compliance Metrics View
CREATE OR REPLACE VIEW revision_compliance_metrics AS
WITH raw_calc AS (
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
  GROUP BY p.id, p.title
)
SELECT 
  r.project_id,
  r.project_title,
  r.total_comments,
  r.addressed_count,
  r.verified_count,
  r.in_progress_count,
  COALESCE(c.compliance_rate, r.compliance_rate) as compliance_rate
FROM raw_calc r
LEFT JOIN public.project_score_cache c ON c.project_id = r.project_id;

-- C. Project Readiness Status View
CREATE OR REPLACE VIEW project_readiness_status AS
WITH stats AS (
  SELECT 
    p.id as project_id,
    COALESCE(rc.compliance_rate, 100.00) as compliance_rate,
    COALESCE(avg(e.total_score), 0.00) as avg_rubric_score,
    COUNT(a.id) FILTER (WHERE a.status != 'verified' AND a.severity IN ('major', 'critical')) as major_unresolved_comments
  FROM public.projects p
  LEFT JOIN public.evaluations e ON e.project_id = p.id AND e.status = 'submitted'
  LEFT JOIN public.documents d ON d.project_id = p.id
  LEFT JOIN public.document_versions dv ON dv.document_id = d.id
  LEFT JOIN public.annotations a ON a.document_version_id = dv.id
  LEFT JOIN revision_compliance_metrics rc ON rc.project_id = p.id
  GROUP BY p.id, rc.compliance_rate
)
SELECT 
  s.project_id,
  COALESCE(c.compliance_rate, s.compliance_rate) as compliance_rate,
  COALESCE(c.avg_score, s.avg_rubric_score) as avg_rubric_score,
  s.major_unresolved_comments,
  COALESCE(c.readiness_level, 
    CASE
      WHEN COALESCE(c.compliance_rate, s.compliance_rate) >= 90.00 AND COALESCE(c.avg_score, s.avg_rubric_score) >= 85.00 AND s.major_unresolved_comments = 0 THEN 'Ready'
      WHEN COALESCE(c.compliance_rate, s.compliance_rate) >= 70.00 AND COALESCE(c.avg_score, s.avg_rubric_score) >= 75.00 AND s.major_unresolved_comments <= 2 THEN 'Almost Ready'
      WHEN COALESCE(c.compliance_rate, s.compliance_rate) < 70.00 OR s.major_unresolved_comments > 2 THEN 'Needs Revision'
      ELSE 'Not Ready'
    END
  ) as readiness_level
FROM stats s
LEFT JOIN public.project_score_cache c ON c.project_id = s.project_id;
