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
  Mañago, Gene Vincent D. | Castillo, Carol Ann B. | Buenafe, Rona Mae S.
  Encinas, Lara Mae B.   | Bares, Leomer
Under the Supervision of:
  Froiland B. Peñalosa (Capstone Project Adviser & Research Coordinator)
  Dr. Kennedy C. Cuya (Department Chair, DCS & Defense Coordinator)
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
   - 2.5 Filing the Oral Defense Application (Form DCS-CF-01 / DCS-CF-03)
   - 2.6 Viewing Real-Time Annotations & Feedback
   - 2.7 Tracking Defense Schedules & Evaluation Verdicts
3. [MODULE 2: RESEARCH ADVISER USER MANUAL](#3-module-2-research-adviser-user-manual)
   - 3.1 Authentication & Advisee Directory Access
   - 3.2 Dual-Pane Review Workspace Navigation
   - 3.3 Manuscript Annotation, Highlighting, and Inline Remarks
   - 3.4 Action 1: Manuscript Defense Endorsement Gate (Unlocking Scheduling)
   - 3.5 Action 2: Signing the Official Adviser Certification (Form DCS-CF-01 / DCS-CF-03)
   - 3.6 Academic Conflict-of-Interest Guard (Adviser Non-Grading Policy)
4. [MODULE 3: FACULTY PANEL EVALUATOR USER MANUAL](#4-module-3-faculty-panel-evaluator-user-manual)
   - 4.1 Panelist Access & Defense Calendar Schedule
   - 4.2 Accessing the Live Evaluation Workspace
   - 4.3 Navigating the ParSU BSIT Oral Defense Rubric (Form DCS-CF-04)
   - 4.4 Real-Time Criteria Scoring & Weighted Computations
   - 4.5 Digital Signature & RA 8792 Step-Up Re-Authentication
   - 4.6 Generating Verification Certificates & Consensus Summaries (Form DCS-CF-05)
5. [MODULE 4: DEFENSE COORDINATOR USER MANUAL](#5-module-4-defense-coordinator-user-manual)
   - 5.1 Coordinator Command Hub & Defense Pipeline
   - 5.2 Verification of Oral Defense Applications & Dual Endorsement Check
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

The **Academic Unified Review, Observation, Rating, and Assessment System (AURORA)** is an enterprise-grade, paperless academic workflow and quality assurance platform designed specifically for the **College of Engineering and Computational Sciences (CECS)** and extensible across all academic colleges at **Partido State University (ParSU)**.

AURORA replaces fragmented, paper-heavy, and manual defense routing procedures with a secure, cloud-synchronized web architecture. The system governs the complete lifecycle of undergraduate capstone projects across five distinct defense milestones for BSIT:
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
| [Login] -> [Dashboard] -> [Create/Join Project] -> [Upload PDF] -> [File DCS-CF-01/03] |
|                                                                |                      |
|             [View Final Verdict & Certificate] <- [Live Defense] <- [Adviser Certifies]|
+---------------------------------------------------------------------------------------+
```

### 2.1 Account Access & Authentication
1. Launch any modern web browser (Google Chrome, Microsoft Edge, or Mozilla Firefox) and navigate to the official university portal URL: `https://aurora-parsu.vercel.app/login`.
2. Select the **Sign In** tab.
3. Enter your registered institutional email (e.g., `student1@aurora.test` or your official `@parsu.edu.ph` address) and your account password.
   > **Demo Access Note:** On the login page, you may click the **Student** quick-action button under *Demo Accounts* to automatically populate demo credentials (`student1@aurora.test` / `Student123!`).
4. Click **Sign In**. The system verifies your student role through PostgreSQL Row-Level Security (RLS) and redirects you to the **Student Dashboard**.

### 2.2 Proponent Dashboard & Navigation
Upon successful sign-in, the Student Dashboard presents:
- **Welcome Banner**: Displays your proponent name, assigned academic year (`AY 2026-2027`), section, and degree program (`BS Information Technology`).
- **Active Research Card**: Shows project title, current defense milestone badge (e.g., *Title Defense*), and current status (`Under Review`, `Scheduled`, or `Approved`).
- **Defense Stepper Bar**: A visual 5-stage progression indicator tracking advancement from Concept Defense to Final Institutional Clearance.
- **High-Contrast Tab Switcher**: Solid, tactile buttons with live count badges for:
  - **Uploaded Manuscripts**: Version history (`v1`, `v2`, `v3`) with SHA-256 binary checksums.
  - **Revisions Notes**: Unresolved and resolved faculty feedback.
  - **Panel Consensus Grades**: Deliberation verdicts and composite scores.
- **Sidebar Menu**: Direct links to **My Project** (`/dashboard/my-project`), **Submissions** (`/dashboard/submissions`), **Annotations** (`/dashboard/annotations`), **Grades** (`/dashboard/grades`), and **Notifications** (`/dashboard/notifications`).

### 2.3 Research Project Creation & Team Formation
If you are a student leader initiating a new capstone project:
1. Navigate to **My Project** from the sidebar navigation.
2. Click **Create Capstone Project**.
3. Fill in the required metadata:
   - **Project Title**: Enter the complete descriptive title of your capstone project.
   - **Team Name**: Enter your group moniker (e.g., `TEAM POLARIS`).
   - **Academic Track / Department**: Select `Department of Computational Sciences (BSIT)`.
   - **Assigned Class Section Adviser**: Selects your designated faculty adviser (e.g., **Froiland B. Peñalosa**).
4. Click **Save & Initialize Workspace**.
5. Once created, AURORA generates a unique **6-Character Project Join Code** (e.g., `AUR-9402`). Distribute this code to your groupmates.
6. Group members join by navigating to **My Project**, clicking **Join Project via Code**, entering the join code, and clicking **Confirm Membership**.

### 2.4 Manuscript Upload & Automated Version Control
AURORA enforces strict document integrity and PDF-only submissions:
1. In the **My Project** screen, click **Upload Manuscript**.
2. Drag and drop your compiled PDF document (maximum file size: 50MB) or click **Browse Files**.
3. The system automatically computes a cryptographic **SHA-256 Checksum** of the PDF binary to guarantee non-tampering.
4. Check the verification acknowledgment box: *"I confirm that this PDF is the complete and final copy approved by our team."*
5. Click **Submit Manuscript**.
6. The system stores the document in a secure, private Supabase Storage bucket (`manuscripts/`), generates version number `v1` (or increments existing versions: `v2`, `v3`), and dispatches an automated notification to your research adviser.

### 2.5 Filing the Oral Defense Application (Form DCS-CF-01 / DCS-CF-03)
Once your manuscript is uploaded, you must officially file for defense scheduling:
1. In **My Project** (`/dashboard/my-project`), locate the defense scheduling card and click **Apply for Oral Defense** (or **View Defense Application**).
2. The **Application for Oral Defense** dialog opens, rendering the official Partido State University Department of Computational Sciences document header (`/forms/bsit_header_banner.png`) with document code **DCS-CF-01** (for Title Defense) or **DCS-CF-03** (for Progress Report Defense):
   - **Date Today**: Automatically populates with current date (editable).
   - **Name of Members**: Split across two designated lines (Line 1 for up to 3 members; Line 2 for additional team members).
   - **Capstone Working Titles**: Fields for Concept 1 (Primary Title), Concept 2, and Concept 3.
   - **Required Documents Checklist**:
     - [x] *Accomplishment Report (Fully accomplished form)*
     - [x] *Documentation (Printed, three [3] copies: Chapter 1-3 of Concept 1, Concept Paper 2 & 3)*
     - [x] *Presentation Files*
   - **Scheduling Preferences**:
     - Preferred Defense Date (e.g., `September 14, 2026`).
     - Preferred Time Window (e.g., `09:30 AM`).
     - Comments / Venue Preferences (optional).
3. Click **Submit Oral Defense Application**.
4. The application status updates to `submitted_by_student` with an amber badge **Awaiting Adviser Sign-off**. It routes directly to your research adviser.

### 2.6 Viewing Real-Time Annotations & Feedback
1. To inspect faculty feedback, go to **Submissions** (`/dashboard/submissions`) and click **Open Review** on your document card.
2. The **Evaluation Workspace** displays the dual-pane viewer:
   - **Left Pane**: Interactive PDF Manuscript with highlighted text spans, markup pins, and color-coded severity tags (*Critical*, *Major*, *Minor*).
   - **Right Pane**: Threaded commentary panel displaying remarks from your adviser and panel members.
3. Click any annotation highlight to jump directly to the referenced page and paragraph.
4. Type your reply in the response box under the comment thread (e.g., *"Revised in Chapter 3, Table 4.2"*) and click **Send Reply**.

### 2.7 Tracking Defense Schedules & Evaluation Verdicts
1. When the Defense Coordinator publishes your schedule, you will receive an in-app notification.
2. Navigate to **Defenses** (`/dashboard/defenses`) to review your assigned defense venue (e.g., *CECS Conference Room*), date/time, and appointed panel committee.
3. Following the defense deliberation, visit **Grades & Verdicts** (`/dashboard/grades`) to view:
   - Consolidated panel weighted scores.
   - Official institutional verdict (`Passed`, `Passed with Minor Revisions`, `Passed with Major Revisions`, or `Re-Defense`).
   - Digital certificates of completion and official ParSU defense serials (`AURORA-YYYY-NNNNNN`).

---

## 3. MODULE 2: RESEARCH ADVISER USER MANUAL

```
+---------------------------------------------------------------------------------------+
|                           RESEARCH ADVISER WORKFLOW MAP                               |
+---------------------------------------------------------------------------------------+
| [Login] -> [Adviser Dashboard] -> [Paperless Review Queue] -> [Annotate Manuscript]   |
|                                                                     |                 |
|  [Dept. Chair Sign-off] <- [Certify DCS-CF-01/03] <- [Endorse for Defense Gate]       |
+---------------------------------------------------------------------------------------+
```

### 3.1 Authentication & Advisee Directory Access
1. Sign in at `/login` using your faculty adviser credentials (e.g., `panelist1@aurora.test` / `Panel123!` for **Froiland B. Peñalosa** or your `@parsu.edu.ph` address).
2. The **Adviser Dashboard** opens, featuring three prominent, high-contrast `<Button>` tabs:
   - **Guidance Directory**: Complete roster of all advisee capstone groups assigned to your supervision, showing members, active stage, and direct review links.
   - **Paperless Review Queue** (with pending count badge): Focused queue of advisee drafts awaiting your review, with quick one-click actions: **Request Revisions**, **Endorse for Defense**, and **Open Review Workspace**.
   - **Activity Trails**: Live chronological feed of advisee manuscript uploads, revisions, and student responses.

### 3.2 Dual-Pane Review Workspace Navigation
1. On any advisee card, click **Open Review** (or **Open Review Workspace**) to launch the evaluation workspace (`/workspace/[projectId]/[stageId]`).
2. The workspace consists of two synchronized viewports:
   - **Left Viewport (62% default width)**: Vector-rendered PDF manuscript viewer featuring zoom control (100%–200%), page navigation, text selection, and version comparison toggles.
   - **Right Viewport (38% default width)**: Administrative compliance panel containing the **Adviser Defense Endorsement Gate**, institutional metadata, and threaded annotations.
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

### 3.4 Action 1: Manuscript Defense Endorsement Gate (Unlocking Scheduling)
Before a project can be scheduled for defense, the research adviser must endorse defense readiness:
1. In the **Review Workspace** right-hand panel, locate the **Adviser Defense Endorsement Gate** card (or locate the project under **Paperless Review Queue** on the Adviser Dashboard).
2. Review the annotations summary (number of open comments vs. resolved comments).
3. In the **Adviser Consultation Remarks** textarea, type your final endorsement evaluation (e.g., *"Manuscript is comprehensive, prototype verified, recommended for oral defense presentation"*).
4. Click **Endorse for Defense**.
5. The manuscript status updates to `approved`. This clears the prerequisite gate, enabling the Defense Coordinator's scheduling engine to accept the project.

### 3.5 Action 2: Signing the Official Adviser Certification (Form DCS-CF-01 / DCS-CF-03)
When students file an official defense application, the research adviser must formally certify the application form:
1. Open the project's **Application for Oral Defense** dialog (accessible by clicking **View Defense Application** in **My Project**, **Submissions**, or the **Review Workspace**).
2. The dialog renders the official Department of Computational Sciences form with header banner and document code **DCS-CF-01** (Title Defense) or **DCS-CF-03** (Progress Report Defense).
3. Verify the proponent details, proposed concepts, and required checklist items (Accomplishment Report, Documentation 3 copies, Presentation files).
4. Scroll to the section titled **CERTIFICATION OF THE ADVISER**, which contains the official institutional certification clause:
   > *"This is to certify that I have thoroughly evaluated the project for Title Defense requirements in accordance with the prescribed requirements and have reviewed and verified the completeness and accuracy of the documents submitted with this application. Based on this evaluation, I hereby recommend that the above name of students be permitted to proceed with the progress report defense."*
5. When authenticated as the assigned adviser, an amber action box appears: **Adviser Certification Action (DCS-CF-01 / DCS-CF-03)**.
6. Click **Sign Certification of the Adviser** (`handleCertify`).
7. The system instantly records your authenticated identity, applies a server-verified timestamp, updates the application status to `certified_by_adviser` (**Certified by Adviser**), and imprints `[Digitally Certified MM/DD/YYYY]` directly above your printed name (`Signature of Adviser over Printed Name`).
8. **Routing to Department Chair**: The certified form automatically advances to the Department Chair (**Dr. Kennedy C. Cuya, DIT**), who reviews the application and clicks **Approve Application as Department Chair**, updating the status to `approved_by_chair` and clearing the application for coordinator defense scheduling.

### 3.6 Academic Conflict-of-Interest Guard (Adviser Non-Grading Policy)
To preserve academic integrity and eliminate bias:
- **Advisers do NOT grade rubrics for their advisees**: In the evaluation workspace, the rubric scoring drawer is disabled for the assigned research adviser.
- **Firewall Enforcement**: The Defense Coordinator's scheduling module strictly prevents an adviser from being assigned as a Panel Chairperson or Panel Member for their own advisee's defense.

---

## 4. MODULE 3: FACULTY PANEL EVALUATOR USER MANUAL

```
+---------------------------------------------------------------------------------------+
|                           PANEL EVALUATOR WORKFLOW MAP                                |
+---------------------------------------------------------------------------------------+
| [Login] -> [Panel Dashboard] -> [Assigned Defenses] -> [Workspace Rubric DCS-CF-04]   |
|                                                                 |                     |
|           [Audit Log & Hash Recorded] <- [RA 8792 Signature] <- [Input Criteria Scores]|
+---------------------------------------------------------------------------------------+
```

### 4.1 Panelist Access & Defense Calendar Schedule
1. Sign in using your faculty panelist account (e.g., `panelist2@aurora.test` / `Panel123!` for **Dr. Aris Thorne** or your official `@parsu.edu.ph` address).
2. The **Panelist Dashboard** opens, featuring three solid, high-contrast `<Button>` tabs:
   - **Research Manuscripts**: Active capstone projects assigned to your evaluation panel.
   - **Pending Drafts**: Defenses where scoring has started but digital signature has not yet been affixed.
   - **Signature History**: Past signed evaluation sheets with certificate serials.
3. Click **Defenses** (`/dashboard/defenses`) to review your panel schedule with time, room, and appointed committee members.

### 4.2 Accessing the Live Evaluation Workspace
1. Click **Workspace →** (or **Evaluate Defense**) on the assigned project card.
2. The workspace opens with the **ParSU BSIT Oral Defense Rubric (Form DCS-CF-04)** pinned to the right-hand panel.
3. The left pane provides full access to the proponent's submitted PDF manuscript, allowing you to cross-examine technical documentation while scoring.

### 4.3 Navigating the ParSU BSIT Oral Defense Rubric (Form DCS-CF-04)
AURORA incorporates the official Department of Computational Sciences evaluation instrument (Form DCS-CF-04). The rubric is divided into four weighted criteria dimensions:

| Dimension Code | Evaluation Criteria | Max Weight |
| :---: | :--- | :---: |
| **CRIT-01** | **Technical Content & Methodology**<br>*Soundness of research design, data instrumentation, and architectural logic* | **30%** |
| **CRIT-02** | **System Prototype & Implementation**<br>*Functionality, code quality, security, and UI/UX execution* | **35%** |
| **CRIT-03** | **Presentation & Delivery**<br>*Clarity, professional mastery, adherence to time, and visual decks* | **15%** |
| **CRIT-04** | **Q&A Defense & Subject Mastery**<br>*Readiness in addressing technical critique and defense interrogation* | **20%** |
| **TOTAL** | **Comprehensive Weighted Oral Defense Score** | **100%** |

### 4.4 Real-Time Criteria Scoring & Weighted Computations
1. For each criterion dimension, enter a numeric score from `1.0` to `5.0` (or percentage equivalent).
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
To comply with the Philippine **Electronic Commerce Act of 2000 (Republic Act No. 8792)**, evaluations cannot be finalized with a casual click:
1. Click **Sign & Submit Evaluation**.
2. The **Cryptographic Electronic Signature Modal** (`SignatureDialog`) appears.
3. Choose your signature method:
   - **Draw**: Render your handwritten stroke on the signature canvas.
   - **Type**: Generate a stylized legal signature from your printed name.
   - **Saved Profile**: Use your verified stored university e-signature baseline.
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
| [Login] -> [Defenses Hub] -> [Verify Adviser & Chair Badges] -> [Schedule Defense]   |
|                                                                     |                 |
|             [Consensus DCS-CF-05] <- [Publish Verdict] <- [Live Defense Conducted]    |
+---------------------------------------------------------------------------------------+
```

### 5.1 Coordinator Command Hub & Defense Pipeline
1. Sign in using Coordinator credentials (e.g., `coord@aurora.test` / `Panel123!` or `kccuya@parsu.edu.ph` for **Dr. Kennedy C. Cuya**).
2. The **Coordinator Dashboard** provides institutional oversight:
   - **Defenses Hub** (`/dashboard/defenses`): High-contrast tabs for **Oral Defenses**, **Defense Stages**, and **Calendar View**.
   - **Status Filter Controls**: Solid buttons for **All Defenses**, **Upcoming & Live**, **Concluded & Evaluated**, and **Cancelled**.
   - **Quick Actions**: **Schedule Defense** and **Manage Stages**.

### 5.2 Verification of Oral Defense Applications & Dual Endorsement Check
Before scheduling an oral defense, the Defense Coordinator verifies the defense application:
1. Navigate to **Defenses Management** (`/dashboard/defenses`).
2. Verify that the project displays the prerequisite badges:
   - **Certified by Adviser**: Confirms Form DCS-CF-01 / DCS-CF-03 has been reviewed and certified by the research adviser.
   - **Approved by Dept. Chair**: Confirms Department Chair approval has been granted.
3. Verify that the manuscript is endorsed (`approved`) by the research adviser.

### 5.3 Single-Project Defense Scheduling & Conflict Detection
To schedule an individual defense session:
1. Click **Schedule Defense** (`/dashboard/defenses/schedule`) and select **Single Project Mode**.
2. Select the target project from the dropdown. Projects with endorsed manuscripts and approved applications are marked with a green badge `✓ Ready for Defense`.
3. Choose the defense date and specify start time and duration (default: 90 minutes).
4. Select the physical venue (e.g., *CECS Conference Room*, *Annex IIT Building*) or toggle **Online Defense** to supply a video conference URL.
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
   - **Conflict of Interest Check**: If you accidentally select the project's research adviser (e.g., Froiland B. Peñalosa) as a panel evaluator, AURORA immediately blocks the action with a clear policy violation alert.
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
5. The system transitions the project to the next curriculum milestone (e.g., *Title Defense* $\rightarrow$ *Progress Report 1*) and generates the official **Progress Report Evaluation Summary Sheet (Form DCS-CF-05)** and verifiable digital certificates.

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
2. The **Dean Dashboard** (`/dashboard`) provides institutional oversight across four solid `<Button>` tabs:
   - **College Defense Pipeline**: Live stage distribution across all academic programs.
   - **Department Performance**: Departmental comparison between **Department of Computational Sciences (DCS)** and **Department of Engineering (DOE)**.
   - **My Defense Assignments**: Defenses where the Dean is an appointed panelist or observer.
   - **Published Defense Verdicts**: Executive archive of concluded deliberations and formal verdicts.
3. Navigate to **Analytics** (`/dashboard/analytics`) to inspect throughput metrics, pass rates, and ISO/IEC 25010 performance indicators.

### 6.2 ISO/IEC 25010 Software Quality & Compliance Auditing
AURORA continuously logs software operational metrics evaluated under ISO/IEC 25010:
- **Functional Suitability**: 100% complete transaction logging across all CRUD actions.
- **Performance Efficiency**: Database query latencies tracked with sub-second execution thresholds.
- **Usability (SUS & UTAUT Metrics)**: Usability survey module accessible directly from the welcome banner.
- **Security**: Complete separation of duties enforced through cryptographic tokens and Row-Level Security.

### 6.3 User Account, Role, and Hierarchy Management
System administrators manage campus hierarchy and role delegations:
1. Navigate to **User Management** (`/admin/users`).
2. Search users by name, student number, or institutional email.
3. Manage role assignments:
   - `student`: Standard proponent access.
   - `adviser`: Advisee management, review workspace, and DCS-CF-01/03 certification.
   - `panelist`: Evaluation workspace, DCS-CF-04 rubric scoring, and digital signature.
   - `coordinator`: Gating verification, defense scheduling, and stage promotion.
   - `college_dean`: Executive oversight, analytics, and institutional sign-off.
   - `sys_admin`: Full system infrastructure privileges.
4. Deactivate inactive accounts or initiate password resets securely.

### 6.4 Academic Workflow Stages & Rubric Template Configuration
1. Navigate to **Workflow Stages** (`/admin/stages`) to customize defense milestones, change sequence ordering, or adjust required document types.
2. Navigate to **Rubric Templates** (`/admin/rubrics`) to edit criteria descriptions, percentage weights, and scoring scales aligned with revised curriculum guidelines.

### 6.5 System Health, Backup, and Activity Logs
1. Navigate to **System Health** (`/admin/system-health`) to run the 6 automated subsystem diagnostic probes and the **Run Self-Healing Maintenance** engine.
2. Click **Export Disaster Recovery Backup (JSON)** to generate a SHA-256 signed snapshot of all 20 relational tables.
3. Navigate to **Audit Trail** (`/admin/audit`) to review immutable transaction logs:
   - Actor Profile & Email
   - Timestamp & Originating IP Address
   - Action Category (`SUBMIT`, `APPROVE`, `SCHEDULE`, `SIGN`, `VERDICT`)
   - Pre-change and post-change JSON state snapshots

---

## 7. APPENDIX H QUICK TIPS & TROUBLESHOOTING GUIDE

### Quick Tips for Defense Day Success
- **Browser Recommendation**: Always utilize Google Chrome or Microsoft Edge with hardware acceleration enabled for optimal PDF vector rendering.
- **Rapid Account Switching**: Open `/presentation` or `/demo` in a separate browser tab to quickly switch between Proponent, Adviser, Coordinator, and Panelist views during demonstrations.
- **Digital Signatures**: If drawing with a mouse is uncomfortable, select the **Type** option or pre-configure your verified signature profile under `/dashboard/settings`.
- **Offline / Connectivity Safeguards**: AURORA incorporates local state persistence; if an unexpected network drop occurs, rubric draft scores remain cached in the browser session.

### Troubleshooting Matrix

| Issue Encountered | Root Cause | Immediate Resolution |
| :--- | :--- | :--- |
| **"Permission denied. You are not an assigned panelist."** | Evaluator account is not assigned to this project in `defense_panels`. | Ensure the Defense Coordinator has appointed the faculty member in `/dashboard/defenses/schedule`. |
| **"Adviser Conflict of Interest Violation"** | The appointed panel evaluator is also the primary research adviser. | Academic regulations strictly prohibit this. Select an independent faculty evaluator for the panel committee. |
| **"Password re-authentication failed."** | Incorrect password entered during the RA 8792 digital signature step. | Enter the exact account password (`Panel123!` for demo accounts) to re-verify identity. |
| **"Manuscript PDF fails to render."** | Browser extension blocking iframe/canvas or unsupported file format. | Ensure the uploaded file is a valid PDF document. Disable ad-blockers for the AURORA domain. |
| **"Adviser Approval Gate locked."** | Research adviser has not yet clicked *Endorse for Defense*. | Sign in as the designated adviser (Froiland B. Peñalosa), open the workspace, and click **Endorse for Defense**. (In demo mode, this gate is auto-cleared). |
| **"Defense Application awaiting sign-off."** | Application submitted by student has not yet been certified by adviser. | Sign in as the research adviser, open the application dialog (**View Defense Application**), and click **Sign Certification of the Adviser**. |
| **"Buttons appear faint or unclickable."** | Old browser cache displaying deprecated segmented controls. | Press `Ctrl + F5` (hard refresh) to load the updated high-contrast `<Button>` components and crisp card styling. |

---

```
========================================================================================
                             END OF SYSTEM MANUAL — APPENDIX H
                      AURORA © 2026 PARTIDO STATE UNIVERSITY
========================================================================================
```
