import type {
  AnnotationType,
  DefenseStageCode,
  ProjectStatus,
  RoleCode,
  ScoringModel,
} from "./enums";

export interface Campus {
  id: string;
  name: string;
  code: string;
  address: string | null;
  settings: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface College {
  id: string;
  campus_id: string;
  name: string;
  code: string;
  is_active: boolean;
}

export interface Department {
  id: string;
  college_id: string;
  name: string;
  code: string;
  is_active: boolean;
}

export interface Role {
  id: string;
  name: string;
  code: RoleCode;
  description: string | null;
  hierarchy: number;
}

export interface Profile {
  id: string;
  campus_id: string;
  college_id: string | null;
  department_id: string | null;
  email: string;
  first_name: string;
  last_name: string;
  middle_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  status: "active" | "inactive" | "suspended";
  mfa_enabled: boolean;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Student {
  id: string;
  profile_id: string;
  student_number: string;
  program: string | null;
  year_level: number | null;
}

export interface Faculty {
  id: string;
  profile_id: string;
  employee_number: string;
  rank: string | null;
  specialization: string | null;
  is_adviser: boolean;
  is_panelist: boolean;
}

export interface DefenseStage {
  id: string;
  campus_id: string;
  code: DefenseStageCode;
  name: string;
  sequence_order: number;
  description: string | null;
  is_enabled: boolean;
  required_documents: string[];
  requirements: Record<string, unknown>;
  passing_score: number;
}

export interface Project {
  id: string;
  campus_id: string;
  department_id: string;
  student_id: string;
  title: string;
  abstract: string | null;
  keywords: string[] | null;
  current_stage_id: string | null;
  status: ProjectStatus;
  academic_year: string;
  semester: string | null;
  system_completion_pct: number;
  final_score: number | null;
  final_verdict: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Document {
  id: string;
  project_id: string;
  stage_id: string;
  title: string;
  status: string;
  current_version: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface DocumentVersion {
  id: string;
  document_id: string;
  version_number: number;
  storage_path: string;
  file_url: string | null;
  file_name: string;
  file_size: number;
  mime_type: string;
  checksum_sha256: string;
  page_count: number | null;
  extracted_text: string | null;
  chapter_outline: ChapterOutlineItem[];
  upload_notes: string | null;
  change_summary: string | null;
  is_current: boolean;
  uploaded_by: string;
  created_at: string;
}

export interface ChapterOutlineItem {
  title: string;
  page: number;
  level: number;
  children?: ChapterOutlineItem[];
}

/** Percentage-based coordinates (0–100), zoom-independent */
export interface AnnotationCoordinates {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface Annotation {
  id: string;
  document_version_id: string;
  parent_id: string | null;
  type: AnnotationType;
  page_number: number;
  coordinates: AnnotationCoordinates;
  selected_text: string | null;
  content: string | null;
  category_id: string | null;
  severity: "info" | "minor" | "major" | "critical";
  status: "open" | "resolved" | "archived";
  author_role: string | null;
  version_checksum: string | null;
  is_stale: boolean;
  revision_completed: boolean;
  revision_completed_at: string | null;
  revision_completed_by: string | null;
  created_by: string;
  resolved_by: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AnnotationReply {
  id: string;
  annotation_id: string;
  content: string;
  created_by: string;
  created_at: string;
}

export interface GradingTemplate {
  id: string;
  campus_id: string;
  college_id: string | null;
  stage_id: string;
  name: string;
  description: string | null;
  scoring_model: ScoringModel;
  passing_score: number;
  max_score: number;
  custom_formula: string | null;
  is_active: boolean;
  version: number;
}

export interface GradingCriterion {
  id: string;
  template_id: string;
  name: string;
  description: string | null;
  weight: number;
  max_score: number;
  sort_order: number;
  is_required: boolean;
}

export interface GradingSubcriterion {
  id: string;
  criterion_id: string;
  name: string;
  description: string | null;
  max_score: number;
  sort_order: number;
}

export interface RubricCriterionJson {
  id: string;
  name: string;
  weight: number;
}

export interface RubricTemplate {
  id: string;
  project_id: string;
  title: string;
  criteria: RubricCriterionJson[];
  passing_score: number;
  excellent_score: number;
  target_compliance_rate: number;
  min_compliance_rate: number;
  max_major_unresolved: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Evaluation {
  id: string;
  project_id: string;
  stage_id: string;
  panelist_id: string;
  template_id: string | null;
  rubric_template_id: string | null;
  status: "draft" | "submitted" | "locked";
  total_score: number | null;
  weighted_score: number | null;
  scores: Record<string, number>;
  verdict_code: string | null;
  recommendations: string | null;
  panel_notes: string | null;
  submitted_at: string | null;
}

export interface EvaluationEvent {
  id: string;
  project_id: string;
  stage_id: string | null;
  event_type:
    | "annotation_created"
    | "annotation_updated"
    | "annotation_verified"
    | "evaluation_submitted"
    | "document_version_uploaded";
  payload: Record<string, unknown>;
  created_at: string;
}

export interface ProjectScoreCache {
  project_id: string;
  stage_id: string | null;
  avg_score: number | null;
  compliance_rate: number | null;
  readiness_level: string | null;
  last_updated: string;
}

export interface GradingScore {
  id: string;
  evaluation_id: string;
  criterion_id: string;
  subcriterion_id: string | null;
  score: number;
  notes: string | null;
}

export interface DefenseSchedule {
  id: string;
  project_id: string;
  stage_id: string;
  scheduled_at: string;
  end_at: string | null;
  room: string | null;
  building: string | null;
  is_online: boolean;
  meeting_url: string | null;
  duration_minutes: number;
  status: string;
  notes: string | null;
}

export interface DefensePanel {
  id: string;
  project_id: string;
  stage_id: string;
  profile_id: string;
  panel_role: "chair" | "member";
  assigned_at: string;
}

export interface Notification {
  id: string;
  profile_id: string;
  title: string;
  message: string;
  type: string;
  link: string | null;
  metadata: Record<string, unknown>;
  read_at: string | null;
  created_at: string;
}

export interface AuditLog {
  id: string;
  academic_year: string;
  profile_id: string | null;
  user_email: string;
  user_role: string | null;
  action_type: string;
  module: string;
  entity_type: string;
  entity_id: string;
  description: string;
  old_value: Record<string, unknown> | null;
  new_value: Record<string, unknown> | null;
  amount_changed: string | null;
  reason: string | null;
  ip_address: string | null;
  created_at: string;
}

export interface Report {
  id: string;
  report_type: string;
  format: "pdf" | "xlsx" | "csv";
  title: string;
  scope_type: string | null;
  scope_id: string | null;
  storage_path: string | null;
  generated_by: string;
  generated_at: string;
}
