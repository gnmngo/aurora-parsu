# Module 01: Foundation & Database

## Status: ✅ Complete

## What Was Built

1. Next.js project scaffold (`aurora-parsu`)
2. Complete PostgreSQL schema (30+ tables)
3. Supabase migrations + seed data
4. Storage bucket policies
5. TypeScript types and enums
6. Supabase client utilities
7. Auth middleware shell (used in Module 02)

## Folder Structure Created

```
aurora-parsu/
├── docs/
│   ├── ARCHITECTURE.md
│   └── modules/
│       └── MODULE-01-FOUNDATION.md
├── supabase/
│   ├── config.toml
│   ├── seed.sql
│   └── migrations/
│       ├── 20250609000001_initial_schema.sql
│       └── 20250609000002_storage_policies.sql
├── src/
│   ├── app/
│   ├── components/
│   │   ├── ui/           # shadcn (Module 02+)
│   │   ├── layout/       # Module 03
│   │   ├── workspace/    # Module 07
│   │   ├── annotations/  # Module 06
│   │   ├── documents/    # Module 04
│   │   ├── grading/      # Module 08
│   │   └── analytics/    # Module 11
│   ├── hooks/
│   ├── lib/
│   │   ├── supabase/
│   │   └── utils.ts
│   ├── providers/
│   ├── stores/
│   ├── types/
│   │   ├── database.ts
│   │   └── enums.ts
│   └── constants/
└── .env.local.example
```

## Supabase Setup Steps

### 1. Create Supabase Project

1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Create project: `aurora-parsu`
3. Region: Singapore (closest to Philippines)
4. Copy Project URL and anon key

### 2. Configure Environment

```bash
cp .env.local.example .env.local
```

Fill in:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

### 3. Run Migrations

**Option A — Supabase Dashboard (recommended for capstone)**

1. Open SQL Editor
2. Paste contents of `supabase/migrations/20250609000001_initial_schema.sql`
3. Run
4. Paste contents of `supabase/migrations/20250609000002_storage_policies.sql`
5. Run
6. Paste contents of `supabase/seed.sql`
7. Run

**Option B — Supabase CLI**

```bash
npm install -g supabase
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
psql $DATABASE_URL -f supabase/seed.sql
```

### 4. Enable Realtime

In Supabase Dashboard → Database → Replication:
- Enable realtime for: `annotations`, `annotation_replies`, `notifications`

## Testing Procedures (Module 01)

### Test 1: Verify Tables

```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
```

Expected: 30+ tables including `projects`, `documents`, `annotations`, `grading_templates`.

### Test 2: Verify Seed Data

```sql
SELECT name FROM colleges;
SELECT code, name FROM defense_stages ORDER BY sequence_order;
SELECT code, name FROM roles ORDER BY hierarchy DESC;
```

Expected:
- 5 ParSU colleges
- 5 defense stages
- 8 roles

### Test 3: Verify RLS Enabled

```sql
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public' AND rowsecurity = true;
```

### Test 4: Verify Storage Buckets

```sql
SELECT id, name, public FROM storage.buckets;
```

Expected: `manuscripts`, `exports`, `avatars`

### Test 5: Verify Triggers

```sql
SELECT trigger_name, event_object_table
FROM information_schema.triggers
WHERE trigger_schema = 'public';
```

### Test 6: Local App Starts

```bash
npm run dev
```

Visit `http://localhost:3000` — should load without errors.

## Security Rules (Module 01)

| Table | RLS | Policy Summary |
|-------|-----|----------------|
| profiles | ✅ | Own profile read/update |
| projects | ✅ | Participants + coordinators |
| documents | ✅ | Project participants |
| annotations | ✅ | Participants view; faculty create |
| evaluations | ✅ | Panelist owns; coordinators read |
| notifications | ✅ | Own notifications only |
| audit_logs | ✅ | Coordinators+ read only |
| storage.manuscripts | ✅ | Authenticated access |

## Next Module

**Module 02: Authentication & RBAC**
- Login / Register pages
- Auth callback route
- Role-based redirect
- Profile completion flow
