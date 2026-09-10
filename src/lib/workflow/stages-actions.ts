"use server";

import { createClient, createServiceClient } from "@/lib/supabase/server";
import { headers } from "next/headers";
import { currentAcademicYear } from "@/lib/utils/academic-year";

export interface StageInput {
  name: string;
  code: string;
  description?: string;
  sequenceOrder: number;
  isEnabled: boolean;
  requiredDocuments: string[];
  passingScore?: number;
  workflowTemplateId?: string;
  requiresSubmission?: boolean;
  requiresSchedule?: boolean;
  requiresPanel?: boolean;
  requiresRubric?: boolean;
  requiresSignature?: boolean;
  allowsRevision?: boolean;
}

/**
 * Authorize caller as coordinator or sys_admin
 */
async function authorizeCoordinatorOrAdmin(supabase: any) {
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) {
    throw new Error("Unauthorized. Please log in.");
  }

  const { data: userRoles } = await supabase
    .from("user_roles")
    .select("roles(code)")
    .eq("profile_id", user.id);

  const codes = (userRoles as { roles: { code: string } | { code: string }[] | null }[])
    ?.map((ur) => {
      const r = Array.isArray(ur.roles) ? ur.roles[0] : ur.roles;
      return r?.code as string | undefined;
    })
    .filter(Boolean) ?? [];

  const isAuthorized = codes.includes("coordinator") || codes.includes("sys_admin");
  if (!isAuthorized) {
    throw new Error("Permission denied. Only Coordinators and Administrators can modify defense stages.");
  }

  return user;
}

/**
 * Toggle whether a defense stage is enabled or disabled in the workflow
 */
export async function toggleStageEnabledAction(stageId: string, isEnabled: boolean) {
  const supabase = await createClient();
  const user = await authorizeCoordinatorOrAdmin(supabase);
  const serviceClient = createServiceClient();
  const headersList = await headers();
  const ip = headersList.get("x-forwarded-for")?.split(",")[0] || "127.0.0.1";
  const userAgent = headersList.get("user-agent") || "unknown";

  const { data: oldStage, error: fetchErr } = await serviceClient
    .from("defense_stages")
    .select("name, code, is_enabled")
    .eq("id", stageId)
    .single();

  if (fetchErr || !oldStage) {
    throw new Error("Defense stage not found.");
  }

  const { error: updateErr } = await serviceClient
    .from("defense_stages")
    .update({ is_enabled: isEnabled, updated_at: new Date().toISOString() })
    .eq("id", stageId);

  if (updateErr) {
    throw new Error(`Failed to toggle stage: ${updateErr.message}`);
  }

  // Audit log
  await serviceClient.from("audit_logs").insert({
    profile_id: user.id,
    user_email: user.email || "unknown",
    user_role: "coordinator",
    action_type: "UPDATE",
    module: "stages",
    entity_type: "defense_stages",
    entity_id: stageId,
    description: `Defense stage "${oldStage.name}" (${oldStage.code}) ${isEnabled ? "Enabled" : "Disabled"}.`,
    old_value: { is_enabled: oldStage.is_enabled },
    new_value: { is_enabled: isEnabled },
    ip_address: ip,
    user_agent: userAgent,
    academic_year: currentAcademicYear(),
  });

  return { success: true };
}

/**
 * Update an existing defense stage configuration
 */
export async function updateStageAction(stageId: string, input: Partial<StageInput>) {
  const supabase = await createClient();
  const user = await authorizeCoordinatorOrAdmin(supabase);
  const serviceClient = createServiceClient();
  const headersList = await headers();
  const ip = headersList.get("x-forwarded-for")?.split(",")[0] || "127.0.0.1";
  const userAgent = headersList.get("user-agent") || "unknown";

  const { data: oldStage, error: fetchErr } = await serviceClient
    .from("defense_stages")
    .select("*")
    .eq("id", stageId)
    .single();

  if (fetchErr || !oldStage) {
    throw new Error("Defense stage not found.");
  }

  const updatePayload: Record<string, any> = {
    updated_at: new Date().toISOString(),
  };

  if (input.name !== undefined) updatePayload.name = input.name.trim();
  if (input.code !== undefined) updatePayload.code = input.code.trim().toLowerCase().replace(/\s+/g, "_");
  if (input.description !== undefined) updatePayload.description = input.description.trim();
  if (input.sequenceOrder !== undefined) updatePayload.sequence_order = input.sequenceOrder;
  if (input.isEnabled !== undefined) updatePayload.is_enabled = input.isEnabled;
  if (input.requiredDocuments !== undefined) updatePayload.required_documents = input.requiredDocuments;
  if (input.passingScore !== undefined) updatePayload.passing_score = input.passingScore;
  if (input.requiresSubmission !== undefined) updatePayload.requires_submission = input.requiresSubmission;
  if (input.requiresSchedule !== undefined) updatePayload.requires_schedule = input.requiresSchedule;
  if (input.requiresPanel !== undefined) updatePayload.requires_panel = input.requiresPanel;
  if (input.requiresRubric !== undefined) updatePayload.requires_rubric = input.requiresRubric;
  if (input.requiresSignature !== undefined) updatePayload.requires_signature = input.requiresSignature;
  if (input.allowsRevision !== undefined) updatePayload.allows_revision = input.allowsRevision;

  const { error: updateErr } = await serviceClient
    .from("defense_stages")
    .update(updatePayload)
    .eq("id", stageId);

  if (updateErr) {
    throw new Error(`Failed to update stage: ${updateErr.message}`);
  }

  // Audit log
  await serviceClient.from("audit_logs").insert({
    profile_id: user.id,
    user_email: user.email || "unknown",
    user_role: "coordinator",
    action_type: "UPDATE",
    module: "stages",
    entity_type: "defense_stages",
    entity_id: stageId,
    description: `Defense stage "${oldStage.name}" updated with new configuration parameters.`,
    old_value: oldStage,
    new_value: updatePayload,
    ip_address: ip,
    user_agent: userAgent,
    academic_year: currentAcademicYear(),
  });

  return { success: true };
}

/**
 * Create a new custom defense stage
 */
export async function createStageAction(input: StageInput) {
  const supabase = await createClient();
  const user = await authorizeCoordinatorOrAdmin(supabase);
  const serviceClient = createServiceClient();
  const headersList = await headers();
  const ip = headersList.get("x-forwarded-for")?.split(",")[0] || "127.0.0.1";
  const userAgent = headersList.get("user-agent") || "unknown";

  // Resolve template ID if not provided
  let templateId = input.workflowTemplateId;
  if (!templateId) {
    const { data: defaultTemplate } = await serviceClient
      .from("workflow_templates")
      .select("id")
      .limit(1)
      .maybeSingle();
    templateId = defaultTemplate?.id || "70000000-0000-0000-0000-000000000001";
  }

  // Resolve campus ID
  const { data: defaultCampus } = await serviceClient
    .from("campuses")
    .select("id")
    .limit(1)
    .maybeSingle();
  const campusId = defaultCampus?.id || "00000000-0000-0000-0000-000000000001";

  const sanitizedCode = input.code.trim().toLowerCase().replace(/\s+/g, "_");

  const insertPayload = {
    name: input.name.trim(),
    code: sanitizedCode,
    description: input.description?.trim() || null,
    sequence_order: input.sequenceOrder,
    is_enabled: input.isEnabled ?? true,
    required_documents: input.requiredDocuments || [],
    passing_score: input.passingScore || 75,
    campus_id: campusId,
    workflow_template_id: templateId,
    requires_submission: input.requiresSubmission ?? true,
    requires_schedule: input.requiresSchedule ?? true,
    requires_panel: input.requiresPanel ?? true,
    requires_rubric: input.requiresRubric ?? true,
    requires_signature: input.requiresSignature ?? true,
    allows_revision: input.allowsRevision ?? true,
    requirements: { max_pages: 50, min_pages: 5 },
  };

  const { data: newStage, error: insertErr } = await serviceClient
    .from("defense_stages")
    .insert(insertPayload)
    .select()
    .single();

  if (insertErr || !newStage) {
    throw new Error(`Failed to create defense stage: ${insertErr?.message || "Unknown error"}`);
  }

  // Audit log
  await serviceClient.from("audit_logs").insert({
    profile_id: user.id,
    user_email: user.email || "unknown",
    user_role: "coordinator",
    action_type: "CREATE",
    module: "stages",
    entity_type: "defense_stages",
    entity_id: newStage.id,
    description: `Created new defense stage: "${newStage.name}" (${newStage.code}) at sequence #${newStage.sequence_order}.`,
    new_value: insertPayload,
    ip_address: ip,
    user_agent: userAgent,
    academic_year: currentAcademicYear(),
  });

  return { success: true, stage: newStage };
}

/**
 * Reorder stages by sequence order
 */
export async function reorderStagesAction(orderedStageIds: string[]) {
  const supabase = await createClient();
  await authorizeCoordinatorOrAdmin(supabase);
  const serviceClient = createServiceClient();

  for (let i = 0; i < orderedStageIds.length; i++) {
    const id = orderedStageIds[i];
    await serviceClient
      .from("defense_stages")
      .update({ sequence_order: i + 1, updated_at: new Date().toISOString() })
      .eq("id", id);
  }

  return { success: true };
}

/**
 * Delete a custom defense stage if no active documents or projects depend on it
 */
export async function deleteStageAction(stageId: string) {
  const supabase = await createClient();
  const user = await authorizeCoordinatorOrAdmin(supabase);
  const serviceClient = createServiceClient();
  const headersList = await headers();
  const ip = headersList.get("x-forwarded-for")?.split(",")[0] || "127.0.0.1";
  const userAgent = headersList.get("user-agent") || "unknown";

  // Check if stage is in use
  const { data: docs } = await serviceClient
    .from("documents")
    .select("id")
    .eq("stage_id", stageId)
    .limit(1);

  if (docs && docs.length > 0) {
    throw new Error(
      "Cannot delete this stage because submitted documents are attached to it. Disable the stage instead to preserve historical records."
    );
  }

  const { data: projects } = await serviceClient
    .from("projects")
    .select("id")
    .eq("current_stage_id", stageId)
    .limit(1);

  if (projects && projects.length > 0) {
    throw new Error(
      "Cannot delete this stage because active projects are currently in this stage. Advance or reassign those projects first, or disable this stage."
    );
  }

  const { data: oldStage } = await serviceClient
    .from("defense_stages")
    .select("name, code")
    .eq("id", stageId)
    .single();

  const { error: delErr } = await serviceClient
    .from("defense_stages")
    .delete()
    .eq("id", stageId);

  if (delErr) {
    throw new Error(`Failed to delete stage: ${delErr.message}`);
  }

  // Audit log
  await serviceClient.from("audit_logs").insert({
    profile_id: user.id,
    user_email: user.email || "unknown",
    user_role: "coordinator",
    action_type: "DELETE",
    module: "stages",
    entity_type: "defense_stages",
    entity_id: stageId,
    description: `Deleted defense stage "${oldStage?.name || stageId}" (${oldStage?.code || ""}).`,
    old_value: oldStage,
    ip_address: ip,
    user_agent: userAgent,
    academic_year: currentAcademicYear(),
  });

  return { success: true };
}
