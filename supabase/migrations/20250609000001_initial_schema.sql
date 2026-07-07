-- ============================================================
-- AURORA Module 01: Initial Database Schema
-- Partido State University – Goa Campus
-- Run in Supabase SQL Editor or via: supabase db push
-- ============================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================================
-- ENUMS
-- ============================================================
CREATE TYPE user_status AS ENUM ('active', 'inactive', 'suspended');
CREATE TYPE project_status AS ENUM (
  'draft',
  'submitted',
  'under_review',
  'scheduled',
  'in_progress',
  'revision_required',
  'passed',
  'passed_minor',
  'passed_major',
  'conditional',
  'failed',
  'archived'
);
CREATE TYPE panel_role AS ENUM ('chair', 'member');
CREATE TYPE member_role AS ENUM (
  'student',
  'adviser',
  'panel_chair',
  'panel_member',
  'student_leader'
);
CREATE TYPE document_status AS ENUM (
  'uploading',
  'processing',
  'draft',
  'submitted',
  'under_review',
  'approved',
  'revision_required',
  'rejected',
  'locked'
);
CREATE TYPE annotation_type AS ENUM (
  'highlight',
  'underline',
  'strike_through',
  'sticky_note',
  'text_comment',
  'correction_note',
  'recommendation',
  'research_concern',
  'methodology_concern',
  'formatting_concern',
  'grammar_concern'
);
CREATE TYPE annotation_status AS ENUM ('open', 'resolved', 'archived');
CREATE TYPE severity_level AS ENUM ('info', 'minor', 'major', 'critical');
CREATE TYPE scoring_model AS ENUM ('weighted_average', 'percentage', 'custom_formula');
CREATE TYPE evaluation_status AS ENUM ('draft', 'submitted', 'locked');
CREATE TYPE schedule_status AS ENUM ('scheduled', 'in_progress', 'completed', 'cancelled', 'postponed');
CREATE TYPE attendance_status AS ENUM ('present', 'absent', 'excused', 'late');
CREATE TYPE audit_action AS ENUM (
  'CREATE', 'UPDATE', 'DELETE',
  'LOGIN', 'LOGOUT',
  'UPLOAD', 'DOWNLOAD',
  'SUBMIT', 'APPROVE', 'REJECT',
  'ASSIGN', 'RELEASE', 'TRANSITION',
  'COMMENT', 'GRADE', 'SCHEDULE'
);
CREATE TYPE notification_type AS ENUM (
  'comment',
  'schedule',
  'grade_released',
  'document_returned',
  'revision_requested',
  'final_verdict',
  'assignment',
  'reminder',
  'system'
);
CREATE TYPE report_format AS ENUM ('pdf', 'xlsx', 'csv');
CREATE TYPE report_type AS ENUM (
  'defense_result',
  'panel_report',
  'student_report',
  'rubric_report',
  'college_report',
  'university_report'
);

-- ============================================================
-- ORGANIZATION
-- ============================================================
CREATE TABLE campuses (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(200) NOT NULL,
  code        VARCHAR(20) NOT NULL UNIQUE,
  address     TEXT,
  settings    JSONB NOT NULL DEFAULT '{}',
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE colleges (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campus_id   UUID NOT NULL REFERENCES campuses(id) ON DELETE RESTRICT,
  name        VARCHAR(200) NOT NULL,
  code        VARCHAR(20) NOT NULL,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (campus_id, code)
);

CREATE TABLE departments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  college_id  UUID NOT NULL REFERENCES colleges(id) ON DELETE RESTRICT,
  name        VARCHAR(200) NOT NULL,
  code        VARCHAR(20) NOT NULL,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (college_id, code)
);

-- ============================================================
-- RBAC
-- ============================================================
CREATE TABLE roles (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(100) NOT NULL,
  code        VARCHAR(50) NOT NULL UNIQUE,
  description TEXT,
  hierarchy   INT NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE permissions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code        VARCHAR(100) NOT NULL UNIQUE,
  module      VARCHAR(50) NOT NULL,
  description TEXT
);

CREATE TABLE role_permissions (
  role_id       UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

-- ============================================================
-- USERS (extends auth.users)
-- ============================================================
CREATE TABLE profiles (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  campus_id       UUID NOT NULL REFERENCES campuses(id),
  college_id      UUID REFERENCES colleges(id),
  department_id   UUID REFERENCES departments(id),
  email           VARCHAR(255) NOT NULL UNIQUE,
  first_name      VARCHAR(100) NOT NULL,
  last_name       VARCHAR(100) NOT NULL,
  middle_name     VARCHAR(100),
  avatar_url      TEXT,
  phone           VARCHAR(30),
  status          user_status NOT NULL DEFAULT 'active',
  mfa_enabled     BOOLEAN NOT NULL DEFAULT FALSE,
  last_login_at   TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE students (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id      UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  student_number  VARCHAR(50) NOT NULL UNIQUE,
  program         VARCHAR(200),
  year_level      INT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE faculty (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id      UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  employee_number VARCHAR(50) NOT NULL UNIQUE,
  rank            VARCHAR(100),
  specialization  VARCHAR(200),
  is_adviser      BOOLEAN NOT NULL DEFAULT FALSE,
  is_panelist     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE user_roles (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role_id     UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  scope_type  VARCHAR(20),
  scope_id    UUID,
  assigned_by UUID REFERENCES profiles(id),
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (profile_id, role_id, scope_type, scope_id)
);

-- ============================================================
-- DEFENSE STAGES (admin-configurable)
-- ============================================================
CREATE TABLE defense_stages (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campus_id           UUID NOT NULL REFERENCES campuses(id),
  code                VARCHAR(30) NOT NULL,
  name                VARCHAR(100) NOT NULL,
  sequence_order      INT NOT NULL,
  description         TEXT,
  is_enabled          BOOLEAN NOT NULL DEFAULT TRUE,
  required_documents  JSONB NOT NULL DEFAULT '[]',
  requirements        JSONB NOT NULL DEFAULT '{}',
  passing_score       DECIMAL(5,2) DEFAULT 75.00,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (campus_id, code)
);

-- ============================================================
-- PROJECTS (thesis/capstone record)
-- ============================================================
CREATE TABLE projects (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campus_id             UUID NOT NULL REFERENCES campuses(id),
  department_id         UUID NOT NULL REFERENCES departments(id),
  student_id            UUID NOT NULL REFERENCES students(id),
  title                 VARCHAR(500) NOT NULL,
  abstract              TEXT,
  keywords              TEXT[],
  current_stage_id      UUID REFERENCES defense_stages(id),
  status                project_status NOT NULL DEFAULT 'draft',
  academic_year         VARCHAR(9) NOT NULL,
  semester              VARCHAR(20),
  system_completion_pct INT NOT NULL DEFAULT 0,
  final_score           DECIMAL(5,2),
  final_verdict         VARCHAR(50),
  archived_at           TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE project_members (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  profile_id  UUID NOT NULL REFERENCES profiles(id),
  member_role member_role NOT NULL,
  is_primary  BOOLEAN NOT NULL DEFAULT FALSE,
  assigned_by UUID REFERENCES profiles(id),
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (project_id, profile_id, member_role)
);

CREATE TABLE workflow_transitions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id    UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  stage_id      UUID REFERENCES defense_stages(id),
  from_status   project_status NOT NULL,
  to_status     project_status NOT NULL,
  triggered_by  UUID NOT NULL REFERENCES profiles(id),
  reason        TEXT,
  metadata      JSONB NOT NULL DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- DEFENSE SCHEDULES & PANELS
-- ============================================================
CREATE TABLE defense_schedules (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id        UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  stage_id          UUID NOT NULL REFERENCES defense_stages(id),
  scheduled_at      TIMESTAMPTZ NOT NULL,
  end_at            TIMESTAMPTZ,
  room              VARCHAR(200),
  building          VARCHAR(200),
  is_online         BOOLEAN NOT NULL DEFAULT FALSE,
  meeting_url       TEXT,
  duration_minutes  INT NOT NULL DEFAULT 120,
  status            schedule_status NOT NULL DEFAULT 'scheduled',
  notes             TEXT,
  created_by        UUID NOT NULL REFERENCES profiles(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (project_id, stage_id)
);

CREATE TABLE defense_panels (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  stage_id    UUID NOT NULL REFERENCES defense_stages(id),
  profile_id  UUID NOT NULL REFERENCES profiles(id),
  panel_role  panel_role NOT NULL DEFAULT 'member',
  assigned_by UUID REFERENCES profiles(id),
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (project_id, stage_id, profile_id)
);

CREATE TABLE defense_attendance (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id UUID NOT NULL REFERENCES defense_schedules(id) ON DELETE CASCADE,
  profile_id  UUID NOT NULL REFERENCES profiles(id),
  status      attendance_status NOT NULL DEFAULT 'present',
  marked_by   UUID REFERENCES profiles(id),
  marked_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes       TEXT,
  UNIQUE (schedule_id, profile_id)
);

-- ============================================================
-- DOCUMENTS
-- ============================================================
CREATE TABLE documents (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  stage_id        UUID NOT NULL REFERENCES defense_stages(id),
  title           VARCHAR(500) NOT NULL,
  status          document_status NOT NULL DEFAULT 'draft',
  current_version INT NOT NULL DEFAULT 0,
  created_by      UUID NOT NULL REFERENCES profiles(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (project_id, stage_id)
);

CREATE TABLE document_versions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id     UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  version_number  INT NOT NULL,
  storage_path    TEXT NOT NULL,
  file_name       VARCHAR(255) NOT NULL,
  file_size       BIGINT NOT NULL,
  mime_type       VARCHAR(100) NOT NULL,
  checksum_sha256 VARCHAR(64) NOT NULL,
  page_count      INT,
  extracted_text  TEXT,
  chapter_outline JSONB NOT NULL DEFAULT '[]',
  upload_notes    TEXT,
  is_current      BOOLEAN NOT NULL DEFAULT TRUE,
  uploaded_by     UUID NOT NULL REFERENCES profiles(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (document_id, version_number)
);

CREATE TABLE document_upload_history (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id     UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  version_id      UUID NOT NULL REFERENCES document_versions(id) ON DELETE CASCADE,
  action          VARCHAR(30) NOT NULL DEFAULT 'upload',
  performed_by    UUID NOT NULL REFERENCES profiles(id),
  ip_address      INET,
  user_agent      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- ANNOTATIONS
-- ============================================================
CREATE TABLE annotation_categories (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campus_id   UUID REFERENCES campuses(id),
  name        VARCHAR(100) NOT NULL,
  color       VARCHAR(7) NOT NULL DEFAULT '#3B82F6',
  is_system   BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE annotations (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_version_id   UUID NOT NULL REFERENCES document_versions(id) ON DELETE CASCADE,
  parent_id             UUID REFERENCES annotations(id) ON DELETE CASCADE,
  type                  annotation_type NOT NULL,
  page_number           INT NOT NULL,
  coordinates           JSONB NOT NULL,
  selected_text         TEXT,
  content               TEXT,
  category_id           UUID REFERENCES annotation_categories(id),
  severity              severity_level NOT NULL DEFAULT 'info',
  status                annotation_status NOT NULL DEFAULT 'open',
  author_role           VARCHAR(50),
  version_checksum      VARCHAR(64),
  is_stale              BOOLEAN NOT NULL DEFAULT FALSE,
  revision_completed    BOOLEAN NOT NULL DEFAULT FALSE,
  revision_completed_at TIMESTAMPTZ,
  revision_completed_by UUID REFERENCES profiles(id),
  created_by            UUID NOT NULL REFERENCES profiles(id),
  resolved_by           UUID REFERENCES profiles(id),
  resolved_at           TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE annotation_replies (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  annotation_id   UUID NOT NULL REFERENCES annotations(id) ON DELETE CASCADE,
  content         TEXT NOT NULL,
  created_by      UUID NOT NULL REFERENCES profiles(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE annotation_mentions (
  annotation_id UUID NOT NULL REFERENCES annotations(id) ON DELETE CASCADE,
  profile_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  PRIMARY KEY (annotation_id, profile_id)
);

-- ============================================================
-- GRADING ENGINE
-- ============================================================
CREATE TABLE grading_templates (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campus_id       UUID NOT NULL REFERENCES campuses(id),
  college_id      UUID REFERENCES colleges(id),
  stage_id        UUID NOT NULL REFERENCES defense_stages(id),
  name            VARCHAR(200) NOT NULL,
  description     TEXT,
  scoring_model   scoring_model NOT NULL DEFAULT 'weighted_average',
  passing_score   DECIMAL(5,2) NOT NULL DEFAULT 75.00,
  max_score       DECIMAL(5,2) NOT NULL DEFAULT 100.00,
  custom_formula  TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  version         INT NOT NULL DEFAULT 1,
  created_by      UUID NOT NULL REFERENCES profiles(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE grading_criteria (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES grading_templates(id) ON DELETE CASCADE,
  name        VARCHAR(200) NOT NULL,
  description TEXT,
  weight      DECIMAL(5,2) NOT NULL,
  max_score   DECIMAL(5,2) NOT NULL,
  sort_order  INT NOT NULL DEFAULT 0,
  is_required BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE grading_subcriteria (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  criterion_id UUID NOT NULL REFERENCES grading_criteria(id) ON DELETE CASCADE,
  name         VARCHAR(200) NOT NULL,
  description  TEXT,
  max_score    DECIMAL(5,2) NOT NULL,
  sort_order   INT NOT NULL DEFAULT 0
);

CREATE TABLE grading_rating_scales (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id  UUID NOT NULL REFERENCES grading_templates(id) ON DELETE CASCADE,
  label        VARCHAR(100) NOT NULL,
  min_score    DECIMAL(5,2) NOT NULL,
  max_score    DECIMAL(5,2) NOT NULL,
  description  TEXT,
  sort_order   INT NOT NULL DEFAULT 0
);

CREATE TABLE grading_verdicts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id     UUID NOT NULL REFERENCES grading_templates(id) ON DELETE CASCADE,
  code            VARCHAR(50) NOT NULL,
  label           VARCHAR(100) NOT NULL,
  condition_expr  TEXT NOT NULL,
  priority        INT NOT NULL DEFAULT 0,
  description     TEXT,
  UNIQUE (template_id, code)
);

CREATE TABLE evaluations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  stage_id        UUID NOT NULL REFERENCES defense_stages(id),
  panelist_id     UUID NOT NULL REFERENCES profiles(id),
  template_id     UUID NOT NULL REFERENCES grading_templates(id),
  status          evaluation_status NOT NULL DEFAULT 'draft',
  total_score     DECIMAL(5,2),
  weighted_score  DECIMAL(5,2),
  verdict_code    VARCHAR(50),
  recommendations TEXT,
  panel_notes     TEXT,
  submitted_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (project_id, stage_id, panelist_id)
);

CREATE TABLE grading_scores (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evaluation_id   UUID NOT NULL REFERENCES evaluations(id) ON DELETE CASCADE,
  criterion_id    UUID NOT NULL REFERENCES grading_criteria(id),
  subcriterion_id UUID REFERENCES grading_subcriteria(id),
  score           DECIMAL(5,2) NOT NULL,
  notes           TEXT,
  UNIQUE (evaluation_id, criterion_id, subcriterion_id)
);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
CREATE TABLE notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title       VARCHAR(200) NOT NULL,
  message     TEXT NOT NULL,
  type        notification_type NOT NULL,
  link        TEXT,
  metadata    JSONB NOT NULL DEFAULT '{}',
  read_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- AUDIT & ACTIVITY
-- ============================================================
CREATE TABLE audit_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  academic_year   VARCHAR(9) NOT NULL DEFAULT '2025-2026',
  profile_id      UUID REFERENCES profiles(id),
  user_email      VARCHAR(255) NOT NULL,
  user_role       VARCHAR(50),
  action_type     audit_action NOT NULL,
  module          VARCHAR(50) NOT NULL,
  entity_type     VARCHAR(50) NOT NULL,
  entity_id       UUID NOT NULL,
  description     TEXT NOT NULL,
  old_value       JSONB,
  new_value       JSONB,
  amount_changed  TEXT,
  reason          TEXT,
  ip_address      INET,
  user_agent      TEXT,
  device_info     JSONB,
  session_id      VARCHAR(100),
  integrity_hash  VARCHAR(64),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE activity_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id  UUID REFERENCES profiles(id),
  event_type  VARCHAR(50) NOT NULL,
  entity_type VARCHAR(50),
  entity_id   UUID,
  metadata    JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- REPORTS
-- ============================================================
CREATE TABLE reports (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_type   report_type NOT NULL,
  format        report_format NOT NULL,
  title         VARCHAR(300) NOT NULL,
  scope_type    VARCHAR(20),
  scope_id      UUID,
  storage_path  TEXT,
  parameters    JSONB NOT NULL DEFAULT '{}',
  generated_by  UUID NOT NULL REFERENCES profiles(id),
  generated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX idx_profiles_campus ON profiles(campus_id);
CREATE INDEX idx_profiles_department ON profiles(department_id);
CREATE INDEX idx_students_profile ON students(profile_id);
CREATE INDEX idx_faculty_profile ON faculty(profile_id);
CREATE INDEX idx_projects_student ON projects(student_id);
CREATE INDEX idx_projects_department ON projects(department_id);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_stage ON projects(current_stage_id);
CREATE INDEX idx_project_members_profile ON project_members(profile_id);
CREATE INDEX idx_defense_panels_profile ON defense_panels(profile_id);
CREATE INDEX idx_defense_schedules_date ON defense_schedules(scheduled_at);
CREATE INDEX idx_documents_project ON documents(project_id);
CREATE INDEX idx_document_versions_document ON document_versions(document_id);
CREATE INDEX idx_document_versions_current ON document_versions(document_id) WHERE is_current;
CREATE INDEX idx_annotations_version ON annotations(document_version_id);
CREATE INDEX idx_annotations_page ON annotations(document_version_id, page_number);
CREATE INDEX idx_annotations_status ON annotations(status);
CREATE INDEX idx_annotations_author ON annotations(created_by);
CREATE INDEX idx_evaluations_project ON evaluations(project_id);
CREATE INDEX idx_evaluations_panelist ON evaluations(panelist_id);
CREATE INDEX idx_grading_scores_evaluation ON grading_scores(evaluation_id);
CREATE INDEX idx_notifications_unread ON notifications(profile_id) WHERE read_at IS NULL;
CREATE INDEX idx_audit_profile ON audit_logs(profile_id);
CREATE INDEX idx_audit_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_created ON audit_logs(created_at);
CREATE INDEX idx_activity_event ON activity_logs(event_type, created_at);

-- ============================================================
-- TRIGGERS
-- ============================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_profiles_updated BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER tr_projects_updated BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER tr_documents_updated BEFORE UPDATE ON documents
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER tr_defense_stages_updated BEFORE UPDATE ON defense_stages
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER tr_grading_templates_updated BEFORE UPDATE ON grading_templates
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER tr_defense_schedules_updated BEFORE UPDATE ON defense_schedules
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE OR REPLACE FUNCTION manage_document_version()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE documents
  SET current_version = NEW.version_number, updated_at = NOW()
  WHERE id = NEW.document_id;

  UPDATE document_versions
  SET is_current = FALSE
  WHERE document_id = NEW.document_id AND id <> NEW.id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_document_version AFTER INSERT ON document_versions
  FOR EACH ROW EXECUTE FUNCTION manage_document_version();

CREATE OR REPLACE FUNCTION compute_audit_integrity_hash()
RETURNS TRIGGER AS $$
DECLARE
  prev_hash VARCHAR(64);
BEGIN
  SELECT integrity_hash INTO prev_hash
  FROM audit_logs
  WHERE academic_year = NEW.academic_year
  ORDER BY created_at DESC
  LIMIT 1;

  NEW.integrity_hash = encode(
    digest(
      COALESCE(prev_hash, '') ||
      COALESCE(NEW.id::text, '') ||
      NEW.created_at::text ||
      COALESCE(NEW.profile_id::text, '') ||
      NEW.action_type::text ||
      COALESCE(NEW.new_value::text, ''),
      'sha256'
    ),
    'hex'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_audit_hash BEFORE INSERT ON audit_logs
  FOR EACH ROW EXECUTE FUNCTION compute_audit_integrity_hash();

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    campus_id,
    email,
    first_name,
    last_name
  )
  VALUES (
    NEW.id,
    COALESCE(
      (NEW.raw_user_meta_data->>'campus_id')::uuid,
      '00000000-0000-0000-0000-000000000001'::uuid
    ),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', '')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Prevent audit log tampering
CREATE RULE audit_no_update AS ON UPDATE TO audit_logs DO INSTEAD NOTHING;
CREATE RULE audit_no_delete AS ON DELETE TO audit_logs DO INSTEAD NOTHING;

-- ============================================================
-- HELPER FUNCTIONS FOR RLS
-- ============================================================
CREATE OR REPLACE FUNCTION auth_profile_id()
RETURNS UUID
LANGUAGE sql
STABLE
AS $$
  SELECT auth.uid();
$$;

CREATE OR REPLACE FUNCTION has_role(role_code TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM user_roles ur
    JOIN roles r ON r.id = ur.role_id
    WHERE ur.profile_id = auth.uid()
      AND r.code = role_code
  );
$$;

CREATE OR REPLACE FUNCTION is_project_participant(p_project_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM projects p
    JOIN students s ON s.id = p.student_id
    WHERE p.id = p_project_id
      AND s.profile_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM project_members pm
    WHERE pm.project_id = p_project_id
      AND pm.profile_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM defense_panels dp
    WHERE dp.project_id = p_project_id
      AND dp.profile_id = auth.uid()
  );
$$;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE faculty ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE annotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE annotation_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE grading_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE defense_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE defense_panels ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- Profiles: users read/update own profile
CREATE POLICY profiles_select_own ON profiles FOR SELECT
  USING (id = auth.uid() OR has_role('sys_admin') OR has_role('college_coordinator'));

CREATE POLICY profiles_update_own ON profiles FOR UPDATE
  USING (id = auth.uid());

-- Projects: participants + coordinators
CREATE POLICY projects_select ON projects FOR SELECT
  USING (
    is_project_participant(id)
    OR has_role('dept_coordinator')
    OR has_role('college_coordinator')
    OR has_role('sys_admin')
  );

-- Documents: project participants
CREATE POLICY documents_select ON documents FOR SELECT
  USING (
    is_project_participant(project_id)
    OR has_role('dept_coordinator')
    OR has_role('college_coordinator')
    OR has_role('sys_admin')
  );

CREATE POLICY documents_insert ON documents FOR INSERT
  WITH CHECK (is_project_participant(project_id));

-- Document versions
CREATE POLICY document_versions_select ON document_versions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM documents d
      WHERE d.id = document_versions.document_id
        AND (
          is_project_participant(d.project_id)
          OR has_role('dept_coordinator')
          OR has_role('college_coordinator')
          OR has_role('sys_admin')
        )
    )
  );

-- Annotations: participants; students can reply but faculty create
CREATE POLICY annotations_select ON annotations FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM document_versions dv
      JOIN documents d ON d.id = dv.document_id
      WHERE dv.id = annotations.document_version_id
        AND (
          is_project_participant(d.project_id)
          OR has_role('dept_coordinator')
          OR has_role('sys_admin')
        )
    )
  );

CREATE POLICY annotations_insert ON annotations FOR INSERT
  WITH CHECK (
    created_by = auth.uid()
    AND NOT has_role('student')
  );

CREATE POLICY annotation_replies_select ON annotation_replies FOR SELECT
  USING (true);

CREATE POLICY annotation_replies_insert ON annotation_replies FOR INSERT
  WITH CHECK (created_by = auth.uid());

-- Evaluations: panelist owns; coordinators read submitted
CREATE POLICY evaluations_panelist ON evaluations FOR ALL
  USING (panelist_id = auth.uid())
  WITH CHECK (panelist_id = auth.uid());

CREATE POLICY evaluations_coordinator_read ON evaluations FOR SELECT
  USING (
    has_role('dept_coordinator')
    OR has_role('college_coordinator')
    OR has_role('sys_admin')
  );

CREATE POLICY grading_scores_panelist ON grading_scores FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM evaluations e
      WHERE e.id = grading_scores.evaluation_id
        AND e.panelist_id = auth.uid()
    )
  );

-- Notifications: own only
CREATE POLICY notifications_own ON notifications FOR ALL
  USING (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());

-- Audit: coordinators and admins read only
CREATE POLICY audit_read ON audit_logs FOR SELECT
  USING (
    has_role('dept_coordinator')
    OR has_role('college_coordinator')
    OR has_role('sys_admin')
  );

-- Defense schedules & panels
CREATE POLICY defense_schedules_select ON defense_schedules FOR SELECT
  USING (
    is_project_participant(project_id)
    OR has_role('dept_coordinator')
    OR has_role('college_coordinator')
    OR has_role('sys_admin')
  );

CREATE POLICY defense_panels_select ON defense_panels FOR SELECT
  USING (
    is_project_participant(project_id)
    OR has_role('dept_coordinator')
    OR has_role('sys_admin')
  );

-- Reports: coordinators+
CREATE POLICY reports_select ON reports FOR SELECT
  USING (
    generated_by = auth.uid()
    OR has_role('dept_coordinator')
    OR has_role('college_coordinator')
    OR has_role('sys_admin')
  );
