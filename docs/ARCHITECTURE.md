# AURORA System Architecture

**Academic Unified Review, Observation, Rating, and Assessment System**  
**Institution:** Partido State University – Goa Campus

## Module Map

| Module | Status | Description |
|--------|--------|-------------|
| M01 | ✅ Current | Foundation, Database, Supabase Setup |
| M02 | Pending | Authentication & RBAC |
| M03 | Pending | Dashboard Shell & Navigation |
| M04 | Pending | Document Submission System |
| M05 | Pending | PDF Viewer |
| M06 | Pending | Annotation Engine |
| M07 | Pending | Split-Screen Defense Workspace |
| M08 | Pending | Grading Engine |
| M09 | Pending | Defense Management |
| M10 | Pending | Audit Trail |
| M11 | Pending | Analytics Engine |
| M12 | Pending | Report Generator |
| M13 | Pending | Notifications |
| M14 | Pending | Testing & Deployment |

## Technology Stack

```
┌─────────────────────────────────────────────────────────┐
│  Vercel (CDN + Edge)                                    │
│  Next.js 15 App Router + TypeScript                     │
│  Tailwind CSS + shadcn/ui + React Query + Zustand       │
└───────────────────────┬─────────────────────────────────┘
                        │ HTTPS / JWT
┌───────────────────────▼─────────────────────────────────┐
│  Supabase                                               │
│  ├── Auth (JWT)                                         │
│  ├── PostgreSQL + RLS                                   │
│  ├── Storage (manuscripts, exports)                     │
│  ├── Realtime (annotations, notifications)              │
│  └── Edge Functions (audit, PDF processing)             │
└─────────────────────────────────────────────────────────┘
```

## Core Data Domains

1. **Organization** — campuses, colleges, departments
2. **Identity** — profiles, students, faculty, roles
3. **Projects** — thesis/capstone records per student
4. **Defense** — stages, schedules, panels
5. **Documents** — manuscripts with version control
6. **Annotations** — anchored comments on PDFs
7. **Grading** — templates, criteria, scores, verdicts
8. **Governance** — audit logs, activity logs, reports
9. **Engagement** — notifications

## Security Layers

1. Vercel middleware — route protection, rate limiting
2. Supabase Auth — JWT sessions
3. RBAC — role_permissions table
4. PostgreSQL RLS — row-level data isolation
5. Storage policies — bucket-level file access
6. Audit trail — immutable append-only logs

## Flagship Feature

**Split-Screen Defense Workspace** (`/workspace/[projectId]/[stageId]`)

- Left 70%: PDF viewer + annotations
- Right 30%: Rubric evaluation panel
- Real-time sync via Supabase Realtime
