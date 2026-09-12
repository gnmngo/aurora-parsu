"use server";

import crypto from "crypto";
import { headers } from "next/headers";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { currentAcademicYear } from "@/lib/utils/academic-year";
import { recordWorkflowTransition } from "@/lib/workflow/history";
import { emitNotification } from "@/lib/notifications/emit";
import { computeWeightedScore } from "@/lib/rubric/scoring";
import { emitAuditLog } from "@/lib/audit/log";

async function getSafeClientContext() {
  try {
    const headersList = await headers();
    const ip = headersList.get("x-forwarded-for")?.split(",")[0] || "127.0.0.1";
    const userAgent = headersList.get("user-agent") || "unknown";
    return { ip, userAgent };
  } catch {
    return { ip: "127.0.0.1", userAgent: "unknown" };
  }
}

export interface SaveEvaluationDraftInput {
  projectId: string;
  stageId: string;
  rubricTemplateId?: string | null;
  scores: Record<string, number>;
  verdictCode: string;
  panelNotes: string;
  recommendations: string;
  version?: number;
  totalScore?: number;
}

/**
 * Saves or updates a draft evaluation with authorization checks and score calculation
 */
export async function saveEvaluationDraftAction(input: SaveEvaluationDraftInput) {
  try {
    const supabase = await createClient();

    // 1. Authenticate user
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) {
      return { success: false, error: "Unauthorized. Please sign in again." };
    }
    const userId = user.id;

    // 2. Verify panelist authorization & role
    const { data: userRolesData } = await supabase
      .from("user_roles")
      .select("roles(code)")
      .eq("profile_id", userId);

    const roleCodes = (userRolesData as { roles: { code: string } | { code: string }[] | null }[])
      ?.map((ur) => { const r = Array.isArray(ur.roles) ? ur.roles[0] : ur.roles; return r?.code as string | undefined; })
      .filter(Boolean) ?? [];

    const isSysAdmin = roleCodes.includes("sys_admin");

    if (!isSysAdmin) {
      if (!roleCodes.includes("panelist")) {
        return { success: false, error: "Permission denied. Only faculty panel members can evaluate defenses." };
      }

      // Check defense_panels assignment
      const { data: panelAssignment } = await supabase
        .from("defense_panels")
        .select("id")
        .eq("project_id", input.projectId)
        .eq("profile_id", userId)
        .maybeSingle();

      if (!panelAssignment) {
        return { success: false, error: "Permission denied. You are not an assigned defense panelist for this project." };
      }

      // Check that user is not project adviser
      const { data: adviserMember } = await supabase
        .from("project_members")
        .select("id")
        .eq("project_id", input.projectId)
        .eq("profile_id", userId)
        .eq("member_role", "adviser")
        .maybeSingle();

      if (adviserMember) {
        return { success: false, error: "Academic integrity violation: The project adviser cannot evaluate their advisee's defense." };
      }
    }

    const version = input.version || 1;

    // 3. Check if existing version is already locked
    const { data: existingEval } = await supabase
      .from("evaluations")
      .select("id, status")
      .eq("project_id", input.projectId)
      .eq("panelist_id", userId)
      .eq("version", version)
      .maybeSingle();

    if (existingEval?.status === "submitted") {
      return { success: false, error: "This evaluation version is already signed and submitted. It is locked against modifications." };
    }

    // 4. Compute weighted score
    let computedScore = 0;
    if (input.rubricTemplateId) {
      const { data: rubric } = await supabase
        .from("rubric_templates")
        .select("criteria")
        .eq("id", input.rubricTemplateId)
        .maybeSingle();
      if (rubric?.criteria && Array.isArray(rubric.criteria) && rubric.criteria.length > 0) {
        computedScore = computeWeightedScore(rubric.criteria, input.scores);
      }
    }

    if (computedScore === 0 && input.scores) {
      const scoreVals = Object.values(input.scores).map(Number).filter((v) => !isNaN(v));
      if (scoreVals.length > 0) {
        computedScore = Number((scoreVals.reduce((a, b) => a + b, 0) / scoreVals.length).toFixed(2));
      }
    }

    if (computedScore === 0 && typeof input.totalScore === "number" && input.totalScore > 0) {
      computedScore = input.totalScore;
    }

    // 5. Save draft evaluation — update if exists, insert if new
    const evalPayload = {
      project_id: input.projectId,
      stage_id: input.stageId,
      panelist_id: userId,
      rubric_template_id: input.rubricTemplateId || null,
      status: "draft" as const,
      scores: input.scores,
      total_score: computedScore,
      weighted_score: computedScore,
      verdict_code: input.verdictCode,
      panel_notes: input.panelNotes,
      recommendations: input.recommendations,
      version: version,
    };

    let evalData: any = null;
    let evalError: any = null;

    if (existingEval?.id) {
      // Update the existing draft record
      const { data, error } = await supabase
        .from("evaluations")
        .update({
          rubric_template_id: evalPayload.rubric_template_id,
          scores: evalPayload.scores,
          total_score: evalPayload.total_score,
          weighted_score: evalPayload.weighted_score,
          verdict_code: evalPayload.verdict_code,
          panel_notes: evalPayload.panel_notes,
          recommendations: evalPayload.recommendations,
        })
        .eq("id", existingEval.id)
        .select()
        .single();
      evalData = data;
      evalError = error;
    } else {
      // Insert a new draft record
      const { data, error } = await supabase
        .from("evaluations")
        .insert(evalPayload)
        .select()
        .single();
      evalData = data;
      evalError = error;
    }

    if (evalError || !evalData) {
      return { success: false, error: `Failed to save evaluation draft: ${evalError?.message || "Unknown database error"}` };
    }

    return {
      success: true,
      evaluation: {
        id: evalData.id,
        project_id: evalData.project_id,
        stage_id: evalData.stage_id,
        panelist_id: evalData.panelist_id,
        rubric_template_id: evalData.rubric_template_id,
        status: evalData.status,
        scores: evalData.scores,
        total_score: evalData.total_score,
        weighted_score: evalData.weighted_score,
        verdict_code: evalData.verdict_code,
        panel_notes: evalData.panel_notes,
        recommendations: evalData.recommendations,
        version: evalData.version,
        created_at: evalData.created_at,
        updated_at: evalData.updated_at,
      },
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[saveEvaluationDraftAction] Unexpected error:", msg);
    return { success: false, error: msg };
  }
}

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
 * Digitally signs and submits an evaluation score sheet
 */
export async function signEvaluationAction(input: SignEvaluationInput) {
  try {
    const supabase = await createClient();
    const { ip, userAgent } = await getSafeClientContext();

  // 1. Authenticate user (secure — uses getUser() not getSession())
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) {
    throw new Error("Unauthorized. Please sign in again.");
  }
  const userId = user.id;

  // 1b. Step-Up Credential Re-Authentication (RA 8792 Legal Non-Repudiation)
  if (!input.password || !input.password.trim()) {
    throw new Error("Password re-authentication is required to certify and affix your electronic signature.");
  }

  // Defensively check password against Supabase Auth without mutating the active session
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
    throw new Error("Password re-authentication failed. Incorrect account password. Electronic signature authorization denied under Republic Act No. 8792.");
  }

  // 2. Fetch evaluation and verify ownership + lock status
  const { data: currentEval, error: fetchError } = await supabase
    .from("evaluations")
    .select("*")
    .eq("id", input.evaluationId)
    .single();

  if (fetchError || !currentEval) {
    throw new Error("Evaluation record not found.");
  }

  if (currentEval.panelist_id !== userId) {
    throw new Error("Permission denied. You can only sign your own evaluations.");
  }

  if (currentEval.status === "submitted") {
    throw new Error("This evaluation version is already signed and locked.");
  }

  // 2b. Verify panelist authorization & role
  const { data: userRolesData } = await supabase
    .from("user_roles")
    .select("roles(code)")
    .eq("profile_id", userId);

  const roleCodes = (userRolesData as { roles: { code: string } | { code: string }[] | null }[])
    ?.map((ur) => { const r = Array.isArray(ur.roles) ? ur.roles[0] : ur.roles; return r?.code as string | undefined; })
    .filter(Boolean) ?? [];

  const isSysAdmin = roleCodes.includes("sys_admin");

  if (!isSysAdmin) {
    if (!roleCodes.includes("panelist")) {
      throw new Error("Permission denied. Only faculty panel members can submit evaluations.");
    }

    // Check defense_panels assignment
    const { data: panelAssignment } = await supabase
      .from("defense_panels")
      .select("id")
      .eq("project_id", currentEval.project_id)
      .eq("profile_id", userId)
      .maybeSingle();

    if (!panelAssignment) {
      throw new Error("Permission denied. You are not an assigned defense panelist for this project.");
    }

    // Check that user is not the project adviser
    const { data: adviserMember } = await supabase
      .from("project_members")
      .select("id")
      .eq("project_id", currentEval.project_id)
      .eq("profile_id", userId)
      .eq("member_role", "adviser")
      .maybeSingle();

    if (adviserMember) {
      throw new Error("Academic integrity violation: The project adviser cannot serve as an evaluation panelist.");
    }
  }

  // 3. Generate certificate serial via DB sequence (atomic — no race condition)
  //    Falls back to COUNT-based serial if sequence not yet migrated
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

  // 4. Upload signature image to Supabase Storage — NEVER store base64 in DB
  const signedAt = new Date().toISOString();
  let signatureStoragePath: string | null = null;
  let signatureFileHash: string | null = null;

  if (input.signatureImage) {
    try {
      const base64Data = input.signatureImage.replace(/^data:image\/\w+;base64,/, "");
      const buffer = Buffer.from(base64Data, "base64");
      signatureFileHash = crypto.createHash("sha256").update(base64Data).digest("hex");
      const year = new Date().getFullYear();
      const month = String(new Date().getMonth() + 1).padStart(2, "0");
      const storagePath = `${year}/${month}/${certificateSerial}-${input.signatureType}.png`;
      const storageClient = createServiceClient() || supabase;
      const { error: uploadErr } = await storageClient.storage
        .from("signatures")
        .upload(storagePath, buffer, { contentType: "image/png", cacheControl: "3600", upsert: true });
      if (!uploadErr) signatureStoragePath = storagePath;
      else console.warn("[signEvaluationAction] Storage upload notice:", uploadErr.message);
    } catch (uploadEx: unknown) {
      console.warn("[signEvaluationAction] Storage exception:", uploadEx instanceof Error ? uploadEx.message : uploadEx);
    }
  }

  // 5. Authoritatively compute total and weighted score
  let computedScore = 0;
  if (currentEval.rubric_template_id) {
    const { data: rubric } = await supabase
      .from("rubric_templates")
      .select("criteria")
      .eq("id", currentEval.rubric_template_id)
      .maybeSingle();
    if (rubric?.criteria && Array.isArray(rubric.criteria) && rubric.criteria.length > 0) {
      computedScore = computeWeightedScore(rubric.criteria, input.scores);
    }
  }

  if (computedScore === 0 && input.scores) {
    const scoreVals = Object.values(input.scores).map(Number).filter((v) => !isNaN(v));
    if (scoreVals.length > 0) {
      computedScore = Number((scoreVals.reduce((a, b) => a + b, 0) / scoreVals.length).toFixed(2));
    }
  }

  if (computedScore === 0 && typeof input.totalScore === "number" && input.totalScore > 0) {
    computedScore = input.totalScore;
  }

  // 6. Build deterministic signing payload + SHA-256 hash
  const signingPayload = {
    evaluationId: input.evaluationId,
    projectId: currentEval.project_id,
    stageId: currentEval.stage_id,
    panelistId: userId,
    scores: input.scores,
    totalScore: computedScore,
    verdictCode: input.verdictCode,
    panelNotes: input.panelNotes,
    recommendations: input.recommendations,
    printedName: input.printedName,
    positionRole: input.positionRole,
    certificateSerial,
    signedAt,
  };
  const payloadJson = JSON.stringify(signingPayload, Object.keys(signingPayload).sort());
  const payloadHash = crypto.createHash("sha256").update(payloadJson, "utf8").digest("hex");
  const certificateHash = crypto.createHash("sha256").update(`${certificateSerial}|${payloadHash}`).digest("hex");

  // 6b. Ensure project status allows transition to submitted evaluation
  // If the project is currently 'scheduled', transition it to 'in_progress' so that
  // the academic workflow state machine validation trigger allows resolving to passed/revision_required
  const serviceClient = createServiceClient();
  if (serviceClient) {
    try {
      const { data: projectStatusCheck } = await serviceClient
        .from("projects")
        .select("status")
        .eq("id", currentEval.project_id)
        .maybeSingle();

      if (projectStatusCheck?.status === "scheduled") {
        await serviceClient
          .from("projects")
          .update({ status: "in_progress" })
          .eq("id", currentEval.project_id);
      }
    } catch (transErr) {
      console.warn("[signEvaluationAction] Transition to in_progress notice:", transErr);
    }
  }

  // 7. Update Evaluation Record — server is authoritative
  const { data: updatedEval, error: updateError } = await supabase
    .from("evaluations")
    .update({
      scores: input.scores,
      total_score: computedScore,
      weighted_score: computedScore,
      verdict_code: input.verdictCode,
      panel_notes: input.panelNotes,
      recommendations: input.recommendations,
      status: "submitted",
      signature_type: input.signatureType,
      // Store storage path only — never raw base64
      signature_image: signatureStoragePath,
      signature_hash: payloadHash,
      signed_at: signedAt,
      verified: true,
      verified_by_system: true,
      certificate_serial: certificateSerial,
      ip_address: ip,
      user_agent: userAgent,
      device_info: { browser: userAgent, ip, signatureType: input.signatureType },
    })
    .eq("id", input.evaluationId)
    .eq("panelist_id", userId)   // Ownership check in WHERE clause
    .select()
    .single();

  if (updateError || !updatedEval) {
    throw new Error(`Failed to update evaluation score sheet: ${updateError?.message}`);
  }

  // 8. Create immutable digital_signatures record (non-blocking)
  try {
    const dbClient = serviceClient || supabase;
    // Mark any existing active signature for this evaluation as superseded first
    await dbClient
      .from("digital_signatures")
      .update({ status: "superseded" })
      .eq("evaluation_id", input.evaluationId)
      .eq("status", "active");

    const { error: sigErr } = await dbClient
      .from("digital_signatures")
      .insert({
        evaluation_id: input.evaluationId,
        panelist_id: userId,
        certificate_serial: certificateSerial,
        payload_hash: payloadHash,
        certificate_hash: certificateHash,
        signature_hash: signatureFileHash,
        hash_algorithm: "SHA-256",
        signing_payload: signingPayload as unknown as Record<string, unknown>,
        signature_storage_path: signatureStoragePath,
        signed_at: signedAt,
        ip_address: ip,
        user_agent: userAgent,
        device_info: { signatureType: input.signatureType },
        status: "active",
      });
    if (sigErr) console.warn("[signEvaluationAction] digital_signatures insert notice:", sigErr.message);
  } catch (dsEx: unknown) {
    console.warn("[signEvaluationAction] digital_signatures exception:", dsEx instanceof Error ? dsEx.message : dsEx);
  }

  // 9. Insert audit log
  try {
    await emitAuditLog(supabase, {
      profile_id: userId,
      user_email: user.email || "unknown",
      user_role: "panelist",
      action_type: "SUBMIT",
      module: "grading",
      entity_type: "evaluations",
      entity_id: input.evaluationId,
      description: `Signed and submitted evaluation v${updatedEval.version} with certificate serial ${certificateSerial}`,
      new_value: {
        evaluation_id: input.evaluationId,
        version: updatedEval.version,
        certificate_serial: certificateSerial,
        signature_hash: payloadHash,
        total_score: computedScore,
        verdict_code: input.verdictCode,
        reauthentication_method: "password_verified",
      },
      ip_address: ip,
      user_agent: userAgent,
    });
  } catch (auditEx) {
    console.warn("[signEvaluationAction] Audit log exception (non-fatal):", auditEx);
  }

  // 10. Fire evaluation event trigger (non-blocking)
  try {
    const dbClient = serviceClient || supabase;
    await dbClient.from("evaluation_events").insert({
      project_id: updatedEval.project_id,
      stage_id: updatedEval.stage_id,
      event_type: "evaluation_submitted",
      payload: {
        evaluation_id: input.evaluationId,
        total_score: computedScore,
        rubric_template_id: updatedEval.rubric_template_id,
      },
    });
  } catch (evEx) {
    console.warn("[signEvaluationAction] evaluation_events notice:", evEx);
  }

  // 11. Record workflow history (non-blocking)
  try {
    await recordWorkflowTransition(supabase, {
      projectId: currentEval.project_id,
      fromStageId: currentEval.stage_id,
      toStageId: currentEval.stage_id,
      transitionedBy: userId,
      performedByRole: "panelist",
      transitionType: "manual",
      transitionReason: `Evaluation signed. Certificate: ${certificateSerial}`,
      oldStatus: "draft",
      newStatus: "submitted",
      metadata: { evaluationId: input.evaluationId, certificateSerial },
    });
  } catch (whEx) {
    console.warn("[signEvaluationAction] workflow transition notice:", whEx);
  }

  // 12. Notify student co-authors and committee (centralized dispatcher, non-blocking)
  try {
    const { data: projectMeta } = await supabase
      .from("projects")
      .select("student_id, title")
      .eq("id", currentEval.project_id)
      .maybeSingle();

    if (projectMeta?.student_id) {
      const { data: studentRecord } = await supabase
        .from("students")
        .select("profile_id")
        .eq("id", projectMeta.student_id)
        .maybeSingle();
      if (studentRecord?.profile_id) {
        await emitNotification({
          supabase,
          recipientProfileId: studentRecord.profile_id,
          title: "Defense Evaluation Signed",
          message: `A panelist has completed and digitally signed their evaluation for "${projectMeta.title || 'your defense'}".`,
          eventType: "grade_released",
          actionUrl: `/dashboard/grades`,
          metadata: { certificateSerial, evaluationId: input.evaluationId, projectId: currentEval.project_id },
        });
      }
    }
  } catch (notifEx: unknown) {
    console.warn("[signEvaluationAction] Notification notice:", notifEx instanceof Error ? notifEx.message : notifEx);
  }

    return {
      success: true,
      evaluation: {
        id: updatedEval.id,
        status: updatedEval.status,
        version: updatedEval.version,
        verdict_code: updatedEval.verdict_code,
        scores: updatedEval.scores,
        total_score: updatedEval.total_score,
        weighted_score: updatedEval.weighted_score,
        panel_notes: updatedEval.panel_notes,
        recommendations: updatedEval.recommendations,
        signed_at: updatedEval.signed_at,
        certificate_serial: updatedEval.certificate_serial,
      },
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[signEvaluationAction] Error:", msg);
    return { success: false, error: msg };
  }
}

/**
 * Creates a new evaluation version (v2, v3, etc.) copying values from previous version
 */
export async function createNewEvaluationVersionAction(projectId: string, stageId: string) {
  try {
    const supabase = await createClient();
    const { ip, userAgent } = await getSafeClientContext();

    // 1. Authenticate user (secure — uses getUser() not getSession())
    const { data: { user }, error: sessionError } = await supabase.auth.getUser();
    if (sessionError || !user) {
      return { success: false, error: "Unauthorized. Please sign in again." };
    }
    const userId = user.id;

    // 2. Fetch latest submitted evaluation version
    const { data: latestEval, error: fetchError } = await supabase
      .from("evaluations")
      .select("*")
      .eq("project_id", projectId)
      .eq("stage_id", stageId)
      .eq("panelist_id", userId)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (fetchError || !latestEval) {
      return { success: false, error: "No existing evaluation found to revise." };
    }

    const nextVersion = latestEval.version + 1;

    // 3. Insert new version record
    const { data: newEval, error: insertError } = await supabase
      .from("evaluations")
      .insert({
        project_id: projectId,
        stage_id: stageId,
        panelist_id: userId,
        rubric_template_id: latestEval.rubric_template_id,
        status: "draft",
        version: nextVersion,
        derived_from_version: latestEval.version,
        revision_reason: `Revision requested after version ${latestEval.version}`,
        scores: latestEval.scores || {},
        panel_notes: latestEval.panel_notes || "",
        recommendations: latestEval.recommendations || "",
        total_score: latestEval.total_score,
        weighted_score: latestEval.weighted_score,
        verdict_code: latestEval.verdict_code || "passed_minor"
      })
      .select()
      .single();

    if (insertError || !newEval) {
      return { success: false, error: `Failed to create revised evaluation: ${insertError?.message || "Unknown database error"}` };
    }

    // 4. Log audit event
    await emitAuditLog(supabase, {
      profile_id: userId,
      user_email: user.email || "unknown",
      user_role: "panelist",
      action_type: "CREATE",
      module: "grading",
      entity_type: "evaluations",
      entity_id: newEval.id,
      description: `Created new evaluation version v${nextVersion} derived from v${latestEval.version}`,
      new_value: {
        evaluation_id: newEval.id,
        version: nextVersion,
        derived_from: latestEval.version
      },
      ip_address: ip,
      user_agent: userAgent,
    });

    return {
      success: true,
      evaluation: {
        id: newEval.id,
        status: newEval.status,
        version: newEval.version,
        verdict_code: newEval.verdict_code,
        scores: newEval.scores,
        total_score: newEval.total_score,
        weighted_score: newEval.weighted_score,
        panel_notes: newEval.panel_notes,
        recommendations: newEval.recommendations,
      },
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[createNewEvaluationVersionAction] Error:", msg);
    return { success: false, error: msg };
  }
}
