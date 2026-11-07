# PARTIDO STATE UNIVERSITY
### College of Engineering and Computational Sciences
**Department of Computational Sciences | Bachelor of Science in Information Technology**  
*San Juan Bautista, Goa, Camarines Sur, Philippines 4422*  
*Website: www.parsu.edu.ph | Contact No.: (054) 871-2090 | ISO 9001:2015 Certified*

---

# ANNEX K: DEPLOYMENT & INFRASTRUCTURE
## Project: AURORA: Paperless Academic Defense Workflow System for Research, Capstone, Thesis & Dissertation Papers at Partido State University

---

## K.1 HOSTING & SERVER SPECIFICATIONS

AURORA utilizes a high-availability, serverless cloud hosting topology engineered for zero-maintenance operation across academic semesters at Partido State University:

| Topology Tier | Cloud Provider / Service | Region / Runtime Specifications | Key Security & Availability Attributes |
| :--- | :--- | :--- | :--- |
| **1. Frontend & Edge Layer** | **Vercel Cloud Platform** | Global Anycast Edge Network; Serverless Node.js 20.x Runtime | Automatic TLS 1.3 termination, DDoS mitigation, instant atomic deployment rollback, $\ge 99.9\%$ SLA. |
| **2. Backend & Auth Layer** | **Supabase Managed Cloud** | AWS `ap-southeast-1` (Singapore); GoTrue Auth & Realtime Engine | HTTP-only JWT session cookies, bcrypt password hashing, RA 8792 step-up re-authentication, WSS bus. |
| **3. Relational Database** | **PostgreSQL 15 Engine** | Multi-AZ Cloud Compute; Automated Write-Ahead Logging (WAL) | Kernel-level Row-Level Security (RLS) across all 20 tables, AES-256 encryption at rest, daily snapshots & PITR. |
| **4. Object Storage Vault** | **Supabase Storage (AWS S3)** | Private Buckets: `/manuscripts`, `/signatures`, `/certificates` | Signed time-limited access URLs, FIPS 180-4 SHA-256 file checksum verification, 50 MB PDF upload guard. |

---

## K.2 DOMAIN, SSL & DNS CONFIGURATIONS

### 1. Domain Routing & Networking
- **Production URL:** `https://aurora-parsu.vercel.app`
- **DNS Provider:** Vercel Anycast DNS
- **DNS Records:**
  - `CNAME aurora-parsu.vercel.app -> cname.vercel-dns.com`
  - `TXT _vercel -> vc-domain-verification-record`

### 2. Transport Layer Security (SSL/TLS)
- **Certificate Authority:** Let’s Encrypt Automated SSL/TLS Authority
- **Protocols Supported:** TLS 1.3 (Primary), TLS 1.2 (Fallback)
- **Cipher Suites:** `TLS_AES_256_GCM_SHA384`, `ECDHE-ECDSA-AES128-GCM-SHA256`
- **HTTP Security Headers Enforced:**
  - `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: SAMEORIGIN`
  - `Referrer-Policy: strict-origin-when-cross-origin`

---

## K.3 CI/CD PIPELINE & DEPLOYMENT SCRIPTS

AURORA leverages **GitHub Actions** and **Vercel Git Integration** for continuous integration and automated deployment directly to the production edge network.

### Automated CI/CD Workflow Pipeline:
1. **Trigger Event:** Every `git push` or `pull_request` targeting the `main` production branch at `https://github.com/gnmngo/aurora-parsu`.
2. **Step 1 — Environment Provisioning:** Spins up an isolated `ubuntu-latest` build container with Node.js 20.x and `pnpm`.
3. **Step 2 — Dependency Verification:** Executes `pnpm install --frozen-lockfile` to guarantee deterministic package resolution.
4. **Step 3 — Static Quality Gates:**
   - ESLint and Next.js static analysis (`pnpm run lint`)
   - Strict TypeScript type checking (`pnpm exec tsc --noEmit`)
5. **Step 4 — Automated Security & Workflow Verification:** Executes integration checks verifying Adviser-Panelist Conflict-of-Interest isolation and RA 8792 signature immutability.
6. **Step 5 — Production Build Compilation:** Compiles optimized server components, client bundles, and server actions via Next.js 16 Turbopack (`pnpm run build`).
7. **Step 6 — Atomic Edge Deployment:** Publishes verified build artifacts to `https://aurora-parsu.vercel.app` with zero downtime.
