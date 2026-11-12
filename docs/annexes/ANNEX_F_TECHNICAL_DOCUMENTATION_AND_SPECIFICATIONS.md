# PARTIDO STATE UNIVERSITY
### College of Engineering and Computational Sciences
**Department of Computational Sciences | Bachelor of Science in Information Technology**  
*San Juan Bautista, Goa, Camarines Sur, Philippines 4422*  
*Website: www.parsu.edu.ph | Contact No.: (054) 871-2090 | ISO 9001:2015 Certified*

---

# ANNEX F: TECHNICAL DOCUMENTATION & SPECIFICATIONS
## Project: AURORA: Paperless Academic Defense Workflow System for Research, Capstone, Thesis & Dissertation Papers at Partido State University – Goa Campus

---

## F.1 SOFTWARE REQUIREMENTS SPECIFICATION (SRS) MATRIX

### 1. Institutional Context & System Scope
The software requirements for **AURORA** were formulated in strict alignment with institutional defense policies and academic guidelines governing undergraduate, graduate, and doctoral research at **Partido State University – Goa Campus**. The platform services five (5) academic colleges across the campus:
1. **College of Engineering and Computational Sciences (CEC)**
2. **College of Education (COED)**
3. **College of Business and Management (CBM)**
4. **College of Arts and Humanities (CAH)**
5. **College of Science (COS)**

The system establishes an automated, auditable paperless workflow across six (6) authenticated user roles and five (5) sequential academic defense stages:
- **Authorized User Roles:** Student Proponent, Research Adviser, Defense Panelist / Evaluator, Research Coordinator, College Dean, and System Administrator.
- **Academic Defense Stages:** (1) Concept Defense, (2) Title Defense, (3) Progress Report 1 (Mid-Term), (4) Progress Report 2 (Pre-Oral), and (5) Final Defense.

---

### 2. Functional Requirements (FR) Matrix

The table below delineates the comprehensive functional requirements of AURORA, categorizing each by subsystem, operational description, actor scope, implementation priority, and institutional defense stage applicability.

| Requirement ID | Module / Subsystem | Functional Requirement Description | User Role | Priority | Applicable Stages |
| :--- | :--- | :--- | :--- | :---: | :--- |
| **FR-01** | Authentication & RBAC | Authenticate users via institutional `@parsu.edu.ph` email and password with role-tailored dashboard redirection and multi-role active context switching. | All Users | High | All Stages |
| **FR-02** | Academic Hierarchy | Bind user accounts and research projects to official ParSU academic levels (Undergraduate, Graduate, Doctoral), colleges, departments, programs, and majors. | Student / Admin | High | All Stages |
| **FR-03** | Team Collaboration | Permit lead student proponents to create research dockets and generate unique 8-character alphanumeric join codes for co-proponent team enrollment. | Student Proponent | High | Concept & Title |
| **FR-04** | Manuscript Ingestion | Provide drag-and-drop PDF manuscript upload with automated SHA-256 cryptographic hashing, byte validation, and chronological version indexing ($v1, v2, \dots, vn$). | Student Proponent | High | All Stages |
| **FR-05** | Secure Storage Gate | Restrict public read access to manuscript binaries by serving private Supabase storage objects via short-lived, authenticated presigned URLs. | Student / Faculty | High | All Stages |
| **FR-06** | Coordinate Annotations | Capture, store, and render inline manuscript annotations using responsive percentage viewport coordinates ($x\%, y\%, w\%, h\%$) across varying screen resolutions. | Adviser / Panelist | High | All Stages |
| **FR-07** | Threaded Deliberation | Support multi-actor threaded discussion replies on specific inline annotations to enable structured proponent-evaluator revision dialogue. | Proponent / Faculty | High | All Stages |
| **FR-08** | Severity Tagging | Classify manuscript remarks into four standard severity levels (*Info*, *Minor*, *Major*, *Critical*) to guide required revision depth. | Adviser / Panelist | Medium | All Stages |
| **FR-09** | Form DCS-CF-03 Filing | Implement digitized Application for Oral Defense (Form DCS-CF-03) with prerequisite checklist validation and preferred schedule submission. | Student Proponent | High | Title to Final |
| **FR-10** | Adviser Endorsement | Enforce digital certification gatekeeper requiring the designated Research Adviser to approve the manuscript and endorse the defense application prior to scheduling. | Research Adviser | High | All Stages |
| **FR-11** | Defense Scheduling | Enable Research Coordinators to schedule defense sessions, specifying date, start time, duration, physical deliberation room, or online meeting link. | Coordinator | High | All Stages |
| **FR-12** | Room Conflict Guard | Detect and prevent room scheduling overlaps by validating prospective room reservations against existing bookings within equivalent time windows. | Coordinator / System | High | All Stages |
| **FR-13** | Impartiality Firewall | Enforce institutional academic integrity policy by automatically disqualifying a student's assigned Research Adviser from being appointed as a voting defense panelist. | Coordinator / System | High | All Stages |
| **FR-14** | Committee Formation | Support defense panel composition designating exactly one (1) Committee Chairperson and two (2) Panel Members with real-time faculty availability checking. | Coordinator | High | All Stages |
| **FR-15** | Batch Scheduling | Enable coordinators to execute batch defense scheduling and committee chairman appointments across multiple student cohorts simultaneously. | Coordinator | Medium | All Stages |
| **FR-16** | Rubric Engine (DCS-CF-04) | Compute criteria and weighted total scores based on program-specific rubric templates (e.g., ParSU BSIT: $30\% + 35\% + 25\% + 10\% = 100\%$). | Defense Panelist | High | All Stages |
| **FR-17** | Legal Digital Signing | Enforce step-up password re-authentication before committing digital signatures to Form DCS-CF-04, satisfying legal non-repudiation under R.A. 8792. | Defense Panelist | High | All Stages |
| **FR-18** | Evaluation Lock State | Irreversibly lock submitted evaluations and digital signatures (`is_locked = true`), prohibiting post-submission modifications by any actor. | System / Kernel | High | All Stages |
| **FR-19** | Consensus Deliberation | Aggregate individual panelist scores into a weighted consensus grade and determine official defense verdict (*Approved*, *Minor Revisions*, *Major Revisions*, *Re-Defense*). | Panel Chair / Coord | High | All Stages |
| **FR-20** | Atomic Serial Issuance | Generate tamper-evident certificate serial numbers (`AURORA-YYYY-NNNNNN`) utilizing an atomic PostgreSQL database sequence upon consensus approval. | System / Database | High | All Stages |
| **FR-21** | Public Verification Portal | Expose unauthenticated public routes (`/verify/{serial}` and `/api/verify/{serial}`) for instant cryptographic verification of certificate authenticity by external parties. | Public / Auditor | High | Post-Defense |
| **FR-22** | Dean KPI Analytics | Deliver real-time executive dashboard visualizations depicting defense pass rates, rubric dimensional averages, college workloads, and turnaround times. | College Dean / Admin | Medium | All Stages |
| **FR-23** | Transactional Audit Trail | Maintain an immutable, append-only audit log recording actor UUID, email, role, action type, IP address, user agent, and JSON payload diffs for all critical actions. | Admin / Dean | High | All Stages |
| **FR-24** | Self-Healing Diagnostics | Provide system administrators with live subsystem telemetry probes, database integrity checks, and one-click database self-healing repair routines. | System Admin | High | All Stages |
| **FR-25** | Encrypted Data Backup | Enable on-demand generation and verification of SHA-256 signed JSON database backups with schema metadata and table record counts. | System Admin | High | All Stages |
| **FR-26** | Real-Time Notifications | Deliver instant in-app alerts and email notifications for milestone events (manuscript uploads, remarks, scheduling confirmations, verdicts). | All Users | Medium | All Stages |
| **FR-27** | Multi-Version Diff Viewer | Allow faculty and students to compare manuscript versions side-by-side with overlaid annotation remark markers and resolution statuses. | Proponent / Faculty | Medium | Revisions |
| **FR-28** | Official Document Export | Generate exportable, print-ready PDF certificates, defense evaluation summaries, and annotated manuscript markups for institutional accreditation records. | Faculty / Student | High | Post-Defense |

---

### 3. Non-Functional Requirements (NFR) Matrix (ISO/IEC 25010 Quality Model)

AURORA’s non-functional parameters are structured in strict compliance with the **ISO/IEC 25010 Software Product Quality Model**, specifying quantifiable metrics and empirical verification methodologies.

| Requirement ID | ISO/IEC 25010 Dimension | Sub-Characteristic | Target Metric Specification | Empirical Verification Method |
| :--- | :--- | :--- | :--- | :--- |
| **NFR-01** | Performance Efficiency | Time Behavior | Initial page load and dashboard rendering $\le 1.5\text{ s}$ over standard 5 Mbps campus connection; API response time $\le 250\text{ ms}$. | Google Lighthouse Audits & Chrome DevTools Profiling |
| **NFR-02** | Performance Efficiency | Resource Utilization | Client memory footprint $\le 200\text{ MB}$ during active dual-pane PDF rendering; server compute $\le 60\%$ peak CPU utilization. | Vercel Analytics & Supabase Metrics Dashboard |
| **NFR-03** | Compatibility | Co-existence & Cross-Browser | Operational parity across modern web browsers (Chrome 120+, Edge 120+, Firefox 120+, Safari 17+) and mobile/tablet browsers. | Playwright Automated Cross-Browser Matrix Suite |
| **NFR-04** | Usability | Accessibility & Operability | WCAG 2.1 Level AA color contrast compliance ($\ge 4.5:1$ ratio); responsive layouts across desktop ($1920\text{px}$) down to mobile ($375\text{px}$). | Axe-core Accessibility Engine & Viewport Emulation |
| **NFR-05** | Reliability | Availability & Continuity | Platform uptime $\ge 99.9\%$ excluding scheduled maintenance; zero single points of failure across edge CDN and managed database tiers. | Pingdom Uptime Monitoring & StatusPage SLA Tracking |
| **NFR-06** | Reliability | Recoverability | Recovery Point Objective (RPO) $\le 1.0\text{ hour}$; Recovery Time Objective (RTO) $\le 4.0\text{ hours}$ utilizing automated Supabase WAL backups. | Annual Disaster Recovery Simulation & Tabletop Restoration Drill |
| **NFR-07** | Security | Confidentiality & Integrity | Passwords hashed using bcrypt; Row-Level Security (RLS) active on all 26 relational tables; private S3 buckets for manuscripts. | Automated Supabase Security Linter & RLS Penetration Tests |
| **NFR-08** | Security | Non-Repudiation | Digital signatures comply with R.A. 8792 standards via step-up re-authentication, SHA-256 payload hashing, and irreversible database locking. | Cryptographic Hash Verification & Forensic Audit Scans |
| **NFR-09** | Maintainability | Modularity & Testability | Strict modular Next.js App Router architecture; TypeScript type-checking with zero `any` mutations; automated test suite code coverage $\ge 80\%$. | TypeScript Compiler (`tsc --noEmit`) & Vitest Suites |
| **NFR-10** | Portability | Adaptability | Cloud-agnostic Next.js and PostgreSQL persistence layer, facilitating zero-vendor-lockin deployment to AWS, Vercel, Docker, or on-premise servers. | Docker Container Build & Local Environment Spinning Tests |

---

### 4. Requirements Traceability Matrix (RTM)

The Requirements Traceability Matrix demonstrates the bidirectional alignment between institutional policies, research objectives, software requirements, and verification test cases.

| Policy / Business Driver | Institutional Mandate | Target User Roles | SRS Requirement IDs | Software Subsystem Module | Verification Test Suite |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Paperless Institutional Mandate** | ParSU Strategic Modernization Plan 2025–2030 | Student Proponent, Faculty Adviser, Coordinator | FR-04, FR-05, FR-06, FR-07, FR-08 | Manuscript Ingestion & Split-Screen Review Workspace | TC-DOC-01 to TC-DOC-14 |
| **Academic Defense Integrity Policy** | PSU Capstone & Thesis Defense Guidelines (Rev. 2024) | Coordinator, Panelist, Adviser | FR-10, FR-11, FR-12, FR-13, FR-14, FR-15 | Scheduling Engine & Impartiality Firewall | TC-SCHED-01 to TC-SCHED-22 |
| **Electronic Commerce Act of 2000** | Republic Act No. 8792 (E-Signature Legal Validity) | Defense Panelist, Committee Chair | FR-16, FR-17, FR-18, FR-19, FR-20, FR-21 | Rubric Evaluation Engine & Signature Subsystem | TC-SIG-01 to TC-SIG-18 |
| **Accreditation & Audit Compliance** | CHED CMO No. 25 s. 2015 & ISO 9001:2015 Clause 7.5 | College Dean, System Administrator | FR-22, FR-23, FR-24, FR-25, FR-28 | Executive Analytics, Audit Logs & DR Console | TC-AUDIT-01 to TC-AUDIT-12 |

---

## F.2 COMPREHENSIVE SYSTEM DOCUMENTATION

### 1. High-Level Four-Tier Cloud Architecture
AURORA is engineered as a modern, decoupled cloud application leveraging **Next.js 16 (App Router / React 19)** on the presentation and edge routing layer, backed by **Supabase (PostgreSQL 15, GoTrue Auth, S3 Private Object Storage, and Realtime Engine)** on the persistence and infrastructure tier.

```
+--------------------------------------------------------------------------------------------------+
|                                  TIER 1: CLIENT PRESENTATION TIER                                |
|  - React 19 Server & Client Components          - Responsive Viewport Coordinate Annotation Pad   |
|  - Tailwind CSS v4 Modern Theme Tokens          - HTML5 Canvas Electronic Signature Module       |
|  - PDF.js Embedded Manuscript Rendering Engine  - Institutional Public Verification Viewport     |
+-------------------------------------------------+------------------------------------------------+
                                                  |  HTTPS / WSS / REST / RPC
                                                  v
+--------------------------------------------------------------------------------------------------+
|                              TIER 2: EDGE APPLICATION & ROUTING TIER                              |
|  - Next.js 16 App Router & Route Handlers       - Next.js Server Actions (Type-Safe Mutations)   |
|  - Edge Middleware Route Guard (`src/proxy.ts`)  - Step-Up Re-Authentication Engine (R.A. 8792)  |
|  - Public JSON API Gateway (`/api/verify/...`)  - Impartiality Firewall & Schedule Conflict Guard|
+-------------------------------------------------+------------------------------------------------+
                                                  |  Supabase SSR SDK / Secure Service Role
                                                  v
+--------------------------------------------------------------------------------------------------+
|                           TIER 3: CLOUD MICROSERVICES & BaaS TIER (SUPABASE)                      |
|  - GoTrue Authentication Gateway (JWT Sessions) - S3-Compatible Private Object Storage Buckets   |
|  - Realtime WebSocket Bus (Live Annotations)    - Edge Storage Access Gatekeeper (Signed URLs)   |
+-------------------------------------------------+------------------------------------------------+
                                                  |  Kernel SQL / Row-Level Security
                                                  v
+--------------------------------------------------------------------------------------------------+
|                           TIER 4: DATA PERSISTENCE & SECURITY TIER (POSTGRESQL 15)                |
|  - 26 Normalized Relational Tables              - Atomic Defense Consensus Stored Procedures     |
|  - Kernel Row-Level Security (RLS) Policies     - Certificate Sequence Generator (`AURORA-YYYY`) |
|  - Append-Only Immutable `audit_logs` Trigger   - Point-in-Time Recovery & WAL Archiving         |
+--------------------------------------------------------------------------------------------------+
```

#### Detailed Tier Architecture Breakdown:
1. **Tier 1 — Client Presentation Tier:**
   - Built on React 19 and Tailwind CSS v4, providing an accessible, responsive user interface adapted for desktop monitors, laptops, and mobile devices.
   - Embeds a custom vector `PDF.js` canvas engine capable of rendering multi-page academic manuscripts with sub-pixel text layer alignment.
   - Implements an interactive HTML5 vector signature pad allowing panelists to draw, type, or upload digital signatures.
2. **Tier 2 — Edge Application & Routing Tier:**
   - Hosted on Vercel's global edge network, providing low-latency server-side rendering (SSR), streaming dynamic UI components, and static asset delivery.
   - Enforces institutional role-based access control (RBAC) through Next.js 16 edge middleware (`src/proxy.ts`), inspecting session JWT tokens before route dispatch.
   - Executes business logic via Next.js Server Actions, handling atomic state mutations, schedule conflict detection, and step-up password verification.
3. **Tier 3 — Cloud Microservices & BaaS Tier (Supabase Cloud):**
   - **GoTrue Auth:** Issues secure, HTTP-only, short-lived JWT access tokens and long-lived refresh tokens with encrypted cookie serialization.
   - **S3 Object Storage:** Houses student manuscript PDFs inside private, non-public storage buckets (`/manuscripts`), accessible only through time-limited presigned URLs.
   - **Realtime WebSocket Bus:** Broadcasts real-time events over WebSocket Secure (WSS) connections to synchronize inline annotations and deliberations across simultaneous users.
4. **Tier 4 — Data Persistence & Kernel Security Tier (PostgreSQL 15):**
   - Managed PostgreSQL 15 instance deployed in AWS Region `ap-southeast-1` (Singapore) to ensure ultra-low network latency for Philippine institutional traffic.
   - Enforces kernel-level Row-Level Security (RLS) policies across all 26 relational tables, guaranteeing tenant isolation between colleges and defense committees.
   - Maintains transactional integrity using PostgreSQL functions, triggers, and atomic sequences (`certificate_serial_seq`).

---

### 2. Defense Lifecycle State Machine & Swimlane Workflow

AURORA guides academic research through a formal finite-state machine comprising eight (8) primary lifecycle states across six (6) collaborating institutional actors.

```
 [ S-01: DRAFT ] 
        |  (Proponent uploads PDF manuscript & registers docket)
        v
 [ S-02: UNDER_ADVISER_REVIEW ]
        |  (Adviser inspects inline remarks & signs Form DCS-CF-03)
        v
 [ S-03: ENDORSED_BY_ADVISER ]
        |  (Coordinator assigns conflict-free date, room & panel)
        v
 [ S-04: SCHEDULED ]
        |  (Defense convenes; oral presentation commences)
        v
 [ S-05: IN_DELIBERATION ]
        |  (Panelists grade DCS-CF-04 rubrics & affix R.A. 8792 signatures)
        v
 [ S-06: EVALUATED_AND_LOCKED ]
        |  (Consensus algorithm executes; aggregate grade finalized)
        v
 [ S-07: CONSENSUS_FINALIZED ] 
        |---> Approved (Pass) ----------> [ S-08: CLEARED_AND_ARCHIVED ]
        |---> Minor Revisions (14 days) -> [ Re-Upload & Adviser Verify ]
        |---> Major Revisions (30 days) -> [ Re-Upload & Panel Re-Check ]
        +---> Re-Defense Required -------> [ S-03: Re-Schedule Defense ]
```

| State Code | Lifecycle State Name | Transition Trigger Action | Responsible Actor | Destination Valid State(s) |
| :--- | :--- | :--- | :--- | :--- |
| **S-01** | `DRAFT` | Proponent creates research project docket and uploads initial PDF manuscript ($v1$). | Student Proponent | `UNDER_ADVISER_REVIEW` |
| **S-02** | `UNDER_ADVISER_REVIEW` | Designated Research Adviser reviews inline annotations and signs Form DCS-CF-03 endorsement. | Research Adviser | `ENDORSED_BY_ADVISER` or `CHANGES_REQUESTED` |
| **S-03** | `ENDORSED_BY_ADVISER` | Capstone Coordinator verifies prerequisite clearance, executes conflict check, and schedules defense. | Research Coordinator | `SCHEDULED` |
| **S-04** | `SCHEDULED` | Defense session begins; manuscript is projected in the Dual-Pane Deliberation Workspace. | Defense Committee | `IN_DELIBERATION` |
| **S-05** | `IN_DELIBERATION` | Panel members complete Form DCS-CF-04 rubric criteria and execute step-up signature re-authentication. | Panel Chair & Members | `EVALUATED_AND_LOCKED` |
| **S-06** | `EVALUATED_AND_LOCKED` | System validates that all panelist evaluations are committed, locked, and cryptographically hashed. | System / Kernel | `CONSENSUS_FINALIZED` |
| **S-07** | `CONSENSUS_FINALIZED` | Committee Chair and Coordinator review weighted aggregate score and finalize official verdict. | Committee Chair | `APPROVED`, `MINOR_REVISIONS`, `MAJOR_REVISIONS`, or `RE_DEFENSE` |
| **S-08** | `CLEARED_AND_ARCHIVED` | Final revised manuscript verified; atomic certificate serial (`AURORA-YYYY-NNNNNN`) issued and archived. | Dean / Coordinator | `ARCHIVED` |

---

### 3. Dual-Pane Manuscript Review & Responsive Coordinate Annotation Workspace

A core technical innovation of AURORA is the **Dual-Pane Manuscript Review & Rubric Grading Workspace**. To ensure that faculty remarks remain pinpoint-accurate regardless of screen size, device orientation, or zoom level, AURORA employs a **Viewport-Independent Percentage Coordinate System**.

#### Mathematical Formulation of Responsive Coordinates:
When a faculty evaluator drags a selection box over a manuscript passage, the client captures pixel coordinates $(x_{px}, y_{px}, w_{px}, h_{px})$ relative to the active PDF page canvas dimensions $(W_{page}, H_{page})$. These values are converted into normalized floating-point percentages prior to database persistence:

$$x_{\%} = \left( \frac{x_{px}}{W_{page}} \right) \times 100\%$$

$$y_{\%} = \left( \frac{y_{px}}{H_{page}} \right) \times 100\%$$

$$w_{\%} = \left( \frac{w_{px}}{W_{page}} \right) \times 100\%$$

$$h_{\%} = \left( \frac{h_{px}}{H_{page}} \right) \times 100\%$$

#### Normalized Coordinate Storage Schema (JSONB):
```json
{
  "page_number": 14,
  "highlight_coordinates": {
    "x": 18.45,
    "y": 42.10,
    "width": 62.30,
    "height": 4.85
  },
  "selected_text": "The system utilizes single-factor authentication for sensitive grade finalization.",
  "comment": "Under R.A. 8792 and PSU institutional policy, grade finalization requires step-up digital signature re-authentication. Please revise the architectural narrative.",
  "severity": "major",
  "status": "open"
}
```

When any user opens the manuscript on any display (e.g., $1920 \times 1080$ desktop monitor, $1366 \times 768$ laptop, or $1080 \times 2400$ mobile tablet), the client recalculates the bounding box using the local page canvas width and height:
$$x_{render} = W_{local} \times \left( \frac{x_{\%}}{100} \right), \quad y_{render} = H_{local} \times \left( \frac{y_{\%}}{100} \right)$$
This mathematical approach completely prevents coordinate drifting, misalignments, or obscured remarks.

---

### 4. Electronic Signature & Consensus Scoring Engine (R.A. 8792 Compliance)

AURORA implements an electronic signature subsystem designed in full compliance with **Republic Act No. 8792 (Philippine Electronic Commerce Act of 2000)** and its Implementing Rules and Regulations (IRR).

#### 1. Four Pillars of R.A. 8792 Legal Compliance:
1. **Signatory Authentication:** Prior to affixing a signature, the panelist must undergo step-up re-authentication by entering their account password, confirming physical presence and identity.
2. **Demonstration of Intent:** The evaluation interface presents a clear legal affirmation: *"By entering my password and submitting this evaluation, I certify under penalty of administrative sanction that I have thoroughly evaluated this defense pursuant to ParSU academic standards."*
3. **Document Integrity & Tamper-Evidence:** The evaluation payload (scores, rubric criteria, feedback remarks, panelist UUID, and timestamp) is serialized and hashed using **SHA-256**. The resulting hash is stored in the immutable database record.
4. **Irreversible Record Locking:** Once committed, the evaluation status is set to `locked` and `is_locked = true`. Database Row-Level Security explicitly revokes all `UPDATE` and `DELETE` privileges on locked records.

#### 2. Weighted Rubric Scoring Formula (Form DCS-CF-04):
The authoritative composite score for an evaluation is calculated using the weighted sum of dimensional criteria:

$$\text{Final Evaluation Score} = \sum_{i=1}^{k} \left( \text{Score}_i \times \frac{\text{Weight}_i}{100} \right)$$

For the Bachelor of Science in Information Technology (BSIT) program at Partido State University:
$$\text{Score} = (S_{\text{Technical}} \times 0.30) + (S_{\text{Execution}} \times 0.35) + (S_{\text{Oral}} \times 0.25) + (S_{\text{Manuscript}} \times 0.10)$$

#### 3. Consensus Verdict Decision Matrix:
The final consensus grade is the arithmetic mean of all participating panel members' scores:
$$\bar{S}_{\text{consensus}} = \frac{1}{N} \sum_{j=1}^{N} S_{\text{panelist}_j}$$
- **Approved ($\ge 75.0\%$ with no major failure):** Project is cleared for institutional manuscript archiving.
- **Passed with Minor Revisions ($\ge 75.0\%$ with minor corrections):** Proponents are given fourteen (14) calendar days to address remarks under Research Adviser verification.
- **Passed with Major Revisions ($\ge 70.0\%$ and $< 75.0\%$):** Proponents are given thirty (30) calendar days to execute revisions, subject to re-examination by the full committee.
- **Re-Defense Required ($< 70.0\%$ or unanimous failure):** The team must re-file Form DCS-CF-03 and convene a new oral defense session.

---

### 5. Production Database Architecture & Data Dictionary (26 Relational Tables)

The AURORA persistence layer comprises twenty-six (26) normalized relational tables managed under PostgreSQL 15, protected by Row-Level Security (RLS) policies and transactional triggers.

| Table Name | Primary Function / Scope | Primary Key | Key Foreign Keys & Relationships | Security & RLS Policy Summary |
| :--- | :--- | :--- | :--- | :--- |
| **1. `profiles`** | Master user account identity, contact details, and department affiliations. | `id` (UUID) | References `auth.users(id)` | Selectable by authenticated users; updatable by account owner. |
| **2. `roles`** | Canonical enumeration of system roles (`student`, `adviser`, `panelist`, etc.). | `id` (UUID) | Unique code constraint | Read-only reference table accessible to all users. |
| **3. `user_roles`** | Multi-role assignment junction mapping profiles to institutional roles. | `id` (UUID) | `profile_id` $\rightarrow$ `profiles`, `role_id` $\rightarrow$ `roles` | Manageable exclusively by System Administrators and Deans. |
| **4. `students`** | Student academic registry records (student ID number, year level, program). | `id` (UUID) | `profile_id` $\rightarrow$ `profiles`, `major_id` $\rightarrow$ `majors` | Readable by authenticated faculty; manageable by students and admins. |
| **5. `faculty`** | Faculty academic ranks, designations, and departmental appointments. | `id` (UUID) | `profile_id` $\rightarrow$ `profiles`, `department_id` $\rightarrow$ `departments` | Public faculty directory readable across the university. |
| **6. `colleges`** | Academic colleges established at ParSU Goa Campus (CEC, COED, CBM, CAH, COS). | `id` (UUID) | `campus_id` $\rightarrow$ `campuses` | Universally readable reference registry. |
| **7. `departments`** | Departmental subdivisions within colleges (e.g., Dept. of Computational Sciences). | `id` (UUID) | `college_id` $\rightarrow$ `colleges` | Universally readable reference registry. |
| **8. `programs`** | Degree programs (BSIT, BSIS, BSEd, etc.) with degree level classifications. | `id` (UUID) | `college_id` $\rightarrow$ `colleges`, `department_id` $\rightarrow$ `departments` | Universally readable reference registry. |
| **9. `academic_levels`** | Program level designations (Undergraduate, Graduate, Doctoral). | `id` (UUID) | Unique name constraint | Read-only reference table. |
| **10. `majors`** | Specialization tracks within degree programs (e.g., Software Systems). | `id` (UUID) | `program_id` $\rightarrow$ `programs` | Universally readable reference registry. |
| **11. `defense_stages`** | Sequential defense milestones (Concept, Title, Progress 1, Progress 2, Final). | `id` (UUID) | Sequence order constraint | Universally readable reference registry. |
| **12. `projects`** | Research capstone project dockets, titles, abstracts, and join codes. | `id` (UUID) | `student_id` $\rightarrow$ `students`, `stage_id` $\rightarrow$ `defense_stages` | Readable by team members and faculty; updatable by proponents. |
| **13. `project_members`** | Team roster mapping student proponents and designated research advisers. | `id` (UUID) | `project_id` $\rightarrow$ `projects`, `profile_id` $\rightarrow$ `profiles` | Accessible to team proponents and assigned faculty advisers. |
| **14. `documents`** | Academic manuscript docket containers linked to specific defense stages. | `id` (UUID) | `project_id` $\rightarrow$ `projects`, `stage_id` $\rightarrow$ `defense_stages` | Inherits project permissions; controlled by adviser approval flag. |
| **15. `document_versions`** | Versioned PDF binaries with file byte size and SHA-256 cryptographic hashes. | `id` (UUID) | `document_id` $\rightarrow$ `documents`, `uploaded_by` $\rightarrow$ `profiles` | Append-only manuscript versioning; immutable once submitted. |
| **16. `annotations`** | Responsive percentage coordinate text remarks ($x\%, y\%, w\%, h\%$). | `id` (UUID) | `version_id` $\rightarrow$ `document_versions`, `profile_id` $\rightarrow$ `profiles` | Viewable by project stakeholders; updatable only by author. |
| **17. `annotation_replies`** | Multi-actor threaded discussion messages linked to specific annotations. | `id` (UUID) | `annotation_id` $\rightarrow$ `annotations`, `profile_id` $\rightarrow$ `profiles` | Viewable by project stakeholders; insertable by proponents/faculty. |
| **18. `defense_schedules`** | Authoritative defense calendar bookings (timeslot, room, meeting URL). | `id` (UUID) | `project_id` $\rightarrow$ `projects`, `stage_id` $\rightarrow$ `defense_stages` | Readable by campus users; manageable exclusively by Coordinators. |
| **19. `defense_panels`** | Committee evaluator appointments designating Chair and Panel Members. | `id` (UUID) | `project_id` $\rightarrow$ `projects`, `profile_id` $\rightarrow$ `profiles` | Manageable by Coordinators; enforces adviser impartiality firewall. |
| **20. `defense_applications`** | Digitized Form DCS-CF-03 defense application records with checklists. | `id` (UUID) | `project_id` $\rightarrow$ `projects`, `stage_id` $\rightarrow$ `defense_stages` | Created by student proponent; certified by adviser; cleared by chair. |
| **21. `rubric_templates`** | Criteria definitions and percentage weights for defense scoring (Form DCS-CF-04). | `id` (UUID) | `stage_id` $\rightarrow$ `defense_stages` | Managed by Coordinators and Deans; readable by evaluators. |
| **22. `evaluations`** | Authoritative scoring records, narrative feedback, and evaluation verdicts. | `id` (UUID) | `project_id` $\rightarrow$ `projects`, `panelist_id` $\rightarrow$ `profiles` | Viewable by panel and coordinator; updatable only by assigned panelist. |
| **23. `digital_signatures`** | Cryptographic signature audit records (PNG base64, hash, serial, timestamp). | `id` (UUID) | `evaluation_id` $\rightarrow$ `evaluations`, `panelist_id` $\rightarrow$ `profiles` | Immutable signature ledger; locked under R.A. 8792 compliance. |
| **24. `workflow_history`** | Chronological audit trail of project lifecycle stage progressions and verdicts. | `id` (UUID) | `project_id` $\rightarrow$ `projects`, `actor_id` $\rightarrow$ `profiles` | Append-only state transition journal. |
| **25. `audit_logs`** | Security audit events capturing actor UUID, role, IP address, and payload diffs. | `id` (UUID) | `profile_id` $\rightarrow$ `profiles` | Append-only system security trail; readable only by Deans & Admins. |
| **26. `notifications`** | Real-time user notification queue for in-app alert banners and badges. | `id` (UUID) | `recipient_id` $\rightarrow$ `profiles`, `sender_id` $\rightarrow$ `profiles` | Private to individual recipient; updated upon read receipt. |

---

## F.3 API ENDPOINT SPECIFICATIONS & POSTMAN COLLECTION

While internal state transitions within AURORA are orchestrated through type-safe **Next.js Server Actions**, the platform exposes a comprehensive set of RESTful endpoints, Supabase PostgREST data services, PostgreSQL RPC functions, and public verification routes.

### 1. Ready-to-Import Postman Collection
The complete, production-grade Postman collection has been authored in **Postman Collection v2.1.0 format** and is permanently maintained in the project repository at:  
📁 `docs/annexes/AURORA_API_Postman_Collection.json`

To import the collection into Postman:
1. Open the Postman Desktop Application or Postman Web Client.
2. Click **Import** in the upper left navigation pane.
3. Select `AURORA_API_Postman_Collection.json` from the `docs/annexes/` folder.
4. Set the environment variable `base_url` to `https://aurora-parsu.vercel.app` (or `http://localhost:3000` for local testing).
5. Execute the **01. Authentication & Session Management $\rightarrow$ POST Sign In with Institutional Credentials** request; the collection’s integrated test script automatically captures the JWT bearer token into the `{{auth_token}}` variable for subsequent requests.

---

### 2. Comprehensive API Endpoint Contract Reference

The following contract table details the endpoints, methods, authentication scopes, request parameters, and response schemas provided by AURORA:

| HTTP Method & Endpoint Route | Functional Scope & Module | Authorization Scope | Request Headers & Query Parameters | Request Body Payload Schema | Success Response Schema (HTTP Status) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`POST /auth/v1/token?grant_type=password`** | User Sign-In & JWT Session Generation | Public / All Institutional Users | `apikey: {{anon_key}}`<br>`Content-Type: application/json` | `{"email": "faculty@parsu.edu.ph", "password": "SecretPassword!"}` | `200 OK`<br>`{"access_token": "eyJ...", "token_type": "bearer", "user": {...}}` |
| **`GET /auth/v1/user`** | Retrieve Active Session Identity | Bearer JWT Authenticated | `Authorization: Bearer {{token}}`<br>`apikey: {{anon_key}}` | None (HTTP GET) | `200 OK`<br>`{"id": "uuid", "email": "faculty@parsu.edu.ph", "user_metadata": {...}}` |
| **`POST /auth/v1/logout`** | Revoke Session & Terminate JWT | Bearer JWT Authenticated | `Authorization: Bearer {{token}}`<br>`apikey: {{anon_key}}` | None (HTTP POST) | `204 No Content`<br>Session token invalidated at gateway. |
| **`GET /rest/v1/colleges`** | List Academic Colleges (Goa Campus) | Authenticated Users | `select=id,name,code,description`<br>`order=name.asc` | None (HTTP GET) | `200 OK`<br>`[{"id": "uuid", "name": "College of Engineering...", "code": "CEC"}]` |
| **`GET /rest/v1/programs`** | Query Degree Programs with Majors | Authenticated Users | `select=id,name,code,majors(id,name)`<br>`order=name.asc` | None (HTTP GET) | `200 OK`<br>`[{"id": "uuid", "name": "BS in Information Technology", "majors": [...]}]` |
| **`GET /rest/v1/projects`** | List Proponent Research Dockets | Student / Faculty / Admin | `select=id,title,status,join_code,stages(*)`<br>`order=created_at.desc` | None (HTTP GET) | `200 OK`<br>`[{"id": "uuid", "title": "AURORA...", "status": "scheduled", ...}]` |
| **`POST /rest/v1/projects`** | Create New Research Docket | Student Proponent | `Prefer: return=representation`<br>`Content-Type: application/json` | `{"title": "...", "abstract": "...", "join_code": "AURORA26"}` | `201 Created`<br>`{"id": "uuid", "title": "...", "join_code": "AURORA26", "status": "draft"}` |
| **`POST /storage/v1/object/manuscripts/{path}`** | Upload Manuscript PDF Binary | Student Proponent | `Content-Type: application/pdf`<br>`x-upsert: true` | Raw binary PDF file stream (Multipart / Octet-stream) | `200 OK`<br>`{"Key": "manuscripts/projects/uuid/v2.pdf", "Id": "storage-id"}` |
| **`POST /rest/v1/document_versions`** | Register Manuscript Version & Hash | Student Proponent | `Content-Type: application/json`<br>`Prefer: return=representation` | `{"document_id": "uuid", "version_number": 2, "sha256_hash": "c475d...", "file_size_bytes": 4812940}` | `201 Created`<br>`{"id": "uuid", "version_number": 2, "is_current": true}` |
| **`GET /rest/v1/annotations`** | Fetch Viewport Coordinates by Version | Authenticated Project Viewers | `document_version_id=eq.{id}`<br>`select=*,annotation_replies(*)` | None (HTTP GET) | `200 OK`<br>`[{"id": "uuid", "page_number": 14, "highlight_coordinates": {...}, ...}]` |
| **`POST /rest/v1/annotations`** | Store Responsive Percentage Remark | Research Adviser / Panelist | `Content-Type: application/json`<br>`Prefer: return=representation` | `{"document_version_id": "uuid", "page_number": 14, "highlight_coordinates": {"x": 18.4, "y": 42.1, ...}, "comment": "...", "severity": "major"}` | `201 Created`<br>`{"id": "uuid", "status": "open", "created_at": "timestamp"}` |
| **`POST /rest/v1/annotation_replies`** | Submit Threaded Discussion Reply | Proponent / Faculty | `Content-Type: application/json`<br>`Prefer: return=representation` | `{"annotation_id": "uuid", "reply_text": "Addressed in Section 4.3.2..."}` | `201 Created`<br>`{"id": "uuid", "reply_text": "...", "created_at": "timestamp"}` |
| **`POST /rest/v1/rpc/check_defense_conflict`** | Validate Room & Panelist Overlap | Research Coordinator | `Content-Type: application/json` | `{"p_room": "Room 301", "p_scheduled_at": "...", "p_end_at": "...", "p_panelist_ids": ["uuid", ...]}` | `200 OK`<br>`{"has_conflict": false, "conflicts": []}` |
| **`POST /rest/v1/defense_schedules`** | Create Authoritative Defense Booking | Research Coordinator | `Content-Type: application/json`<br>`Prefer: return=representation` | `{"project_id": "uuid", "stage_id": "uuid", "scheduled_at": "...", "room": "Deliberation Room 301"}` | `201 Created`<br>`{"id": "uuid", "status": "scheduled", "duration_minutes": 90}` |
| **`POST /rest/v1/defense_panels`** | Appoint Panel Members & Chairman | Research Coordinator | `Content-Type: application/json` | `[{"project_id": "uuid", "profile_id": "uuid", "panel_role": "chair"}, {"project_id": "uuid", "profile_id": "uuid", "panel_role": "member"}]` | `201 Created`<br>`[{"id": "uuid", "panel_role": "chair"}, ...]` |
| **`GET /rest/v1/rubric_templates`** | Retrieve Active Defense Rubrics | Evaluator / Faculty | `program=eq.BSIT`<br>`is_active=eq.true` | None (HTTP GET) | `200 OK`<br>`[{"id": "uuid", "title": "BSIT Final Defense Rubric", "criteria": [...]}]` |
| **`POST /rest/v1/rpc/submit_signed_evaluation`** | Commit Rubric & Sign Under R.A. 8792 | Defense Panelist | `Content-Type: application/json` | `{"p_evaluation_id": "uuid", "p_scores": {...}, "p_verdict_code": "approved", "p_signature_image": "data:image/png...", "p_password_hash_proof": "..."}` | `200 OK`<br>`{"success": true, "status": "locked", "signature_hash": "e3b0c..."}` |
| **`POST /rest/v1/rpc/finalize_defense_consensus`** | Finalize Consensus & Issue Serial | Committee Chair / Coordinator | `Content-Type: application/json` | `{"p_project_id": "uuid", "p_stage_id": "uuid"}` | `200 OK`<br>`{"success": true, "verdict": "approved", "certificate_serial": "AURORA-2026-000001"}` |
| **`GET /api/verify/{serial}`** | Public Certificate Verification API | Public / External Verifiers | `Accept: application/json`<br>`CORS: *` | None (HTTP GET) | `200 OK`<br>`{"success": true, "found": true, "certificateSerial": "AURORA-2026-000001", "verdict": "approved", ...}` |
| **`GET /verify/{serial}`** | Public Web Verification Page | Public / External Verifiers | None (Standard Web Browser) | None (HTTP GET) | `200 OK`<br>Renders high-resolution institutional verification certificate with print CSS. |
| **`GET /rest/v1/audit_logs`** | Query System Transaction Audit Trail | College Dean / Sys Admin | `order=created_at.desc`<br>`limit=50` | None (HTTP GET) | `200 OK`<br>`[{"id": "uuid", "user_email": "...", "action_type": "SIGN_EVALUATION", ...}]` |
| **`GET /rest/v1/rpc/system_health_check`** | Subsystem Telemetry & Health Probe | System Administrator | None | None (HTTP GET / RPC) | `200 OK`<br>`{"database": "healthy", "storage": "healthy", "sequence_lag_ms": 1.2}` |

---

### 3. Detailed Endpoint Contracts & JSON Payload Samples

#### Contract 1: Public Certificate Verification (`GET /api/verify/{serial}`)
- **Endpoint Route:** `GET /api/verify/{serial}`
- **Access Level:** Public / Unauthenticated (CORS enabled for cross-origin verification)
- **Sample Request:** `GET https://aurora-parsu.vercel.app/api/verify/AURORA-2026-000001`
- **Sample JSON Response:**
```json
{
  "success": true,
  "found": true,
  "certificateSerial": "AURORA-2026-000001",
  "projectTitle": "AURORA: Paperless Academic Defense Workflow System for Research, Capstone, Thesis & Dissertation Papers at Partido State University",
  "stage": "Final Oral Defense",
  "verdict": "approved",
  "score": 94.50,
  "panelistName": "Dr. Kennedy C. Cuya",
  "signedAt": "2026-10-02T10:14:22.000Z",
  "hashAlgorithm": "SHA-256",
  "signatureHash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  "verificationStatus": "AUTHENTIC_AND_VERIFIED",
  "institution": "Partido State University — Goa Campus",
  "college": "College of Engineering and Computational Sciences",
  "department": "Department of Computational Sciences"
}
```

#### Contract 2: Signed Evaluation Committal (`POST /rest/v1/rpc/submit_signed_evaluation`)
- **Server Action / RPC:** `submit_signed_evaluation`
- **Access Level:** Authenticated Defense Panelist (Enforces step-up authentication)
- **Sample JSON Request Body:**
```json
{
  "p_evaluation_id": "a892b110-4491-419b-b912-3849102938cd",
  "p_scores": {
    "technical_soundness": 92.5,
    "software_execution": 95.0,
    "defense_presentation": 90.0,
    "manuscript_compliance": 94.0
  },
  "p_verdict_code": "approved",
  "p_panel_notes": "The candidate demonstrated exemplary system architecture and rigorous testing methodology.",
  "p_recommendations": "Authorize immediate preparation for final bound manuscript submission.",
  "p_signature_image": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
  "p_password_hash_proof": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
}
```
- **Sample JSON Response:**
```json
{
  "success": true,
  "evaluation_id": "a892b110-4491-419b-b912-3849102938cd",
  "status": "locked",
  "total_score": 93.15,
  "verdict": "approved",
  "signature_hash": "7d2b4f91048b29f984a1e9481023bc491029384758129048a129384756102938",
  "signed_at": "2026-11-20T10:15:30.142Z"
}
```

---

## F.4 HARDWARE & CIRCUIT SCHEMATICS

### Formal Specification Note:
> **Hardware & Circuit Schematics:** **NOT APPLICABLE (Pure Cloud-Native Software Architecture)**
>
> AURORA is architected and implemented entirely as a high-availability, cloud-native web application without custom embedded microcontrollers, IoT sensor telemetry arrays, or proprietary physical electronic circuits. Physical computing infrastructure is abstracted through tier-1 cloud edge providers (Vercel and Supabase / AWS Singapore).

---

### Minimum & Recommended Computing Environment Specifications

#### 1. Client-Side End-User Devices (Faculty, Evaluators & Students)
| Hardware Component | Minimum Operational Specification | Recommended Production Specification |
| :--- | :--- | :--- |
| **Processor (CPU)** | Dual-Core 2.0 GHz (Intel Core i3 7th Gen / AMD Ryzen 3 / Apple A12) | Quad-Core 2.8+ GHz (Intel Core i5 11th Gen+ / Apple M-Series / AMD Ryzen 5) |
| **System Memory (RAM)** | 4.0 GB LPDDR3 / DDR4 | 8.0 GB to 16.0 GB DDR4/DDR5 (Supports smooth dual-pane PDF rendering) |
| **Display Resolution** | $1280 \times 720$ HD (Minimum functional workspace layout) | $1920 \times 1080$ Full HD or higher (Optimized split-screen review & rubrics) |
| **Input Peripherals** | Standard optical mouse and keyboard | Precision trackpad, optical mouse, or capacitive stylus/touchscreen for signatures |
| **Network Bandwidth** | 2.0 Mbps broadband / 4G LTE connection | 10.0+ Mbps fiber broadband / 5G connection ($\le 50\text{ ms}$ latency to Singapore) |
| **Supported Operating Systems** | Windows 10/11, macOS 12+, Ubuntu 22.04 LTS+, Android 11+, iOS/iPadOS 15+ | Windows 11, macOS 14+, iPadOS 17+ (Ideal for stylus signature input) |

#### 2. Cloud Server Infrastructure (Vercel Global Edge & Supabase Cloud AWS Singapore)
| Server Subsystem | Infrastructure Platform & Region | Technical Specification & Redundancy Topology |
| :--- | :--- | :--- |
| **Edge Compute & Web Routing** | Vercel Global Edge Network (Multi-Region Anycast) | Serverless edge execution nodes with automated TLS 1.3 termination, HTTP/3 support, and automated DDoS mitigation. |
| **Relational Database Tier** | Supabase Managed PostgreSQL 15 (AWS `ap-southeast-1` Singapore) | High-availability compute instance with 2 vCPU, 2 GB RAM, NVMe high-IOPS storage, and automated point-in-time recovery (PITR). |
| **Object Storage Subsystem** | Supabase S3-Compatible Object Store (AWS Singapore) | Encrypted multi-tenant block storage with automated cross-availability zone replication for manuscript binaries. |
| **Backup & Disaster Recovery** | Automated Multi-Zone Cloud Snapshots & Offsite JSON Dumps | Continuous Write-Ahead Log (WAL) archiving with daily automated snapshots and on-demand SHA-256 integrity-verified JSON backups. |
