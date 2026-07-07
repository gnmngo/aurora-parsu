export const ROLES = {
  SYS_ADMIN: "sys_admin",
  COORDINATOR: "coordinator",
  ADVISER: "adviser",
  PANELIST: "panelist",
  STUDENT: "student",
} as const;

export type RoleCode = (typeof ROLES)[keyof typeof ROLES];

export const DEFENSE_STAGE_CODES = {
  CONCEPT: "concept",
  TITLE: "title",
  PROGRESS_1: "progress_1",
  PROGRESS_2: "progress_2",
  FINAL: "final",
} as const;

export type DefenseStageCode =
  (typeof DEFENSE_STAGE_CODES)[keyof typeof DEFENSE_STAGE_CODES];

export const ANNOTATION_TYPES = {
  HIGHLIGHT: "highlight",
  UNDERLINE: "underline",
  STRIKE_THROUGH: "strike_through",
  STICKY_NOTE: "sticky_note",
  TEXT_COMMENT: "text_comment",
  CORRECTION_NOTE: "correction_note",
  RECOMMENDATION: "recommendation",
  RESEARCH_CONCERN: "research_concern",
  METHODOLOGY_CONCERN: "methodology_concern",
  FORMATTING_CONCERN: "formatting_concern",
  GRAMMAR_CONCERN: "grammar_concern",
} as const;

export type AnnotationType =
  (typeof ANNOTATION_TYPES)[keyof typeof ANNOTATION_TYPES];

export const PROJECT_STATUS = {
  DRAFT: "draft",
  SUBMITTED: "submitted",
  UNDER_REVIEW: "under_review",
  SCHEDULED: "scheduled",
  IN_PROGRESS: "in_progress",
  REVISION_REQUIRED: "revision_required",
  PASSED: "passed",
  PASSED_MINOR: "passed_minor",
  PASSED_MAJOR: "passed_major",
  CONDITIONAL: "conditional",
  FAILED: "failed",
  ARCHIVED: "archived",
} as const;

export type ProjectStatus =
  (typeof PROJECT_STATUS)[keyof typeof PROJECT_STATUS];

export const SCORING_MODELS = {
  WEIGHTED_AVERAGE: "weighted_average",
  PERCENTAGE: "percentage",
  CUSTOM_FORMULA: "custom_formula",
} as const;

export type ScoringModel =
  (typeof SCORING_MODELS)[keyof typeof SCORING_MODELS];
