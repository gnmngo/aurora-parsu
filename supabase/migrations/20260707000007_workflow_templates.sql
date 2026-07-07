-- ============================================================
-- AURORA Module 4.1: Dynamic Configurable Workflow Templates
-- Partido State University – Goa Campus
-- ============================================================

-- 1. Create workflow_templates table
CREATE TABLE IF NOT EXISTS public.workflow_templates (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Add template linkages to defense_stages and projects
ALTER TABLE public.defense_stages 
  ADD COLUMN IF NOT EXISTS workflow_template_id UUID REFERENCES public.workflow_templates(id) ON DELETE CASCADE;

ALTER TABLE public.projects 
  ADD COLUMN IF NOT EXISTS workflow_template_id UUID REFERENCES public.workflow_templates(id) ON DELETE SET NULL;

-- Enable RLS on new table
ALTER TABLE public.workflow_templates ENABLE ROW LEVEL SECURITY;

-- Simple select/modification policies for RLS
CREATE POLICY workflow_templates_select ON public.workflow_templates
  FOR SELECT USING (true);

CREATE POLICY workflow_templates_write ON public.workflow_templates
  FOR ALL USING (has_role('coordinator') OR has_role('sys_admin'));

-- 3. Seed default BSIT workflow template
INSERT INTO public.workflow_templates (id, name, description)
VALUES ('70000000-0000-0000-0000-000000000001', 'BSIT Default Workflow', 'Standard BSIT Capstone Defense stages workflow')
ON CONFLICT (name) DO NOTHING;

-- Map existing stages to BSIT template
UPDATE public.defense_stages 
SET workflow_template_id = '70000000-0000-0000-0000-000000000001'
WHERE workflow_template_id IS NULL;

-- Map existing projects to BSIT template
UPDATE public.projects 
SET workflow_template_id = '70000000-0000-0000-0000-000000000001'
WHERE workflow_template_id IS NULL;
