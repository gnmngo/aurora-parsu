# PARTIDO STATE UNIVERSITY
### College of Engineering and Computational Sciences
**Department of Computational Sciences | Bachelor of Science in Information Technology**  
*San Juan Bautista, Goa, Camarines Sur, Philippines 4422*  
*Website: www.parsu.edu.ph | Contact No.: (054) 871-2090 | ISO 9001:2015 Certified*

---

# ANNEX K: DEPLOYMENT & INFRASTRUCTURE
## Project: AURORA (Academic Unified Review, Observation, Rating, and Assessment System)

---

## K.1 HOSTING & SERVER SPECIFICATIONS

AURORA utilizes a modern, serverless cloud hosting topology designed for zero-maintenance academic institutions:

```text
+-------------------------------------------------------------------------------------------------------+
| TOPOLOGY TIER             | CLOUD PROVIDER / SERVICE       | REGION / SPECS & ATTRIBUTES              |
+-------------------------------------------------------------------------------------------------------+
| 1. Frontend & Edge Layer  | Vercel Cloud Platform          | Global Anycast Edge Network              |
|                           | Serverless Next.js Functions   | Auto-scaling Node.js 20.x runtime        |
+-------------------------------------------------------------------------------------------------------+
| 2. Backend & Auth Layer   | Supabase Managed Cloud         | AWS ap-southeast-1 (Singapore)           |
|                           | GoTrue Auth & Realtime Engine  | JWT Token Authentication / WebSocket bus |
+-------------------------------------------------------------------------------------------------------+
| 3. Relational Database    | PostgreSQL 15 Engine           | Multi-AZ Replication, Automated WAL      |
|                           | Supabase Cloud Compute         | Row-Level Security, Encrypted Data At Rest|
+-------------------------------------------------------------------------------------------------------+
| 4. Object Storage         | Supabase Storage (AWS S3)      | Buckets: /manuscripts (Private)          |
|                           |                                |          /signatures (Private)           |
+-------------------------------------------------------------------------------------------------------+
```

---

## K.2 DOMAIN, SSL & DNS CONFIGURATIONS

### 1. Domain Routing & Networking
- **Production URL:** `https://aurora-parsu.vercel.app`
- **DNS Provider:** Vercel Anycast DNS
- **Record Types:**
  - `CNAME aurora-parsu.vercel.app -> cname.vercel-dns.com`
  - `TXT _vercel -> vc-challenge-record`

### 2. Transport Layer Security (SSL/TLS)
- **Certificate Authority:** Let’s Encrypt Wildcard SSL
- **Protocols Supported:** TLS 1.3 (Primary), TLS 1.2 (Fallback)
- **Cipher Suites:** ECDHE-ECDSA-AES128-GCM-SHA256, ECDHE-RSA-AES256-GCM-SHA384
- **Security Headers Implemented:**
  - `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: SAMEORIGIN`
  - `Referrer-Policy: strict-origin-when-cross-origin`

---

## K.3 CI/CD PIPELINE & DEPLOYMENT SCRIPTS

AURORA leverages **GitHub Actions** for continuous integration and automated deployment directly to the Vercel production edge network.

### CI/CD Workflow Pipeline (`.github/workflows/ci.yml`):
1. **Trigger:** Every `git push` or `pull_request` to the `main` branch.
2. **Step 1: Environment Provisioning:** Spins up `ubuntu-latest` with Node.js 20.x and `pnpm`.
3. **Step 2: Dependency Verification:** Runs `pnpm install --frozen-lockfile` to ensure dependency lockfile determinism.
4. **Step 3: Quality Gates:**
   - ESLint and Next.js static checks (`pnpm run lint`)
   - Strict TypeScript compilation (`pnpm exec tsc --noEmit`)
5. **Step 4: Automated Testing:** Executes security isolation scripts (`scripts/test-adviser-panelist-separation.js` and `scripts/test-phase6-signature-immutability.js`).
6. **Step 5: Production Build:** Generates static assets and optimized serverless bundles via Next.js Turbopack (`pnpm run build`).
7. **Step 6: Vercel Production Deployment:** Automatically ships verified artifacts to `https://aurora-parsu.vercel.app`.
