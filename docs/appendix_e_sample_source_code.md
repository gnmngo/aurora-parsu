# PARTIDO STATE UNIVERSITY
### College of Engineering and Computational Sciences
**Department of Computational Sciences | Bachelor of Science in Information Technology**  
*San Juan Bautista, Goa, Camarines Sur, Philippines 4422*  
*Website: www.parsu.edu.ph | Contact No.: (054) 871-2090 | ISO 9001:2015 Certified*

---

# APPENDIX E: SAMPLE SOURCE CODE
## AURORA: Academic Unified Review, Observation, Rating, and Assessment System
### Core Algorithmic, Security, Workflow, and Evaluation Modules

```
========================================================================================
                                     AURORA
            Academic Unified Review, Observation, Rating, and Assessment
                 Paperless Capstone Defense Management Platform
========================================================================================
Project Proponents:
  Mañago, Gene Vincent | Castillo, Carol Ann | Buenafe, Rona Mae | Encinas, Lara Mae
Adviser: Pablo Job | Capstone Coordinator: Dr. Kennedy C. Cuya
Department of Computational Sciences, College of Engineering and Computational Sciences
Partido State University
========================================================================================
```

---

## TABLE OF CONTENTS — APPENDIX E

| Section | Module Title | Source Path | Key Functional Contribution |
| :--- | :--- | :--- | :--- |
| **E.1** | **RA 8792 Digital Signature & Cryptographic Scoring** | `src/lib/evaluations/actions.ts` | Step-up re-authentication, non-repudiation, SHA-256 certificate hashing, and evaluation locking. |
| **E.2** | **BSIT Rubric Weighted Scoring Engine (DCS-CF-04)** | `src/lib/rubric/scoring.ts` | Mathematical weighted scoring, weight sum validation, and dynamic threshold derivation. |
| **E.3** | **Defense Scheduler & Conflict-of-Interest Guard** | `src/lib/scheduler/actions.ts` | Timeslot clash prevention, venue booking, and adviser-panelist academic integrity isolation. |
| **E.4** | **Oral Defense Application & Gating (DCS-CF-03)** | `src/lib/defenses/application-actions.ts` | Requirement checklist validation, adviser endorsement certification, and chair approval routing. |
| **E.5** | **Coordinate-Based PDF Annotation Subsystem** | `src/lib/annotations/actions.ts` | Percentage-based page coordinate mapping, severity classification, and threaded reviewer replies. |
| **E.6** | **Centralized Notification & Immutable Audit Trail** | `src/lib/notifications/emit.ts` & `src/lib/audit/log.ts` | Non-blocking realtime event broadcasting and transactional compliance auditing. |

---

## APPENDIX E.1: REPUBLIC ACT NO. 8792 DIGITAL SIGNATURE & CRYPTOGRAPHIC VERIFICATION

**File Reference:** `src/lib/evaluations/actions.ts`  
**Description:** Implements digital finalization of Form DCS-CF-04. Complies with the Philippine Electronic Commerce Act (RA 8792) by requiring step-up password re-authentication before affixing legal electronic signatures. Generates cryptographic SHA-256 verification hashes and sequential certificate serial numbers (`AURORA-YYYY-NNNNNN`).

```typescript
"use server";

import crypto from "crypto";
import { headers } from "next/headers";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { recordWorkflowTransition } from "@/lib/workflow/history";
import { emitNotification } from "@/lib/notifications/emit";
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

/**
 * Digitally signs and locks an oral defense evaluation score sheet.
 * Enforces legal non-repudiation under RA 8792 via step-up re-authentication.
 */
export async function signEvaluationAction(input: SignEvaluationInput) {
  try {
    const supabase = await createClient();
    const headersList = await headers();
    const ip = headersList.get("x-forwarded-for")?.split(",")[0] || "127.0.0.1";
    const userAgent = headersList.get("user-agent") || "unknown";

    // 1. Authenticate Active User Session
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) {
      throw new Error("Unauthorized. Please sign in again.");
    }
    const userId = user.id;

    // 2. Step-Up Credential Re-Authentication (RA 8792 Legal Safeguard)
    if (!input.password || !input.password.trim()) {
      throw new Error("Password re-authentication is required to certify and affix your electronic signature.");
    }

    const anonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "").trim().replace(/^["']|["']$/g, "");
    const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim();
    const authVerifier = createSupabaseClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: reAuthData, error: reAuthErr } = await authVerifier.auth.signInWithPassword({
      email: user.email!,
      password: input.password.trim(),
    });

    if (reAuthErr || !reAuthData.user || reAuthData.user.id !== userId) {
      throw new Error(
        "Password re-authentication failed. Incorrect credentials. Signature certification denied under RA 8792."
      );
    }

    // 3. Fetch Evaluation Record and Verify Lock State
    const { data: currentEval, error: fetchError } = await supabase
      .from("evaluations")
      .select("*")
      .eq("id", input.evaluationId)
      .single();

    if (fetchError || !currentEval) {
      throw new Error("Evaluation record not found.");
    }

    if (currentEval.panelist_id !== userId) {
      throw new Error("Permission denied. You can only sign your own assigned evaluation.");
    }

    if (currentEval.status === "submitted") {
      throw new Error("This evaluation version is already signed and locked against modifications.");
    }

    // 4. Generate Unique Certificate Serial (Atomic DB Sequence with Fallback)
    let certificateSerial: string;
    try {
      const { data: serialData, error: seqErr } = await supabase
        .rpc("generate_certificate_serial")
        .single();
      if (seqErr || !serialData) throw new Error(seqErr?.message ?? "No serial");
      certificateSerial = serialData as string;
    } catch {
      const currentYear = new Date().getFullYear();
      const { count } = await supabase
        .from("evaluations")
        .select("id", { count: "exact", head: true })
        .eq("status", "submitted");
      const serialNum = String((count ?? 0) + 1).padStart(6, "0");
      certificateSerial = `AURORA-${currentYear}-${serialNum}`;
    }

    // 5. Upload Cryptographic Signature to Secure Storage (Never Base64 in DB)
    const signedAt = new Date().toISOString();
    let signatureStoragePath: string | null = null;

    if (input.signatureImage) {
      const base64Data = input.signatureImage.replace(/^data:image\/\w+;base64,/, "");
      const buffer = Buffer.from(base64Data, "base64");
      const year = new Date().getFullYear();
      const month = String(new Date().getMonth() + 1).padStart(2, "0");
      const storagePath = `${year}/${month}/${certificateSerial}-${input.signatureType}.png`;
      const storageClient = createServiceClient() || supabase;
      
      const { error: uploadErr } = await storageClient.storage
        .from("signatures")
        .upload(storagePath, buffer, { contentType: "image/png", upsert: true });
        
      if (!uploadErr) signatureStoragePath = storagePath;
    }

    // 6. Authoritative Score Computation
    let computedScore = input.totalScore || 0;
    if (currentEval.rubric_template_id) {
      const { data: rubric } = await supabase
        .from("rubric_templates")
        .select("criteria")
        .eq("id", currentEval.rubric_template_id)
        .maybeSingle();
      if (rubric?.criteria && Array.isArray(rubric.criteria)) {
        computedScore = computeWeightedScore(rubric.criteria, input.scores || {});
      }
    }

    // 7. Deterministic Payload Hashing (SHA-256)
    const signingPayload = {
      evaluationId: input.evaluationId,
      projectId: currentEval.project_id,
      stageId: currentEval.stage_id,
      panelistId: userId,
      scores: input.scores,
      totalScore: computedScore,
      verdictCode: input.verdictCode,
      certificateSerial,
      signedAt,
    };
    const payloadHash = crypto.createHash("sha256").update(JSON.stringify(signingPayload)).digest("hex");
    const certificateHash = crypto.createHash("sha256").update(`${certificateSerial}|${payloadHash}`).digest("hex");

    // 8. Commit Authoritative Evaluation Record
    const { data: updatedEval, error: updateError } = await supabase
      .from("evaluations")
      .update({
        scores: input.scores,
        total_score: computedScore,
        weighted_score: computedScore,
        verdict_code: input.verdictCode,
        panel_notes: input.panelNotes,
        recommendations: input.recommendations,
        signature_image: signatureStoragePath,
        signature_hash: certificateHash,
        certificate_serial: certificateSerial,
        status: "submitted",
        signed_at: signedAt,
        updated_at: signedAt,
      })
      .eq("id", input.evaluationId)
      .select()
      .single();

    if (updateError || !updatedEval) {
      throw new Error(`Failed to commit evaluation signature: ${updateError?.message}`);
    }

    // 9. Emit Non-Repudiation Audit Trail Log
    await emitAuditLog(supabase, {
      profile_id: userId,
      user_email: user.email,
      user_role: "panelist",
      action_type: "SIGN",
      module: "evaluations",
      entity_type: "evaluations",
      entity_id: input.evaluationId,
      description: `Digitally signed evaluation with Serial ${certificateSerial} (Verdict: ${input.verdictCode})`,
      new_value: { certificateSerial, totalScore: computedScore, verdict: input.verdictCode },
      ip_address: ip,
      user_agent: userAgent,
    });

    return { success: true, evaluation: updatedEval };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Digital signing failed";
    console.error("[signEvaluationAction] Error:", msg);
    return { success: false, error: msg };
  }
}
```

---

## APPENDIX E.2: BSIT RUBRIC WEIGHTED SCORING ENGINE (FORM DCS-CF-04)

**File Reference:** `src/lib/rubric/scoring.ts`  
**Description:** The mathematical foundation for evaluating oral defenses. Converts raw scores from panel evaluators into authoritative weighted ratings based on ParSU departmental rubrics.

```typescript
export interface RubricCriterion {
  id?: string;
  name: string;
  weight: number;
}

export interface RubricThresholds {
  passing_score?: number;
  excellent_score?: number;
  target_compliance_rate?: number;
  min_compliance_rate?: number;
  max_major_unresolved?: number;
}

/**
 * Computes authoritative weighted score from criteria weights and evaluator raw ratings.
 * Formula: Total Score = SUM((Score_i * Weight_i) / 100)
 */
export function computeWeightedScore(
  criteria: RubricCriterion[],
  scores: Record<string, number>
): number {
  if (!criteria.length) return 0;
  
  const calculatedTotal = criteria.reduce((sum, criterion) => {
    const key = criterion.id || criterion.name;
    const score = scores[key] ?? 0;
    const weight = Number(criterion.weight || 0);
    return sum + (score * weight) / 100;
  }, 0);

  return Number(calculatedTotal.toFixed(2));
}

/**
 * Maps quantitative score into standardized academic pass/fail thresholds.
 */
export function deriveScoreLabel(
  score: number,
  thresholds: RubricThresholds
): "excellent" | "passing" | "failing" {
  const passing = thresholds.passing_score ?? 75.0;
  const excellent = thresholds.excellent_score ?? 90.0;
  
  if (score >= excellent) return "excellent";
  if (score >= passing) return "passing";
  return "failing";
}

/**
 * Validates that criteria percentage distribution sums strictly to 100%.
 */
export function validateCriteriaWeights(criteria: RubricCriterion[]): {
  valid: boolean;
  total: number;
} {
  const total = criteria.reduce((sum, c) => sum + Number(c.weight || 0), 0);
  return { valid: total >= 99.9 && total <= 100.1, total };
}
```

---

## APPENDIX E.3: ORAL DEFENSE SCHEDULING ENGINE & ACADEMIC CONFLICT-OF-INTEREST GUARD

**File Reference:** `src/lib/scheduler/actions.ts`  
**Description:** Manages defense scheduling, room booking validation, panelist double-booking prevention, and automated enforcement of academic conflict-of-interest regulations.

```typescript
"use server";

import { createClient, createServiceClient } from "@/lib/supabase/server";
import { emitNotificationToMany } from "@/lib/notifications/emit";
import { emitAuditLog } from "@/lib/audit/log";

export interface CreateScheduleInput {
  projectId: string;
  stageId: string;
  scheduledAt: string; // ISO 8601 Timestamp
  durationMinutes: number;
  room: string;
  building: string;
  isOnline: boolean;
  meetingUrl?: string;
  panelistIds: string[]; // Panel member Profile UUIDs
  chairmanId?: string; // Designated Committee Chairperson UUID
}

/**
 * Schedules a defense deliberation session with automated conflict resolution.
 */
export async function createDefenseScheduleAction(input: CreateScheduleInput) {
  const supabase = await createClient();
  const serviceClient = createServiceClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized.");

  const startTime = new Date(input.scheduledAt);
  const endTime = new Date(startTime.getTime() + input.durationMinutes * 60 * 1000);
  const startTimeISO = startTime.toISOString();
  const endTimeISO = endTime.toISOString();

  // 1. Fetch Project and Assigned Research Adviser
  const { data: project } = await supabase
    .from("projects")
    .select("title, student_id, students(profile_id)")
    .eq("id", input.projectId)
    .single();

  if (!project) throw new Error("Project not found.");

  const { data: adviserMember } = await supabase
    .from("project_members")
    .select("profile_id, profiles!project_members_profile_id_fkey(first_name, last_name)")
    .eq("project_id", input.projectId)
    .eq("member_role", "adviser")
    .maybeSingle();

  const adviserProfileId = adviserMember?.profile_id;

  // 2. CONFLICT OF INTEREST GUARD:
  // Academic regulations strictly prohibit an adviser from evaluating their own advisee.
  if (adviserProfileId && input.panelistIds.includes(adviserProfileId)) {
    const prof = Array.isArray(adviserMember?.profiles) ? adviserMember.profiles[0] : adviserMember?.profiles;
    const adviserName = prof ? `${prof.first_name} ${prof.last_name}` : "The assigned research adviser";
    throw new Error(
      `Conflict of Interest Violation: ${adviserName} is the assigned research adviser for this project. Academic policy strictly prohibits an adviser from serving on the evaluation panel for their own advisee's defense.`
    );
  }

  // 3. VENUE / ROOM CONFLICT CHECK
  const { data: roomConflict } = await supabase
    .from("defense_schedules")
    .select("room, projects(title)")
    .eq("room", input.room)
    .neq("status", "cancelled")
    .lt("scheduled_at", endTimeISO)
    .gt("end_at", startTimeISO)
    .maybeSingle();

  if (roomConflict) {
    const title = (roomConflict as any)?.projects?.title || "another defense";
    throw new Error(`Room Conflict: ${input.room} is already booked for "${title}" during this timeslot.`);
  }

  // 4. PANELIST SCHEDULE OVERLAP CHECK
  if (input.panelistIds.length > 0) {
    const { data: activeSchedules } = await supabase
      .from("defense_schedules")
      .select("project_id")
      .neq("status", "cancelled")
      .lt("scheduled_at", endTimeISO)
      .gt("end_at", startTimeISO);

    if (activeSchedules && activeSchedules.length > 0) {
      const activeProjIds = activeSchedules.map((s) => s.project_id);
      const { data: conflictingPanels } = await supabase
        .from("defense_panels")
        .select("profile_id, profiles!defense_panels_profile_id_fkey(first_name, last_name)")
        .in("project_id", activeProjIds)
        .in("profile_id", input.panelistIds);

      if (conflictingPanels && conflictingPanels.length > 0) {
        const conf = conflictingPanels[0];
        const p = Array.isArray(conf.profiles) ? conf.profiles[0] : conf.profiles;
        throw new Error(`Panelist Conflict: Evaluator ${p?.first_name} ${p?.last_name} is already assigned to a concurrent defense.`);
      }
    }
  }

  // 5. Commit Defense Schedule Record
  const { data: newSchedule, error: schedError } = await supabase
    .from("defense_schedules")
    .insert({
      project_id: input.projectId,
      stage_id: input.stageId,
      scheduled_at: startTimeISO,
      end_at: endTimeISO,
      room: input.room,
      building: input.building,
      is_online: input.isOnline,
      meeting_url: input.meetingUrl,
      duration_minutes: input.durationMinutes,
      status: "scheduled",
      created_by: user.id,
    })
    .select()
    .single();

  if (schedError || !newSchedule) {
    throw new Error(`Failed to create defense schedule: ${schedError?.message}`);
  }

  // 6. Assign Evaluator Committee Panels (Roles: Chair vs. Member)
  const panelsToInsert = input.panelistIds.map((pid) => ({
    project_id: input.projectId,
    stage_id: input.stageId,
    profile_id: pid,
    panel_role: input.chairmanId ? (pid === input.chairmanId ? "chair" : "member") : "member",
    assigned_by: user.id,
  }));

  await supabase.from("defense_panels").insert(panelsToInsert);

  // 7. Transition Project State
  await serviceClient.from("projects").update({ status: "scheduled" }).eq("id", input.projectId);

  return newSchedule;
}
```

---

## APPENDIX E.4: ORAL DEFENSE APPLICATION & GATING WORKFLOW (FORM DCS-CF-03)

**File Reference:** `src/lib/defenses/application-actions.ts`  
**Description:** Manages the proponent's oral defense application filing, institutional checklist compliance, and adviser endorsement certifications.

```typescript
"use server";

import { createClient, createServiceClient } from "@/lib/supabase/server";
import { emitNotification } from "@/lib/notifications/emit";
import { emitAuditLog } from "@/lib/audit/log";
import { DefenseApplicationRequirements, AdviserCertification } from "@/types/database";

/**
 * Submits or updates an Application for Oral Defense (DCS-CF-03)
 */
export async function submitDefenseApplicationAction(input: {
  projectId: string;
  stageId: string;
  formCode?: string;
  requirements: DefenseApplicationRequirements;
  preferredDates?: Array<{ date: string; time?: string }>;
  notes?: string;
}) {
  try {
    const supabase = await createClient();
    const serviceClient = createServiceClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Unauthorized. Please log in." };

    // Resolve Student Record to Prevent Foreign Key Violations
    const { data: studentRecord } = await serviceClient
      .from("students")
      .select("id")
      .eq("profile_id", user.id)
      .maybeSingle();

    const { data: project } = await serviceClient
      .from("projects")
      .select("id, title, student_id, project_members(profile_id, member_role)")
      .eq("id", input.projectId)
      .single();

    if (!project) return { success: false, error: "Project not found." };

    const isMember =
      (studentRecord && project.student_id === studentRecord.id) ||
      project.student_id === user.id ||
      (project.project_members as any[])?.some((m) => m.profile_id === user.id);

    if (!isMember) {
      return { success: false, error: "Permission denied. You are not an enrolled member of this project." };
    }

    // Upsert Application Form
    const { data: application, error: upsertErr } = await serviceClient
      .from("defense_applications")
      .upsert(
        {
          project_id: input.projectId,
          stage_id: input.stageId,
          form_code: input.formCode || "DCS-CF-03",
          defense_type: "Oral Defense",
          requirements_checklist: input.requirements,
          preferred_dates: input.preferredDates || [],
          status: "submitted_by_student",
          notes: input.notes?.trim() || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "project_id,stage_id" }
      )
      .select("*")
      .single();

    if (upsertErr || !application) {
      throw new Error(`Failed to submit defense application: ${upsertErr?.message}`);
    }

    return { success: true, application };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Application filing failed";
    return { success: false, error: msg };
  }
}

/**
 * Adviser signs the Certification of Defense Readiness (DCS-CF-03)
 */
export async function certifyDefenseApplicationAction(input: {
  applicationId: string;
  remarks?: string;
  signatureUrl?: string;
}) {
  try {
    const supabase = await createClient();
    const serviceClient = createServiceClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Unauthorized." };

    const { data: profile } = await serviceClient
      .from("profiles")
      .select("first_name, last_name")
      .eq("id", user.id)
      .single();

    const adviserName = profile ? `${profile.first_name} ${profile.last_name}`.trim() : "Research Adviser";

    const certificationPayload: AdviserCertification = {
      certified_at: new Date().toISOString(),
      adviser_id: user.id,
      adviser_name: adviserName,
      signature_url: input.signatureUrl || undefined,
      remarks: input.remarks?.trim() || "Recommended for oral defense presentation.",
    };

    const { data: updatedApp, error: updateErr } = await serviceClient
      .from("defense_applications")
      .update({
        adviser_certification: certificationPayload,
        status: "certified_by_adviser",
        updated_at: new Date().toISOString(),
      })
      .eq("id", input.applicationId)
      .select("*, projects(id, title, student_id)")
      .single();

    if (updateErr || !updatedApp) throw new Error("Certification update failed.");

    return { success: true, application: updatedApp };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Certification failed";
    return { success: false, error: msg };
  }
}
```

---

## APPENDIX E.5: COORDINATE-BASED MANUSCRIPT PDF ANNOTATION SUBSYSTEM

**File Reference:** `src/lib/annotations/actions.ts`  
**Description:** Coordinates vector-rendered text highlight coordinates across client viewports and stores normalized coordinates for threaded multi-user manuscript critiques.

```typescript
"use server";

import { createClient } from "@/lib/supabase/server";

export interface CreateAnnotationInput {
  documentVersionId: string;
  pageNumber: number;
  highlightCoordinates: {
    left: number;   // Percentage offset (0-100%)
    top: number;    // Percentage offset (0-100%)
    width: number;  // Bounding box width percentage
    height: number; // Bounding box height percentage
  };
  selectedText?: string;
  comment: string;
  severity?: "minor" | "major" | "critical";
  rubricCriterionId?: string;
}

/**
 * Creates an inline markup annotation anchored to exact PDF coordinates.
 */
export async function createAnnotationAction(input: CreateAnnotationInput) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized.");

  const { data: newAnnotation, error } = await supabase
    .from("annotations")
    .insert({
      document_version_id: input.documentVersionId,
      profile_id: user.id,
      page_number: input.pageNumber,
      highlight_coordinates: input.highlightCoordinates,
      selected_text: input.selectedText || null,
      comment: input.comment.trim(),
      severity: input.severity || "minor",
      rubric_criterion_id: input.rubricCriterionId || null,
      status: "open",
    })
    .select("*, profiles(first_name, last_name, email)")
    .single();

  if (error || !newAnnotation) {
    throw new Error(`Failed to create annotation: ${error?.message}`);
  }

  return newAnnotation;
}

/**
 * Appends a threaded response to an existing annotation item.
 */
export async function createAnnotationReplyAction(annotationId: string, replyText: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized.");

  const { data: reply, error } = await supabase
    .from("annotation_replies")
    .insert({
      annotation_id: annotationId,
      profile_id: user.id,
      reply_text: replyText.trim(),
    })
    .select("*, profiles(first_name, last_name)")
    .single();

  if (error || !reply) {
    throw new Error(`Failed to record reply: ${error?.message}`);
  }

  return reply;
}
```

---

## APPENDIX E.6: CENTRALIZED NOTIFICATION & AUDIT TRAIL DISPATCHER

**File Reference:** `src/lib/notifications/emit.ts` & `src/lib/audit/log.ts`  
**Description:** High-reliability notification broadcaster and immutable transaction logging framework adhering to ISO/IEC 25010 operational traceability benchmarks.

```typescript
import type { SupabaseClient } from "@supabase/supabase-js";
import { createServiceClient } from "@/lib/supabase/server";

export interface AuditLogInput {
  profile_id?: string | null;
  user_email?: string;
  user_role?: string;
  action_type: string;
  module: string;
  entity_type: string;
  entity_id?: string | null;
  description: string;
  old_value?: unknown;
  new_value?: unknown;
  ip_address?: string;
  user_agent?: string;
}

/**
 * Writes an immutable transaction log to `audit_logs` without interrupting primary execution.
 */
export async function emitAuditLog(fallbackClient: SupabaseClient, input: AuditLogInput): Promise<void> {
  try {
    const serviceClient = createServiceClient();
    const client = serviceClient || fallbackClient;

    const payload = {
      profile_id: input.profile_id || null,
      user_email: input.user_email || "unknown",
      user_role: input.user_role || "authenticated",
      action_type: input.action_type,
      module: input.module,
      entity_type: input.entity_type,
      entity_id: input.entity_id || null,
      description: input.description,
      old_value: input.old_value,
      new_value: input.new_value,
      ip_address: input.ip_address || "127.0.0.1",
      user_agent: input.user_agent || "unknown",
      created_at: new Date().toISOString(),
    };

    await client.from("audit_logs").insert(payload);
  } catch (err: unknown) {
    console.warn("[emitAuditLog] Audit log notice (non-fatal):", err);
  }
}
```

---

```
========================================================================================
                          END OF APPENDIX E: SAMPLE SOURCE CODE
                         AURORA © 2026 PARTIDO STATE UNIVERSITY
========================================================================================
```
