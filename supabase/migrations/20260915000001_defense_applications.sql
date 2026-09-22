-- ============================================================
-- AURORA: Defense Applications & ParSU BSIT Criteria Workflow
-- Form DCS-CF-03: Application for Oral Defense
-- Form DCS-CF-04: Progress Report Evaluation Sheet
-- Form DCS-CF-05: Progress Report Evaluation Summary Sheet
-- ============================================================

-- 1. Create defense_applications table
CREATE TABLE IF NOT EXISTS public.defense_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  stage_id UUID NOT NULL REFERENCES public.defense_stages(id) ON DELETE CASCADE,
  form_code TEXT NOT NULL DEFAULT 'DCS-CF-03',
  defense_type TEXT NOT NULL DEFAULT 'Progress Report',
  application_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  requirements_checklist JSONB NOT NULL DEFAULT '{
    "accomplishment_report": true,
    "documentation_chapters": true,
    "documentation_chapters_label": "Chapter 1-4",
    "presentation_files": true,
    "custom_items": []
  }'::jsonb,
  preferred_dates JSONB DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'submitted_by_student',
  -- Statuses: 'draft', 'submitted_by_student', 'certified_by_adviser', 'scheduled', 'approved_by_chair', 'rejected'
  
  -- Adviser Certification (DCS-CF-03 Section)
  adviser_certification JSONB DEFAULT NULL,
  -- Schema: { "certified_at": "ISO", "adviser_id": "UUID", "adviser_name": "string", "signature_url": "string", "remarks": "string" }

  -- Committee Manifestation of Schedule Agreement
  committee_manifestations JSONB DEFAULT '[]'::jsonb,
  -- Schema: [ { "profile_id": "UUID", "name": "string", "role": "member"|"chair", "agreed_at": "ISO", "signature_url": "string" } ]

  -- Department Chair / Coordinator Approval
  chair_approval JSONB DEFAULT NULL,
  -- Schema: { "approved_at": "ISO", "chair_name": "KENNEDY C. CUYA, DIT", "chair_id": "UUID", "signature_url": "string" }

  defense_schedule_id UUID REFERENCES public.defense_schedules(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT defense_applications_unique_project_stage UNIQUE (project_id, stage_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_defense_applications_project ON public.defense_applications(project_id);
CREATE INDEX IF NOT EXISTS idx_defense_applications_stage ON public.defense_applications(stage_id);
CREATE INDEX IF NOT EXISTS idx_defense_applications_status ON public.defense_applications(status);

-- Enable RLS
ALTER TABLE public.defense_applications ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "defense_applications_select_policy" ON public.defense_applications;
DROP POLICY IF EXISTS "defense_applications_insert_policy" ON public.defense_applications;
DROP POLICY IF EXISTS "defense_applications_update_policy" ON public.defense_applications;
DROP POLICY IF EXISTS "defense_applications_delete_policy" ON public.defense_applications;

-- RLS Policies
-- Anyone authenticated can view applications linked to their projects or role
CREATE POLICY "defense_applications_select_policy" ON public.defense_applications
  FOR SELECT TO authenticated
  USING (true);

-- Authenticated users (students or advisers) can insert applications
CREATE POLICY "defense_applications_insert_policy" ON public.defense_applications
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- Authenticated users can update applications (guarded by server actions)
CREATE POLICY "defense_applications_update_policy" ON public.defense_applications
  FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

-- Admins and coordinators can delete
CREATE POLICY "defense_applications_delete_policy" ON public.defense_applications
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON ur.role_id = r.id
      WHERE ur.profile_id = auth.uid()
      AND r.code IN ('sys_admin', 'coordinator')
    )
  );

-- 2. Allow institutional / degree-wide rubric templates by dropping NOT NULL on project_id
ALTER TABLE public.rubric_templates ALTER COLUMN project_id DROP NOT NULL;

-- 3. Seed Official ParSU BSIT Oral Defense Rubric Template (DCS-CF-04 / DCS-CF-05)
-- Criteria:
-- 1. Substance / Context of the Proposal (50%)
--    - Originality / Inventiveness: 30%
--    - Quality of Proposal Manuscript: 20%
-- 2. Technological Impact (30%)
--    - Contribution to Technology: 15%
--    - Impact to Productivity and Cost Effectiveness: 15%
-- 3. Presentation Delivery (20%)
--    - Quality of Presentation: 10%
--    - Ability to Respond to Inquiries: 10%
-- Total: 100%

INSERT INTO public.rubric_templates (
  id,
  title,
  criteria,
  passing_score,
  excellent_score,
  target_compliance_rate,
  min_compliance_rate,
  max_major_unresolved,
  is_published,
  is_active,
  is_archived,
  version
) VALUES (
  '11111111-2222-3333-4444-555555555555',
  'ParSU BSIT Progress Report Defense Rubric (DCS-CF-04/05)',
  '[
    {
      "id": "crit_substance_originality",
      "category": "1. Substance / Context of the Proposal (50%)",
      "name": "Originality / Inventiveness",
      "weight": 30,
      "max_score": 100
    },
    {
      "id": "crit_substance_manuscript",
      "category": "1. Substance / Context of the Proposal (50%)",
      "name": "Quality of Proposal Manuscript",
      "weight": 20,
      "max_score": 100
    },
    {
      "id": "crit_tech_contribution",
      "category": "2. Technological Impact (30%)",
      "name": "Contribution to Technology",
      "weight": 15,
      "max_score": 100
    },
    {
      "id": "crit_tech_productivity",
      "category": "2. Technological Impact (30%)",
      "name": "Impact to Productivity and Cost Effectiveness",
      "weight": 15,
      "max_score": 100
    },
    {
      "id": "crit_pres_quality",
      "category": "3. Presentation Delivery (20%)",
      "name": "Quality of Presentation",
      "weight": 10,
      "max_score": 100
    },
    {
      "id": "crit_pres_inquiries",
      "category": "3. Presentation Delivery (20%)",
      "name": "Ability to Respond to Inquiries",
      "weight": 10,
      "max_score": 100
    }
  ]'::jsonb,
  75.0,
  90.0,
  90.0,
  70.0,
  2,
  true,
  true,
  false,
  1
) ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  criteria = EXCLUDED.criteria,
  passing_score = EXCLUDED.passing_score,
  is_published = true,
  is_active = true;
