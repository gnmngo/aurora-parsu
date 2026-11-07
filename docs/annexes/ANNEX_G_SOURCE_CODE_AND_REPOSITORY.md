# PARTIDO STATE UNIVERSITY
### College of Engineering and Computational Sciences
**Department of Computational Sciences | Bachelor of Science in Information Technology**  
*San Juan Bautista, Goa, Camarines Sur, Philippines 4422*  
*Website: www.parsu.edu.ph | Contact No.: (054) 871-2090 | ISO 9001:2015 Certified*

---

# ANNEX G: SOURCE CODE & REPOSITORY
## Project: AURORA (Academic Unified Review, Observation, Rating, and Assessment System)

- **Git Repository URL:** `https://github.com/gnmngo/aurora-parsu`
- **Production Branch:** `main` (Active Cloud Deployment on Vercel)
- **Framework Stack:** Next.js 16 (App Router) + React 19 + TypeScript + Tailwind CSS v4 + Supabase PostgreSQL 15

---

## G.1 RELEVANT SOURCE CODE SNIPPETS

### G.1.1 Republic Act No. 8792 Step-Up Electronic Signature Certification
**Source Path:** `src/lib/evaluations/actions.ts`  
**Description:** Digitally locks an oral defense evaluation. Validates step-up password re-authentication to guarantee non-repudiation under Republic Act No. 8792, computes deterministic FIPS 180-4 SHA-256 integrity hashes, and generates atomic certificate serial numbers (`AURORA-YYYY-NNNNNN`).

```typescript
"use server";

import crypto from "crypto";
import { headers } from "next/headers";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { emitAuditLog } from "@/lib/audit/log";

export interface SignEvaluationInput {
  evaluationId: string;
  signatureType: "drawn" | "typed" | "uploaded";
  signatureImage: string;
  printedName: string;
  positionRole: string;
  password?: string;
  scores: Record<string, number>;
  verdictCode: string;
  panelNotes: string;
  recommendations: string;
  totalScore?: number;
}

export async function signEvaluationAction(input: SignEvaluationInput) {
  const supabase = await createClient();
  const headersList = await headers();
  const forwardedFor = headersList.get("x-forwarded-for") || "127.0.0.1";
  const ip = forwardedFor.split(",")[0].trim();
  const userAgent = headersList.get("user-agent") || "unknown";

  // 1. Authenticate Active User Session
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) {
    throw new Error("Unauthorized session.");
  }

  // 2. Step-Up Credential Re-Authentication (RA 8792 Legal Requirement)
  if (!input.password?.trim()) {
    throw new Error("Password re-authentication is required under RA 8792.");
  }

  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim();
  const anonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "").trim();
  const authVerifier = createSupabaseClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { error: reAuthErr } = await authVerifier.auth.signInWithPassword({
    email: user.email!,
    password: input.password.trim(),
  });

  if (reAuthErr) {
    throw new Error("Password re-authentication failed. Signature rejected.");
  }

  // 3. Generate Sequential Certificate Serial (AURORA-YYYY-NNNNNN)
  const { data: serialData } = await supabase
    .rpc("generate_certificate_serial")
    .single();
  const year = new Date().getFullYear();
  const certificateSerial = serialData || `AURORA-${year}-000001`;

  // 4. Deterministic Payload Hashing (FIPS 180-4 SHA-256)
  const signedAt = new Date().toISOString();
  const payload = [
    input.evaluationId,
    input.verdictCode,
    certificateSerial,
    signedAt,
  ].join("|");
  const certificateHash = crypto
    .createHash("sha256")
    .update(payload)
    .digest("hex");

  // 5. Commit Irreversibly Locked Evaluation Record
  const { data: updatedEval, error: updateError } = await supabase
    .from("evaluations")
    .update({
      scores: input.scores,
      total_score: input.totalScore,
      weighted_score: input.totalScore,
      verdict_code: input.verdictCode,
      panel_notes: input.panelNotes,
      recommendations: input.recommendations,
      signature_hash: certificateHash,
      certificate_serial: certificateSerial,
      status: "submitted",
      signed_at: signedAt,
    })
    .eq("id", input.evaluationId)
    .select()
    .single();

  if (updateError) {
    throw new Error(`Evaluation commit failed: ${updateError.message}`);
  }

  // 6. Append Non-Repudiation Entry to Immutable Audit Trail
  await emitAuditLog(supabase, {
    profile_id: user.id,
    user_email: user.email,
    user_role: "panelist",
    action_type: "SIGN",
    module: "evaluations",
    entity_type: "evaluations",
    entity_id: input.evaluationId,
    description: `Digitally signed evaluation (${certificateSerial})`,
    ip_address: ip,
    user_agent: userAgent,
  });

  return { success: true, evaluation: updatedEval };
}
```

---

### G.1.2 BSIT Dynamic Rubric Weighted Scoring Engine (Form DCS-CF-04)
**Source Path:** `src/lib/rubric/scoring.ts`  
**Description:** Computes quantitative weighted scores across dynamic rubric criteria and validates that criterion weights sum to $100\%$.

```typescript
export interface RubricCriterion {
  id?: string;
  name: string;
  weight: number;
}

export function computeWeightedScore(
  criteria: RubricCriterion[],
  scores: Record<string, number>
): number {
  if (!criteria.length) return 0;

  const total = criteria.reduce((sum, criterion) => {
    const key = criterion.id || criterion.name;
    const score = scores[key] ?? 0;
    const weight = Number(criterion.weight || 0);
    return sum + (score * weight) / 100;
  }, 0);

  return Number(total.toFixed(2));
}

export function validateCriteriaWeights(criteria: RubricCriterion[]): {
  valid: boolean;
  total: number;
} {
  const total = criteria.reduce((sum, c) => sum + Number(c.weight || 0), 0);
  return { valid: total >= 99.9 && total <= 100.1, total };
}
```

---

### G.1.3 Academic Conflict-of-Interest & Room Conflict Guard
**Source Path:** `src/lib/scheduler/actions.ts`  
**Description:** Enforces institutional impartiality by prohibiting a project's Research Adviser (**Prof. Froiland B. Peñalosa**) from sitting on the evaluation panel for their own advisee, and blocks overlapping room bookings.

```typescript
// 1. ACADEMIC CONFLICT OF INTEREST FIREWALL
if (adviserProfileId && input.panelistIds.includes(adviserProfileId)) {
  throw new Error(
    "Conflict of Interest Violation: Academic policy prohibits an adviser " +
    "from serving on the evaluation panel for their own advisee."
  );
}

// 2. VENUE / ROOM COLLISION DETECTION
const { data: roomConflict } = await supabase
  .from("defense_schedules")
  .select("room, projects(title)")
  .eq("room", input.room)
  .neq("status", "cancelled")
  .lt("scheduled_at", endTimeISO)
  .gt("end_at", startTimeISO)
  .maybeSingle();

if (roomConflict) {
  throw new Error(
    `Room Conflict: ${input.room} is already booked during this timeslot.`
  );
}
```

---

## G.2 DATABASE SCHEMA SCRIPTS (SQL DDL)

**Source Path:** `docs/annexes/schema_ddl.sql`  
**Description:** Excerpt of the core PostgreSQL 15 Data Definition Language (DDL) script defining the `evaluations` table, atomic certificate serial generator (`generate_certificate_serial`), and Row-Level Security (RLS) immutability policies.

```sql
-- 1. Atomic Sequence & Stored Procedure for Certificate Serials
CREATE SEQUENCE IF NOT EXISTS certificate_serial_seq START 1;

CREATE OR REPLACE FUNCTION public.generate_certificate_serial()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  seq_val bigint;
  yr text;
BEGIN
  seq_val := nextval('certificate_serial_seq');
  yr := to_char(CURRENT_DATE, 'YYYY');
  RETURN 'AURORA-' || yr || '-' || lpad(seq_val::text, 6, '0');
END;
$$;

-- 2. Evaluations Table with Cryptographic Signature Lock
CREATE TABLE IF NOT EXISTS public.evaluations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id uuid NOT NULL REFERENCES public.defense_schedules(id) ON DELETE CASCADE,
  panelist_id uuid NOT NULL REFERENCES public.profiles(id),
  scores jsonb NOT NULL DEFAULT '{}'::jsonb,
  total_score numeric(5,2),
  weighted_score numeric(5,2),
  verdict_code text,
  panel_notes text,
  recommendations text,
  signature_hash text,
  certificate_serial text UNIQUE,
  status text NOT NULL DEFAULT 'draft',
  signed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Row-Level Security (RLS): Prevent Tampering Once Signed
ALTER TABLE public.evaluations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Prevent mutation of signed evaluations"
  ON public.evaluations
  FOR UPDATE
  USING (auth.uid() = panelist_id AND status <> 'submitted')
  WITH CHECK (auth.uid() = panelist_id);
```

*Repository Verification:* The complete 20-table relational schema (`profiles`, `roles`, `user_roles`, `students`, `colleges`, `workflow_templates`, `defense_stages`, `projects`, `project_members`, `documents`, `document_versions`, `annotations`, `annotation_replies`, `defense_applications`, `defense_schedules`, `defense_panels`, `rubric_templates`, `evaluations`, `iso_evaluations`, `audit_logs`, and `notifications`) is maintained in `docs/annexes/schema_ddl.sql`.
