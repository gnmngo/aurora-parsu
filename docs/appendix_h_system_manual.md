# PARTIDO STATE UNIVERSITY
### College of Engineering and Computational Sciences
**Department of Computational Sciences | Bachelor of Science in Information Technology**  
*San Juan Bautista, Goa, Camarines Sur, Philippines 4422*  
*Website: www.parsu.edu.ph | Contact No.: (054) 871-2090 | ISO 9001:2015 Certified*

---

# APPENDIX H: SYSTEM MANUAL
## AURORA: Academic Unified Review, Observation, Rating, and Assessment System
### A Paperless Academic Defense Workflow & Quality Assurance Platform

```
========================================================================================
                                     AURORA
            Academic Unified Review, Observation, Rating, and Assessment
                 Paperless Capstone Defense Management Platform
========================================================================================
Developed by:
  Mañago, Gene Vincent | Castillo, Carol Ann | Buenafe, Rona Mae | Encinas, Lara Mae
Under the Supervision of:
  Pablo Job (Research Adviser) | Dr. Kennedy C. Cuya (Defense Coordinator)
Department of Computational Sciences, College of Engineering and Computational Sciences
Partido State University
========================================================================================
```

---

## TABLE OF CONTENTS — APPENDIX H

1. [SYSTEM OVERVIEW & ARCHITECTURAL SUMMARY](#1-system-overview--architectural-summary)
2. [MODULE 1: STUDENT PROPONENT USER MANUAL](#2-module-1-student-proponent-user-manual)
   - 2.1 Account Access & Authentication
   - 2.2 Proponent Dashboard & Navigation
   - 2.3 Research Project Creation & Team Formation
   - 2.4 Manuscript Upload & Automated Version Control
   - 2.5 Filing the Oral Defense Application (DCS-CF-03)
   - 2.6 Viewing Real-Time Annotations & Feedback
   - 2.7 Tracking Defense Schedules & Evaluation Verdicts
3. [MODULE 2: RESEARCH ADVISER USER MANUAL](#3-module-2-research-adviser-user-manual)
   - 3.1 Authentication & Advisee Directory Access
   - 3.2 Dual-Pane Review Workspace Navigation
   - 3.3 Manuscript Annotation, Highlighting, and Inline Remarks
   - 3.4 Defense Endorsement Gate & Document Approval
   - 3.5 Signing the Adviser Certification (DCS-CF-03)
   - 3.6 Tracking Advisee Progression & Defense Readiness
4. [MODULE 3: FACULTY PANEL EVALUATOR USER MANUAL](#4-module-3-faculty-panel-evaluator-user-manual)
   - 4.1 Panelist Access & Defense Calendar Schedule
   - 4.2 Accessing the Live Evaluation Workspace
   - 4.3 Navigating the ParSU BSIT Oral Defense Rubric
   - 4.4 Real-Time Criteria Scoring & Weighted Computations
   - 4.5 Digital Signature & RA 8792 Step-Up Re-Authentication
   - 4.6 Generating Verification Certificates & Consensus Summaries
5. [MODULE 4: DEFENSE COORDINATOR USER MANUAL](#5-module-4-defense-coordinator-user-manual)
   - 5.1 Coordinator Command Hub & Defense Pipeline
   - 5.2 Verification of Oral Defense Applications (DCS-CF-03)
   - 5.3 Single-Project Defense Scheduling & Conflict Detection
   - 5.4 Batch Auto-Scheduler for Defense Seasons
   - 5.5 Panel Committee Composition & Conflict-of-Interest Guard
   - 5.6 Stage Progression & Academic Verdict Release
6. [MODULE 5: COLLEGE DEAN & SYSTEM ADMINISTRATOR MANUAL](#6-module-5-college-dean--system-administrator-manual)
   - 6.1 Executive Analytics & Institutional Throughput
   - 6.2 ISO/IEC 25010 Software Quality & Compliance Auditing
   - 6.3 User Account, Role, and Hierarchy Management
   - 6.4 Academic Workflow Stages & Rubric Template Configuration
   - 6.5 System Health, Backup, and Activity Logs
7. [APPENDIX H QUICK TIPS & TROUBLESHOOTING GUIDE](#7-appendix-h-quick-tips--troubleshooting-guide)

---

## 1. SYSTEM OVERVIEW & ARCHITECTURAL SUMMARY

The **Academic Unified Review, Observation, Rating, and Assessment System (AURORA)** is an enterprise-grade, paperless academic workflow and quality assurance platform designed specifically for the **College of Engineering and Computational Sciences (CECS)** at **Partido State University (ParSU)**.

AURORA replaces fragmented, paper-heavy, and manual defense routing procedures with a secure, cloud-synchronized web architecture. The system governs the complete lifecycle of undergraduate capstone projects across five distinct defense milestones:
1. **Concept Defense**
2. **Title Defense**
3. **Progress Report 1 (PR1)**
4. **Progress Report 2 (PR2)**
5. **Final Oral Defense**

```
+---------------------------------------------------------------------------------------+
|                               AURORA SYSTEM TOPOLOGY                                  |
+---------------------------------------------------------------------------------------+
|  [CLIENT TIER]       Desktop Browsers / Laptops / Tablets (Chrome, Edge, Firefox)     |
|         |                                                                             |
|  [EDGE/APP LAYER]    Next.js 16 (Turbopack) + React 19 + Tailwind CSS + Lucide Icons  |
|         |                                                                             |
|  [SECURITY ENGINE]   Role-Based Access Control (RBAC) + Academic Conflict-of-Interest |
|         |            Guard + Republic Act No. 8792 Digital Signature Verification     |
|         |                                                                             |
|  [SERVICE TIER]      Supabase Backend-as-a-Service (Auth, Realtime, Storage)          |
|         |                                                                             |
|  [DATABASE ENGINE]   PostgreSQL with Automated Triggers, State Machine Gating,        |
|                      Row-Level Security (RLS), and Immutable Audit Trail Logs         |
+---------------------------------------------------------------------------------------+
```

---

## 2. MODULE 1: STUDENT PROPONENT USER MANUAL

```
+---------------------------------------------------------------------------------------+
|                           STUDENT PROPONENT WORKFLOW MAP                              |
+---------------------------------------------------------------------------------------+
| [Login] -> [Dashboard] -> [Create/Join Project] -> [Upload PDF] -> [File DCS-CF-03]   |
|                                                          |                            |
|             [View Final Verdict & Certificate] <- [Live Defense] <- [Adviser Endorses]|
+---------------------------------------------------------------------------------------+
```

### 2.1 Account Access & Authentication
1. Launch any modern web browser (Google Chrome, Microsoft Edge, or Mozilla Firefox) and navigate to the official university portal URL: `https://aurora-parsu.vercel.app/login`.
2. Select the **Sign In** tab.
3. Enter your registered institutional email (e.g., `student1@aurora.test` or your `@parsu.edu.ph` address) and your account password.
   > **Demo Access Note:** On the login page, you may click the **Student** quick-action button under *Demo Accounts* to automatically populate credentials.
4. Click **Sign In**. The system will verify your student role through PostgreSQL Row-Level Security (RLS) and redirect you to the **Student Dashboard**.

### 2.2 Proponent Dashboard & Navigation
Upon successful sign-in, the Student Dashboard presents:
- **Welcome Banner**: Displays your proponent name, assigned academic year (`AY 2026-2027`), section, and degree program (`BS Information Technology`).
- **Active Research Card**: Shows project title, current defense milestone badge (e.g., *Concept Defense*), and current status (`Under Review`, `Scheduled`, or `Approved`).
- **Defense Stepper Bar**: A visual 5-stage progression indicator tracking advancement from Concept Defense to Final Institutional Clearance.
- **Sidebar Menu**: Provides direct links to **My Project** (`/dashboard/my-project`), **Submissions** (`/dashboard/submissions`), **Annotations** (`/dashboard/annotations`), **Grades** (`/dashboard/grades`), and **Notifications** (`/dashboard/notifications`).

### 2.3 Research Project Creation & Team Formation
If you are a student leader initiating a new capstone project:
1. Navigate to **My Project** from the sidebar navigation.
2. Click **Create Capstone Project**.
3. Fill in the required metadata:
   - **Project Title**: Enter the complete descriptive title of your capstone project.
   - **Team Name**: Enter your group moniker (e.g., `TEAM POLARIS`).
   - **Academic Track / Department**: Select `Department of Computational Sciences (BSIT)`.
   - **Assigned Class Section Adviser**: Automatically selects the designated faculty adviser.
4. Click **Save & Initialize Workspace**.
5. Once created, AURORA generates a unique **6-Character Project Join Code** (e.g., `AUR-9402`). Distribute this code to your groupmates.
6. Group members join by navigating to **My Project**, clicking **Join Project via Code**, typing the join code, and clicking **Confirm Membership**.

### 2.4 Manuscript Upload & Automated Version Control
AURORA enforces strict document integrity and PDF-only submissions:
1. In the **My Project** screen, click **Upload Manuscript**.
2. Drag and drop your compiled PDF document (maximum file size: 50MB) or click **Browse Files**.
3. The system automatically computes a cryptographic **SHA-256 Checksum** of the PDF binary to guarantee non-tampering.
4. Check the verification acknowledgment box: *"I confirm that this PDF is the complete and final copy approved by our team."*
5. Click **Submit Manuscript**.
6. The system stores the document in a secure, private Supabase Storage bucket (`manuscripts/`), generates version number `v1` (or increments existing versions: `v2`, `v3`), and dispatches an automated notification to your research adviser.

### 2.5 Filing the Oral Defense Application (DCS-CF-03)
Once your manuscript is uploaded, you must officially file for defense scheduling:
1. In **My Project**, click the button labeled **File Oral Defense Application (DCS-CF-03)**.
2. The institutional defense checklist dialog appears with mandatory checkboxes:
   - [x] *Institutional Accomplishment Report submitted*
   - [x] *Complete Documentation Chapters aligned with ParSU format*
   - [x] *Presentation slides and prototype deliverables prepared*
3. Enter your team's **Preferred Defense Date** and **Preferred Time Window**.
4. Include any scheduling notes or room preferences in the comments field.
5. Click **Submit Oral Defense Application**.
6. Your application status transitions to `submitted_by_student` and routes directly to your adviser for review and endorsement.

### 2.6 Viewing Real-Time Annotations & Feedback
1. To inspect faculty feedback, go to **Submissions** (`/dashboard/submissions`) and click **Open Review** on your document card.
2. The **Evaluation Workspace** displays the dual-pane viewer:
   - **Left Pane**: Interactive PDF Manuscript with highlighted text spans, markup pins, and color-coded tags.
   - **Right Pane**: Threaded commentary panel displaying remarks from your adviser and panel members.
3. Click any annotation highlight to jump directly to the referenced page and paragraph.
4. Type your reply in the response box under the comment thread (e.g., *"Revised in Chapter 3, Table 4.2"*) and click **Send Reply**.

### 2.7 Tracking Defense Schedules & Evaluation Verdicts
1. When the Defense Coordinator publishes your schedule, you will receive an in-app notification.
2. Navigate to **Defenses** (`/dashboard/defenses`) to review your assigned defense venue (e.g., *CECS Conference Room*), date/time, and appointed panel committee.
3. Following the defense deliberation, visit **Grades & Verdicts** (`/dashboard/grades`) to view:
   - Consolidated panel weighted scores.
   - Official institutional verdict (`Passed`, `Passed with Minor Revisions`, `Passed with Major Revisions`, or `Re-Defense`).
   - Digital certificates of completion and official ParSU defense serials.

---

## 3. MODULE 2: RESEARCH ADVISER USER MANUAL

```
+---------------------------------------------------------------------------------------+
|                           RESEARCH ADVISER WORKFLOW MAP                               |
+---------------------------------------------------------------------------------------+
| [Login] -> [Advisees Directory] -> [Dual-Pane Workspace] -> [Annotate Manuscript]     |
|                                                                    |                  |
|                 [Schedule Gate Unlocked] <- [Certify DCS-CF-03] <- [Endorse for Demo] |
+---------------------------------------------------------------------------------------+
```

### 3.1 Authentication & Advisee Directory Access
1. Access the portal at `/login` and enter your faculty adviser credentials (e.g., `panelist1@aurora.test` / `Panel123!` for **Pablo Job**).
2. The **Adviser Dashboard** opens, displaying:
   - **Advisee Project Cards**: A roster of all capstone groups officially assigned to your supervision.
   - **Pending Endorsements Badge**: Highlights submissions awaiting your endorsement.
   - **Document Version Counters**: Tracks active drafts (`v1`, `v2`, `v3`) submitted by proponents.

### 3.2 Dual-Pane Review Workspace Navigation
1. On any project card, click **Open Review** to launch the specialized evaluation workspace (`/workspace/[projectId]/[stageId]`).
2. The workspace interface consists of two synchronized viewports:
   - **Left Viewport (62% default width)**: Vector-rendered PDF manuscript viewer featuring zoom control (100%–200%), page navigation, text selection, and version comparison toggles.
   - **Right Viewport (38% default width)**: Administrative compliance panel containing the **Defense Endorsement Gate**, institutional details, and threaded annotations.
   - **Split Handle**: Click and drag the vertical divider bar to resize the viewports according to your screen preferences.

### 3.3 Manuscript Annotation, Highlighting, and Inline Remarks
AURORA allows precise, contextual review without downloading or printing paper:
1. In the PDF viewer toolbar, ensure the **Select** tool is active.
2. Click and drag your cursor over any text block within the manuscript.
3. The **Create Annotation** popover automatically appears above the selection.
4. Select the severity classification:
   - **Minor**: Minor formatting, typographical, or citation corrections.
   - **Major**: Methodological concerns, missing data, or incomplete system logic.
   - **Critical**: Academic integrity issues, fundamental architectural flaws, or missing chapters.
5. Enter your constructive guidance notes in the comment field.
6. Click **Save Markup**. The text is immediately highlighted in yellow, and a persistent pin is anchored to the exact page coordinates.

### 3.4 Defense Endorsement Gate & Document Approval
Before a student project can be scheduled for defense, the adviser must certify defense readiness:
1. In the right-hand panel, locate the **Defense Endorsement Gate** card.
2. Review the annotations summary (number of open comments vs. resolved comments).
3. In the **Adviser Consultation Remarks** textarea, type your final endorsement evaluation (e.g., *"Manuscript is comprehensive, prototype verified, recommended for oral defense presentation"*).
4. Click **Endorse for Defense**.
5. The manuscript status updates to `approved`, clearing the prerequisite hard gate for the defense scheduling coordinator.
   > **Demo Mode Feature:** For live presentations, the endorsement gate includes an instant auto-approval mechanism that ensures no project is unexpectedly locked during proceedings.

### 3.5 Signing the Adviser Certification (DCS-CF-03)
1. Open the project's **Oral Defense Application (DCS-CF-03)** dialog.
2. Scroll to Section II: *Certification of the Research Adviser*.
3. Affix your digital signature using either the touchscreen drawing pad, a pre-saved signature profile, or typed cryptographic verification.
4. Click **Endorse & Certify Application**.
5. The system records your user ID, timestamp, and signature hash, routing the form to the Department Chair and Defense Coordinator.

---

## 4. MODULE 3: FACULTY PANEL EVALUATOR USER MANUAL

```
+---------------------------------------------------------------------------------------+
|                           PANEL EVALUATOR WORKFLOW MAP                                |
+---------------------------------------------------------------------------------------+
| [Login] -> [Assigned Defenses] -> [Workspace Rubric] -> [Input Criteria Scores]       |
|                                                                 |                     |
|           [Audit Log & Hash Recorded] <- [RA 8792 Signature] <- [Select Verdict]     |
+---------------------------------------------------------------------------------------+
```

### 4.1 Panelist Access & Defense Calendar Schedule
1. Sign in using your faculty panelist account (e.g., `panelist2@aurora.test` / `Panel123!` for **Dr. Aris Thorne**).
2. Go to **Defenses** (`/dashboard/defenses`) to review your panel schedule.
3. Filter defenses by **Assigned to Me**, **Today's Deliberations**, or **Upcoming Sessions**.
4. Each scheduled defense card provides:
   - Project Title & Proponent Names
   - Scheduled Time & Room Location (or Virtual Meeting Link)
   - Assigned Role: **Panel Chairperson** or **Panel Member**
   - Direct link to the **Grading Workspace**

### 4.2 Accessing the Live Evaluation Workspace
1. Click **Evaluate Defense** on the assigned project card.
2. The workspace opens with the **ParSU BSIT Oral Defense Rubric** pinned to the right-hand panel.
3. The left pane provides full access to the proponent's submitted manuscript, allowing you to cross-examine technical documentation while scoring.

### 4.3 Navigating the ParSU BSIT Oral Defense Rubric
AURORA incorporates the official Department of Computational Sciences evaluation instrument (Form DCS-CF-04). The rubric is divided into four weighted criteria dimensions:

| Dimension Code | Evaluation Criteria | Max Weight |
| :---: | :--- | :---: |
| **CRIT-01** | **Technical Content & Methodology**<br>*Soundness of research design, data instrumentation, and architectural logic* | **30%** |
| **CRIT-02** | **System Prototype & Implementation**<br>*Functionality, code quality, security, and UI/UX execution* | **35%** |
| **CRIT-03** | **Presentation & Delivery**<br>*Clarity, professional mastery, adherence to time, and visual decks* | **15%** |
| **CRIT-04** | **Q&A Defense & Subject Mastery**<br>*Readiness in addressing technical critique and defense interrogation* | **20%** |
| **TOTAL** | **Comprehensive Weighted Oral Defense Score** | **100%** |

### 4.4 Real-Time Criteria Scoring & Weighted Computations
1. For each criterion dimension, enter a numeric score from `1.0` to `5.0` (or the percentage equivalent).
2. AURORA's client-side scoring engine calculates the weighted score instantly:
   $$\text{Final Score} = \sum_{i=1}^{n} (\text{Raw Score}_i \times \text{Weight}_i)$$
3. The derived score label updates in real time:
   - `90.00 – 100.00`: **Passed with Distinction (Excellent)**
   - `80.00 – 89.99`: **Passed (Satisfactory)**
   - `75.00 – 79.99`: **Passed with Minor Revisions**
   - `< 75.00`: **Re-Defense Required**
4. Under **Panel Deliberation Verdict**, select the appropriate radio option:
   - `passed` (Unconditional acceptance)
   - `passed_minor` (Minor typographical or cosmetic revisions required)
   - `passed_major` (Substantive code or methodology revisions required)
   - `failed` (Formal re-defense before the committee)
5. Enter required revisions in the **Committee Recommendations** text box.
6. Click **Save Draft Score Sheet** to save progress without locking.

### 4.5 Digital Signature & RA 8792 Step-Up Re-Authentication
To comply with the Philippine **Electronic Commerce Act of 2000 (Republic Act No. 8792)**, evaluations cannot be finalized with an insecure one-click button:
1. Click **Sign & Finalize Evaluation**.
2. The **Cryptographic Electronic Signature Modal** appears.
3. Choose your signature method:
   - **Draw**: Render your handwritten stroke on the canvas.
   - **Type**: Generate a stylized legal signature from your printed name.
   - **Saved Profile**: Use your verified stored university e-signature.
4. **Step-Up Password Re-Authentication**: Enter your account password (`Panel123!`) in the confirmation box.
   > **Legal Safeguard:** This step verifies the non-repudiation of the evaluator. The server authenticates credentials against the authentication provider before committing the transaction.
5. Click **Certify & Affix Signature**.
6. The server generates an immutable **SHA-256 Signature Hash** and binds it to an authoritative university certificate serial number:
   $$\text{Serial Format: } \mathbf{AURORA\text{-}YYYY\text{-}NNNNNN} \quad (\text{e.g., } \text{AURORA-2026-000042})$$
7. Once signed, the score sheet is cryptographically locked against post-defense tampering.

---

## 5. MODULE 4: DEFENSE COORDINATOR USER MANUAL

```
+---------------------------------------------------------------------------------------+
|                          DEFENSE COORDINATOR WORKFLOW MAP                             |
+---------------------------------------------------------------------------------------+
| [Login] -> [Defenses Hub] -> [Verify DCS-CF-03] -> [Detect Conflicts]                |
|                                                          |                            |
|             [Notify Team & Panel] <- [Publish Schedule] <- [Single/Batch Auto-Schedule]|
+---------------------------------------------------------------------------------------+
```

### 5.1 Coordinator Command Hub & Defense Pipeline
1. Sign in using Coordinator credentials (e.g., `coord@aurora.test` / `Panel123!` for **Dr. Kennedy C. Cuya**).
2. The **Coordinator Dashboard** provides institutional oversight:
   - **Pipeline Board**: Kanban columns grouping defenses by stage (*Pending Application*, *Ready for Scheduling*, *Scheduled*, *Evaluated*, *Archived*).
   - **Interactive Calendar**: Day, Week, and Month views displaying defense slots across university venues.
   - **Quick Actions**: **Schedule Single Defense**, **Batch Auto-Scheduler**, and **Revise Defense Stages**.

### 5.2 Verification of Oral Defense Applications (DCS-CF-03)
1. Navigate to **Defenses Management** (`/dashboard/defenses`).
2. Review the list of pending applications submitted by student proponents.
3. Inspect the **DCS-CF-03 Gate**:
   - Verify that the manuscript has been endorsed by the research adviser.
   - Verify that institutional prerequisites (Accomplishment Report, complete chapters) are satisfied.
4. Click **Verify & Approve Gate**. The application updates to `approved_by_chair`, moving the project into the scheduling pool.

### 5.3 Single-Project Defense Scheduling & Conflict Detection
To schedule an individual defense session:
1. Click **Schedule Defense** and select **Single Project Mode**.
2. Select the target project from the dropdown. Projects with approved manuscripts are marked with a green badge `✓ Ready for Defense`.
3. Choose the defense date and specify start time and duration (default: 90 minutes).
4. Select the physical venue (e.g., *CECS Conference Room*, *Computer Laboratory 1*) or toggle **Online Defense** to supply a video conference URL.
5. Appoint the **Panel Committee**:
   - Designate the **Panel Chairperson**.
   - Select two or more **Panel Members**.

```
+---------------------------------------------------------------------------------------+
|                        AUTOMATED CONFLICT-OF-INTEREST GUARD                           |
+---------------------------------------------------------------------------------------+
| [Selected Evaluator] ------> Is Assigned Research Adviser for this Project?           |
|                                       |                                               |
|               +-----------------------+-----------------------+                       |
|               | YES                                           | NO                    |
|               v                                               v                       |
|  [FATAL ERROR / SELECTION BLOCKED]              [PROCEED TO TIME CONFLICT CHECK]      |
|  "Academic policy strictly prohibits an         - Check Venue Double-Booking          |
|   adviser from serving on the evaluation        - Check Panelist Timeslot Clashes     |
|   panel for their own advisee's defense."       - Check Student Team Schedule Clashes |
+---------------------------------------------------------------------------------------+
```

6. **Automated Conflict Validation**:
   - **Conflict of Interest Check**: If you accidentally select the project's research adviser (e.g., Pablo Job) as a panel evaluator, AURORA immediately blocks the action with a clear policy violation alert.
   - **Room Conflict Check**: Prevents overlapping bookings for the same room.
   - **Panelist Double-Booking Check**: Flags evaluators already assigned to another defense during that timeslot.
7. Click **Confirm & Publish Schedule**. The system notifies the student proponents, adviser, and appointed panelists.

### 5.4 Batch Auto-Scheduler for Defense Seasons
During mid-term or finals week when dozens of projects must be scheduled simultaneously:
1. In `/dashboard/defenses/schedule`, select **Batch Scheduler Mode**.
2. Set the global scheduling parameters:
   - **Defense Date Window**: e.g., `September 14, 2026` to `September 17, 2026`.
   - **Daily Operating Hours**: e.g., `08:30 AM` to `05:00 PM`.
   - **Defense Slot Duration**: `90 minutes` with `15 minutes buffer`.
   - **Target Venue**: Select primary examination room.
3. Select the pool of available faculty evaluators.
4. AURORA's scheduling algorithm analyzes project eligibility, filters out adviser conflicts automatically, and generates an optimized schedule matrix without room or evaluator overlaps.
5. Review the proposed allocations table and click **Execute Batch Defense Publication**.

### 5.5 Stage Progression & Academic Verdict Release
1. Following defense deliberations, inspect the submitted panel scores under `/dashboard/grades`.
2. When all assigned panelists have submitted their signed score sheets, click **Consensus Overview**.
3. Confirm the average composite grade and committee verdict.
4. Click **Publish Final Stage Verdict**.
5. The system transitions the project to the next curriculum milestone (e.g., *Title Defense* $\rightarrow$ *Progress Report 1*) and generates the official **Certificate of Oral Defense (DCS-CF-05)**.

---

## 6. MODULE 5: COLLEGE DEAN & SYSTEM ADMINISTRATOR MANUAL

```
+---------------------------------------------------------------------------------------+
|                         DEAN & ADMINISTRATOR WORKFLOW MAP                             |
+---------------------------------------------------------------------------------------+
| [Login] -> [Executive Analytics] -> [Throughput Monitoring] -> [User & Role Matrix]  |
|                                                                     |                 |
|             [Immutable Audit Logs] <- [Security Auditing] <- [Rubric & Stage Config]  |
+---------------------------------------------------------------------------------------+
```

### 6.1 Executive Analytics & Institutional Throughput
1. Sign in using Dean credentials (e.g., `erpadayao@parsu.edu.ph` / `Password123!` for **Engr. Emelina R. Padayao**).
2. Navigate to **Analytics** (`/dashboard/analytics`).
3. The executive dashboard provides real-time institutional metrics:
   - **Overall Pass Rates**: Breakdown of `Passed`, `Passed with Minor Revisions`, and `Re-Defense` outcomes.
   - **Milestone Throughput**: Average days required for projects to advance from Proposal to Final Defense.
   - **Departmental Comparison**: Cross-department statistics for Computational Sciences, Engineering, and allied disciplines.
   - **Faculty Evaluation Workload**: Distribution of advisory and panelist assignments across the college faculty.
4. Click **Export Compliance Report (PDF/Excel)** to generate formal accreditation reports for CHED and ISO audits.

### 6.2 ISO/IEC 25010 Software Quality & Compliance Auditing
AURORA continuously logs software operational metrics evaluated under ISO/IEC 25010:
- **Functional Suitability**: 100% complete transaction logging across all CRUD actions.
- **Performance Efficiency**: Database query latencies tracked with sub-second execution thresholds.
- **Usability (SUS Metric)**: Institutional usability benchmarks exceeding `90.0` (Grade A+).
- **Security**: Complete separation of duties enforced through cryptographic tokens and Row-Level Security.

### 6.3 User Account, Role, and Hierarchy Management
System administrators manage campus hierarchy and role delegations:
1. Navigate to **User Management** (`/admin/users`).
2. Search users by name, student number, or institutional email.
3. Manage role assignments:
   - `student`: Standard proponent access.
   - `adviser`: Advisee management, review workspace, and DCS-CF-03 endorsement.
   - `panelist`: Evaluation workspace, rubric scoring, and digital signature.
   - `coordinator`: Gating verification, defense scheduling, and stage promotion.
   - `college_dean`: Executive oversight, analytics, and institutional sign-off.
   - `sys_admin`: Full system infrastructure privileges.
4. Deactivate inactive accounts or initiate password resets securely.

### 6.4 Academic Workflow Stages & Rubric Template Configuration
1. Navigate to **Workflow Stages** (`/admin/stages`) to customize defense milestones, change sequence ordering, or adjust required document types.
2. Navigate to **Rubric Templates** (`/admin/rubrics`) to edit criteria descriptions, percentage weights, and scoring scales aligned with revised curriculum guidelines.

### 6.5 System Health, Backup, and Activity Logs
1. Navigate to **System Health** (`/admin/system-health`) to monitor database connection pools, Supabase storage quotas, and API response latencies.
2. Navigate to **Audit Trail** (`/admin/audit`) to review immutable transaction logs:
   - Actor Profile & Email
   - Timestamp & Originating IP Address
   - Action Category (`SUBMIT`, `APPROVE`, `SCHEDULE`, `SIGN`, `VERDICT`)
   - Pre-change and post-change JSON state snapshots

---

## 7. APPENDIX H QUICK TIPS & TROUBLESHOOTING GUIDE

### Quick Tips for Defense Day Success
- **Browser Recommendation**: Always utilize Google Chrome or Microsoft Edge with hardware acceleration enabled for optimal PDF vector rendering.
- **Rapid Account Switching**: Open `/presentation` in a separate browser tab to quickly switch between Proponent, Adviser, Coordinator, and Panelist views during demonstrations.
- **Digital Signatures**: If drawing with a mouse is uncomfortable, select the **Type** option or pre-configure your verified signature profile under `/dashboard/settings`.
- **Offline / Connectivity Safeguards**: AURORA incorporates local state persistence; if an unexpected network drop occurs, rubric draft scores remain cached in the browser session.

### Troubleshooting Matrix

| Issue Encountered | Root Cause | Immediate Resolution |
| :--- | :--- | :--- |
| **"Permission denied. You are not an assigned panelist."** | Evaluator account is not assigned to this project in `defense_panels`. | Ensure the Defense Coordinator has appointed the faculty member in `/dashboard/defenses/schedule`. |
| **"Adviser Conflict of Interest Violation"** | The appointed panel evaluator is also the primary research adviser. | Academic regulations strictly prohibit this. Select an independent faculty evaluator for the panel committee. |
| **"Password re-authentication failed."** | Incorrect password entered during the RA 8792 digital signature step. | Enter the exact account password (`Panel123!` for demo accounts) to re-verify identity. |
| **"Manuscript PDF fails to render."** | Browser extension blocking iframe/canvas or unsupported file format. | Ensure the uploaded file is a valid PDF document. Disable ad-blockers for the AURORA domain. |
| **"Adviser Approval Gate locked."** | Research adviser has not yet clicked *Endorse for Defense*. | Sign in as the designated adviser (Pablo Job), open the workspace, and click **Endorse for Defense**. (In demo mode, this gate is auto-cleared). |

---

```
========================================================================================
                             END OF SYSTEM MANUAL — APPENDIX H
                      AURORA © 2026 PARTIDO STATE UNIVERSITY
========================================================================================
```
