"use server";

import crypto from "crypto";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { currentAcademicYear } from "@/lib/utils/academic-year";
import { recordWorkflowTransition } from "@/lib/workflow/history";
import { emitNotification } from "@/lib/notifications/emit";

export interface SignEvaluationInput {
  evaluationId: string;
  signatureType: "drawn" | "typed" | "uploaded";
  signatureImage: string;
  printedName: string;
  positionRole: string;
  scores: Record<string, number>;
  verdictCode: string;
  panelNotes: string;
  recommendations: string;
}

/**
 * Digitally signs and submits an evaluation score sheet
 */
export async function signEvaluationAction(input: SignEvaluationInput) {
  const supabase = await createClient();
  const headersList = await headers();
  const ip = headersList.get("x-forwarded-for")?.split(",")[0] || "127.0.0.1";
  const userAgent = headersList.get("user-agent") || "unknown";

  // 1. Authenticate user (secure — uses getUser() not getSession())
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) {
    throw new Error("Unauthorized. Please sign in again.");
  }
  const userId = user.id;

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
      const { error: uploadErr } = await supabase.storage
        .from("signatures")
        .upload(storagePath, buffer, { contentType: "image/png", cacheControl: "3600", upsert: false });
      if (!uploadErr) signatureStoragePath = storagePath;
      else console.error("[signEvaluationAction] Storage upload failed:", uploadErr.message);
    } catch (uploadEx: unknown) {
      console.error("[signEvaluationAction] Storage exception:", uploadEx instanceof Error ? uploadEx.message : uploadEx);
    }
  }

  // 5. Build deterministic signing payload + SHA-256 hash
  const signingPayload = {
    evaluationId: input.evaluationId,
    projectId: currentEval.project_id,
    stageId: currentEval.stage_id,
    panelistId: userId,
    scores: input.scores,
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

  // 6. Update Evaluation Record — server is authoritative
  const { data: updatedEval, error: updateError } = await supabase
    .from("evaluations")
    .update({
      scores: input.scores,
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

  // 7. Create immutable digital_signatures record (Sprint 2D — non-blocking)
  try {
    const { error: sigErr } = await supabase
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
    if (sigErr) console.error("[signEvaluationAction] digital_signatures insert failed:", sigErr.message);
  } catch (dsEx: unknown) {
    console.error("[signEvaluationAction] digital_signatures exception:", dsEx instanceof Error ? dsEx.message : dsEx);
  }

  // 8. Insert audit log
  const { data: profile } = await supabase
    .from("profiles")
    .select("email")
    .eq("id", userId)
    .single();

  await supabase.from("audit_logs").insert({
    profile_id: userId,
    user_email: profile?.email ?? user.email ?? "unknown",
    user_role: "panelist",
    action_type: "GRADE",
    module: "grading",
    entity_type: "evaluations",
    entity_id: input.evaluationId,
    description: `Signed and submitted evaluation v${updatedEval.version} with certificate serial ${certificateSerial}`,
    new_value: {
      evaluation_id: input.evaluationId,
      version: updatedEval.version,
      certificate_serial: certificateSerial,
      signature_hash: payloadHash,
      total_score: updatedEval.total_score,
      verdict_code: input.verdictCode,
    },
    ip_address: ip,
    user_agent: userAgent,
    academic_year: currentAcademicYear(),
  });

  // 9. Fire evaluation event trigger
  await supabase.from("evaluation_events").insert({
    project_id: updatedEval.project_id,
    stage_id: updatedEval.stage_id,
    event_type: "evaluation_submitted",
    payload: {
      evaluation_id: input.evaluationId,
      total_score: updatedEval.total_score,
      rubric_template_id: updatedEval.rubric_template_id,
    },
  });

  // 10. Record workflow history (Sprint 2G — non-blocking)
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

  // 11. Notify coordinator (Sprint 2E — centralized dispatcher, non-blocking)
  try {
    const { data: projectMeta } = await supabase
      .from("projects")
      .select("coordinator_profile_id")
      .eq("id", currentEval.project_id)
      .maybeSingle();
    if (projectMeta?.coordinator_profile_id) {
      await emitNotification({
        supabase,
        recipientProfileId: projectMeta.coordinator_profile_id,
        title: "Evaluation Signed & Submitted",
        message: `A panel evaluator has signed an evaluation. Certificate: ${certificateSerial}.`,
        eventType: "evaluation_signed",
        metadata: { certificateSerial, evaluationId: input.evaluationId },
      });
    }
  } catch (notifEx: unknown) {
    console.error("[signEvaluationAction] Notification failed:", notifEx instanceof Error ? notifEx.message : notifEx);
  }

  return updatedEval;
}

/**
 * Creates a new evaluation version (v2, v3, etc.) copying values from previous version
 */
export async function createNewEvaluationVersionAction(projectId: string, stageId: string) {
  const supabase = await createClient();
  const headersList = await headers();
  const ip = headersList.get("x-forwarded-for")?.split(",")[0] || "127.0.0.1";
  const userAgent = headersList.get("user-agent") || "unknown";

  // 1. Authenticate user (secure — uses getUser() not getSession())
  const { data: { user }, error: sessionError } = await supabase.auth.getUser();
  if (sessionError || !user) {
    throw new Error("Unauthorized. Please sign in again.");
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
    throw new Error("No existing evaluation found to revise.");
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
    throw new Error(`Failed to create revised evaluation: ${insertError?.message}`);
  }

  // 4. Log audit event
  const { data: profile } = await supabase
    .from("profiles")
    .select("email")
    .eq("id", userId)
    .single();

  await supabase.from("audit_logs").insert({
    profile_id: userId,
    user_email: profile?.email || user.email || "unknown",
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
    academic_year: currentAcademicYear()
  });

  return newEval;
}
