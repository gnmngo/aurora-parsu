-- ============================================================
-- AURORA Seed Data: Partido State University – Goa Campus
-- Run AFTER initial migration
-- ============================================================

-- Campus (fixed UUID for .env reference)
INSERT INTO campuses (id, name, code, address) VALUES
  (
    '00000000-0000-0000-0000-000000000001',
    'Partido State University – Goa Campus',
    'PARSU-GOA',
    'Goa, Camarines Sur, Philippines'
  )
ON CONFLICT (id) DO NOTHING;

-- Colleges
INSERT INTO colleges (id, campus_id, name, code) VALUES
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'College of Education', 'COE'),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'College of Business and Management', 'COB'),
  ('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'College of Engineering and Computational Sciences', 'CECS'),
  ('10000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', 'College of Arts and Humanities', 'CAH'),
  ('10000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', 'College of Science', 'COS')
ON CONFLICT DO NOTHING;

-- Sample departments (CECS + COB)
INSERT INTO departments (college_id, name, code) VALUES
  ('10000000-0000-0000-0000-000000000003', 'Computer Science', 'BSCS'),
  ('10000000-0000-0000-0000-000000000003', 'Information Technology', 'BSIT'),
  ('10000000-0000-0000-0000-000000000002', 'Business Administration', 'BSBA'),
  ('10000000-0000-0000-0000-000000000001', 'Elementary Education', 'BEED'),
  ('10000000-0000-0000-0000-000000000005', 'Biology', 'BSBIO')
ON CONFLICT DO NOTHING;

-- Roles
INSERT INTO roles (id, name, code, description, hierarchy) VALUES
  ('20000000-0000-0000-0000-000000000001', 'System Administrator', 'sys_admin', 'Full system access', 100),
  ('20000000-0000-0000-0000-000000000002', 'College Coordinator', 'college_coordinator', 'College-wide research coordination', 80),
  ('20000000-0000-0000-0000-000000000003', 'Department Coordinator', 'dept_coordinator', 'Department defense management', 70),
  ('20000000-0000-0000-0000-000000000004', 'Research Adviser', 'research_adviser', 'Advises student researchers', 50),
  ('20000000-0000-0000-0000-000000000005', 'Panel Chair', 'panel_chair', 'Leads defense panel', 45),
  ('20000000-0000-0000-0000-000000000006', 'Panel Member', 'panel_member', 'Evaluates defenses', 40),
  ('20000000-0000-0000-0000-000000000007', 'Student Leader', 'student_leader', 'Student representative', 20),
  ('20000000-0000-0000-0000-000000000008', 'Student', 'student', 'Student researcher', 10)
ON CONFLICT (code) DO NOTHING;

-- Permissions
INSERT INTO permissions (code, module, description) VALUES
  ('project:read', 'project', 'View projects'),
  ('project:create', 'project', 'Create projects'),
  ('project:update', 'project', 'Update projects'),
  ('document:upload', 'document', 'Upload manuscripts'),
  ('document:download', 'document', 'Download manuscripts'),
  ('annotation:create', 'annotation', 'Create annotations'),
  ('annotation:resolve', 'annotation', 'Resolve annotations'),
  ('evaluation:submit', 'grading', 'Submit evaluations'),
  ('grading:manage', 'grading', 'Manage rubrics and templates'),
  ('defense:schedule', 'defense', 'Manage defense schedules'),
  ('defense:assign_panel', 'defense', 'Assign panelists'),
  ('audit:read', 'audit', 'View audit logs'),
  ('report:generate', 'report', 'Generate reports'),
  ('user:manage', 'admin', 'Manage users'),
  ('stage:configure', 'admin', 'Configure defense stages')
ON CONFLICT (code) DO NOTHING;

-- Defense Stages (admin-configurable)
INSERT INTO defense_stages (campus_id, code, name, sequence_order, description, is_enabled, required_documents, requirements) VALUES
  (
    '00000000-0000-0000-0000-000000000001',
    'concept',
    'Concept Defense',
    1,
    'Determines feasibility and relevance of the research project.',
    TRUE,
    '["project_concept","problem_statement","proposed_solution","technical_background"]',
    '{"min_pages": 5, "max_pages": 20}'
  ),
  (
    '00000000-0000-0000-0000-000000000001',
    'title',
    'Title Defense',
    2,
    'Validates title, objectives, literature, and methodology.',
    TRUE,
    '["chapter_1","chapter_2","chapter_3"]',
    '{"chapters_required": [1, 2, 3]}'
  ),
  (
    '00000000-0000-0000-0000-000000000001',
    'progress_1',
    'Progress Report 1',
    3,
    'Evaluates system architecture and 60% implementation progress.',
    TRUE,
    '["chapters_1_3","chapter_4","system_60pct"]',
    '{"system_completion_min": 60}'
  ),
  (
    '00000000-0000-0000-0000-000000000001',
    'progress_2',
    'Progress Report 2',
    4,
    'Evaluates readiness for final defense at 90% completion.',
    TRUE,
    '["chapters_1_4","chapter_5","system_90pct"]',
    '{"system_completion_min": 90}'
  ),
  (
    '00000000-0000-0000-0000-000000000001',
    'final',
    'Final Defense',
    5,
    'Final evaluation and approval of complete thesis/capstone.',
    TRUE,
    '["complete_manuscript","functional_system","compliance_docs","presentation"]',
    '{"system_completion_min": 100}'
  )
ON CONFLICT (campus_id, code) DO NOTHING;

-- Annotation categories
INSERT INTO annotation_categories (campus_id, name, color, is_system) VALUES
  ('00000000-0000-0000-0000-000000000001', 'General', '#3B82F6', TRUE),
  ('00000000-0000-0000-0000-000000000001', 'Research Concern', '#EF4444', TRUE),
  ('00000000-0000-0000-0000-000000000001', 'Methodology', '#F59E0B', TRUE),
  ('00000000-0000-0000-0000-000000000001', 'Formatting', '#8B5CF6', TRUE),
  ('00000000-0000-0000-0000-000000000001', 'Grammar', '#10B981', TRUE),
  ('00000000-0000-0000-0000-000000000001', 'Recommendation', '#06B6D4', TRUE)
ON CONFLICT DO NOTHING;
