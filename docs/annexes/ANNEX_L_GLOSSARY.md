# PARTIDO STATE UNIVERSITY
### College of Engineering and Computational Sciences
**Department of Computational Sciences | Bachelor of Science in Information Technology**  
*San Juan Bautista, Goa, Camarines Sur, Philippines 4422*  
*Website: www.parsu.edu.ph | Contact No.: (054) 871-2090 | ISO 9001:2015 Certified*

---

# ANNEX L: GLOSSARY OF TECHNICAL TERMS & ACRONYMS
## Project: AURORA: Paperless Academic Defense Workflow System for Research, Capstone, Thesis & Dissertation Papers at Partido State University

---

## L.1 GLOSSARY OF TECHNICAL TERMS & ACRONYMS

This glossary defines the core software engineering, cryptographic, statistical, legal, and institutional terms and acronyms used throughout the AURORA capstone manuscript and its accompanying technical annexes.

| Term / Acronym | Full Form / Standard Definition | Contextual Application in AURORA |
| :--- | :--- | :--- |
| **AES-256** | Advanced Encryption Standard (256-bit) | Symmetric block cipher utilized by Supabase cloud infrastructure to encrypt database volumes and manuscript storage buckets at rest. |
| **API** | Application Programming Interface | Standardized software contract allowing AURORA client viewports, Next.js Server Actions, and public verification endpoints (`/verify/[serial]`) to exchange structured data. |
| **AURORA** | Academic Unified Review, Observation, Rating, and Assessment | The official title and acronym of the paperless capstone defense workflow and quality assurance platform developed for Partido State University. |
| **BaaS** | Backend-as-a-Service | Cloud service model (provided by Supabase) integrating PostgreSQL 15, GoTrue Authentication, S3 Object Storage, and Realtime WebSocket broadcasting. |
| **bcrypt** | Adaptive Cryptographic Password Hashing Function | Salted key-derivation algorithm used by the authentication engine to store user credentials and verify step-up password re-authentication. |
| **BI** | Behavioral Intention (UTAUT Construct) | UTAUT dimension measuring stakeholders' intention, prediction, and plan to continue using AURORA for future academic defenses ($\mu = 4.90$). |
| **BSIT** | Bachelor of Science in Information Technology | Undergraduate degree program under the Department of Computational Sciences for which this capstone study was conducted. |
| **CECS / CEC** | College of Engineering and Computational Sciences | The host academic college at Partido State University overseeing the 5-stage BSIT capstone defense workflow (*Concept Defense*, *Title Defense*, *Progress Report 1*, *Progress Report 2*, and *Final Defense*) and engineering programs. |
| **CHED** | Commission on Higher Education | Philippine national regulatory agency issuing Policies, Standards, and Guidelines (CMO No. 25, s. 2015) for Information Technology education. |
| **CI/CD** | Continuous Integration / Continuous Deployment | Automated DevOps pipeline (GitHub Actions to Vercel) that runs TypeScript checks, linting, and security tests on every `git push`. |
| **Cronbach’s Alpha ($\alpha$)** | Coefficient of Internal Consistency Reliability | Psychometric statistic confirming high internal reliability across the 37-item SUS and UTAUT evaluation instrument ($\alpha = 0.946$). |
| **CSP** | Content Security Policy | HTTP response security header mitigating Cross-Site Scripting (XSS) and unauthorized frame embedding. |
| **DCS** | Department of Computational Sciences | Academic department within ParSU CECS administering the BSIT and BSIS degree programs. |
| **DCS-CF-01** | Department Form: Application for Oral Defense | Official BSIT institutional form certifying prerequisite completion, project concepts, and Research Adviser endorsement permitting proponents to proceed with Progress Report defense. |
| **DCS-CF-04** | Department Form: Oral Defense Evaluation Sheet | Official weighted grading rubric used by panel evaluators to score manuscript quality (30%), prototype demo (35%), presentation (25%), and Q&A (10%). |
| **DCS-CF-05** | Department Form: Certificate of Defense Clearance | Verifiable institutional certificate issued upon stage completion bearing a unique `AURORA-YYYY-NNNNNN` serial and SHA-256 hash. |
| **DDL** | Data Definition Language | SQL syntax (`CREATE TABLE`, `ALTER TABLE`, `CREATE POLICY`) defining AURORA’s 20 relational PostgreSQL tables and constraints. |
| **DFD** | Data Flow Diagram | Structured systems modeling notation illustrating how manuscript binaries, annotations, and rubric scores flow between actors and data stores. |
| **DRP / BCP** | Disaster Recovery Plan / Business Continuity Plan | Institutional operational protocol in `/admin/system-health` governing 3-2-1 backups, SHA-256 archive verification, and system restoration. |
| **EE** | Effort Expectancy (UTAUT Construct) | UTAUT dimension assessing the perceived ease of use, clarity of interaction, and learnability of the AURORA interface ($\mu = 4.86$). |
| **ERD** | Entity-Relationship Diagram | Structural data model mapping primary-key and foreign-key relationships across AURORA’s 20 normalized PostgreSQL tables. |
| **FC** | Facilitating Conditions (UTAUT Construct) | UTAUT dimension measuring device compatibility, user knowledge readiness, and built-in troubleshooting support ($\mu = 4.85$). |
| **FIPS 180-4** | Federal Information Processing Standard 180-4 | Official cryptographic standard specifying the SHA-256 secure hash algorithm used for manuscript version fingerprinting and backup verification. |
| **Good & Scates** | Good and Scates (1972) Validation Criteria | Standardized 6-criterion evaluation scale used by expert validators to establish content validity of the survey instrument ($\mu = 4.89$). |
| **HTML5 Canvas** | HTML5 2D Rendering Context API | Browser graphics API powering AURORA’s interactive electronic signature pad and normalized PDF coordinate bounding-box overlays. |
| **Hydration** | React Client-Side DOM Hydration | Process in Next.js 16 where server-rendered HTML markup is seamlessly attached to interactive client-side React 19 event listeners without layout shift. |
| **ISO 9001:2015** | Quality Management Systems Standard | International quality management framework under which Partido State University’s administrative and academic processes are certified. |
| **ISO/IEC 25010** | Systems and Software Quality Requirements (SQuaRE) | International software engineering benchmark evaluating Functional Suitability, Performance Efficiency, Usability, Reliability, Security, and Maintainability. |
| **JWT** | JSON Web Token (RFC 7519) | Cryptographically signed, HTTP-only session token carrying authenticated user identity and role claims across Next.js Edge Middleware and Supabase. |
| **Next.js (v16)** | React Full-Stack Web Application Framework | Production framework utilizing the App Router, React Server Components (RSC), Server Actions, and Turbopack bundler. |
| **Non-Repudiation** | Cryptographic Assurance of Authorship | Legal and technical guarantee under RA 8792 that an evaluator cannot deny signing a locked score sheet once authenticated and hashed. |
| **NPC Circular 16-01** | National Privacy Commission Circular No. 16-01 | Philippine regulatory directive mandating security measures, encrypted backups, and disaster recovery protocols for government data systems. |
| **ParSU** | Partido State University | The state university in Goa, Camarines Sur, Philippines, serving as the deployment host and beneficiary of the AURORA platform. |
| **PDF.js** | Mozilla HTML5 Vector PDF Rendering Engine | Open-source library integrated into AURORA’s left workspace pane to render manuscripts and capture percentage-based annotation coordinates. |
| **PE** | Performance Expectancy (UTAUT Construct) | UTAUT dimension measuring the degree to which users believe AURORA improves defense workflow productivity and efficiency ($\mu = 4.88$). |
| **PITR** | Point-in-Time Recovery | Database disaster recovery capability utilizing continuous Write-Ahead Logging (WAL) to restore PostgreSQL state to any exact historical second. |
| **PostgreSQL 15** | Object-Relational Database Management System | Enterprise ACID-compliant database engine powering AURORA’s relational schema, stored procedures, and Row-Level Security policies. |
| **RA 8792** | Republic Act No. 8792 (Electronic Commerce Act of 2000) | Philippine statute granting legal validity, admissibility, and enforceability to electronic documents and cryptographically verified digital signatures. |
| **RA 10173** | Republic Act No. 10173 (Data Privacy Act of 2012) | Philippine law governing the lawful collection, processing, access restriction, and confidential protection of personal and academic records. |
| **RBAC** | Role-Based Access Control | Security architecture restricting routes and actions across AURORA’s six institutional roles (`student`, `adviser`, `panelist`, `coordinator`, `college_dean`, `sys_admin`). |
| **RLS** | Row-Level Security | PostgreSQL kernel-level security mechanism enforcing fine-grained SQL policies on every `SELECT`, `INSERT`, `UPDATE`, and `DELETE` query. |
| **RPO** | Recovery Point Objective | Maximum tolerable age of data that could be lost during a catastrophic incident ($\le 24\text{ hours}$ via snapshots; near-zero via WAL PITR). |
| **RTO** | Recovery Time Objective | Maximum targeted duration required to restore full system availability following a hardware or cloud outage ($\le 4\text{ hours}$ for DB; $\le 15\text{ mins}$ for edge failover). |
| **Server Actions** | Next.js Server-Side Asynchronous RPC Functions | Type-safe `"use server"` functions in AURORA that execute privileged database mutations, conflict checks, and SHA-256 hashing securely on the server. |
| **SHA-256** | Secure Hash Algorithm (256-bit) | One-way cryptographic function producing deterministic 64-character hexadecimal digests for PDF manuscripts, e-signatures, and DR backup archives. |
| **SI** | Social Influence (UTAUT Construct) | UTAUT dimension evaluating peer, faculty, and university administrative support for adopting the AURORA platform ($\mu = 4.81$). |
| **SQL** | Structured Query Language | Standardized query language used to define tables, triggers, RPC functions (`generate_certificate_serial`), and security policies in PostgreSQL. |
| **SRS** | Software Requirements Specification | Formal engineering specification in Annex F enumerating AURORA’s 22 Functional Requirements (`FR-01` to `FR-22`) and 6 Non-Functional Requirements (`NFR-01` to `NFR-06`). |
| **SSR** | Server-Side Rendering | Rendering strategy where Next.js pre-renders initial route layouts on the server for fast First Contentful Paint (FCP) before client-side React hydration. |
| **Supabase** | Open-Source Firebase Alternative (PostgreSQL BaaS) | Managed cloud backend platform providing AURORA’s PostgreSQL 15 database, authentication service, private S3 storage buckets, and realtime engine. |
| **SUS** | System Usability Scale (Brooke, 1996) | Standardized 10-item alternating Likert instrument yielding a 0–100 composite usability score (AURORA achieved **91.8 / 100**, Grade A — Excellent). |
| **Tailwind CSS v4** | Utility-First CSS Design Framework | Styling engine implementing ParSU Maroon (`#800000`) and Gold (`#DAA520`) design tokens and responsive 12-column split-screen viewports. |
| **TLS 1.3** | Transport Layer Security (Version 1.3) | Cryptographic transport protocol encrypting all HTTPS traffic and WebSocket channels between client browsers and AURORA cloud servers. |
| **Turnitin** | Originality & Plagiarism Verification Service | Institutional similarity screening tool integrated into the Form DCS-CF-03 prerequisite checklist ($\le 20\%$ similarity threshold). |
| **UAT** | User Acceptance Testing | Formal empirical validation conducted with 27 ParSU CECS stakeholders (students, advisers, panelists, coordinator, and dean) prior to turnover. |
| **UB** | Use Behavior (UTAUT Construct) | UTAUT dimension measuring actual usage frequency, positive user attitude, and preference for AURORA over paper-based defense workflows ($\mu = 4.87$). |
| **UI/UX** | User Interface / User Experience | Visual ergonomics, information architecture, and interaction design governing AURORA’s role-specific dashboards and dual-pane review workspace. |
| **UTAUT** | Unified Theory of Acceptance and Use of Technology | Theoretical model by Venkatesh et al. (2003) adopted in Objective 4 to evaluate AURORA across PE, EE, SI, FC, BI, and UB constructs (Grand Mean = **4.86 / 5.00**). |
| **UUID** | Universally Unique Identifier (128-bit / RFC 4122) | Non-sequential primary key identifier used across all AURORA database records to prevent ID enumeration attacks. |
| **Vercel** | Cloud Edge Application Hosting Platform | Serverless deployment network hosting AURORA’s Next.js 16 frontend and edge middleware with automatic global CDN caching and instant rollback. |
| **WAL** | Write-Ahead Logging | PostgreSQL transaction logging mechanism guaranteeing ACID durability, real-time WebSocket replication, and Point-in-Time Recovery (PITR). |
| **WBS** | Work Breakdown Structure | Hierarchical decomposition of the AURORA project into 7 major engineering phases and deliverable work packages (Annex D.2). |
| **WebSocket (WSS)** | Secure Full-Duplex WebSocket Protocol | Persistent encrypted connection enabling real-time synchronization of inline PDF annotations and live defense evaluation scores across panel members. |
| **XSS** | Cross-Site Scripting | Client-side injection vulnerability neutralized in AURORA via React automatic DOM escaping, strict TypeScript validation, and HTTP Content Security Policies. |

*Summary Note:* All 64 technical terms, acronyms, legal statutes, and psychometric constructs defined in this glossary correspond directly to the architectural implementation and empirical evaluation presented in Chapters 1 through 5 and Annexes A through K of the AURORA Capstone Manuscript.
