# PARTIDO STATE UNIVERSITY
### College of Engineering and Computational Sciences
**Department of Computational Sciences | Bachelor of Science in Information Technology**  
*San Juan Bautista, Goa, Camarines Sur, Philippines 4422*  
*Website: www.parsu.edu.ph | Contact No.: (054) 871-2090 | ISO 9001:2015 Certified*

---

# ANNEX G: SOURCE CODE & REPOSITORY
## Project: AURORA (Academic Unified Review, Observation, Rating, and Assessment System)

```text
========================================================================================
Git Repository URL: https://github.com/gnmngo/aurora-parsu
Branch: main (Active Production)
Framework Stack: Next.js 16 + React 19 + TypeScript + Tailwind CSS v4 + Supabase
========================================================================================
```

---

## G.1 RELEVANT SOURCE CODE SNIPPETS

### G.1.1 Republic Act No. 8792 Step-Up Electronic Signature Certification
**Source Path:** `src/lib/evaluations/actions.ts`  
**Description:** Digitally locks an oral defense evaluation. Validates password re-authentication to guarantee non-repudiation under RA 8792, computes SHA-256 integrity hashes, and generates atomic certificate serial numbers.

```typescript
"use server";

import crypto from "crypto";
import { headers } from "next/headers";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { computeWeightedScore } from "@/lib/rubric/scoring";
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
  const ip = headersList.get("x-forwarded-for")?.split(",")[0] || "127.0.0.1";
  const userAgent = headersList.get("user-agent") || "unknown";

  // 1. Authenticate Active User Session
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) throw new Error("Unauthorized.");

  // 2. Step-Up Credential Re-Authentication (RA 8792 Legal Requirement)
  if (!input.password?.trim()) {
    throw new Error("Password re-authentication is required to certify your digital signature.");
  }

  const anonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "").trim().replace(/^["']|["']$/g, "");
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim();
  const authVerifier = createSupabaseClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { error: reAuthErr } = await authVerifier.auth.signInWithPassword({
    email: user.email!,
    password: input.password.trim(),
  });

  if (reAuthErr) {
    throw new Error("Password re-authentication failed. Signature rejected under RA 8792.");
  }

  // 3. Generate Sequential Certificate Serial
  const { data: serialData } = await supabase.rpc("generate_certificate_serial").single();
  const certificateSerial = serialData || `AURORA-${new Date().getFullYear()}-000001`;

  // 4. Deterministic Payload Hashing (SHA-256)
  const signedAt = new Date().toISOString();
  const payloadToHash = `${input.evaluationId}|${input.verdictCode}|${certificateSerial}|${signedAt}`;
  const certificateHash = crypto.createHash("sha256").update(payloadToHash).digest("hex");

  // 5. Commit Locked Evaluation
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

  if (updateError) throw new Error(`Commit failed: ${updateError.message}`);

  // 6. Record Audit Trail
  await emitAuditLog(supabase, {
    profile_id: user.id,
    user_email: user.email,
    user_role: "panelist",
    action_type: "SIGN",
    module: "evaluations",
    entity_type: "evaluations",
    entity_id: input.evaluationId,
    description: `Digitally signed evaluation with Serial ${certificateSerial}`,
    ip_address: ip,
    user_agent: userAgent,
  });

  return { success: true, evaluation: updatedEval };
}
```

---

### G.1.2 BSIT Dynamic Rubric Weighted Scoring Engine (Form DCS-CF-04)
**Source Path:** `src/lib/rubric/scoring.ts`  
**Description:** Computes quantitative weighted scores and verifies percentage balance.

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
**Description:** Prohibits advisers from evaluating their own advisees and blocks room double-booking.

```typescript
// 1. ACADEMIC CONFLICT OF INTEREST GUARD
if (adviserProfileId && input.panelistIds.includes(adviserProfileId)) {
  throw new Error(
    "Conflict of Interest Violation: Academic policy strictly prohibits an adviser from serving on the evaluation panel for their own advisee."
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
  throw new Error(`Room Conflict: ${input.room} is already booked during this timeslot.`);
}
```

---

## G.2 DATABASE SCHEMA SCRIPTS (SQL DDL)

**Consolidated Schema Script:** Located at [`docs/annexes/schema_ddl.sql`](file:///c:/Users/Acer/Projects/aurora-parsu/docs/annexes/schema_ddl.sql).  
Contains all core relational entities:
- `profiles`, `roles`, `user_roles`, `students`
- `stages`, `projects`, `project_members`
- `documents`, `document_versions`, `annotations`, `annotation_replies`
- `defense_schedules`, `defense_panels`, `defense_applications`
- `rubric_templates`, `evaluations`, `audit_logs`, `notifications`
- Atomic stored procedures: `generate_certificate_serial()`
- Row-Level Security (RLS) policies and sequence definitions
