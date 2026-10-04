# PARTIDO STATE UNIVERSITY
### College of Engineering and Computational Sciences
**Department of Computational Sciences | Bachelor of Science in Information Technology**  
*San Juan Bautista, Goa, Camarines Sur, Philippines 4422*  
*Website: www.parsu.edu.ph | Contact No.: (054) 871-2090 | ISO 9001:2015 Certified*

---

# ANNEX F: TECHNICAL DOCUMENTATION & SPECIFICATIONS
## Project: AURORA (Academic Unified Review, Observation, Rating, and Assessment System)

---

## F.1 SOFTWARE REQUIREMENTS SPECIFICATION (SRS) MATRIX

The software requirements for AURORA were derived from institutional departmental workflows governing BSIT and BSIS capstone defenses at Partido State University.

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
| **FR-22** | Notification Dispatcher | Send real-time event notifications for manuscript approvals, schedule confirmations, and verdict releases. | All Users | Medium |

### Non-Functional Requirements (NFR) Matrix

| Requirement ID | Quality Dimension | Metric Specification | Verification Method |
| :--- | :--- | :--- | :--- |
| **NFR-01** | Performance | Web pages and dashboards must render within $\le 1.5$ seconds under standard campus broadband (5 Mbps). | Lighthouse & Network Profiler |
| **NFR-02** | Scalability | System must support concurrent defense deliberations for up to 10 simultaneous teams without latency degradation. | Load Testing (k6) |
| **NFR-03** | Security | Passwords hashed using bcrypt; database protected with Row-Level Security (RLS) on all 14 tables. | Supabase Security Audit |
| **NFR-04** | Data Integrity | Zero loss of evaluation scores; foreign key cascades and atomic database transactions for schedule creation. | SQL Unit Tests |
| **NFR-05** | Availability | Uptime guarantee of $\ge 99.9\%$ hosted on Vercel Edge Network and AWS Singapore PostgreSQL cluster. | Vercel SLA Dashboard |
| **NFR-06** | Browser Compatibility | Fully operational on Chrome 120+, Edge 120+, Firefox 120+, and Safari 17+ on desktop and mobile viewports. | Cross-Browser Matrix Testing |

---

## F.2 COMPREHENSIVE SYSTEM DOCUMENTATION

### 1. High-Level Architectural Diagram
AURORA is engineered as a modern, decoupled cloud application utilizing Next.js 16 (App Router / React 19) on the frontend/edge application layer, and Supabase (PostgreSQL 15, Auth, Storage, and Realtime Engine) on the service layer.

```text
+-------------------------------------------------------------------------------------------------------+
|                                    AURORA SYSTEM ARCHITECTURE                                         |
+-------------------------------------------------------------------------------------------------------+
|  CLIENT LAYER:                                                                                        |
|  - Progressive Web App (Desktop Chrome / Edge, Mobile Responsive)                                     |
|  - PDF.js Canvas Annotation Renderer | HTML5 Canvas Signature Pad | Lucide React Iconography           |
|                                                  |                                                    |
|  APPLICATION & API LAYER (Next.js 16 Edge / Server Components):                                       |
|  - Server Actions: evaluations, scheduler, annotations, defenses, notifications, audit                |
|  - Next.js Middleware: Route Protection, Role-Based Access Control Guard, Profile Status Guard         |
|                                                  |                                                    |
|  SECURITY & DATA PERSISTENCE LAYER (Supabase / AWS ap-southeast-1):                                   |
|  - PostgreSQL 15 Engine with strict Row-Level Security (RLS) on all tables                            |
|  - Supabase Auth: JWT tokens, Secure Cookie Sessions, Step-Up Re-Authentication                       |
|  - Supabase Storage: Encrypted buckets for manuscripts (/manuscripts) and signatures (/signatures)    |
|  - Event Bus & Audit Ledger: Immutable audit_logs table + real-time notification broadcaster          |
+-------------------------------------------------------------------------------------------------------+
```

### 2. Defense Lifecycle State Machine

```text
[ DRAFT ] 
    │
    ▼ (Upload PDF Manuscript)
[ UNDER REVIEW ] 
    │
    ▼ (Adviser Annotates & Endorses DCS-CF-03)
[ ENDORSED BY ADVISER ] 
    │
    ▼ (Coordinator Checks Conflicts & Assigns Room/Panel)
[ SCHEDULED ] 
    │
    ▼ (Deliberation Commences)
[ DELIBERATION / IN PROGRESS ] 
    │
    ▼ (Panelists Score DCS-CF-04 & Sign via RA 8792)
[ LOCKED & EVALUATED ] 
    │
    ├─────────────┬─────────────┬─────────────┐
    ▼             ▼             ▼             ▼
[ APPROVED ] [ MINOR REVISIONS ] [ MAJOR REVISIONS ] [ FAILED ]
```

---

## F.3 API ENDPOINT & SERVER ACTION SPECIFICATIONS

While AURORA leverages type-safe Next.js Server Actions for internal transactions, it exposes standardized JSON contracts for external audit validation and document verification.

### Contract 1: Public Certificate Verification (`GET /api/verify/[serial]`)
- **Route:** `GET /verify/{serial}` (e.g., `/verify/AURORA-2026-000001`)
- **Access Level:** Public / Unauthenticated
- **Description:** Returns cryptographic verification metadata for an issued Certificate of Oral Defense.
- **Sample JSON Response:**
```json
{
  "success": true,
  "certificateSerial": "AURORA-2026-000001",
  "projectTitle": "AURORA: Paperless Academic Defense Workflow Platform",
  "stage": "Final Defense",
  "academicYear": "2025-2026",
  "verdict": "approved",
  "weightedScore": 94.50,
  "panelistName": "Dr. Aris Thorne",
  "panelRole": "chair",
  "signedAt": "2026-10-02T10:14:22.000Z",
  "signatureHash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  "verificationStatus": "AUTHENTIC_AND_VERIFIED",
  "issuer": "Partido State University - Department of Computational Sciences"
}
```

### Contract 2: Digital Signature Finalization (`POST /evaluations/sign`)
- **Server Action:** `signEvaluationAction(input: SignEvaluationInput)`
- **Access Level:** Authenticated Panelist
- **Payload Schema:**
```typescript
{
  evaluationId: string;        // UUID of evaluation record
  signatureType: "drawn" | "typed" | "uploaded";
  signatureImage: string;      // Base64 data URL
  printedName: string;         // Full printed name
  positionRole: string;        // "Panelist" | "Committee Chair"
  password: string;            // Step-up credential for RA 8792
  scores: Record<string, number>; // Criteria key -> raw score
  verdictCode: "approved" | "minor_revisions" | "major_revisions" | "failed";
  panelNotes: string;          // Deliberation narrative
  recommendations: string;     // Required revisions
}
```

---

## F.4 HARDWARE & CIRCUIT SCHEMATICS

### Formal Specification Note:
> **Hardware & Circuit Schematics:** **NOT APPLICABLE (Pure Software Cloud Architecture)**

AURORA is implemented entirely as a high-availability, cloud-native web application without specialized embedded microcontrollers, IoT sensor arrays, or hardware circuits.

### Minimum Recommended Client & Server Hardware Specifications:

1. **Client End-User Devices (Faculty & Students):**
   - **Processor:** Intel Core i3 (7th Gen+) / AMD Ryzen 3 / Apple M1 or modern equivalent mobile SoC.
   - **Memory (RAM):** 4.0 GB minimum (8.0 GB recommended for multi-page PDF rendering).
   - **Display:** $1280 \times 720$ minimum ($1920 \times 1080$ recommended for dual-pane review).
   - **Peripherals:** Touchscreen, trackpad, or mouse for electronic signature drawing.

2. **Cloud Server Infrastructure (Vercel & Supabase Cloud):**
   - **Vercel Edge Platform:** Multi-region edge network nodes with automatic TLS termination and $\le 50\text{ms}$ cold-start execution.
   - **Supabase Cloud Managed Database:** Compute Add-on Micro (2 vCPU, 1 GB RAM, 10 GB SSD, automated backups enabled), hosted on AWS Region `ap-southeast-1` (Singapore).
