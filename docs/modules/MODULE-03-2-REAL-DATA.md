# Module 03.2: Real-Data Academic Evaluation Platform

## Status: Complete

## Changes Summary

### Phase 1 — Clean System Mode
- Removed `src/lib/mock-data.ts`
- `analytics-charts.tsx` now queries Supabase via `src/lib/analytics/queries.ts`
- All dashboards show empty states when no real data exists

### Phase 2 — Rubric System
- `rubric_templates` table (migration `20260610000004`)
- Weight validation trigger (sum = 100)
- `evaluations.rubric_template_id` + `evaluations.scores` JSONB
- RLS policies added in migration `20260610000005`

### Phase 3 — Scoring Logic
- `compute_evaluation_score()` — weighted from rubric criteria
- `process_evaluation_event()` — loads thresholds from `rubric_templates`
- `project_readiness_status` view updated to use rubric thresholds

### Phase 4 — PDF Ingestion
- `pdf-uploader.tsx` — real PDF only, SHA-256 checksum, signed URLs
- Storage path: `{projectId}/{stageId}/{timestamp}_{hash}.pdf`
- `document_versions.file_url` column added
- Fires `document_version_uploaded` event on upload

### Phase 5 — PDF + Annotations
- `pdf-viewer-panel.tsx` — PDF.js canvas, percentage coordinates
- Text selection for highlights, click placement for comments
- Overlays scale with zoom (percentage-based positioning)

### Phase 6 — Dynamic Grading Panel
- Loads `rubric_templates` per project
- Live weighted score via `src/lib/rubric/scoring.ts`
- Submits with `rubric_template_id` linked

### Phase 7 — Event Integrity
Events fire only from:
- `pdf-uploader.tsx` → `document_version_uploaded`
- `pdf-viewer-panel.tsx` → `annotation_created`
- `grading-panel.tsx` → `annotation_updated`, `annotation_verified`, `evaluation_submitted`

## Run Migration

```sql
-- In Supabase SQL Editor, run:
-- supabase/migrations/20260610000005_module_03_2_cleanup.sql
```

## Testing Checklist

1. Upload a real PDF → verify `document_versions` row + signed URL
2. Open workspace → PDF renders from signed URL
3. Add highlight (select text) → coordinates stored as percentages
4. Create rubric → weights must sum to 100
5. Submit evaluation → `total_score` computed by DB trigger
6. Check `project_score_cache` updates after event insert
7. Analytics page shows empty state OR real charts (no mock data)
