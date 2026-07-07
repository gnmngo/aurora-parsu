-- ============================================================
-- AURORA Module 03 Refinements: Rubric Templates & Dynamic Scoring
-- ============================================================

-- 1. Create rubric_templates table
CREATE TABLE IF NOT EXISTS public.rubric_templates (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id              UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title                   TEXT NOT NULL,
  criteria                JSONB NOT NULL, -- Holds array of criteria: [{"id": "c1", "name": "Methodology", "weight": 30}, ...]
  passing_score           NUMERIC(5,2) DEFAULT 75.00,
  excellent_score         NUMERIC(5,2) DEFAULT 85.00,
  target_compliance_rate  NUMERIC(5,2) DEFAULT 90.00,
  min_compliance_rate     NUMERIC(5,2) DEFAULT 70.00,
  max_major_unresolved    INT DEFAULT 2,
  created_by              UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  updated_at              TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Modify evaluations table to support dynamic rubrics
ALTER TABLE public.evaluations ALTER COLUMN template_id DROP NOT NULL;
ALTER TABLE public.evaluations ADD COLUMN IF NOT EXISTS rubric_template_id UUID REFERENCES public.rubric_templates(id) ON DELETE SET NULL;
ALTER TABLE public.evaluations ADD COLUMN IF NOT EXISTS scores JSONB DEFAULT '{}'; -- Holds grades: {"c1": 85, "c2": 90}

-- 3. Validation Trigger function on rubric_templates to ensure weights sum to 100
CREATE OR REPLACE FUNCTION validate_rubric_template()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_criterion JSONB;
  v_weight NUMERIC;
  v_total_weight NUMERIC := 0;
BEGIN
  IF NEW.criteria IS NULL OR jsonb_array_length(NEW.criteria) = 0 THEN
    RAISE EXCEPTION 'Rubric template must contain at least one criterion.';
  END IF;

  FOR v_criterion IN SELECT * FROM jsonb_array_elements(NEW.criteria) LOOP
    v_weight := (v_criterion->>'weight')::numeric;
    IF v_weight IS NULL OR v_weight < 0 THEN
      RAISE EXCEPTION 'Criterion weight must be a positive number.';
    END IF;
    v_total_weight := v_total_weight + v_weight;
  END LOOP;

  IF v_total_weight < 99.90 OR v_total_weight > 100.10 THEN
    RAISE EXCEPTION 'Criteria weights must sum to 100. Total weight was %', v_total_weight;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_validate_rubric_template ON public.rubric_templates;
CREATE TRIGGER tr_validate_rubric_template
  BEFORE INSERT OR UPDATE ON public.rubric_templates
  FOR EACH ROW EXECUTE FUNCTION validate_rubric_template();


-- 4. Trigger function to compute total_score dynamically on evaluations insert/update
CREATE OR REPLACE FUNCTION compute_evaluation_score()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_criteria JSONB;
  v_criterion JSONB;
  v_id TEXT;
  v_weight NUMERIC;
  v_score NUMERIC;
  v_total_weight NUMERIC := 0;
  v_computed_score NUMERIC := 0;
BEGIN
  IF NEW.rubric_template_id IS NOT NULL THEN
    SELECT criteria INTO v_criteria
    FROM public.rubric_templates
    WHERE id = NEW.rubric_template_id;

    IF v_criteria IS NOT NULL AND jsonb_array_length(v_criteria) > 0 THEN
      FOR v_criterion IN SELECT * FROM jsonb_array_elements(v_criteria) LOOP
        v_id := COALESCE(v_criterion->>'id', v_criterion->>'name');
        v_weight := (v_criterion->>'weight')::numeric;
        
        -- Default to 0 if no score given for this criterion
        v_score := COALESCE((NEW.scores->>v_id)::numeric, 0.00);
        
        v_computed_score := v_computed_score + (v_score * v_weight / 100.00);
        v_total_weight := v_total_weight + v_weight;
      END LOOP;

      -- Set calculated values
      NEW.total_score := round(v_computed_score, 2);
      NEW.weighted_score := round(v_computed_score, 2);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_evaluations_compute_score ON public.evaluations;
CREATE TRIGGER tr_evaluations_compute_score
  BEFORE INSERT OR UPDATE ON public.evaluations
  FOR EACH ROW EXECUTE FUNCTION compute_evaluation_score();


-- 5. Rewrite process_evaluation_event() to load thresholds dynamically
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
  
  -- Rubric-configured thresholds
  v_threshold_pass NUMERIC(5,2) := 75.00;
  v_threshold_excellent NUMERIC(5,2) := 85.00;
  v_threshold_target_compliance NUMERIC(5,2) := 90.00;
  v_threshold_min_compliance NUMERIC(5,2) := 70.00;
  v_threshold_max_major INT := 2;
BEGIN
  -- Resolve stage_id if not directly provided
  v_stage_id := NEW.stage_id;
  IF v_stage_id IS NULL THEN
    IF NEW.payload ? 'stage_id' THEN
      v_stage_id := (NEW.payload->>'stage_id')::uuid;
    END IF;
  END IF;
  
  IF v_stage_id IS NULL AND NEW.payload ? 'document_version_id' THEN
    SELECT d.stage_id INTO v_stage_id
    FROM public.documents d
    JOIN public.document_versions dv ON dv.document_id = d.id
    WHERE dv.id = (NEW.payload->>'document_version_id')::uuid
    LIMIT 1;
  END IF;

  IF v_stage_id IS NULL AND NEW.payload ? 'annotation_id' THEN
    SELECT d.stage_id INTO v_stage_id
    FROM public.documents d
    JOIN public.document_versions dv ON dv.document_id = d.id
    JOIN public.annotations a ON a.document_version_id = dv.id
    WHERE a.id = (NEW.payload->>'annotation_id')::uuid
    LIMIT 1;
  END IF;

  IF v_stage_id IS NULL THEN
    SELECT stage_id INTO v_stage_id
    FROM public.evaluations
    WHERE project_id = NEW.project_id
    ORDER BY updated_at DESC
    LIMIT 1;
  END IF;

  -- Load dynamic rubric template thresholds for this project
  SELECT 
    COALESCE(passing_score, 75.00),
    COALESCE(excellent_score, 85.00),
    COALESCE(target_compliance_rate, 90.00),
    COALESCE(min_compliance_rate, 70.00),
    COALESCE(max_major_unresolved, 2)
  INTO
    v_threshold_pass,
    v_threshold_excellent,
    v_threshold_target_compliance,
    v_threshold_min_compliance,
    v_threshold_max_major
  FROM public.rubric_templates
  WHERE project_id = NEW.project_id
  LIMIT 1;

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

  -- D. Recompute readiness level based on dynamic stats & thresholds
  IF v_compliance_rate >= v_threshold_target_compliance AND v_avg_score >= v_threshold_excellent AND v_major_unresolved = 0 THEN
    v_readiness_level := 'Ready';
  ELSIF v_compliance_rate >= v_threshold_min_compliance AND v_avg_score >= v_threshold_pass AND v_major_unresolved <= v_threshold_max_major THEN
    v_readiness_level := 'Almost Ready';
  ELSIF v_compliance_rate < v_threshold_min_compliance OR v_major_unresolved > v_threshold_max_major THEN
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
