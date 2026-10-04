# PARTIDO STATE UNIVERSITY
### College of Engineering and Computational Sciences
**Department of Computational Sciences | Bachelor of Science in Information Technology**  
*San Juan Bautista, Goa, Camarines Sur, Philippines 4422*  
*Website: www.parsu.edu.ph | Contact No.: (054) 871-2090 | ISO 9001:2015 Certified*

---

# ANNEX E: USER INTERFACE & EXPERIENCE (UI/UX)
## Project: AURORA (Academic Unified Review, Observation, Rating, and Assessment System)

---

## E.1 HIGH-FIDELITY WIREFRAMES

The AURORA platform is architected with a modern, dual-purpose design paradigm: an information-dense, distraction-free productivity environment for faculty reviewers, paired with an accessible, guided portal for student proponents.

### Wireframe 1: Proponent Capstone Hub & Stage Progression Wireframe
```text
+-------------------------------------------------------------------------------------------------------+
| [AURORA ParSU Logo]   [Dashboard]  [My Projects]  [Submissions]  [Defenses]       [User: Student] [v] |
+-------------------------------------------------------------------------------------------------------+
|  PROJECT: Automated Solar Irradiance Forecasting (BSIT-2026-004)                                      |
|  Current Stage: Title Defense | Status: Under Review | Adviser: Pablo Job                             |
+-------------------------------------------------------------------------------------------------------+
|  +-------------------------------------------------------+  +---------------------------------------+ |
|  | STAGE PROGRESSION PIPELINE                           |  | MANUSCRIPT DOCUMENTS                  | |
|  | [O] Title Defense =====> [ ] Proposal =====> [ ] Final |  | Latest: Draft_v3.pdf (14.2 MB)        | |
|  | Status: Adviser Endorsement Pending                   |  | SHA-256: 8f9a2b...c3d4                | |
|  |                                                       |  | [ Upload Revised PDF ]                | |
|  | REQUIREMENTS CHECKLIST (DCS-CF-03):                   |  |                                       | |
|  | [X] Similarity Report (Turnitin: 11%)                 |  | ADVISER FEEDBACK                      | |
|  | [X] Adviser Endorsement Form                          |  | - 4 Unresolved Annotations            | |
|  | [ ] Panel Schedule Confirmed                          |  | - 1 Critical Methodology Concern      | |
|  +-------------------------------------------------------+  +---------------------------------------+ |
+-------------------------------------------------------------------------------------------------------+
```

### Wireframe 2: Dual-Pane Review Workspace (Adviser & Panelist Viewport)
```text
+-------------------------------------------------------------------------------------------------------+
| [< Back to Defenses]  MANUSCRIPT: Smart Campus IoT Gateway (v2)  Page [ 12 ] / 85  [Zoom: 100%] [Help]|
+-------------------------------------------------------------------+-----------------------------------+
|  PDF VIEWPORT (Interactive PDF.js Canvas)                         |  ANNOTATIONS & EVALUATION DRAWER  |
|                                                                   |                                   |
|  4.2 Hardware Architecture & Circuitry                            |  [ Filter: All | Critical (1) ]   |
|  -------------------------------------                            |                                   |
|  The NodeMCU ESP8266 microcontroller receives                     |  +-----------------------------+  |
|  continuous sensor streams via I2C bus.                           |  | Page 12 - Methodology (Major)  |  |
|  [==============================================================] |  | By: Dr. Aris Thorne (10:14 AM) |  |
|  [ HIGHLIGHTED REGION: Sensor sampling rate is 10ms without buffer] |  | "Sampling at 10ms will saturate|  |
|  [==============================================================] |  | the WiFi buffer. Use 500ms."   |  |
|                                                                   |  | [Reply] [Mark Resolved]        |  |
|  Data is then routed to the cloud messaging broker.               |  +-----------------------------+  |
|                                                                   |  +-----------------------------+  |
|                                                                   |  | SCORE SHEET: DCS-CF-04        |  |
|                                                                   |  | Manuscript Quality (30%): [27] |  |
|                                                                   |  | System Demo (35%):        [32] |  |
|                                                                   |  | [ Complete Digital Signature ]|  |
|                                                                   |  +-----------------------------+  |
+-------------------------------------------------------------------+-----------------------------------+
```

---

## E.2 SCREEN LAYOUTS & RESPONSIVE GRID SPECIFICATIONS

The application is engineered using **Tailwind CSS v4** and structured on an adaptive 12-column responsive grid system:

### 1. Viewport Breakpoint Standards:
- **Mobile (`sm: 640px`)**: Single-column vertical stack with collapsable bottom navigation sheet.
- **Tablet (`md: 768px`)**: Two-column layout with icon-only sidebar and collapsible drawers.
- **Desktop (`lg: 1024px`)**: Fixed 260px left sidebar, dynamic fluid main workspace.
- **Widescreen Review (`xl: 1280px+`)**: Optimized 60/40 dual-pane split view (PDF canvas left 60%, interactive review sidebar right 40%).

### 2. Navigation Architecture:
- **Global Header**: University institutional identifier, notification bell with unread badge counter, and role-switching user profile menu.
- **Sidebar Navigation**: Role-tailored routes based on PostgreSQL custom user claims (Dashboard, Submissions, Annotations, Deliberations, Grades, Executive Analytics, and Settings).

---

## E.3 MOBILE & WEB UI MOCKUPS

### Web Desktop Mockup Components
1. **Interactive Defense Scheduler Modal**:
   - Visual timeslot picker with automatic red-tag collision warning for double-booked venues.
   - Panelist selector dropdown automatically disabling the assigned Research Adviser to preserve academic integrity.
2. **Digital Signature Modal (RA 8792)**:
   - Three input modes: Drawn (HTML5 Canvas vector drawing), Typed (academic cursive font rendering), or Uploaded (PNG transparent signature stamp).
   - Mandatory step-up password confirmation field with red security badge warning.

### Mobile Viewport Mockups
1. **Student Status Tracker Card**:
   - Touch-optimized progression timeline showing defense schedule countdown, venue room assignment, and link to meeting room for online defenses.
2. **Quick Verdict Card**:
   - High-contrast visual verdict badge (*Approved*, *Approved with Minor Revisions*, *Re-defense*) with instantaneous PDF certificate download button.

---

## E.4 STYLE GUIDE & DESIGN SYSTEM COMPONENTS

AURORA adheres to an institutional design system reflecting Partido State University's visual identity combined with modern software ergonomics.

### 1. Institutional Color Palette

| Token Name | Hex Code | Tailwind Class | Application / Meaning |
| :--- | :--- | :--- | :--- |
| **ParSU Maroon** | `#800000` | `bg-[#800000]` | Primary brand color, institutional headers, major CTAs |
| **ParSU Gold** | `#DAA520` | `text-[#DAA520]` | Secondary accent, badges, ratings, milestone alerts |
| **Slate Dark** | `#0F172A` | `bg-slate-900` | Navigation sidebar background, primary typography |
| **Slate Light** | `#F8FAFC` | `bg-slate-50` | Page background, workspace canvas, light card containers |
| **Status Approved** | `#16A34A` | `bg-emerald-600` | Passing verdicts, verified requirements, completed reviews |
| **Status Warning** | `#EA580C` | `bg-orange-600` | Minor revisions, similarity index near threshold |
| **Status Critical** | `#DC2626` | `bg-rose-600` | Re-defense, room conflicts, plagiarism violation |

### 2. Typography Hierarchy

| Style Level | Font Family | Size | Weight | Line Height | Usage |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Display Header** | `Inter`, sans-serif | 24px (1.5rem) | Bold (700) | 2rem | Page titles, executive KPI totals |
| **Section Header** | `Inter`, sans-serif | 18px (1.125rem) | SemiBold (600) | 1.75rem | Modal headers, card titles |
| **Body Text** | `Inter`, sans-serif | 14px (0.875rem) | Regular (400) | 1.5rem | Form descriptions, table data |
| **Code & Serials** | `Consolas`, monospace | 13px (0.8125rem) | Medium (500) | 1.25rem | Certificate serials, hashes, SQL |

### 3. Reusable UI Design Components
- **Buttons (`Button`)**: Primary (`bg-[#800000] hover:bg-[#600000]`), Secondary (`bg-slate-100 hover:bg-slate-200`), Destructive (`bg-rose-600`), and Ghost variants with integrated loading spinners.
- **Badges (`Badge`)**: Rounded-full pill tags with status-mapped color tokens.
- **Card Containers (`Card`)**: Border radius `rounded-xl`, subtle border `border-slate-200/80`, drop-shadow `shadow-sm`.
- **Modals (`Dialog`)**: Accessible backdrop overlay with focus traps and keyboard `ESC` dismissal.
