# PARTIDO STATE UNIVERSITY
### College of Engineering and Computational Sciences
**Department of Computational Sciences | Bachelor of Science in Information Technology**  
*San Juan Bautista, Goa, Camarines Sur, Philippines 4422*  
*Website: www.parsu.edu.ph | Contact No.: (054) 871-2090 | ISO 9001:2015 Certified*

---

# ANNEX J: USER & SYSTEM MANUALS
## Project: AURORA: Paperless Academic Defense Workflow System for Research, Capstone, Thesis & Dissertation Papers at Partido State University

---

## J.1 USER'S GUIDE / ROLE MANUALS

AURORA provides dedicated operational guides for each institutional stakeholder group:

### J.1.1 Student Proponent Guide
1. **Accessing the Portal:** Visit `https://aurora-parsu.vercel.app/login` and log in using your institutional email.
2. **Team Formation:** The lead proponent clicks **Create Project**, inputs the approved title, and shares the generated 8-character **Join Code** with teammates.
3. **Manuscript Submission:** Navigate to **Submissions** or **My Project**, drag-and-drop your latest PDF manuscript, and select the target defense stage from your college's customized workflow (5 stages for BSIT: Concept Defense, Title Defense, Progress Report 1, Progress Report 2, Final Defense; 3 customizable stages for other colleges). The system computes its FIPS 180-4 SHA-256 fingerprint and sets status to `under_review` (`pending` adviser endorsement).
4. **Filing Defense Application (Form DCS-CF-01 for BSIT / U-CF-03 for Other Colleges):** Fill in the requirements checklist (Turnitin score, adviser clearance, preferred defense dates). For BSIT Title Defense, complete the official Application for Oral Defense (`DCS-CF-01`) listing the three proposed project concepts, which upon adviser recommendation endorses the group to proceed to the Progress Report defense stages.
5. **Viewing Feedback & Remarks:** Open the **Annotations** view or **Review Workspace** to view adviser and panelist comments. Click on any annotation to jump to the highlighted page segment and reply to notes.
6. **Accessing Defense Outcomes:** Check the **Grades** tab to review composite panel evaluations, download Form DCS-CF-04, and view your verifiable clearance certificate serial number (`AURORA-YYYY-XXXX`).

### J.1.2 Research Adviser Guide (e.g., Prof. Froiland B. Peñalosa)
1. **Advisee Directory:** Click **Dashboard** or **Submissions** to view all capstone groups under your supervision.
2. **Dual-Pane Annotation:** Open the project in the **Review Workspace** (`/workspace`). Select text or draw freehand / bounding-box annotations directly on the manuscript PDF. Categorize comments by severity (*Critical*, *Major*, *Minor*) and tag rubric criteria.
3. **Endorsing for Defense:** When satisfied with revisions, click **Approve & Endorse for Defense** (or **Request Revisions**) on the manuscript card. Endorsement automatically unlocks the project for defense scheduling by the Coordinator.

### J.1.3 Faculty Panel Evaluator Guide
1. **Defense Calendar:** View your assigned deliberation schedule under **Defenses**.
2. **Live Evaluation Workspace:** During the oral defense, launch the split-screen **Review Workspace** (`/workspace/[projectId]/[stageId]`) to view the PDF manuscript on the left and the interactive rubric scoring drawer on the right.
3. **Scoring Criteria (DCS-CF-04):** Score each dynamic rubric criterion (weights normalized to 100%).
4. **Digital Signature (RA 8792):** Ensure your official signature baseline is registered in **Settings** (`/dashboard/settings`) or draw/upload your signature directly in the signing modal, then click **Finalize & Lock Evaluation**.

---

## J.2 SYSTEM ADMINISTRATOR MANUAL

### J.2.1 Defense Coordinator Command Hub
1. **Application & Endorsement Vetting:** Review adviser-endorsed manuscripts and DCS-CF-03 applications.
2. **Defense Scheduling (`/dashboard/defenses/schedule`):**
   - **Single Schedule:** Select room, start time, duration, and panel committee. The system automatically blocks room collisions, panelist time clashes, or adviser conflict-of-interest violations.
   - **Batch Auto-Scheduler:** Automatically distribute multiple eligible projects across conflict-free time windows and rooms.
3. **Customizable Defense Stages (`/admin/stages`) & Rubrics (`/admin/rubrics`):**
   - BSIT in the Department of Computational Sciences (CECS) utilizes the dedicated 5-stage progression (*Concept Defense*, *Title Defense*, *Progress Report 1*, *Progress Report 2*, and *Final Defense*), while other academic colleges default to the 3 main defense stages (*Title Defense*, *Proposal Defense*, and *Final Oral Defense*) with full administrative stage and rubric customization.

### J.2.2 College Dean & System Administrator Operations
1. **Executive Analytics (`/dashboard/analytics`):** Monitor college-wide throughput, pass/fail ratios, Objective 2 latency benchmarks, and Objective 4 (SUS & UTAUT) acceptability survey statistics.
2. **User Management & Security (`/admin/users`):** Approve pending registrations, onboard faculty accounts, and manage role assignments (`student`, `adviser`, `panelist`, `coordinator`, `college_dean`, `sys_admin`).
3. **Maintenance, Troubleshooting & Disaster Recovery Console (`/admin/system-health`):** Run live subsystem diagnostics, trigger one-click self-healing maintenance, and export/verify SHA-256 signed institutional database backups.
4. **Audit Ledger (`/admin/audit`):** Inspect the immutable audit trail recording actor email, role, action type, IP address, and state diffs.

---

## J.3 MAINTENANCE & TROUBLESHOOTING GUIDE

### J.3.1 Preventive System Maintenance Schedule (SOP)

| Frequency | Responsible Role | Target Subsystem | Preventive Maintenance Procedure | Verification Metric |
| :--- | :--- | :--- | :--- | :--- |
| **Daily** | System Admin / Automated Probes | PostgreSQL 15 Pool, RLS & Realtime WSS | Verify database connection pool health, Row-Level Security (RLS) enforcement, automated daily WAL backup completion, and WebSocket latency. | Status = Healthy; Latency $< 200\text{ ms}$; 0 RLS errors. |
| **Weekly (Fridays)** | System Admin / Coordinator | Disaster Recovery Vault & Self-Healing Engine | Click **Export DR Backup Snapshot** in `/admin/system-health`; click **Run Self-Healing Maintenance**; inspect `/admin/audit`. | Signed `.json` backup archived offsite; 100% active pointers. |
| **Monthly** | System Administrator | S3 Storage Buckets & SHA-256 Verifier | Audit `manuscripts`, `signatures`, and `certificates` bucket utilization; verify latest backup archive in the **SHA-256 Integrity Verifier**. | Storage $< 80\%$ quota; 100% SHA-256 checksum match. |
| **Semestral Rollover** | Coordinator, College Dean & Admin | Workflow Stages, Rubrics & User Directory | Archive completed capstone dockets; review college Defense Stages (`/admin/stages`) and Rubric Templates (`/admin/rubrics`); onboard new faculty. | All college workflows active; rubric weights sum to 100%. |

### J.3.2 Automated Subsystem Integrity Probes & Self-Healing Maintenance
Accessible via `/admin/system-health` (**Tab 1: Maintenance & Live Diagnostics**), AURORA provides six automated probes and a **Run Self-Healing Maintenance** utility:
1. **PostgreSQL Relational Engine & RLS (`postgres_engine`):** Verifies active connection pooling and Row-Level Security enforcement.
2. **Manuscript Storage & SHA-256 Version Pointers (`manuscript_versions`):** Detects any document where versions exist without an active `is_current = true` flag and automatically promotes the latest version pointer.
3. **RA 8792 Cryptographic Digital Signatures (`digital_signatures`):** Audits all faculty profiles against `user_signatures` and automatically provisions a verifiable SHA-256 baseline signature for any approved faculty account missing one.
4. **College Workflow Templates & Defense Stages (`workflow_stages`):** Verifies ordered defense stages across all university colleges.
5. **Dynamic Rubric Scoring & Consensus Engine (`rubric_engine`):** Confirms active rubric templates have criterion weights summing to 100%.
6. **Security Audit Trail & Non-Repudiation Ledger (`audit_ledger`):** Confirms append-only audit logging across all system modules.

### J.3.3 Comprehensive Module Troubleshooting Matrix

| Code & Priority | Module | Observed Symptom / Issue | Root Cause | Step-by-Step Resolution |
| :--- | :--- | :--- | :--- | :--- |
| **TS-AUTH-01** *(Medium)* | Authentication & RBAC | User logs in but sees *Pending Approval* or restricted navigation. | Account status is `pending` or active role in header Role Switcher is set to another role. | 1. Approve the user in `/admin/users`. 2. Use the top header **Role Switcher** pill to switch active role context. |
| **TS-PDF-01** *(High)* | Manuscript PDF & Storage | Uploaded PDF does not appear in Adviser Queue or shows older version. | Upload was interrupted before `is_current` version pointer completed. | 1. Open `/admin/system-health` and click **Run Self-Healing Maintenance**. 2. Confirm manuscript status in `/dashboard/submissions` is `under_review`. |
| **TS-WS-01** *(Low)* | Split-Screen Workspace | Realtime annotations do not sync immediately across panelists. | Transient WebSocket (WSS) disconnect or network sleep. | 1. Reselect the stage in the workspace header or refresh the page to re-subscribe to the Supabase WAL channel. |
| **TS-SCHED-01** *(Medium)* | Defense Scheduling | *Room Conflict*, *Panelist Clash*, or *Conflict of Interest* error. | Overlapping non-cancelled schedule or adviser selected as voting panelist. | 1. Cancel/reschedule postponed sessions in `/dashboard/defenses` first. 2. Select an independent panelist or use **Batch Auto-Schedule**. |
| **TS-RUBRIC-01** *(Medium)* | Rubric Management | Rubric template cannot be saved in `/admin/rubrics`. | Sum of criterion weights does not equal 100%. | 1. Adjust criterion weights in the Rubric Builder until total equals 100%, then save. |
| **TS-SIG-01** *(High)* | Digital Signatures & Certificates | Panelist cannot lock evaluation or `/verify/[serial]` fails. | Missing active electronic signature baseline or mistyped certificate serial. | 1. Save an Electronic Signature Baseline in `/dashboard/settings` (or run Self-Healing Maintenance). 2. Copy exact serial (`AURORA-YYYY-XXXX`) into `/verify`. |

---

## J.4 DISASTER RECOVERY & DATA BACKUP PLAN (DRP / BCP)

To guarantee institutional business continuity and satisfy **ISO/IEC 25010 Recoverability** and **NPC Circular No. 16-01 (Data Privacy Act of 2012)**, AURORA enforces a formal Disaster Recovery and Data Backup Plan accessible at `/admin/system-health` (**Tab 2: Disaster Recovery & Data Backup Plan**).

### J.4.1 Service Level Objectives & 3-2-1 Backup Architecture
- **Recovery Time Objective (RTO):** $\le 4\text{ Hours}$ for full relational database and object storage restoration ($\le 15\text{ minutes}$ for cloud application failover).
- **Recovery Point Objective (RPO):** $\le 24\text{ Hours}$ via automated daily snapshots and on-demand pre-defense JSON exports (near-zero data loss via continuous Write-Ahead Logging PITR).
- **3-2-1 Backup Rule:**
  1. **Tier 1 (Primary Live Cluster):** Managed PostgreSQL 15 cluster with RLS and S3 object storage (`manuscripts`, `signatures`, `certificates`).
  2. **Tier 2 (Automated Cloud Daily Snapshots & WAL PITR):** Daily physical snapshots retained for 30 days plus continuous WAL archiving for point-in-time recovery.
  3. **Tier 3 (Offsite Cryptographically Signed JSON Cold Archives):** Weekly and pre-defense on-demand snapshots generated via **Export DR Backup Snapshot** (`exportInstitutionalBackupAction`), exporting all 20 relational tables into `AURORA_DR_Backup_YYYY-MM-DD_<sha256>.json` with a verifiable FIPS 180-4 SHA-256 digest.

### J.4.2 Catastrophic Disaster Recovery Playbooks

| Scenario | Target RTO / RPO | Step-by-Step Recovery & Restoration Procedure |
| :--- | :--- | :--- |
| **Scenario A: Relational Database Corruption or Accidental Deletion** | RTO $\le 2\text{h}$ / RPO $\le 24\text{h}$ | 1. Restrict writes or enable maintenance mode. 2. Trigger Supabase Point-in-Time Recovery (PITR) for cluster rollback, or validate the latest `AURORA_DR_Backup_*.json` in the **SHA-256 Integrity Verifier** (`/admin/system-health`) and restore affected tables. 3. Click **Run Self-Healing Maintenance** to verify foreign-key pointers. |
| **Scenario B: Manuscript PDF Storage Outage or File Tampering** | RTO $\le 3\text{h}$ / RPO $0\text{h}$ | 1. Compare `document_versions.checksum_sha256` against binary file hashes in the `manuscripts` bucket. 2. Restore missing/altered PDFs from the replicated institutional S3 archive. 3. Re-verify SHA-256 digests before re-opening the workspace. |
| **Scenario C: Compromised Credentials or Auth Lockout** | RTO $\le 30\text{m}$ / RPO $0\text{h}$ | 1. Set compromised profile status to `suspended` in `/admin/users` (Edge Middleware revokes active sessions immediately). 2. Rotate `SUPABASE_SERVICE_ROLE_KEY` if administrative keys were exposed. 3. Audit `/admin/audit` by `user_email` and `ip_address`. |
| **Scenario D: Cloud Application Host Failover** | RTO $\le 15\text{m}$ / RPO $0\text{h}$ | 1. Promote the last known-good immutable production deployment in Vercel. 2. Confirm environment variables (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`). 3. Click **Re-Run Diagnostics** in `/admin/system-health`. |

*Compliance Verification:* All preventive maintenance procedures, self-healing probes, troubleshooting playbooks, and 3-2-1 disaster recovery workflows are live and operational in `/admin/system-health`.
