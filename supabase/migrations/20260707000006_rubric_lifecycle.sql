-- ============================================================
-- AURORA Module 3.2: Rubric Lifecycle Management
-- Partido State University – Goa Campus
-- ============================================================

-- 1. Add columns for status, soft delete, and version lineage tracking
ALTER TABLE public.rubric_templates 
  ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS version INT DEFAULT 1,
  ADD COLUMN IF NOT EXISTS parent_template_id UUID REFERENCES public.rubric_templates(id) ON DELETE SET NULL;

-- 2. Soft-delete trigger to protect rubrics used in evaluations
CREATE OR REPLACE FUNCTION prevent_rubric_hard_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if referenced in evaluations
  IF EXISTS (SELECT 1 FROM public.evaluations WHERE rubric_template_id = OLD.id) THEN
    -- Soft delete: set flags and cancel hard delete
    UPDATE public.rubric_templates
    SET is_archived = TRUE, is_active = FALSE
    WHERE id = OLD.id;
    
    RETURN NULL; -- Abort hard delete operation
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS tr_prevent_rubric_hard_delete ON public.rubric_templates;
CREATE TRIGGER tr_prevent_rubric_hard_delete
  BEFORE DELETE ON public.rubric_templates
  FOR EACH ROW EXECUTE FUNCTION prevent_rubric_hard_delete();
