# PARTIDO STATE UNIVERSITY
### College of Engineering and Computational Sciences
**Department of Computational Sciences | Bachelor of Science in Information Technology**  
*San Juan Bautista, Goa, Camarines Sur, Philippines 4422*  
*Website: www.parsu.edu.ph | Contact No.: (054) 871-2090 | ISO 9001:2015 Certified*

---

# ANNEX E: USER INTERFACE & EXPERIENCE (UI/UX)
## Project: AURORA: Paperless Academic Defense Workflow System for Research, Capstone, Thesis & Dissertation Papers at Partido State University

---

## E.1 HIGH-FIDELITY VISUAL MOCKUPS & SCREEN WIREFRAMES

The AURORA platform is architected with a modern, dual-purpose design paradigm: an information-dense, distraction-free productivity environment for faculty reviewers (Advisers, Panelists, Coordinators, and College Deans), paired with an accessible, guided milestone portal for student proponents.

### Figure E.1: Student Proponent Capstone Hub & Stage Progression Interface
The Proponent Capstone Hub consolidates the 4-stage CEC defense progression pipeline (*Concept Paper*, *Title Defense*, *Proposal Defense*, and *Final Oral Defense*), the interactive **Form DCS-CF-03** Oral Defense Application prerequisite checklist, SHA-256 manuscript version tracking, and direct access to the **Objective 4 (SUS & UTAUT)** evaluation survey.

![Figure E.1: Proponent Capstone Hub & Defense Stage Progression Interface](public/diagrams/aurora_mockup_student_hub.png)

| UI Region / Component | Functional Specification | Key Data Elements Displayed |
| :--- | :--- | :--- |
| **Left Navigation Sidebar** | Role-scoped navigation menu driven by PostgreSQL RBAC claims (`student`). | Dashboard, My Project, Submissions, Inline Annotations, Defenses, Grades, SUS & UTAUT Survey. |
| **Project Header Banner** | Displays active capstone project metadata and assigned faculty supervision. | Project Title, Code (`BSIT-2026-001`), Research Adviser (**Prof. Froiland B. Peñalosa**), and Stage Badge. |
| **4-Stage Progression Stepper** | Dynamic milestone tracker reflecting college-specific workflow templates. | Stage completion status (`Completed`, `Active`), weighted defense scores, and schedule timestamps. |
| **Form DCS-CF-03 Gating Card** | Real-time prerequisite checklist gating eligibility for oral defense scheduling. | Turnitin similarity index ($11\% \le 20\%$), resolved annotations ($14/14$), and Adviser digital endorsement. |
| **Manuscript SHA-256 Card** | Cryptographic version control panel verifying binary integrity of uploaded PDFs. | Active version pointer (`v3`, `is_current = true`), file size, and 64-character FIPS 180-4 SHA-256 digest. |

---

### Figure E.2: Dual-Pane Split-Screen Review & Rubric Evaluation Workspace
The Dual-Pane Review Workspace (`/workspace/[projectId]/[stageId]`) eliminates paper-based manuscript routing by synchronizing an interactive **PDF.js vector canvas** (left 60% viewport) with a real-time **Coordinate Annotation & Form DCS-CF-04 Rubric Scoring Drawer** (right 40% viewport).

![Figure E.2: Dual-Pane Review & Rubric Evaluation Workspace](public/diagrams/aurora_mockup_review_workspace.png)

| Viewport Pane | Interactive Controls & Ergonomic Features | Technical Implementation |
| :--- | :--- | :--- |
| **Left Viewport (60%): Interactive PDF.js Canvas** | Zoom controls ($75\%$–$200\%$), page jumper, text highlight selector, and normalized bounding-box pin overlays (`x%, y%, w%, h%`). | Renders private S3 signed URLs via `PDF.js`; persists coordinates as resolution-independent percentages. |
| **Right Viewport Top: Threaded Annotations** | Severity-tagged comment cards (*Critical*, *Major*, *Minor*) with one-click page jump and proponent reply threads. | Synchronized in real time across panelists via Supabase PostgreSQL Write-Ahead Log (WAL) WebSockets. |
| **Right Viewport Bottom: Form DCS-CF-04 & RA 8792 Signer** | Live weighted criteria inputs ($30\% + 35\% + 25\% + 10\% = 100\%$), automatic verdict derivation, and step-up password re-authentication. | Computes weighted scores via `computeWeightedScore()` and locks records with a SHA-256 signature hash. |

---

## E.2 SCREEN LAYOUTS & RESPONSIVE GRID SPECIFICATIONS

The application is engineered using **Tailwind CSS v4** and structured on an adaptive 12-column CSS Grid and Flexbox layout system:

| Viewport Tier | Breakpoint Width | Layout Structure & Navigation Behavior | Target Device Class |
| :--- | :---: | :--- | :--- |
| **Mobile Compact** | `sm: < 768px` | Single-column vertical card stack with slide-over drawer navigation and touch-friendly action pills. | Smartphones (iOS / Android) |
| **Tablet Split** | `md: 768px – 1023px` | Collapsible icon-rail sidebar with two-column dashboard metric cards and tabbed PDF/Rubric switcher. | iPads & Android Tablets |
| **Desktop Standard** | `lg: 1024px – 1279px` | Fixed `260px` dark-slate left sidebar with fluid 12-column main content container and modal dialogs. | Standard Laptops ($1366 \times 768$) |
| **Widescreen Review** | `xl: >= 1280px` | Full dual-pane 60/40 split-screen evaluation workspace with simultaneous PDF rendering and rubric grading. | Desktop Monitors ($1920 \times 1080+$) |

---

## E.3 MOBILE & WEB UI COMPONENT SPECIFICATIONS

1. **Interactive Defense Scheduler & Conflict Guard Modal (`/dashboard/defenses/schedule`)**:
   - Features a real-time room and timeslot picker with automatic red-badge collision alerts for overlapping venue bookings.
   - Integrates the **Academic Conflict-of-Interest Firewall**, which automatically disables selecting a project's assigned Research Adviser (**Prof. Froiland B. Peñalosa**) as a voting member of that project's evaluation panel.
2. **RA 8792 Cryptographic Digital Signature Modal**:
   - Supports three signature capture modes: **Drawn** (HTML5 Canvas freehand stroke), **Typed** (stylized legal script), or **Saved Baseline Profile** (`/dashboard/settings`).
   - Enforces mandatory step-up password re-authentication before generating the immutable `AURORA-YYYY-NNNNNN` certificate serial.
3. **Maintenance, Troubleshooting & Disaster Recovery Console (`/admin/system-health`)**:
   - Three-tab administrative command center featuring 6 live subsystem integrity probes, one-click **Self-Healing Maintenance**, **3-2-1 Disaster Recovery Backup Export**, and a client-side **SHA-256 Backup Integrity Verifier**.

---

## E.4 STYLE GUIDE & DESIGN SYSTEM COMPONENTS

AURORA adheres to an institutional design system reflecting Partido State University's official visual identity combined with high-contrast accessibility standards (WCAG 2.1 AA).

### 1. Institutional Color Palette

| Token Name | Hex Code | Tailwind Utility | Application / Semantic Meaning |
| :--- | :---: | :--- | :--- |
| **ParSU Maroon** | `#800000` | `bg-[#800000]` | Primary institutional brand color, active navigation states, primary CTAs |
| **ParSU Gold** | `#DAA520` | `text-[#DAA520]` | Secondary university accent, milestone highlights, excellence badges |
| **Slate Dark** | `#0F172A` | `bg-slate-900` | Sidebar navigation surface, table headers, primary display typography |
| **Slate Surface** | `#F8FAFC` | `bg-slate-50` | App background canvas, card containers, code block surfaces |
| **Status Approved** | `#16A34A` | `bg-emerald-600` | Passing defense verdicts, verified SHA-256 hashes, healthy probes |
| **Status Warning** | `#EA580C` | `bg-orange-600` | Minor revisions required, pending endorsements, threshold alerts |
| **Status Critical** | `#DC2626` | `bg-rose-600` | Re-defense verdicts, room/panelist scheduling conflicts, security blocks |

### 2. Typography Hierarchy

| Style Level | Font Family | Size | Weight | Line Height | Primary Interface Usage |
| :--- | :--- | :---: | :---: | :---: | :--- |
| **Display Header** | `Inter`, sans-serif | `24px` (`1.5rem`) | Bold (`700`) | `2.0rem` | Page headers, executive KPI summary counters |
| **Section Header** | `Inter`, sans-serif | `18px` (`1.125rem`) | SemiBold (`600`) | `1.75rem` | Card titles, dialog headers, rubric section headers |
| **Body Copy** | `Inter`, sans-serif | `14px` (`0.875rem`) | Regular (`400`) | `1.5rem` | Form controls, table cells, annotation comment threads |
| **Monospace / Hash** | `Consolas`, monospace | `13px` (`0.8125rem`) | Medium (`500`) | `1.25rem` | SHA-256 digests, `AURORA-YYYY-NNNNNN` serials, SQL/JSON logs |

*Design System Verification:* All UI components are implemented using accessible Radix UI primitives (`Dialog`, `Tabs`, `Select`, `Tooltip`) styled with Tailwind CSS v4 utility tokens.
