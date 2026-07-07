# AURORA Production Deployment Checklist
**Partido State University – Goa Campus**

---

## 🔒 1. Security & Row Level Security (RLS)

- [x] **Enforce RLS on all tables**: Confirm that all custom tables inside `public` schema have RLS enabled.
  ```sql
  ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
  ```
- [x] **Audit Roles Protection Policies**: Verify that users can only select projects matching their scopes or registrations, and only System Administrators/Coordinators hold write access to setup configs.
- [x] **Private Storage Buckets**: Verify the `manuscripts` bucket is private. Ensure signed URLs expire within 1 hour.

---

## 💾 2. Database Backup & Recovery Plan

- [x] **Local Backup Utilities**: Utilize the powershell scripts located at `docs/scripts/` for weekly dumps.
  - Run `./docs/scripts/backup-db.ps1` to dump schemas.
  - Run `./docs/scripts/backup-storage.ps1` to sync files.

---

## 🚀 3. Environment Variables (Vercel)

Ensure the following variables are configured in Vercel before launching the build:

```env
NEXT_PUBLIC_SUPABASE_URL=https://<ref-id>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=ey...
SUPABASE_SERVICE_ROLE_KEY=ey...
NEXT_PUBLIC_APP_URL=https://aurora-defense.vercel.app
NEXT_PUBLIC_CAMPUS_ID=00000000-0000-0000-0000-000000000001
```
