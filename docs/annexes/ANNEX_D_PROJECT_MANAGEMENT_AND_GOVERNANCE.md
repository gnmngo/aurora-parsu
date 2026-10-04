# PARTIDO STATE UNIVERSITY
### College of Engineering and Computational Sciences
**Department of Computational Sciences | Bachelor of Science in Information Technology**  
*San Juan Bautista, Goa, Camarines Sur, Philippines 4422*  
*Website: www.parsu.edu.ph | Contact No.: (054) 871-2090 | ISO 9001:2015 Certified*

---

# ANNEX D: PROJECT MANAGEMENT & GOVERNANCE
## Project: AURORA (Academic Unified Review, Observation, Rating, and Assessment System)

---

## D.1 PROJECT GANTT CHART & SCHEDULE

The development of the AURORA platform followed an **Agile Scrum Methodology** executed across an 18-month academic cycle spanning Academic Years 2024–2025 and 2025–2026.

```text
+-----------------------------------------------------------------------------------------------------------------------+
| PHASE / MILESTONE                   | Q3 2025    | Q4 2025    | Q1 2026    | Q2 2026    | Q3 2026    | STATUS         |
+-----------------------------------------------------------------------------------------------------------------------+
| 1. Inception & Problem Analysis     | [########] |            |            |            |            | 100% Completed |
| 2. Requirements & UI/UX Wireframes  |            | [########] |            |            |            | 100% Completed |
| 3. Sprint 1: Auth, RBAC & Profiles  |            | [########] |            |            |            | 100% Completed |
| 4. Sprint 2: PDF Upload & Versioning|            |            | [########] |            |            | 100% Completed |
| 5. Sprint 3: Coordinate Annotations |            |            | [########] |            |            | 100% Completed |
| 6. Sprint 4: Defense Scheduler      |            |            |            | [########] |            | 100% Completed |
| 7. Sprint 5: Rubric & E-Signatures  |            |            |            | [########] |            | 100% Completed |
| 8. Sprint 6: Analytics & Auditing   |            |            |            |            | [########] | 100% Completed |
| 9. Staging Deployment & UAT         |            |            |            |            | [########] | 100% Completed |
| 10. Manuscript Finalization         |            |            |            |            | [########] | 100% Completed |
| 11. Final Oral Defense              |            |            |            |            | [===>    ] | Scheduled      |
+-----------------------------------------------------------------------------------------------------------------------+
```

### Detailed Milestone Schedule & Deliverables

| Milestone Code | Milestone Title | Start Date | Completion Date | Lead Person / Proponent | Key Institutional Deliverable |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **M-01** | Project Inception & Research Proposal | Aug 15, 2025 | Sep 30, 2025 | G. V. Mañago | Form DCS-CF-01 Title Proposal Defense |
| **M-02** | Systems Analysis & SRS Formulation | Oct 01, 2025 | Nov 15, 2025 | C. A. Castillo | Software Requirements Matrix & WBS |
| **M-03** | UI/UX Wireframing & Design System | Nov 16, 2025 | Dec 20, 2025 | L. M. Encinas | High-Fidelity Mockups & ParSU Design Kit |
| **M-04** | Core Architecture & Database Setup | Jan 05, 2026 | Feb 15, 2026 | G. V. Mañago | Supabase DDL, RLS Hardening & Auth Engine |
| **M-05** | Proposal Defense Deliberation | Feb 20, 2026 | Feb 25, 2026 | Team Proponents | Form DCS-CF-04 Proposal Approval Clearance |
| **M-06** | Interactive Annotation Engine | Mar 01, 2026 | Apr 15, 2026 | G. V. Mañago | Dual-Pane Viewport & PDF Coordinate Bounding |
| **M-07** | Scheduler & Conflict Firewall | Apr 16, 2026 | May 30, 2026 | C. A. Castillo | Room Collision & Panelist Overlap Logic |
| **M-08** | Digital Signature & RA 8792 Module | Jun 01, 2026 | Jul 15, 2026 | G. V. Mañago | Step-Up Re-Auth, SHA-256 Serial Generator |
| **M-09** | Quality Assurance, Testing & UAT | Jul 16, 2026 | Sep 15, 2026 | R. M. Buenafe | Master Test Execution & ISO 25010 Evaluation |
| **M-10** | Production Deployment & Turnover | Sep 16, 2026 | Oct 02, 2026 | Team Proponents | Vercel Deployment & System Turnover Clearance |

---

## D.2 WORK BREAKDOWN STRUCTURE (WBS)

```text
1.0 AURORA Platform Project Management
    1.1 Project Initiation & Stakeholder Charter
    1.2 Academic Policy Review (ParSU Defense Guidelines & RA 8792)
    1.3 Project Schedule & Risk Management Plan

2.0 Requirements Engineering & Systems Modeling
    2.1 User Stories & Persona Definition (Student, Adviser, Panelist, Coordinator, Dean)
    2.2 Software Requirements Specification (SRS)
    2.3 Data Flow Diagrams (DFD Level 0, 1, 2)
    2.4 Entity Relationship Diagramming (ERD)

3.0 UI/UX Architecture & Prototyping
    3.1 Information Architecture & Navigation Wireframes
    3.2 ParSU CECS Design Tokens & Component Library
    3.3 Responsive Screen Layouts (Desktop Workspace & Mobile Portal)
    3.4 Interactive Prototyping & Usability Review

4.0 Software Engineering & Full-Stack Development
    4.1 Foundation & Identity Tier
        4.1.1 Supabase Auth & Session Management
        4.1.2 Role-Based Access Control (RBAC) & Custom JWT Claims
        4.1.3 Profile Hierarchy & Student Record Sync
    4.2 Document & Annotation Subsystem
        4.2.1 Secure Cloud Storage Buckets (Private Manuscript ACL)
        4.2.2 Automated SHA-256 Document Fingerprinting & Version History
        4.2.3 Viewport-Agnostic PDF Coordinate Mapping Engine
        4.2.4 Threaded Reviewer Comments & Severity Categorization
    4.3 Workflow Gating & Institutional Forms (DCS-CF-03)
        4.3.1 Plagiarism & Turnitin Similarity Clearance Gate
        4.3.2 Electronic Adviser Certification Routing
        4.3.3 Defense Application Verification Subsystem
    4.4 Deliberation & Evaluation Engine (DCS-CF-04)
        4.4.1 Interactive Dynamic Rubric Scoring Worksheet
        4.4.2 Mathematical Weighted Grade Calculation Engine
        4.4.3 Step-Up Re-Authentication & Digital Signature Affixing (RA 8792)
        4.4.4 Sequential Certificate Serial Sequence Generation (AURORA-YYYY-NNNNNN)
    4.5 Scheduling & Institutional Governance Engine
        4.5.1 Single & Batch Defense Deliberation Scheduler
        4.5.2 Room Clash & Panel Overlap Collision Avoidance
        4.5.3 Academic Conflict-of-Interest Guard (Adviser Isolation)
        4.5.4 Executive Throughput & KPI Analytics Dashboard

5.0 Quality Assurance, Testing & Security Hardening
    5.1 Automated Unit & Integration Testing
    5.2 End-to-End Workflow Verification Simulation
    5.3 Vulnerability Assessment & RLS Policy Penetration Testing
    5.4 User Acceptance Testing (UAT) with 27 Stakeholders
    5.5 ISO/IEC 25010 Software Quality Measurement

6.0 Cloud Infrastructure & Production Deployment
    6.1 Vercel Edge Serverless Function Pipeline
    6.2 PostgreSQL Cloud Database Clustering & Replication
    6.3 Domain SSL / TLS 1.3 Certification & Security Headers
    6.4 Disaster Recovery & Point-in-Time Recovery (PITR) Setup

7.0 Technical Documentation & Academic Manuscript
    7.1 Capstone Manuscript Chapters 1 through 5
    7.2 Complete Departmental Annexes A through L
    7.3 System Administrator & Role-Based User Manuals
    7.4 System Turnover & Archival Handover
```

---

## D.3 PANEL REVISION COMPLIANCE MATRIX

This matrix records all substantive comments, criticisms, and required enhancements issued by the Capstone Evaluation Panel during prior defense milestones, together with the concrete technical actions implemented by the proponents.

| Item No. | Defense Stage | Panel Member | Panel Recommendation / Comment | Concrete Technical Action Implemented | Manuscript / Code Reference | Verification Status |
| :---: | :--- | :--- | :--- | :--- | :--- | :---: |
| **01** | Title Defense | Dr. K. Cuya | *"Clarify how electronic signatures comply with Philippine laws to avoid legal challenge."* | Integrated Republic Act No. 8792 compliance using step-up password re-authentication, IP/User-Agent logging, SHA-256 payload hashing, and irreversible locking. | Annex G.1 (`evaluations/actions.ts`) & Chapter 3 | **VERIFIED & RESOLVED** |
| **02** | Title Defense | Prof. P. Job | *"Advisers must have a dedicated endorsement gate so unready papers are not defended."* | Implemented Form DCS-CF-03 workflow with automated status transition: papers cannot be scheduled until the adviser signs the digital certification. | Annex G.1 (`application-actions.ts`) & Chapter 4 | **VERIFIED & RESOLVED** |
| **03** | Proposal | Panel Chair | *"Prevent advisers from sitting as panelists for their own advisees to ensure impartiality."* | Engineered automated Conflict-of-Interest Guard in the scheduling server action; system throws a runtime error if an adviser UUID is placed in the panel committee. | Annex G.1 (`scheduler/actions.ts`) & Chapter 3 | **VERIFIED & RESOLVED** |
| **04** | Proposal | Panel Member | *"PDF annotations must retain exact page location regardless of screen zoom level."* | Replaced pixel offsets with normalized percentage-based coordinates (`left`, `top`, `width`, `height` as float percentages 0–100%). | Annex G.1 (`annotations/actions.ts`) & Chapter 4 | **VERIFIED & RESOLVED** |
| **05** | Progress 1 | Panel Member | *"Add an automated certificate serial number sequence to prevent duplicate evaluation records."* | Created atomic PostgreSQL stored procedure `generate_certificate_serial()` generating unique `AURORA-YYYY-NNNNNN` serials. | Annex G.2 (`schema_ddl.sql`) & Chapter 4 | **VERIFIED & RESOLVED** |
| **06** | Progress 2 | Dr. A. Thorne | *"Ensure non-repudiation and create an immutable audit trail for all deliberative transitions."* | Implemented centralized `emitAuditLog` action recording all actor actions, timestamps, and IP addresses to an immutable `audit_logs` table. | Annex G.1 (`audit/log.ts`) & Chapter 4 | **VERIFIED & RESOLVED** |
| **07** | Pre-Oral | Panel Chair | *"The Dean and Coordinator require high-level analytics on pass rates and departmental throughput."* | Developed Executive Analytics Dashboard featuring ISO 25010 charts, pass/fail ratios, and turnaround time KPIs. | Annex I.3 & Chapter 5 | **VERIFIED & RESOLVED** |
