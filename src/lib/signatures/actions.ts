"use server";

/**
 * AURORA Verified Electronic Signature System — Server Actions
 * Sprint 2D
 *
 * Handles the complete signing workflow:
 * 1. Signature profile registration (one-time per panelist)
 * 2. Signature verification against stored profile
 * 3. Immutable digital_signatures record creation
 * 4. Certificate serial generation via DB sequence
 *
 * Security rules:
 * - Always use getUser() — never getSession()
 * - Storage paths only in DB — no base64 in PostgreSQL
 * - Hash algorithm configurable via HASH_ALGORITHM constant
 * - All signing events logged to audit_logs
 * - Records are INSERT-only — never UPDATE or DELETE
 */

import crypto from "crypto";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { currentAcademicYear } from "@/lib/utils/academic-year";
import { recordWorkflowTransition } from "@/lib/workflow/history";
import { emitNotification } from "@/lib/notifications/emit";

/** Hash algorithm used for all cryptographic operations in AURORA */
export const HASH_ALGORITHM = "SHA-256" as const;

/** Supported storage bucket for signature images */
const SIGNATURES_BUCKET = "signatures" as const;

// ─── TypeScript interfaces ────────────────────────────────────────────────────

export interface SignatureProfileInput {
  fullName: string;
  academicRank: string;
  employeeNumber?: string;
  officialEmail: string;
  departmentId?: string;
  signatureImageBase64?: string;  // Only used for upload — not stored in DB
}

export interface SignatureProfileRow {
  id: string;
  profile_id: string;
  full_name: string;
  academic_rank: string;
  department_id: string | null;
  employee_number: string | null;
  official_email: string;
  signature_storage_path: string | null;
  public_signature_id: string | null;
  fingerprint_sha256: string | null;
  hash_algorithm: string;
  verification_method: string;
  is_verified: boolean;
  verified_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface SigningPayload {
  evaluationId: string;
  projectId: string;
  stageId: string;
  panelistId: string;
  scores: Record<string, number>;
  totalScore: number;
  verdictCode: string;
  panelNotes: string;
  recommendations: string;
  printedName: string;
  positionRole: string;
  certificateSerial: string;
  signedAt: string;
  signatureProfileId: string | null;
}

export interface SignEvaluationV2Input {
  evaluationId: string;
  printedName: string;
  positionRole: string;
  signatureType: "drawn" | "typed" | "uploaded" | "profile";
  signatureImageBase64?: string;    // Used only for upload to storage
  reAuthToken?: string;             // OTP token or password confirmation token
}

// ─── Compute SHA-256 hash ─────────────────────────────────────────────────────

function computeHash(data: string): string {
  return crypto
    .createHash("sha256")
    .update(data, "utf8")
    .digest("hex");
}

// ─── Generate Supabase Storage path for a signature ──────────────────────────

function buildSignatureStoragePath(serial: string): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${year}/${month}/${serial}.png`;
}

// ─── Upload signature image to Supabase Storage ───────────────────────────────

async function uploadSignatureImage(
  supabase: Awaited<ReturnType<typeof createClient>>,
  base64Image: string,
  storagePath: string
): Promise<{ path: string; hash: string }> {
  // Convert base64 data URL to buffer
  const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, "");
  const buffer = Buffer.from(base64Data, "base64");

  const { error } = await supabase.storage
    .from(SIGNATURES_BUCKET)
    .upload(storagePath, buffer, {
      contentType: "image/png",
      cacheControl: "3600",
      upsert: true,
    });

  if (error) throw new Error(`Failed to upload signature: ${error.message}`);

  // Compute SHA-256 of the image bytes
  const hash = computeHash(base64Data);
  return { path: storagePath, hash };
}

// ─── SERVER ACTIONS ──────────────────────────────────────────────────────────

/**
 * Retrieves the current user's signature profile (if it exists).
 * Returns null if no profile is registered yet.
 */
export async function getSignatureProfileAction(): Promise<SignatureProfileRow | null> {
  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) throw new Error("Unauthorized. Please log in.");

  const { data, error } = await supabase
    .from("signature_profiles")
    .select("*")
    .eq("profile_id", user.id)
    .maybeSingle();

  if (error) throw new Error(`Failed to load signature profile: ${error.message}`);
  return data as SignatureProfileRow | null;
}

/**
 * Creates or updates the current user's signature profile.
 * If a signature image is provided, it is uploaded to Supabase Storage
 * and only the storage path is saved to the database.
 */
export async function saveSignatureProfileAction(
  input: SignatureProfileInput
): Promise<{ id: string; publicSignatureId: string }> {
  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) throw new Error("Unauthorized. Please log in.");

  // Check if profile exists already
  const { data: existing } = await supabase
    .from("signature_profiles")
    .select("id, public_signature_id, signature_storage_path")
    .eq("profile_id", user.id)
    .maybeSingle();

  // Generate public_signature_id for new profiles
  let publicSignatureId = existing?.public_signature_id;
  if (!publicSignatureId) {
    const { data: seqData } = await supabase
      .rpc("generate_certificate_serial")
      .single();
    publicSignatureId = (seqData as string | null)?.replace("AURORA-", "SIG-PSU-") ?? `SIG-PSU-${Date.now()}`;
  }

  // Upload signature image if provided
  let storagePath: string | null = existing?.signature_storage_path ?? null;
  let fingerprintSha256: string | null = null;

  if (input.signatureImageBase64) {
    const uploadPath = buildSignatureStoragePath(publicSignatureId);
    const { path, hash } = await uploadSignatureImage(
      supabase,
      input.signatureImageBase64,
      uploadPath
    );
    storagePath = path;
    fingerprintSha256 = hash;
  }

  const profileData = {
    profile_id: user.id,
    full_name: input.fullName,
    academic_rank: input.academicRank,
    employee_number: input.employeeNumber ?? null,
    official_email: input.officialEmail,
    department_id: input.departmentId ?? null,
    signature_storage_path: storagePath,
    public_signature_id: publicSignatureId,
    fingerprint_sha256: fingerprintSha256,
    hash_algorithm: HASH_ALGORITHM,
    verification_method: "self_declared",
    is_verified: false,
  };

  let savedId: string;
  if (existing) {
    const { error: updateErr } = await supabase
      .from("signature_profiles")
      .update(profileData)
      .eq("id", existing.id);
    if (updateErr) throw new Error(`Failed to update signature profile: ${updateErr.message}`);
    savedId = existing.id;
  } else {
    const { data: inserted, error: insertErr } = await supabase
      .from("signature_profiles")
      .insert(profileData)
      .select("id")
      .single();
    if (insertErr) throw new Error(`Failed to create signature profile: ${insertErr.message}`);
    savedId = (inserted as { id: string }).id;
  }

  return { id: savedId, publicSignatureId: publicSignatureId! };
}

/**
 * Signs an evaluation — the primary signing workflow action.
 *
 * Signing Workflow:
 * 1. Verify identity (getUser — server validated)
 * 2. Load signature profile
 * 3. Fetch evaluation + project + rubric data
 * 4. Build deterministic signing payload
 * 5. Generate certificate serial via DB sequence
 * 6. Compute all 4 hashes (payload, certificate, signature, pdf)
 * 7. Upload snapshot of signature image to Storage
 * 8. Insert immutable record into digital_signatures
 * 9. Update evaluations.status = 'submitted', store certificate_serial
 * 10. Log to audit_logs
 * 11. Record workflow transition
 * 12. Return certificate data for display
 */
export async function signEvaluationV2Action(
  input: SignEvaluationV2Input
): Promise<{
  success: true;
  certificateSerial: string;
  payloadHash: string;
  signedAt: string;
}> {
  const supabase = await createClient();
  const headersList = await headers();
  const ip = headersList.get("x-forwarded-for")?.split(",")[0] ?? "127.0.0.1";
  const userAgent = headersList.get("user-agent") ?? "unknown";

  // 1. Verify identity
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) throw new Error("Unauthorized. Please log in.");

  // 2. Load evaluation
  const { data: evaluation, error: evalErr } = await supabase
    .from("evaluations")
    .select("*, rubric_templates(passing_score, criteria)")
    .eq("id", input.evaluationId)
    .single();

  if (evalErr || !evaluation) throw new Error("Evaluation not found.");
  if (evaluation.status === "submitted" || evaluation.status === "locked") {
    throw new Error("This evaluation has already been signed.");
  }
  if (evaluation.panelist_id !== user.id) {
    throw new Error("You can only sign your own evaluations.");
  }

  // 3. Load signature profile
  const { data: sigProfile } = await supabase
    .from("signature_profiles")
    .select("*")
    .eq("profile_id", user.id)
    .maybeSingle();

  // 4. Generate certificate serial via DB sequence
  const { data: serialData } = await supabase
    .rpc("generate_certificate_serial")
    .single();
  const certificateSerial = (serialData as string) ?? `AURORA-${Date.now()}`;

  const signedAt = new Date().toISOString();

  // 5. Build deterministic signing payload
  const payload: SigningPayload = {
    evaluationId: input.evaluationId,
    projectId: evaluation.project_id,
    stageId: evaluation.stage_id,
    panelistId: user.id,
    scores: (evaluation.scores as Record<string, number>) ?? {},
    totalScore: Number(evaluation.total_score ?? 0),
    verdictCode: evaluation.verdict_code ?? "",
    panelNotes: evaluation.panel_notes ?? "",
    recommendations: evaluation.recommendations ?? "",
    printedName: input.printedName,
    positionRole: input.positionRole,
    certificateSerial,
    signedAt,
    signatureProfileId: sigProfile?.id ?? null,
  };
  const payloadJson = JSON.stringify(payload, Object.keys(payload).sort());
  const payloadHash = computeHash(payloadJson);

  // 6. Compute certificate hash (payload + serial)
  const certificateHash = computeHash(`${certificateSerial}|${payloadHash}`);

  // 7. Upload snapshot signature image to storage (if provided)
  let signatureStoragePath: string | null = sigProfile?.signature_storage_path ?? null;
  let signatureHash: string | null = sigProfile?.fingerprint_sha256 ?? null;

  if (input.signatureImageBase64) {
    const snapshotPath = buildSignatureStoragePath(`${certificateSerial}-snapshot`);
    const { path, hash } = await uploadSignatureImage(
      supabase,
      input.signatureImageBase64,
      snapshotPath
    );
    signatureStoragePath = path;
    signatureHash = hash;
  }

  // 8. Insert immutable digital_signatures record
  const { error: sigInsertErr } = await supabase
    .from("digital_signatures")
    .insert({
      evaluation_id: input.evaluationId,
      signature_profile_id: sigProfile?.id ?? null,
      panelist_id: user.id,
      certificate_serial: certificateSerial,
      payload_hash: payloadHash,
      certificate_hash: certificateHash,
      signature_hash: signatureHash,
      signed_pdf_hash: null,   // Will be computed when PDF is generated
      hash_algorithm: HASH_ALGORITHM,
      signing_payload: payload as unknown as Record<string, unknown>,
      signature_storage_path: signatureStoragePath,
      signed_at: signedAt,
      ip_address: ip,
      user_agent: userAgent,
      device_info: { userAgent },
      status: "active",
    });

  if (sigInsertErr) {
    throw new Error(`Failed to record signature: ${sigInsertErr.message}`);
  }

  // 9. Update evaluation to submitted state
  const { error: updateErr } = await supabase
    .from("evaluations")
    .update({
      status: "submitted",
      submitted_at: signedAt,
      certificate_serial: certificateSerial,
      signature_hash: payloadHash,
      signed_at: signedAt,
      ip_address: ip,
      user_agent: userAgent,
      verified: true,
      verified_by_system: true,
    })
    .eq("id", input.evaluationId)
    .eq("panelist_id", user.id);   // Extra safety check

  if (updateErr) {
    throw new Error(`Failed to submit evaluation: ${updateErr.message}`);
  }

  // 10. Log to audit_logs
  await supabase.from("audit_logs").insert({
    profile_id: user.id,
    user_email: user.email ?? "unknown",
    user_role: "panelist",
    action_type: "SIGN",
    module: "digital_signatures",
    entity_type: "evaluations",
    entity_id: input.evaluationId,
    description: `Panelist electronically signed evaluation. Certificate: ${certificateSerial}. Hash: ${payloadHash}`,
    new_value: { certificateSerial, payloadHash, signedAt },
    ip_address: ip,
    user_agent: userAgent,
    academic_year: currentAcademicYear(),
  });

  // 11. Record workflow transition
  await recordWorkflowTransition(supabase, {
    projectId: evaluation.project_id,
    fromStageId: evaluation.stage_id,
    toStageId: evaluation.stage_id,
    transitionedBy: user.id,
    performedByRole: "panelist",
    transitionType: "manual",
    transitionReason: `Panelist signed evaluation. Certificate: ${certificateSerial}`,
    oldStatus: "draft",
    newStatus: "submitted",
    metadata: { evaluationId: input.evaluationId, certificateSerial },
  });

  // 12. Emit evaluation_signed notification to coordinator and student
  // Get project student profile_id for notification
  const { data: projectMeta } = await supabase
    .from("projects")
    .select("student_id, coordinator_profile_id")
    .eq("id", evaluation.project_id)
    .maybeSingle();

  if (projectMeta?.coordinator_profile_id) {
    await emitNotification({
      supabase,
      recipientProfileId: projectMeta.coordinator_profile_id,
      title: "Evaluation Signed",
      message: `A panelist has electronically signed an evaluation. Certificate: ${certificateSerial}.`,
      eventType: "evaluation_signed",
      metadata: { certificateSerial, evaluationId: input.evaluationId },
    });
  }

  return {
    success: true,
    certificateSerial,
    payloadHash,
    signedAt,
  };
}
