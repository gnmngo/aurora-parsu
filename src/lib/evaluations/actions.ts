"use server";

import crypto from "crypto";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";

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
  const { data: { user }, error: sessionError } = await supabase.auth.getUser();
  if (sessionError || !user) {
    throw new Error("Unauthorized. Please sign in again.");
  }
  const userId = user.id;

  // 2. Fetch current evaluation record to verify ownership and check locked status
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

  // 3. Generate Certificate Serial (AURORA-YYYY-000001)
  const currentYear = new Date().getFullYear();
  const { count } = await supabase
    .from("evaluations")
    .select("id", { count: "exact", head: true })
    .eq("status", "submitted");

  const serialNum = String((count || 0) + 1).padStart(6, "0");
  const certificateSerial = `AURORA-${currentYear}-${serialNum}`;

  // 4. Generate SHA-256 Integrity Hash
  const scoresString = JSON.stringify(input.scores);
  const hashPayload = [
    input.evaluationId,
    scoresString,
    input.verdictCode,
    input.panelNotes,
    input.recommendations,
    input.printedName,
    input.positionRole,
    certificateSerial,
    userId
  ].join("|");

  const signatureHash = crypto
    .createHash("sha256")
    .update(hashPayload)
    .digest("hex");

  // 5. Update Evaluation Record (This triggers compute_evaluation_score)
  const { data: updatedEval, error: updateError } = await supabase
    .from("evaluations")
    .update({
      scores: input.scores,
      verdict_code: input.verdictCode,
      panel_notes: input.panelNotes,
      recommendations: input.recommendations,
      status: "submitted",
      signature_type: input.signatureType,
      signature_image: input.signatureImage,
      signature_hash: signatureHash,
      signed_at: new Date().toISOString(),
      verified: true,
      verified_by_system: true,
      certificate_serial: certificateSerial,
      ip_address: ip,
      user_agent: userAgent,
      device_info: {
        browser: userAgent,
        ip: ip
      }
    })
    .eq("id", input.evaluationId)
    .select()
    .single();

  if (updateError || !updatedEval) {
    throw new Error(`Failed to update evaluation score sheet: ${updateError?.message}`);
  }

  // 6. Insert audit log
  const { data: profile } = await supabase
    .from("profiles")
    .select("email")
    .eq("id", userId)
    .single();

  await supabase.from("audit_logs").insert({
    profile_id: userId,
    user_email: profile?.email || user.email || "unknown",
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
      signature_hash: signatureHash,
      total_score: updatedEval.total_score,
      verdict_code: input.verdictCode
    },
    ip_address: ip,
    user_agent: userAgent,
    academic_year: "2025-2026"
  });

  // 7. Fire evaluation event trigger
  await supabase.from("evaluation_events").insert({
    project_id: updatedEval.project_id,
    stage_id: updatedEval.stage_id,
    event_type: "evaluation_submitted",
    payload: {
      evaluation_id: input.evaluationId,
      total_score: updatedEval.total_score,
      rubric_template_id: updatedEval.rubric_template_id
    }
  });

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
    academic_year: "2025-2026"
  });

  return newEval;
}
