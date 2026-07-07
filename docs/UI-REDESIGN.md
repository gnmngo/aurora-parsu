# AURORA UI/UX Redesign

## Design System (SERENA-aligned)

| Token | Value |
|-------|-------|
| Primary | `#343434` |
| Background | `#F5F7FA` |
| Cards | `#FFFFFF` |
| Border | `#E5E7EB` |
| Success | `#22C55E` |
| Danger | `#EF4444` |
| Warning | `#F59E0B` |
| Info | `#3B82F6` |
| Font | Inter |
| Card radius | `rounded-xl` |
| Shadows | `shadow-sm` → `hover:shadow-md` |

## Routes

| Route | Description |
|-------|-------------|
| `/` | Marketing landing page |
| `/login` | Sign in + demo mode |
| `/dashboard` | Main dashboard with KPIs + pipeline |
| `/dashboard/defenses` | Defense stage progress |
| `/dashboard/submissions` | Submission management cards |
| `/dashboard/annotations` | Annotation feed |
| `/dashboard/grades` | Rubric score breakdown |
| `/dashboard/notifications` | Notification center |
| `/dashboard/analytics` | Recharts analytics |
| `/dashboard/settings` | Profile settings |
| `/workspace/[projectId]/[stageId]` | Split-screen review workspace |
| `/admin/users` | User management |
| `/admin/rubrics` | Rubric configuration |
| `/admin/stages` | Defense stage config |
| `/admin/reports` | Report generator |
| `/admin/audit` | Audit trail |

## Key Components

- `src/components/layout/app-sidebar.tsx` — Fixed sidebar + mobile drawer
- `src/components/layout/app-header.tsx` — Sticky header with search + notifications
- `src/components/dashboard/defense-pipeline.tsx` — Signature pipeline visualization
- `src/components/dashboard/kpi-cards.tsx` — Premium KPI cards with trends
- `src/components/workspace/pdf-viewer-panel.tsx` — PDF viewer (70%)
- `src/components/workspace/grading-panel.tsx` — Grading workspace (30%)
- `src/components/analytics/analytics-charts.tsx` — Recharts dashboards

## Demo Mode

Set `NEXT_PUBLIC_DEMO_MODE=true` in `.env.local` to bypass Supabase auth and preview the full UI with mock data.

## Preview

```bash
npm run dev
```

- Dashboard: http://localhost:3000/dashboard
- Workspace: http://localhost:3000/workspace/proj-001/s3
