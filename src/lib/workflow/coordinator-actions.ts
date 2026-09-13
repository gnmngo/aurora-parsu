"use server";

import { createClient, createServiceClient } from "@/lib/supabase/server";
import { headers } from "next/headers";
import { currentAcademicYear } from "@/lib/utils/academic-year";
import { emitNotification } from "@/lib/notifications/emit";

interface CoordinatorOverrideStageInput {
  projectId: string;
  stageId: string;
  status?: string;
  reason: string;
}

export async function coordinatorOverrideProjectStageAction(input: CoordinatorOverrideStageInput) {
  const supabase = await createClient();
  const serviceClient = createServiceClient();
  const headersList = await headers();
  const ip = headersList.get("x-forwarded-for")?.split(",")[0] || "127.0.0.1";
  const userAgent = headersList.get("user-agent") || "unknown";

  // 1. Authorize caller as coordinator or sys_admin
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();

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
    throw new Error("Permission denied. Only Defense Coordinators and Administrators can revise defense stages.");
  }

  if (!input.reason?.trim()) {
    throw new Error("A reason or justification is required for stage adjustment.");
  }

  // 2. Fetch project and target stage
  const { data: project, error: projErr } = await serviceClient
    .from("projects")
    .select("id, title, current_stage_id, status, student_id")
    .eq("id", input.projectId)
    .single();

  if (projErr || !project) {
    throw new Error("Project not found.");
  }

  const { data: stage, error: stageErr } = await serviceClient
    .from("defense_stages")
    .select("id, name, sequence_order")
    .eq("id", input.stageId)
    .single();

  if (stageErr || !stage) {
    throw new Error("Target defense stage not found.");
  }

  const updatePayload: Record<string, any> = {
    current_stage_id: input.stageId,
    updated_at: new Date().toISOString(),
  };

  if (input.status) {
    updatePayload.status = input.status;
  }

  // 3. Update project
  const { error: updateErr } = await serviceClient
    .from("projects")
    .update(updatePayload)
    .eq("id", input.projectId);

  if (updateErr) {
    throw new Error(`Failed to update project stage: ${updateErr.message}`);
  }

  // 4. Record workflow history
  try {
    await serviceClient.from("project_workflow_history").insert({
      project_id: input.projectId,
      from_stage_id: project.current_stage_id,
      to_stage_id: input.stageId,
      from_status: project.status,
      to_status: input.status || project.status,
      reason: `[Coordinator Override] ${input.reason.trim()}`,
      created_by: user.id,
      metadata: {
        coordinator_email: user.email,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (histErr) {
    console.warn("Could not insert project_workflow_history:", histErr);
  }

  // 5. Audit log
  await serviceClient.from("audit_logs").insert({
    profile_id: user.id,
    user_email: user.email || "unknown",
    user_role: "coordinator",
    action_type: "TRANSITION",
    module: "workflow",
    entity_type: "projects",
    entity_id: input.projectId,
    description: `Coordinator revised defense stage for "${project.title}" to "${stage.name}". Reason: ${input.reason.trim()}`,
    old_value: { stage_id: project.current_stage_id, status: project.status },
    new_value: { stage_id: input.stageId, status: input.status || project.status },
    ip_address: ip,
    user_agent: userAgent,
    academic_year: currentAcademicYear(),
  });

  // 6. Notify student & team
  if (project.student_id) {
    const { data: studentRecord } = await serviceClient
      .from("students")
      .select("profile_id")
      .eq("id", project.student_id)
      .maybeSingle();

    if (studentRecord?.profile_id) {
      await emitNotification({
        supabase: serviceClient,
        recipientProfileId: studentRecord.profile_id,
        title: "Defense Stage Revised by Coordinator",
        message: `Your project "${project.title}" has been updated to "${stage.name}" by the Defense Coordinator. Note: ${input.reason.trim()}`,
        eventType: "system_announcement",
        actionUrl: `/dashboard/my-project`,
        metadata: { projectId: input.projectId, newStageId: input.stageId },
      });
    }
  }

  return { success: true, stageName: stage.name };
}
