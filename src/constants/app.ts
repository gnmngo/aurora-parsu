export const APP_NAME = "AURORA";
export const APP_FULL_NAME =
  "Academic Unified Review, Observation, Rating, and Assessment System";
export const INSTITUTION = "Partido State University – Goa Campus";

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
