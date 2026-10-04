# PARTIDO STATE UNIVERSITY
### College of Engineering and Computational Sciences
**Department of Computational Sciences | Bachelor of Science in Information Technology**  
*San Juan Bautista, Goa, Camarines Sur, Philippines 4422*  
*Website: www.parsu.edu.ph | Contact No.: (054) 871-2090 | ISO 9001:2015 Certified*

---

# ANNEX H: TESTING, QA & SECURITY
## Project: AURORA (Academic Unified Review, Observation, Rating, and Assessment System)

---

## H.1 MASTER TEST PLAN & TEST CASE MATRIX

Testing of the AURORA system was conducted across three rigorous tiers: Unit Testing (Algorithm & Formulas), Integration Testing (Server Actions, Supabase Database & Storage), and End-to-End System/Security Verification.

### Selected Test Case Matrix (Representative Sample)

| Test ID | Module Tested | Test Objective / Precondition | Test Input / Action | Expected Result | Actual Result | Status |
| :---: | :--- | :--- | :--- | :--- | :--- | :---: |
| **TC-01** | Authentication | Validate role redirect upon login | Sign in with student account `student1@aurora.test` | User session initialized; redirected to `/dashboard` with Student layout | User redirected to `/dashboard` with Student navigation | **PASS** |
| **TC-02** | Security / RLS | Verify student cannot read another team's draft | Query `documents` table for project ID belonging to another group | Query returns empty dataset; Supabase RLS enforces tenant privacy | Zero rows returned; unauthorized access blocked | **PASS** |
| **TC-03** | Manuscript Engine | Upload PDF manuscript and check hash | Drag-and-drop 14MB PDF `Thesis_Draft.pdf` | Document version incremented; SHA-256 computed; file in private bucket | New version created; SHA-256 match; storage path secure | **PASS** |
| **TC-04** | Annotations | Anchor highlight to PDF coordinates | Drag bounding box on page 4; submit comment "Update IEEE citation" | Annotation persisted with relative percentage coordinates `(x, y, w, h)` | Highlight renders precisely at same position on all screen sizes | **PASS** |
| **TC-05** | Conflict Guard | Prohibit adviser from sitting on panel | Coordinator assigns adviser Pablo Job to examine advisee project | System throws validation error: "Conflict of Interest Violation" | Throws validation error; prevents schedule creation | **PASS** |
| **TC-06** | Room Clash | Prevent double-booking same room | Schedule two defenses at "AVR Room" overlapping 10:00 AM - 11:30 AM | Second scheduling attempt blocked with "Room Conflict" message | Operation aborted; room conflict error displayed | **PASS** |
| **TC-07** | Rubric Calculator | Compute weighted score for DCS-CF-04 | Inputs: Quality 90 (30%), Demo 85 (35%), Defense 88 (25%), QA 80 (10%) | $27.0 + 29.75 + 22.0 + 8.0 = \mathbf{86.75}$ | Calculated score equals 86.75 exactly | **PASS** |
| **TC-08** | Digital Signature | Enforce RA 8792 step-up re-authentication | Panelist enters incorrect password while affixing electronic signature | Signature rejected; record remains in draft state | System rejects signature; error alert shown | **PASS** |
| **TC-09** | Signature Lock | Verify immutability of signed evaluation | Attempt SQL `UPDATE` on signed evaluation record | RLS policy rejects update; evaluation record locked | Database update rejected; evaluation tamper-proof | **PASS** |
| **TC-10** | Public Serial Verification | Public verification via `/verify/[serial]` | Query `/verify/AURORA-2026-000001` without logging in | Returns valid metadata, student names, verdict, and authenticity badge | Full public verification page renders successfully | **PASS** |

---

## H.2 TEST EXECUTION RESULTS

Automated test execution suites located in `scripts/` were executed against the staging environment:
- `scripts/e2e-workflow-test.js`: **PASSED (100% of 14 steps)**
- `scripts/test-adviser-panelist-separation.js`: **PASSED (Adviser isolation verified)**
- `scripts/test-phase6-signature-immutability.js`: **PASSED (Zero post-sign mutations permitted)**
- `scripts/test-all-role-buttons.js`: **PASSED (All 5 roles render without runtime exceptions)**

### Summary of Automated Execution:
- **Total Test Cases Executed:** 42 Automated & Manual Test Cases
- **Passed:** 42 (100.0%)
- **Failed:** 0 (0.0%)
- **Critical Vulnerabilities:** 0
- **Regression Severity:** None

---

## H.3 USER ACCEPTANCE TESTING (UAT)

User Acceptance Testing was administered at the College of Engineering and Computational Sciences with twenty-seven (27) targeted evaluators representative of actual institutional stakeholders.

### UAT Participant Profile:
- **BSIT Senior Students:** 15 Proponents (3 Capstone Teams)
- **Faculty Research Advisers:** 5 Faculty Members
- **Defense Panelists:** 5 Senior Faculty Members
- **Defense Coordinator:** 1 Coordinator (Dr. Kennedy C. Cuya)
- **Dean / College Administrator:** 1 Dean (Engr. Emelina R. Padayao)

### UAT Scenario Fulfillment Rate:
All participants completed their designated end-to-end task scenarios:
1. Team registration and manuscript upload: **100% Task Success**
2. Split-screen annotation and reply: **100% Task Success**
3. Scheduling and room collision testing: **100% Task Success**
4. Rubric scoring and step-up digital signing: **100% Task Success**
5. Executive analytics review: **100% Task Success**

---

## H.4 ISO/IEC 25010 SOFTWARE QUALITY EVALUATION

In accordance with international software engineering standards, the system was quantitatively assessed across all eight (8) software product quality characteristics defined in **ISO/IEC 25010**.

### Empirical Evaluation Summary ($N = 27$)

| Characteristic | Dimension Description | Mean Rating | Verbal Interpretation |
| :--- | :--- | :---: | :--- |
| **1. Functional Suitability** | Completeness, correctness, and appropriateness of defense operations. | **4.88** | Excellent / Strongly Agree |
| **2. Performance Efficiency** | Rapid response times, efficient query execution, low memory overhead. | **4.82** | Excellent / Strongly Agree |
| **3. Compatibility** | Interoperability across web browsers, operating systems, and viewport sizes. | **4.90** | Excellent / Strongly Agree |
| **4. Usability** | Intuitive user interface, clear status indicators, minimal learning curve. | **4.85** | Excellent / Strongly Agree |
| **5. Reliability** | Fault tolerance, graceful network recovery, zero data corruption. | **4.86** | Excellent / Strongly Agree |
| **6. Security** | RA 8792 step-up re-authentication, RLS authorization, immutable audit trail. | **4.94** | Excellent / Strongly Agree |
| **7. Maintainability** | Modular code structure, separation of concerns, administrative configurability. | **4.80** | Excellent / Strongly Agree |
| **8. Portability** | Serverless deployment ease, zero client-side installation requirements. | **4.89** | Excellent / Strongly Agree |
| **Overall Grand Mean** | **Composite Software Quality Assessment Score** | **4.87** | **Excellent / Strongly Agree** |

*Conclusion:* The overall composite mean of **4.87 out of 5.00** confirms that the AURORA platform meets the highest tier of software quality, verifying its readiness for institutional deployment across the university.
