"use server";

import { createClient } from "@/lib/supabase/server";
import { headers } from "next/headers";
import { recordWorkflowTransition } from "@/lib/workflow/history";
import { emitNotification } from "@/lib/notifications/emit";


/**
 * Adviser Approval Gate: Approve or Reject Student uploaded manuscript
 */
export async function adviserApproveDocumentAction(
  documentId: string,
  status: "approved" | "rejected",
  remarks?: string
) {
  const supabase = await createClient();
  const headersList = await headers();
  const ip = headersList.get("x-forwarded-for")?.split(",")[0] || "127.0.0.1";
  const userAgent = headersList.get("user-agent") || "unknown";

  // 1. Get adviser identity (secure — uses getUser() not getSession())
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) {
    throw new Error("Unauthorized. Please log in.");
  }

  // Fetch document details and project membership
  const { data: doc, error: docErr } = await supabase
    .from("documents")
    .select("*, projects(id, title)")
    .eq("id", documentId)
    .single();

  if (docErr || !doc) {
    throw new Error("Document not found.");
  }

  // Verify caller is adviser for this project
  const { data: isMember } = await supabase
    .from("project_members")
    .select("id")
    .eq("project_id", doc.projects.id)
    .eq("profile_id", user.id)
    .eq("member_role", "adviser")
    .maybeSingle();

  if (!isMember) {
    throw new Error("Permission denied. Only the assigned Adviser can approve manuscripts.");
  }

  // 2. Update status
  const { error: updateErr } = await supabase
    .from("documents")
    .update({
      adviser_approval_status: status === "approved" ? "approved" : "rejected",
      approval_remarks: remarks || null
    })
    .eq("id", documentId);

  if (updateErr) {
    throw new Error(`Failed to update approval status: ${updateErr.message}`);
  }

  // 3. Log Audit trail
  await supabase.from("audit_logs").insert({
    profile_id: user.id,
    user_email: user.email || "unknown",
    user_role: "adviser",
    action_type: "UPDATE",
    module: "documents",
    entity_type: "documents",
    entity_id: documentId,
    description: `Adviser ${status} document "${doc.title}" for project "${doc.projects.title}". Remarks: ${remarks || "None"}`,
    old_value: { status: "pending" },
    new_value: { status },
    ip_address: ip,
    user_agent: userAgent,
    academic_year: (await import("@/lib/utils/academic-year")).currentAcademicYear()
  });

  // 4. Create Notifications — BUG-H7 fix: `projects.student_id` is `students.id`,
  //    NOT `profiles.id`. Must join students table to get the actual profile_id.
  //    Sprint 2E: Use centralized emitNotification() dispatcher.
  const { data: studentRecord } = await supabase
    .from("students")
    .select("profile_id")
    .eq("id", doc.projects.student_id)
    .maybeSingle();

  if (studentRecord?.profile_id) {
    await emitNotification({
      supabase,
      recipientProfileId: studentRecord.profile_id,
      title: `Manuscript ${status === "approved" ? "Approved" : "Revision Required"}`,
      message: `Your adviser has ${status === "approved" ? "approved" : "reviewed"} your manuscript submission. Remarks: ${remarks || "None"}.`,
      // Map "rejected" → "revision_required" notification (they are semantically the same in AURORA).
      // "approved" uses document_approved; rejection always means revise-and-resubmit.
      eventType: status === "approved" ? "document_approved" : "revision_required",
    });
  }

  // 5. Record workflow transition history (Sprint 2G)
  await recordWorkflowTransition(supabase, {
    projectId: doc.projects.id,
    fromStageId: null,
    toStageId: doc.stage_id ?? null,
    transitionedBy: user.id,
    performedByRole: "adviser",
    transitionType: "manual",
    transitionReason: `Adviser ${status} manuscript. Remarks: ${remarks || "None"}`,
    oldStatus: "pending",
    newStatus: status,
    metadata: { documentId, adviserId: user.id },
  });

  return { success: true };
}


/**
 * Sprint 3: Coordinator releases the final verdict for a project.
 * Sets projects.final_verdict + projects.status, then emits
 * final_verdict_released notification to the student.
 *
 * This is the authoritative action for completing the AURORA workflow.
 */
export async function releaseProjectVerdictAction(
  projectId: string,
  verdictCode: string,
  remarks?: string
) {
  const supabase = await createClient();
  const headersList = await headers();
  const ip = headersList.get("x-forwarded-for")?.split(",")[0] || "127.0.0.1";
  const userAgent = headersList.get("user-agent") || "unknown";

  // 1. Authenticate — must be coordinator or sys_admin
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) throw new Error("Unauthorized. Please log in.");

  const { data: userRolesData } = await supabase
    .from("user_roles")
    .select("roles(code)")
    .eq("profile_id", user.id);

  const codes = (userRolesData as { roles: { code: string } | { code: string }[] | null }[])
    ?.map((ur) => { const r = Array.isArray(ur.roles) ? ur.roles[0] : ur.roles; return r?.code as string | undefined; })
    .filter(Boolean) ?? [];

  if (!codes.includes("coordinator") && !codes.includes("sys_admin")) {
    throw new Error("Permission denied. Only coordinators or administrators can release verdicts.");
  }

  // 2. Fetch project details
  const { data: project, error: projErr } = await supabase
    .from("projects")
    .select("title, student_id")
    .eq("id", projectId)
    .single();

  if (projErr || !project) throw new Error("Project not found.");

  // 3. Update project final_verdict + status
  const { error: updateErr } = await supabase
    .from("projects")
    .update({
      final_verdict: verdictCode,
      status: verdictCode,
    })
    .eq("id", projectId);

  if (updateErr) throw new Error(`Failed to release verdict: ${updateErr.message}`);

  // 4. Audit log
  await supabase.from("audit_logs").insert({
    profile_id: user.id,
    user_email: user.email || "unknown",
    user_role: "coordinator",
    action_type: "UPDATE",
    module: "workflow",
    entity_type: "projects",
    entity_id: projectId,
    description: `Final verdict released: "${verdictCode}" for project "${project.title}". Remarks: ${remarks || "None"}.`,
    new_value: { projectId, verdictCode, remarks },
    ip_address: ip,
    user_agent: userAgent,
    academic_year: (await import("@/lib/utils/academic-year")).currentAcademicYear(),
  });

  // 5. Notify student — non-blocking
  try {
    const { data: studentRecord } = await supabase
      .from("students")
      .select("profile_id")
      .eq("id", project.student_id)
      .maybeSingle();

    if (studentRecord?.profile_id) {
      await emitNotification({
        supabase,
        recipientProfileId: studentRecord.profile_id,
        title: "Final Verdict Released",
        message: `Your defense outcome has been officially recorded: ${verdictCode.replace(/_/g, " ").toUpperCase()}. Remarks: ${remarks || "None"}.`,
        eventType: "final_verdict_released",
        metadata: { projectId, verdictCode },
      });
    }
  } catch (notifEx: unknown) {
    console.error("[releaseProjectVerdictAction] Notification failed:",
      notifEx instanceof Error ? notifEx.message : notifEx);
  }

  // 6. Record workflow history — non-blocking
  await recordWorkflowTransition(supabase, {
    projectId,
    fromStageId: null,
    toStageId: null,
    transitionedBy: user.id,
    performedByRole: "coordinator",
    transitionType: "manual",
    transitionReason: `Final verdict released: ${verdictCode}. Remarks: ${remarks || "None"}`,
    oldStatus: "evaluation_submitted",
    newStatus: verdictCode,
    metadata: { projectId, verdictCode },
  });

  return { success: true };
}



/**
 * Enforces annotation lifecycle transitions for workflow module.
 * NOTE: Use annotations/actions.ts updateAnnotationStatusAction for the full
 * lifecycle implementation with history tracking and audit trail.
 * This lightweight version is for direct workflow pipeline transitions.
 */
export async function workflowUpdateAnnotationStatusAction(annotationId: string, targetStatus: string) {
  const supabase = await createClient();
  // Secure — uses getUser() not getSession()
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("Unauthorized. Please log in.");
  }

  // Fetch current role claims
  const { data: callerRoles } = await supabase
    .from("user_roles")
    .select("roles(code)")
    .eq("profile_id", user.id);

  const codes = (callerRoles as { roles: { code: string } | { code: string }[] | null }[])?.map((ur) => {
    const r = Array.isArray(ur.roles) ? ur.roles[0] : ur.roles;
    return r?.code as string | undefined;
  }).filter(Boolean) ?? [];

  // Enforce role transition rules
  if (targetStatus === "addressed") {
    if (!codes.includes("student")) {
      throw new Error("Permission denied. Only students can mark annotations as addressed.");
    }
  } else if (targetStatus === "verified" || targetStatus === "resolved") {
    if (!codes.includes("adviser") && !codes.includes("panelist")) {
      throw new Error("Permission denied. Only Advisers and Panelists can verify or resolve annotations.");
    }
  } else if (targetStatus === "archived") {
    if (!codes.includes("coordinator") && !codes.includes("sys_admin")) {
      throw new Error("Permission denied. Only Coordinators and Administrators can archive annotations.");
    }
  }

  const { error } = await supabase
    .from("annotations")
    .update({ status: targetStatus })
    .eq("id", annotationId);

  if (error) {
    throw new Error(`Failed to update annotation status: ${error.message}`);
  }

  return { success: true };
}
