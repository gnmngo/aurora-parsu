# PARTIDO STATE UNIVERSITY
### College of Engineering and Computational Sciences
**Department of Computational Sciences | Bachelor of Science in Information Technology**  
*San Juan Bautista, Goa, Camarines Sur, Philippines 4422*  
*Website: www.parsu.edu.ph | Contact No.: (054) 871-2090 | ISO 9001:2015 Certified*

---

# ANNEX D: PROJECT MANAGEMENT & GOVERNANCE
## Project: AURORA: Paperless Academic Defense Workflow System for Research, Capstone, Thesis & Dissertation Papers at Partido State University

---

## D.1 PROJECT GANTT CHART & SCHEDULE

The development of the AURORA platform followed an **Agile Scrum Software Development Life Cycle (SDLC)** executed across a **14-month capstone development timeline** spanning **Academic Year 2025–2026** (1st Semester, 2nd Semester, and Midyear Term) through the **1st Semester of Academic Year 2026–2027** (**August 15, 2025 to November 2026**).

![Figure D.1: AURORA Agile Scrum Gantt Chart Schedule](public/diagrams/aurora_gantt_chart.png)

### Visual Gantt Schedule Matrix (AY 2025–2026 to 1st Semester, AY 2026–2027)

| Phase / Sprint Deliverable | Aug–Sep 2025 | Oct–Dec 2025 | Jan–Feb 2026 | Mar–May 2026 | Jun–Jul 2026 | Aug–Nov 2026 | Status |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **1. Inception & Title Proposal (M-01)** | `[ACTIVE]` | — | — | — | — | — | **100% Done** |
| **2. Systems Analysis & SRS (M-02)** | — | `[ACTIVE]` | — | — | — | — | **100% Done** |
| **3. UI/UX & ParSU Design Kit (M-03)** | — | `[ACTIVE]` | — | — | — | — | **100% Done** |
| **4. Sprint 1: Auth, RBAC & RLS (M-04)** | — | — | `[ACTIVE]` | — | — | — | **100% Done** |
| **5. Proposal Defense Gate (M-05)** | — | — | `[ACTIVE]` | — | — | — | **100% Done** |
| **6. Sprint 2–3: PDF & Annotations (M-06)** | — | — | — | `[ACTIVE]` | — | — | **100% Done** |
| **7. Sprint 4: Defense Scheduler (M-07)** | — | — | — | `[ACTIVE]` | — | — | **100% Done** |
| **8. Sprint 5: Rubric & RA 8792 Sign (M-08)** | — | — | — | — | `[ACTIVE]` | — | **100% Done** |
| **9. Sprint 6: QA, UAT & SUS/UTAUT (M-09)** | — | — | — | — | — | `[ACTIVE]` | **100% Done** |
| **10. Maintenance/DR & Turnover (M-10)** | — | — | — | — | — | `[ACTIVE]` | **100% Done** |

### Detailed Milestone Schedule & Deliverables

| Milestone Code | Milestone Title | Start Date | Completion Date | Lead Proponent | Key Institutional Deliverable |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **M-01** | Project Inception & Research Proposal | Aug 15, 2025 | Sep 30, 2025 | G. V. D. Mañago | Concept & Title Proposal Defense Approval |
| **M-02** | Systems Analysis & SRS Formulation | Oct 01, 2025 | Nov 15, 2025 | C. A. B. Castillo | Software Requirements Matrix & PIECES Analysis |
| **M-03** | UI/UX Wireframing & Design System | Nov 16, 2025 | Dec 20, 2025 | L. M. B. Encinas | High-Fidelity Mockups & ParSU Design Kit |
| **M-04** | Core Architecture & Database Setup | Jan 05, 2026 | Feb 15, 2026 | G. V. D. Mañago & L. Bares | 26-Table Supabase DDL, RLS Hardening & Auth Engine |
| **M-05** | Multi-College Requirements Interviews & Proposal | Feb 20, 2026 | Feb 28, 2026 | Team Proponents | 5-College Coordinator Interviews & Proposal Clearance |
| **M-06** | Interactive Annotation Engine | Mar 01, 2026 | Apr 15, 2026 | G. V. D. Mañago | Dual-Pane Viewport & PDF Coordinate Bounding |
| **M-07** | Scheduler & Conflict Firewall | Apr 16, 2026 | May 30, 2026 | C. A. B. Castillo | Room Collision & Panelist Overlap Logic |
| **M-08** | Digital Signature & RA 8792 Module | Jun 01, 2026 | Jul 15, 2026 | G. V. D. Mañago | Step-Up Re-Auth & SHA-256 Serial Generator |
| **M-09** | Quality Assurance, UAT & SUS/UTAUT Survey | Jul 16, 2026 | Sep 30, 2026 | R. M. S. Buenafe | Master Test Execution & Objective 4 Evaluation |
| **M-10** | Production Deployment & System Turnover | Oct 01, 2026 | Nov 2026 | Team Proponents | Vercel Deployment, DR Plan & Turnover Certificate |

---

## D.2 WORK BREAKDOWN STRUCTURE (WBS)

The total scope of the AURORA capstone project is decomposed into seven (7) hierarchical engineering work packages detailed in the table below.

| WBS Code | Work Package / Engineering Phase | Key Sub-Tasks & Technical Deliverables | Responsible Proponent |
| :--- | :--- | :--- | :--- |
| **1.0** | **Project Management & Governance** | `1.1` Project Initiation & Stakeholder Charter; `1.2` Academic Policy Review (ParSU Defense Guidelines across 5 Colleges, RA 8792 & RA 10173); `1.3` Agile Sprint Schedule & Risk Management Plan. | Gene Vincent D. Mañago |
| **2.0** | **Requirements Engineering & Modeling** | `2.1` Multi-College Research Coordinator Interviews (CECS, COE, CAH, COS, CBM); `2.2` Functional & Non-Functional SRS & PIECES Matrix; `2.3` Process Flowcharts & Data Flow Diagrams (DFD); `2.4` 26-Table Normalized Entity-Relationship Diagram (ERD) & Data Dictionary. | Carol Ann B. Castillo & Leomer Bares |
| **3.0** | **UI/UX Architecture & Prototyping** | `3.1` Information Architecture & Role Navigation; `3.2` ParSU CECS Maroon/Gold Design Tokens; `3.3` Split-Screen Review Workspace & Responsive Layouts; `3.4` Interactive Usability Prototyping. | Lara Mae B. Encinas |
| **4.0** | **Full-Stack Software Engineering** | `4.1` Supabase Auth, JWT Session & RBAC Middleware; `4.2` SHA-256 Manuscript Upload & Normalized Coordinate PDF Annotations; `4.3` Form DCS-CF-03 Adviser Endorsement Gate; `4.4` Form DCS-CF-04 Dynamic Weighted Rubric & RA 8792 Digital Signatures; `4.5` Single/Batch Defense Scheduler with Conflict-of-Interest Firewall. | Gene Vincent D. Mañago & Carol Ann B. Castillo |
| **5.0** | **Quality Assurance, Testing & UAT** | `5.1` Unit & Server Action Integration Testing; `5.2` End-to-End Role Workflow Simulation; `5.3` PostgreSQL RLS Penetration & Immutability Testing; `5.4` Empirical UAT with ParSU Stakeholders using the Objective 4 SUS & UTAUT Instrument. | Rona Mae S. Buenafe |
| **6.0** | **Cloud Infrastructure, Maintenance & DR** | `6.1` Vercel Edge Serverless Deployment & GitHub Actions CI/CD; `6.2` Supabase PostgreSQL Clustering & TLS 1.3 Hardening; `6.3` Live Subsystem Diagnostics & Self-Healing Maintenance Engine; `6.4` 3-2-1 Disaster Recovery & Signed JSON Backup Console (`/admin/system-health`). | Gene Vincent D. Mañago & Leomer Bares |
| **7.0** | **Documentation & Institutional Turnover** | `7.1` Capstone Manuscript (239 Pages); `7.2` Complete Departmental Annexes A through L; `7.3` Operational Manual, Promotional Flyer & Booklet; `7.4` Formal Institutional Turnover to ParSU CECS. | All 5 Team Proponents |

---

## D.3 PANEL REVISION COMPLIANCE MATRIX

This matrix records all substantive comments, criticisms, and required enhancements issued by the Panel of Examiners (`Salvador V. Briones II, MAEd`, `Rowell John B. Artiaga, DIT`, `Michael B. Amata`, `Froiland B. Peñalosa`, and `Kennedy C. Cuya, DIT`) across defense milestones, together with the concrete technical actions implemented by the proponents.

| Item No. | Defense Stage | Panel Examiner / Reviewer | Panel Recommendation / Comment | Concrete Technical Action Implemented | Manuscript / Code Reference | Verification Status |
| :---: | :--- | :--- | :--- | :--- | :--- | :---: |
| **01** | Title Defense | Kennedy C. Cuya, DIT (Panel Member & Reader) | *"Clarify how electronic signatures comply with Philippine laws to avoid legal challenge."* | Integrated Republic Act No. 8792 compliance using step-up password re-authentication, IP/User-Agent logging, SHA-256 payload hashing, and irreversible locking. | Annex G.1 (`evaluations/actions.ts`) & Chapter 3 | **VERIFIED & RESOLVED** |
| **02** | Title Defense | Froiland B. Peñalosa (Adviser & Panel Member) | *"Advisers must have a dedicated endorsement gate so unready papers are not defended."* | Implemented Form DCS-CF-03 workflow with automated status transition: papers cannot be scheduled until the adviser signs the digital certification. | Annex G.1 (`application-actions.ts`) & Chapter 4 | **VERIFIED & RESOLVED** |
| **03** | Proposal | Salvador V. Briones II, MAEd (Panel Chairperson) | *"Prevent advisers from sitting as voting panelists for their own advisees to ensure impartiality."* | Engineered automated Conflict-of-Interest Guard in the scheduling server action; system blocks schedule creation if an adviser UUID is placed in the voting panel committee. | Annex G.1 (`scheduler/actions.ts`) & Chapter 3 | **VERIFIED & RESOLVED** |
| **04** | Proposal | Rowell John B. Artiaga, DIT (Panel Member) | *"PDF annotations must retain exact page location regardless of screen zoom level."* | Replaced pixel offsets with normalized percentage-based coordinates (`left`, `top`, `width`, `height` as float percentages 0–100%). | Annex G.1 (`annotations/actions.ts`) & Chapter 4 | **VERIFIED & RESOLVED** |
| **05** | Progress 1 | Michael B. Amata (Panel Member) | *"Add an automated certificate serial number sequence to prevent duplicate evaluation records."* | Created atomic PostgreSQL stored procedure `generate_certificate_serial()` generating unique `AURORA-YYYY-NNNNNN` serials. | Annex G.2 (`schema_ddl.sql`) & Chapter 4 | **VERIFIED & RESOLVED** |
| **06** | Progress 2 | Rowell John B. Artiaga, DIT (Panel Member) | *"Include a complete Maintenance & Troubleshooting Guide and Disaster Recovery & Data Backup Plan."* | Built the 3-tab Maintenance, Troubleshooting & DR Console (`/admin/system-health`) with 6 live probes, self-healing repair, and SHA-256 signed JSON backups. | Annex J.3 & J.4 (`admin/system-health`) | **VERIFIED & RESOLVED** |
| **07** | Pre-Oral | Salvador V. Briones II, MAEd (Panel Chairperson) | *"Align the Objective 4 evaluation with the validated SUS and UTAUT questionnaire (excluding PE2 and UB2)."* | Updated the in-app Evaluation Dialog and Research Objectives Dashboard to the exact 10-item SUS + 27-item UTAUT instrument (Grand Mean = 4.86 / 5.00). | Annex C.3 & H.4 (`iso25010.ts`) | **VERIFIED & RESOLVED** |

*Attested by:* **Froiland B. Peñalosa** (Capstone Project Adviser & Research Coordinator) and **Kennedy C. Cuya, DIT** (Department Chair, Department of Computational Sciences & Capstone Reader).
