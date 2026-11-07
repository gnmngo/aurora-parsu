# PARTIDO STATE UNIVERSITY
### College of Engineering and Computational Sciences
**Department of Computational Sciences | Bachelor of Science in Information Technology**  
*San Juan Bautista, Goa, Camarines Sur, Philippines 4422*  
*Website: www.parsu.edu.ph | Contact No.: (054) 871-2090 | ISO 9001:2015 Certified*

---

# ANNEX F: TECHNICAL DOCUMENTATION & SPECIFICATIONS
## Project: AURORA: Paperless Academic Defense Workflow System for Research, Capstone, Thesis & Dissertation Papers at Partido State University

---

## F.1 SOFTWARE REQUIREMENTS SPECIFICATION (SRS) MATRIX

The software requirements for AURORA were derived from institutional departmental workflows governing BSIT and BSIS capstone defenses at Partido State University across Academic Year 2025–2026 through the 1st Semester of Academic Year 2026–2027.

### Functional Requirements (FR) Matrix

| Requirement ID | Module / Subsystem | Functional Requirement Description | User Role | Priority |
| :--- | :--- | :--- | :--- | :---: |
| **FR-01** | Authentication & RBAC | Secure user login via institutional email and password with role-tailored dashboard redirection. | All Users | High |
| **FR-02** | Identity & Hierarchy | Synchronize student profiles with official student ID numbers, academic programs, and year levels. | Student / Admin | High |
| **FR-03** | Team Collaboration | Allow student lead proponents to generate an 8-character unique alphanumeric join code for co-proponents. | Student | High |
| **FR-04** | Document Versioning | Provide PDF manuscript drag-and-drop upload with automated SHA-256 cryptographic hashing and version indexing. | Student | High |
| **FR-05** | Storage Management | Restrict direct public access to manuscript files through authenticated private Supabase storage URLs. | Student / Faculty | High |
| **FR-06** | Coordinate Annotations | Capture and render inline text highlights based on responsive percentage viewport coordinates ($x, y, w, h$). | Adviser / Panelist | High |
| **FR-07** | Threaded Discussion | Allow proponents and faculty to reply to specific annotation comments to track revision resolutions. | Proponent / Faculty | Medium |
| **FR-08** | Severity Categorization | Classify manuscript remarks into four severity levels (*Info*, *Minor*, *Major*, *Critical*). | Adviser / Panelist | Medium |
| **FR-09** | Form DCS-CF-03 Filing | Provide interactive filing for Application for Oral Defense with prerequisite checklist verification. | Student | High |
| **FR-10** | Adviser Endorsement Gate | Require digital certification from the designated Research Adviser before defense scheduling is unlocked. | Research Adviser | High |
| **FR-11** | Defense Scheduling | Enable Defense Coordinator to assign defense date, timeslot duration, and physical room or online URL. | Coordinator | High |
| **FR-12** | Room Conflict Guard | Automatically detect and prevent overlapping defense schedules within the same physical deliberation room. | Coordinator | High |
| **FR-13** | Impartiality Firewall | Enforce institutional academic integrity policy by prohibiting advisers from sitting as evaluators for their own advisees. | Coordinator / System | High |
| **FR-14** | Evaluator Panel Setup | Support committee composition designating one (1) Committee Chair and two (2) Panel Members. | Coordinator | High |
| **FR-15** | Scoring Engine (DCS-CF-04) | Calculate authoritative rubric scores using ParSU BSIT weighted criteria ($30\% + 35\% + 25\% + 10\% = 100\%$). | Panelist | High |
| **FR-16** | Legal Re-Authentication | Enforce step-up password re-authentication before digital signatures are committed, satisfying R.A. 8792 standards. | Panelist | High |
| **FR-17** | Serial Sequence Generation | Generate unique sequential certificate numbers (`AURORA-YYYY-NNNNNN`) using atomic PostgreSQL sequence. | System | High |
| **FR-18** | Evaluation Lock State | Irreversibly lock submitted evaluations against tampering once digitally signed and cryptographically hashed. | System | High |
| **FR-19** | Public Verification Portal | Provide public endpoint `/verify/[serial]` to validate certificate authenticity without requiring login. | Public / Auditor | High |
| **FR-20** | Executive KPI Dashboard | Display visual analytics on defense pass rates, rubric dimensional averages, and defense turnaround times. | Dean / Coordinator | Medium |
| **FR-21** | Transactional Audit Log | Log actor email, role, action type, IP address, and payload diffs for all critical workflow transitions. | Sys Admin / Dean | High |
| **FR-22** | Maintenance & DR Console | Provide live subsystem integrity probes, one-click self-healing repair, and SHA-256 signed JSON database backups. | Sys Admin / Coord | High |

### Non-Functional Requirements (NFR) Matrix

| Requirement ID | Quality Dimension | Metric Specification | Verification Method |
| :--- | :--- | :--- | :--- |
| **NFR-01** | Performance | Web pages and dashboards must render within $\le 1.5$ seconds under standard campus broadband (5 Mbps). | Lighthouse & Network Profiler |
| **NFR-02** | Scalability | System must support concurrent defense deliberations for up to 10 simultaneous teams without latency degradation. | Load Testing (k6) |
| **NFR-03** | Security | Passwords hashed using bcrypt; database protected with Row-Level Security (RLS) on all 20 relational tables. | Supabase Security Audit |
| **NFR-04** | Data Integrity | Zero loss of evaluation scores; foreign key cascades and atomic database transactions for schedule creation. | SQL Integration Tests |
| **NFR-05** | Availability & DR | Uptime guarantee of $\ge 99.9\%$ on Vercel Edge & AWS Singapore PostgreSQL with $\le 4\text{h}$ RTO and 3-2-1 backups. | DR Drill & SLA Dashboard |
| **NFR-06** | Browser Compatibility | Fully operational on Chrome 120+, Edge 120+, Firefox 120+, and Safari 17+ on desktop and mobile viewports. | Cross-Browser Matrix Testing |

---

## F.2 COMPREHENSIVE SYSTEM DOCUMENTATION

### 1. High-Level Four-Tier Cloud Architecture
AURORA is engineered as a modern, decoupled cloud application utilizing **Next.js 16 (App Router / React 19)** on the frontend and edge application layer, and **Supabase (PostgreSQL 15, GoTrue Auth, S3 Storage, and Realtime WAL Engine)** on the persistence layer.

![Figure F.1: AURORA 4-Tier Cloud System Architecture](aurora_system_architecture.png)

| Architectural Tier | Core Technologies & Runtime | Primary Responsibilities & Security Controls |
| :--- | :--- | :--- |
| **1. Client Presentation Tier** | React 19, Tailwind CSS v4, `PDF.js` Vector Canvas, HTML5 Signature Canvas | Renders role-specific dashboards, split-screen PDF annotation viewports, and client-side SHA-256 backup verifiers. |
| **2. Edge & Server Action Tier** | Next.js 16 App Router, Turbopack, Edge Middleware, TypeScript Server Actions | Enforces route-level RBAC guards, step-up password re-authentication (RA 8792), and conflict-of-interest checks. |
| **3. Backend Service Tier** | Supabase GoTrue Auth, Realtime WebSocket Bus, Private S3 Storage Buckets | Issues HTTP-only JWT sessions, broadcasts live annotation/rubric updates over WSS, and secures `/manuscripts` binaries. |
| **4. Data Persistence Tier** | PostgreSQL 15 Relational Engine, Row-Level Security (RLS), Write-Ahead Log (WAL) | Enforces kernel-level RLS policies across 20 tables, executes atomic RPCs, and maintains append-only `audit_logs`. |

---

### 2. Defense Lifecycle State Machine & Swimlane Workflow

![Figure F.2: AURORA Multi-Actor Defense Lifecycle Swimlane Diagram](public/diagrams/aurora_swimlane_complete.png)

| State Code | Lifecycle Stage Name | Triggering Transition Action | Responsible Actor | Next Valid State(s) |
| :--- | :--- | :--- | :--- | :--- |
| **S-01** | `DRAFT` | Student creates project docket and uploads PDF manuscript (SHA-256 computed). | Student Proponent | `UNDER_REVIEW` |
| **S-02** | `UNDER_REVIEW` | Research Adviser reviews inline PDF annotations and digitally certifies Form DCS-CF-03. | Research Adviser (**Prof. Froiland B. Peñalosa**) | `ENDORSED_BY_ADVISER` or `REVISIONS_REQUIRED` |
| **S-03** | `ENDORSED_BY_ADVISER` | Coordinator verifies prerequisite gate and assigns room, timeslot, and conflict-free panel. | Capstone Coordinator (**Dr. Kennedy C. Cuya**) | `SCHEDULED` |
| **S-04** | `SCHEDULED` | Oral defense session commences in the Dual-Pane Review & Rubric Workspace. | Panel Committee | `IN_DELIBERATION` |
| **S-05** | `IN_DELIBERATION` | Panelists score Form DCS-CF-04 criteria and affix RA 8792 step-up digital signatures. | Panel Chair & Members | `LOCKED_AND_EVALUATED` |
| **S-06** | `LOCKED_AND_EVALUATED` | System computes consensus weighted score and issues `AURORA-YYYY-NNNNNN` certificate. | System / Coordinator | `APPROVED`, `MINOR_REVISIONS`, `MAJOR_REVISIONS`, or `RE_DEFENSE` |

---

## F.3 API ENDPOINT & SERVER ACTION SPECIFICATIONS

While AURORA leverages type-safe Next.js Server Actions for internal mutations, it exposes standardized JSON contracts for external audit validation and public certificate verification.

### Contract 1: Public Certificate Verification (`GET /verify/[serial]`)
- **Route:** `GET /verify/{serial}` (e.g., `/verify/AURORA-2026-000001`)
- **Access Level:** Public / Unauthenticated
- **Description:** Returns cryptographic verification metadata for an issued Certificate of Oral Defense.
- **Sample JSON Response:**
```json
{
  "success": true,
  "certificateSerial": "AURORA-2026-000001",
  "projectTitle": "AURORA: Paperless Academic Defense Workflow System for Research, Capstone, Thesis & Dissertation Papers at Partido State University",
  "stage": "Final Oral Defense",
  "academicYear": "2026-2027",
  "verdict": "approved",
  "weightedScore": 94.50,
  "panelistName": "Dr. Kennedy C. Cuya",
  "panelRole": "chair",
  "signedAt": "2026-10-02T10:14:22.000Z",
  "signatureHash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  "verificationStatus": "AUTHENTIC_AND_VERIFIED",
  "issuer": "Partido State University - Department of Computational Sciences"
}
```

### Contract 2: Digital Signature Finalization (`signEvaluationAction`)
- **Server Action:** `signEvaluationAction(input: SignEvaluationInput)`
- **Access Level:** Authenticated Panelist
- **Payload Schema:**
```typescript
export interface SignEvaluationInput {
  evaluationId: string;
  signatureType: "drawn" | "typed" | "uploaded";
  signatureImage: string;
  printedName: string;
  positionRole: string;
  password: string;
  scores: Record<string, number>;
  verdictCode: "approved" | "minor_revisions" | "major_revisions" | "failed";
  panelNotes: string;
  recommendations: string;
}
```

---

## F.4 HARDWARE & CIRCUIT SCHEMATICS

### Formal Specification Note:
> **Hardware & Circuit Schematics:** **NOT APPLICABLE (Pure Cloud-Native Software Architecture)**

AURORA is implemented entirely as a high-availability, cloud-native web application without specialized embedded microcontrollers, IoT sensor arrays, or custom hardware circuits.

### Minimum Recommended Client & Server Hardware Specifications:
1. **Client End-User Devices (Faculty & Students):**
   - **Processor:** Intel Core i3 (7th Gen+) / AMD Ryzen 3 / Apple M1 or modern mobile SoC.
   - **Memory (RAM):** 4.0 GB minimum (8.0 GB recommended for split-screen multi-page PDF rendering).
   - **Display:** $1280 \times 720$ minimum ($1920 \times 1080$ recommended for dual-pane workspace review).
   - **Peripherals:** Touchscreen, trackpad, or mouse for electronic signature drawing.
2. **Cloud Server Infrastructure (Vercel & Supabase Cloud):**
   - **Vercel Edge Platform:** Multi-region edge network nodes with automatic TLS 1.3 termination and $\le 50\text{ ms}$ cold-start execution.
   - **Supabase Managed PostgreSQL Cluster:** Compute instance (2 vCPU, 2 GB RAM, NVMe SSD storage, automated daily backups and WAL archiving enabled), hosted in AWS Region `ap-southeast-1` (Singapore).
