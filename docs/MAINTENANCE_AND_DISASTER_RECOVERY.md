# AURORA — Maintenance & Troubleshooting Guide and Disaster Recovery & Data Backup Plan

**System:** AURORA (Academic Unified Research & Oral Defense Review Application)  
**Institution:** Partido State University (ParSU)  
**In-App Console Route:** `/admin/system-health` (*Administration → Maintenance & DR Backup*)  
**Compliance Standards:** ISO/IEC 25010 (Maintainability & Recoverability), Republic Act No. 8792 (Electronic Commerce Act of 2000), Republic Act No. 10173 (Data Privacy Act of 2012 / NPC Circular 16-01)

---

## Part I: Disaster Recovery & Data Backup Plan (DRP / BCP)

### 1. Recovery Objectives (SLAs)
| Metric | Target | Operational Mechanism |
| :--- | :--- | :--- |
| **Recovery Time Objective (RTO)** | **$\le 4$ Hours** | Automated Vercel immutable build promotion + Supabase Point-in-Time Recovery (PITR) & JSON Snapshot restoration. |
| **Recovery Point Objective (RPO)** | **$\le 24$ Hours** *(Near-zero via WAL)* | Continuous Write-Ahead Logging (WAL) + Automated Daily Database Backups + On-Demand Signed JSON Exports prior to defense weeks. |
| **Cryptographic Integrity** | **FIPS 180-4 SHA-256** | Every manuscript PDF version (`document_versions.checksum_sha256`) and every exported backup archive (`AURORA_DR_Backup_*.json`) includes a verifiable 256-bit SHA-256 digest. |

### 2. 3-2-1 Institutional Backup Strategy
1. **Copy 1 (Primary Live Production):** PostgreSQL 15 relational cluster with Row-Level Security (RLS) and private S3-compatible object buckets (`manuscripts`, `signatures`, `certificates`).
2. **Copy 2 (Cloud Automated Daily Snapshots & WAL):** Automated daily PostgreSQL snapshots retained for 30 days alongside Write-Ahead Log (WAL) segments enabling Point-in-Time Recovery (PITR).
3. **Copy 3 (Offsite Cold Institutional Snapshots):** Weekly and pre-defense on-demand JSON/SQL snapshots generated via `/admin/system-health` (**Export DR Backup Snapshot**), signed with a SHA-256 checksum manifest, and stored in the university's offsite institutional archive.

### 3. Step-by-Step Disaster Recovery Playbooks

#### Scenario A: Relational Database Corruption or Accidental Deletion (`RTO <= 2 Hours`)
1. Restrict incoming write operations or enable maintenance mode.
2. For cluster-wide rollback, trigger **Supabase Point-in-Time Recovery (PITR)** to the exact timestamp preceding the incident.
3. For selective table restoration (`projects`, `documents`, `document_versions`, `annotations`, `defense_schedules`, `evaluations`, `certificates`, `iso_evaluations`):
   - Open `/admin/system-health` → **Tab 2: Disaster Recovery & Data Backup Plan**.
   - Upload the latest `AURORA_DR_Backup_YYYY-MM-DD_*.json` into the **Backup Snapshot Integrity & SHA-256 Verifier** to confirm 100% checksum match.
   - Restore the affected table records using the service-role client.
4. Click **Run Self-Healing Maintenance** in `/admin/system-health` to repair any foreign-key version pointers (`is_current`) and log the recovery action to `audit_logs`.

#### Scenario B: Manuscript PDF Storage Bucket Outage or File Tampering (`RTO <= 3 Hours`)
1. Query `document_versions` and compare the stored `checksum_sha256` column against the binary SHA-256 hash of files in the `manuscripts` bucket.
2. Restore any missing or altered PDF objects from the replicated institutional S3 bucket archive.
3. Re-verify the SHA-256 digest before re-opening the defense workspace.

#### Scenario C: Compromised Credentials or Unauthorized Access (`RTO <= 30 Minutes`)
1. Navigate to `/admin/users` (**User Management & Security**) and set the compromised account status to `suspended` (middleware immediately revokes active sessions on the next request).
2. If administrative keys were exposed, rotate `SUPABASE_SERVICE_ROLE_KEY` in the production environment configuration.
3. Inspect `/admin/audit` (**Audit Logs**) by `user_email` and `ip_address` to trace all transactions executed during the incident window.

#### Scenario D: Cloud Application Host Failover (`RTO <= 15 Minutes`)
1. Promote the last known-good immutable production deployment in Vercel / container registry.
2. Confirm environment variables (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`).
3. Run **Re-Run Diagnostics** in `/admin/system-health` to verify all 6 core subsystems report `healthy`.

---

## Part II: Preventive Maintenance & Troubleshooting Guide

### 1. Preventive Maintenance Schedule (SOP)
- **Daily:**
  - Verify PostgreSQL connection pool health, RLS enforcement, and Realtime WSS status in `/admin/system-health`.
  - Confirm automated daily database backup completion.
- **Weekly (Every Friday, 5:00 PM):**
  - Click **Export DR Backup Snapshot** in `/admin/system-health` and store the `.json` archive in offsite institutional storage.
  - Click **Run Self-Healing Maintenance** to automatically repair any orphaned `document_versions.is_current` flags and ensure all approved faculty have active RA 8792 baseline electronic signatures.
  - Review `/admin/audit` for anomalous login or role-escalation events.
- **Monthly:**
  - Audit S3 storage usage for `manuscripts` and `certificates` buckets.
  - Validate the latest exported `AURORA_DR_Backup_*.json` file using the built-in **SHA-256 Verifier**.
- **Per Semester / Academic Year Rollover:**
  - Archive completed capstone dockets and verifiable clearance certificates.
  - Configure college-specific **Defense Stages** (`/admin/stages`) and **Rubric Templates** (`/admin/rubrics`) for the new semester.

### 2. Module Troubleshooting Matrix

| Module | Symptom / Issue | Root Cause | Step-by-Step Resolution |
| :--- | :--- | :--- | :--- |
| **Authentication & RBAC** | User logs in but sees *Pending Approval* or different dashboard links. | Account status is `pending` or multi-role user has a different role selected in the header Role Switcher. | 1. Approve the account in `/admin/users`.<br>2. Use the **Role Switcher** pill in the top header to switch active role context (`Student`, `Adviser`, `Panelist`, `Coordinator`, `College Dean`, `SysAdmin`). |
| **Manuscript PDF Upload** | Uploaded PDF does not appear as current version in Workspace or Adviser Queue. | Upload interrupted before `is_current` pointer update completed. | 1. Go to `/admin/system-health` and click **Run Self-Healing Maintenance**.<br>2. Verify manuscript status in `/dashboard/submissions` is `under_review` (`pending` adviser endorsement). |
| **Split-Screen Workspace** | Realtime annotations do not sync immediately across panelists. | Transient WebSocket (WSS) disconnect or network sleep. | 1. Reselect the stage in the workspace header or refresh to re-attach the Supabase WAL Realtime channel.<br>2. Ensure port `443` WSS traffic to `*.supabase.co` is permitted. |
| **Defense Scheduling** | *Room Conflict* or *Panelist Overlapping Schedule* error when scheduling. | Another non-cancelled defense occupies the same room or panelist time window. | 1. Check `/dashboard/defenses` for overlapping `scheduled`/`rescheduled` sessions.<br>2. Cancel or reschedule postponed sessions first, or use **Batch Auto-Schedule**. |
| **Rubric Grading & Verdicts** | Rubric template fails to save or panelist cannot lock evaluation. | Criterion weights do not total `100%`, or panelist lacks an active electronic signature. | 1. Ensure criterion weights in `/admin/rubrics` sum to `100%`.<br>2. Register a signature in `/dashboard/settings` or run **Self-Healing Maintenance**. |
| **Certificates & Signatures** | Serial verification (`/verify/[serial]`) fails to match. | Serial code typo or signatory had no active signature at signing time. | 1. Copy the exact serial (`AURORA-YYYY-XXXX`) from `/dashboard/grades`.<br>2. Verify at `/verify` to inspect the cryptographic SHA-256 signature hash. |
