# PARTIDO STATE UNIVERSITY
### College of Engineering and Computational Sciences
**Department of Computational Sciences | Bachelor of Science in Information Technology**  
*San Juan Bautista, Goa, Camarines Sur, Philippines 4422*  
*Website: www.parsu.edu.ph | Contact No.: (054) 871-2090 | ISO 9001:2015 Certified*

---

# ANNEX J: USER & SYSTEM MANUALS
## Project: AURORA (Academic Unified Review, Observation, Rating, and Assessment System)

---

## J.1 USER'S GUIDE / ROLE MANUALS

AURORA provides dedicated operational guides for each institutional stakeholder group:

### J.1.1 Student Proponent Guide
1. **Accessing the Portal:** Visit `https://aurora-parsu.vercel.app/login` and log in using your institutional email.
2. **Team Formation:** The lead proponent clicks **Create Project**, inputs the approved title, and shares the generated 8-character **Join Code** with teammates.
3. **Manuscript Submission:** Navigate to **Workspace > Submissions**, drag-and-drop your latest PDF manuscript. The system computes its SHA-256 fingerprint.
4. **Filing Defense Application (DCS-CF-03):** Fill in the requirements checklist (Turnitin score, adviser clearance, preferred defense dates).
5. **Viewing Feedback & Remarks:** Open the **Annotations Drawer** to view adviser comments. Click on any annotation to view the highlighted page segment and reply to notes.
6. **Accessing Defense Outcomes:** Check the **Grades** tab to review composite panel evaluations, download Form DCS-CF-04, and view your verification serial number.

### J.1.2 Research Adviser Guide
1. **Advisee Directory:** Click **My Advisees** to view all capstone groups under your supervision.
2. **Dual-Pane Annotation:** Open the project workspace. Drag bounding boxes directly on text segments to create highlighted annotations. Categorize comments by severity (*Critical*, *Major*, *Minor*) and tag rubric criteria.
3. **Endorsing for Defense:** When satisfied with revisions, navigate to **DCS-CF-03 Certification**, review the student checklist, and click **Endorse for Oral Defense**. This unlocks the scheduling phase for the coordinator.

### J.1.3 Faculty Panel Evaluator Guide
1. **Defense Calendar:** View your assigned deliberation schedule under **Defenses > Schedule**.
2. **Live Evaluation Workspace:** During the defense deliberation, access the live scoring worksheet.
3. **Scoring Criteria (DCS-CF-04):** Input raw scores for Manuscript Quality (30%), System Demonstration (35%), Oral Competence (25%), and Q&A (10%).
4. **Digital Signature (RA 8792):** Select signature method (Drawn, Typed, or Uploaded). Enter your password for step-up re-authentication. Click **Finalize & Lock Evaluation**.

---

## J.2 SYSTEM ADMINISTRATOR MANUAL

### J.2.1 Defense Coordinator Command Hub
1. **Application Vetting:** Review submitted DCS-CF-03 applications. Confirm adviser digital endorsement.
2. **Defense Scheduling:**
   - Single Schedule: Select room, start time, duration, and panel committee. The system automatically warns if a room collision or panelist clash occurs.
   - Batch Auto-Scheduler: Use the batch scheduling algorithm to automatically distribute multiple defenses across academic calendar windows.
3. **Panel Composition:** Assign one Committee Chair and two voting Panelists. The assigned Research Adviser is automatically isolated from the voting panel.
4. **Stage Transition:** Advance projects to subsequent milestones (*Title -> Proposal -> Final Defense*) upon consensus approval.

### J.2.2 College Dean & Executive Operations
1. **Executive Analytics:** Monitor college-wide throughput, pass/fail ratios, and departmental defense KPIs.
2. **Audit Ledger:** Review the immutable audit log under `/admin/audit` to inspect deliberative actions, IP addresses, and timestamps.
3. **User Management:** Manage faculty and student accounts, assign role privileges (`sys_admin`, `coordinator`, `adviser`, `panelist`, `college_dean`).

---

## J.3 MAINTENANCE & TROUBLESHOOTING GUIDE

| Issue / Symptom | Possible Root Cause | Recommended Operational Solution |
| :--- | :--- | :--- |
| **"Conflict of Interest Violation" Error** | Coordinator assigned the project's adviser to the panel committee. | Select an alternate faculty panelist who is not an adviser for this group. |
| **"Room Conflict" Alert** | Chosen venue is already booked for another defense during this timeslot. | Choose an alternate room or adjust the defense start time by $\pm 90$ minutes. |
| **"Password Re-Authentication Failed"** | Incorrect password entered during signature finalization. | Re-enter your active account password carefully. Signature requires active verification under RA 8792. |
| **PDF Manuscript Fails to Render** | Corrupted PDF export or unsupported PDF version ($> 2.0$). | Re-export the manuscript as standard PDF/A or standard PDF 1.7 and re-upload. |
| **"Adviser Approval Required" Block** | Project attempting to schedule defense before adviser endorses Form DCS-CF-03. | Advise the research adviser to sign the endorsement certification in their portal. |

---

## J.4 DISASTER RECOVERY & DATA BACKUP PLAN

To guarantee business continuity and satisfy ISO/IEC 25010 reliability metrics, AURORA enforces a comprehensive Disaster Recovery and Backup Protocol.

### 1. Key Recovery Metrics:
- **Recovery Point Objective (RPO):** $< 1.0\text{ hour}$ (Maximum allowable data loss window).
- **Recovery Time Objective (RTO):** $< 15\text{ minutes}$ (Maximum allowable system downtime during failover).

### 2. Automated Cloud Backup Strategy:
- **Daily Automated Snapshots:** Supabase Cloud creates daily physical database snapshots stored in multi-region cold storage.
- **Point-in-Time Recovery (PITR):** Write-Ahead Logging (WAL) archives allow restoring the database to any millisecond within the previous 7 days.
- **Storage Bucket Redundancy:** Manuscript and signature storage buckets in AWS S3 (Singapore) are configured with 99.999999999% (11 9's) durability.

### 3. Local Administrative Backup Scripts:
Administrative PowerShell scripts are located in `docs/scripts/` to execute on-demand institutional database and file backups:
- **`backup-db.ps1`**: Dumps schema and data tables into encrypted `.sql` archive.
- **`restore-db.ps1`**: Restores database snapshot to recovery cluster.
- **`backup-storage.ps1`**: Downloads and mirrors all manuscript PDFs and digital signature assets.
- **`restore-storage.ps1`**: Re-syncs storage assets to secondary storage bucket.
