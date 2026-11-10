export const APP_NAME = "AURORA";
export const APP_ACRONYM_MEANING =
  "Academic Unified Review, Observation, Rating, and Assessment System";
export const APP_ACRONYM_BREAKDOWN = [
  { letter: "A", word: "Academic" },
  { letter: "U", word: "Unified" },
  { letter: "R", word: "Review" },
  { letter: "O", word: "Observation" },
  { letter: "R", word: "Rating, and" },
  { letter: "A", word: "Assessment System" },
] as const;
export const APP_FULL_NAME =
  "Paperless Academic Defense Workflow System for Research, Capstone, Thesis & Dissertation Papers";
export const APP_OFFICIAL_TITLE =
  "Paperless Academic Defense Workflow System for Research, Capstone, Thesis & Dissertation Papers at Partido State University";
export const INSTITUTION = "Partido State University";
export const INSTITUTION_CAMPUS = "Partido State University – Goa Campus";

export const DEFAULT_DEFENSE_SEASON = "AY 2026-2027";
export const DEFAULT_ACADEMIC_YEAR = "2026-2027";

export const PARSU_CAMPUS_ID = "00000000-0000-0000-0000-000000000001";

export const ACCEPTED_DOCUMENT_TYPES = {
  "application/pdf": [".pdf"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [
    ".docx",
  ],
} as const;

export const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50MB

export const STORAGE_BUCKETS = {
  MANUSCRIPTS: "manuscripts",
  EXPORTS: "exports",
  AVATARS: "avatars",
} as const;
