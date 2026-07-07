-- ============================================================
-- AURORA Module 4.2: Phase 4 Hardening, Adviser Approval Gates, & Multi-College Workflows
-- Partido State University – Goa Campus
-- ============================================================

-- 1. Create programs table to support multi-college programs
CREATE TABLE IF NOT EXISTS public.programs (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id  UUID REFERENCES public.departments(id) ON DELETE CASCADE,
  name           VARCHAR(255) NOT NULL,
  code           VARCHAR(20) NOT NULL UNIQUE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS on programs
ALTER TABLE public.programs ENABLE ROW LEVEL SECURITY;

CREATE POLICY programs_select ON public.programs
  FOR SELECT USING (true);

CREATE POLICY programs_all ON public.programs
  FOR ALL USING (has_role('coordinator') OR has_role('sys_admin'));

-- Seed default BSIT program
INSERT INTO public.programs (id, department_id, name, code)
VALUES (
  '80000000-0000-0000-0000-000000000001',
  (SELECT id FROM public.departments WHERE code = 'BSIT' LIMIT 1),
  'Bachelor of Science in Information Technology',
  'BSIT'
) ON CONFLICT (code) DO NOTHING;

-- 2. Link workflow_templates to programs
ALTER TABLE public.workflow_templates 
  ADD COLUMN IF NOT EXISTS program_id UUID REFERENCES public.programs(id) ON DELETE SET NULL;

UPDATE public.workflow_templates 
SET program_id = '80000000-0000-0000-0000-000000000001'
WHERE program_id IS NULL;

-- 3. Add dynamic stage options to defense_stages
ALTER TABLE public.defense_stages
  ADD COLUMN IF NOT EXISTS requires_submission BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS requires_schedule BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS requires_panel BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS requires_rubric BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS requires_signature BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS allows_revision BOOLEAN DEFAULT TRUE;

-- 4. Add Adviser Approval Gate status to documents table
ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS adviser_approval_status VARCHAR(30) DEFAULT 'approved',
  ADD COLUMN IF NOT EXISTS approval_remarks TEXT;

-- 5. Add advanced audit logging details to audit_logs
ALTER TABLE public.audit_logs
  ADD COLUMN IF NOT EXISTS device VARCHAR(100),
  ADD COLUMN IF NOT EXISTS reason TEXT;
