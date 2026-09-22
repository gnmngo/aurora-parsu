-- 20260916000001_multi_program_customization.sql
-- Multi-Program and Multi-College Workflow & Rubric Customization with University Defaults

-- 1. Extend workflow_templates with college_id and is_default
ALTER TABLE workflow_templates 
ADD COLUMN IF NOT EXISTS college_id uuid REFERENCES colleges(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS is_default boolean DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_workflow_templates_lookup 
ON workflow_templates (program_id, college_id, is_default);

-- 2. Extend rubric_templates with college_id, program_id, and is_default
ALTER TABLE rubric_templates 
ADD COLUMN IF NOT EXISTS program_id uuid REFERENCES programs(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS college_id uuid REFERENCES colleges(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS is_default boolean DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_rubric_templates_lookup 
ON rubric_templates (program_id, college_id, is_default);

-- 3. Update constraint on defense_stages to allow multiple workflows to define stages
-- Drop the campus_id+code constraint and replace with workflow_template_id+code
ALTER TABLE defense_stages DROP CONSTRAINT IF EXISTS defense_stages_campus_id_code_key;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'defense_stages_workflow_code_unique'
  ) THEN
    ALTER TABLE defense_stages 
    ADD CONSTRAINT defense_stages_workflow_code_unique 
    UNIQUE (workflow_template_id, code);
  END IF;
END $$;

-- 4. Ensure BSIT workflow template is properly tagged
UPDATE workflow_templates 
SET program_id = '80000000-0000-0000-0000-000000000001',
    college_id = '10000000-0000-0000-0000-000000000003',
    is_default = false
WHERE id = '70000000-0000-0000-0000-000000000001';

-- 5. Seed General University Default Workflow (if not existing)
INSERT INTO workflow_templates (
  id,
  name,
  description,
  program_id,
  college_id,
  is_default,
  created_at
) VALUES (
  '10000000-0000-0000-0000-000000000000',
  'General University Defense Workflow',
  'Standard University 3-stage defense pipeline (Title Defense, Proposal Defense, Final Defense) for undergraduate and graduate academic programs across all colleges.',
  null,
  null,
  true,
  NOW()
) ON CONFLICT (id) DO UPDATE 
SET is_default = true,
    name = EXCLUDED.name,
    description = EXCLUDED.description;

-- 6. Seed 3 Standard Stages for the General University Default Workflow
-- Stage 1: Title Defense
INSERT INTO defense_stages (
  id,
  campus_id,
  code,
  name,
  sequence_order,
  description,
  is_enabled,
  required_documents,
  requirements,
  passing_score,
  workflow_template_id,
  requires_submission,
  requires_schedule,
  requires_panel,
  requires_rubric,
  requires_signature,
  allows_revision,
  created_at,
  updated_at
) VALUES (
  '10000000-0001-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001',
  'title',
  'Title Defense',
  1,
  'Evaluates the research topic, statement of the problem, significance, and proposed objectives.',
  true,
  '["research_concept", "topic_outline"]'::jsonb,
  '{"min_pages": 5, "max_pages": 25}'::jsonb,
  75.00,
  '10000000-0000-0000-0000-000000000000',
  true,
  true,
  true,
  true,
  true,
  true,
  NOW(),
  NOW()
) ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name,
    sequence_order = 1,
    workflow_template_id = '10000000-0000-0000-0000-000000000000';

-- Stage 2: Proposal Defense
INSERT INTO defense_stages (
  id,
  campus_id,
  code,
  name,
  sequence_order,
  description,
  is_enabled,
  required_documents,
  requirements,
  passing_score,
  workflow_template_id,
  requires_submission,
  requires_schedule,
  requires_panel,
  requires_rubric,
  requires_signature,
  allows_revision,
  created_at,
  updated_at
) VALUES (
  '10000000-0001-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000001',
  'proposal',
  'Proposal Defense',
  2,
  'Evaluates Chapters 1 to 3 (Introduction, Literature Review, Methodology, and Research Instruments).',
  true,
  '["chapters_1_3", "research_instruments", "turnitin_report"]'::jsonb,
  '{"chapters_required": [1, 2, 3]}'::jsonb,
  75.00,
  '10000000-0000-0000-0000-000000000000',
  true,
  true,
  true,
  true,
  true,
  true,
  NOW(),
  NOW()
) ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name,
    sequence_order = 2,
    workflow_template_id = '10000000-0000-0000-0000-000000000000';

-- Stage 3: Final Defense
INSERT INTO defense_stages (
  id,
  campus_id,
  code,
  name,
  sequence_order,
  description,
  is_enabled,
  required_documents,
  requirements,
  passing_score,
  workflow_template_id,
  requires_submission,
  requires_schedule,
  requires_panel,
  requires_rubric,
  requires_signature,
  allows_revision,
  created_at,
  updated_at
) VALUES (
  '10000000-0001-0000-0000-000000000003',
  '00000000-0000-0000-0000-000000000001',
  'final',
  'Final Defense',
  3,
  'Final oral defense and evaluation of the complete manuscript (Chapters 1 to 5), findings, and deliverables.',
  true,
  '["complete_manuscript", "statistical_clearance", "turnitin_report", "presentation"]'::jsonb,
  '{"chapters_required": [1, 2, 3, 4, 5], "completion_pct_min": 100}'::jsonb,
  75.00,
  '10000000-0000-0000-0000-000000000000',
  true,
  true,
  true,
  true,
  true,
  true,
  NOW(),
  NOW()
) ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name,
    sequence_order = 3,
    workflow_template_id = '10000000-0000-0000-0000-000000000000';

-- 7. Link BSIT Rubric to BSIT Program ID
UPDATE rubric_templates 
SET program_id = '80000000-0000-0000-0000-000000000001',
    college_id = '10000000-0000-0000-0000-000000000003',
    is_default = false
WHERE id = '11111111-2222-3333-4444-555555555555';

-- 8. Seed General University Standard Rubric (U-CF-04)
INSERT INTO rubric_templates (
  id,
  project_id,
  program_id,
  college_id,
  is_default,
  title,
  passing_score,
  excellent_score,
  target_compliance_rate,
  min_compliance_rate,
  max_major_unresolved,
  is_published,
  is_active,
  is_archived,
  version,
  criteria,
  created_at,
  updated_at
) VALUES (
  '20000000-0000-0000-0000-000000000000',
  null,
  null,
  null,
  true,
  'Standard University Thesis & Capstone Defense Rubric (U-CF-04)',
  75.00,
  85.00,
  85.00,
  70.00,
  2,
  true,
  true,
  false,
  1,
  '[
    {
      "id": "crit_u1",
      "name": "Research Problem, Objectives & Significance",
      "category": "problem_formulation",
      "weight": 20,
      "max_score": 100,
      "description": "Clarity of the research problem, alignment of objectives, and institutional/social significance."
    },
    {
      "id": "crit_u2",
      "name": "Literature Review & Theoretical/Conceptual Framework",
      "category": "literature_review",
      "weight": 15,
      "max_score": 100,
      "description": "Comprehensiveness of current literature, synthesis of related studies, and sound conceptual foundation."
    },
    {
      "id": "crit_u3",
      "name": "Research Methodology, Design & Instruments",
      "category": "methodology",
      "weight": 25,
      "max_score": 100,
      "description": "Appropriateness of research design, sampling, data gathering procedures, and instrument validity/reliability."
    },
    {
      "id": "crit_u4",
      "name": "Data Analysis, Findings & Deliverable Output",
      "category": "findings_and_output",
      "weight": 25,
      "max_score": 100,
      "description": "Rigor of data analysis, presentation of results, and quality/readiness of prototype or thesis deliverable."
    },
    {
      "id": "crit_u5",
      "name": "Oral Presentation & Defense Mastery",
      "category": "oral_presentation",
      "weight": 15,
      "max_score": 100,
      "description": "Clarity of delivery, effective communication, and mastery in answering panel inquiries."
    }
  ]'::jsonb,
  NOW(),
  NOW()
) ON CONFLICT (id) DO UPDATE
SET title = EXCLUDED.title,
    criteria = EXCLUDED.criteria,
    is_default = true,
    is_active = true,
    is_published = true;
