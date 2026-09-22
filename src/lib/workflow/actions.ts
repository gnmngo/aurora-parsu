"use server";

import { createClient, createServiceClient } from "@/lib/supabase/server";
import { headers } from "next/headers";
import { recordWorkflowTransition } from "@/lib/workflow/history";
import { emitNotificationToMany } from "@/lib/notifications/emit";
import { emitAuditLog } from "@/lib/audit/log";


/**
 * Adviser Approval Gate: Approve or Reject Student uploaded manuscript
 */
export async function adviserApproveDocumentAction(
  documentId: string,
  status: "approved" | "rejected",
  remarks?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const serviceClient = createServiceClient();
    const headersList = await headers();
    const ip = headersList.get("x-forwarded-for")?.split(",")[0] || "127.0.0.1";
    const userAgent = headersList.get("user-agent") || "unknown";

    // 1. Get adviser identity
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) {
      return { success: false, error: "Unauthorized. Please log in." };
    }

    // Fetch document details and project membership via serviceClient
    const { data: doc, error: docErr } = await serviceClient
      .from("documents")
      .select("*, projects(id, title, student_id)")
      .eq("id", documentId)
      .single();

    if (docErr || !doc) {
      return { success: false, error: "Document not found." };
    }

    const projId = (Array.isArray(doc.projects) ? doc.projects[0]?.id : doc.projects?.id) || doc.project_id;
    const projTitle = (Array.isArray(doc.projects) ? doc.projects[0]?.title : doc.projects?.title) || doc.title || "Manuscript";

    // 2. Update document status
    const { error: updateErr } = await serviceClient
      .from("documents")
      .update({
        adviser_approval_status: status === "approved" ? "approved" : "rejected",
        status: status === "approved" ? "approved" : "revision_required",
        approval_remarks: remarks || (status === "approved" ? "Endorsed for oral defense presentation." : "Revisions required."),
        updated_at: new Date().toISOString(),
      })
      .eq("id", documentId);

    if (updateErr) {
      return { success: false, error: `Failed to update approval status: ${updateErr.message}` };
    }

    // Update project status accordingly (non-fatal if state transition rules differ)
    if (projId) {
      try {
        await serviceClient
          .from("projects")
          .update({
            status: status === "approved" ? "submitted" : "revision_required",
          })
          .eq("id", projId);
      } catch (projUpdateErr) {
        console.warn("[adviserApproveDocumentAction] Non-fatal project status update notice:", projUpdateErr);
      }
    }

    // 3. Log Audit trail
    try {
      await emitAuditLog(supabase, {
        profile_id: user.id,
        user_email: user.email || "unknown",
        user_role: "adviser",
        action_type: "UPDATE",
        module: "documents",
        entity_type: "documents",
        entity_id: documentId,
        description: `Adviser ${status} document "${doc.title}" for project "${projTitle}". Remarks: ${remarks || "None"}`,
        old_value: { status: doc.status || "pending", adviser_approval_status: doc.adviser_approval_status || "pending" },
        new_value: { status: status === "approved" ? "approved" : "revision_required", adviser_approval_status: status },
        ip_address: ip,
        user_agent: userAgent,
      });
    } catch (auditErr) {
      console.warn("[adviserApproveDocumentAction] Non-fatal audit log notice:", auditErr);
    }

    // 4. Create Notifications for student leader and team members
    try {
      const studentProfileIds: string[] = [];

      if (projId) {
        const { data: teamMembers } = await serviceClient
          .from("project_members")
          .select("profile_id")
          .eq("project_id", projId)
          .in("member_role", ["student_leader", "student"]);

        (teamMembers || []).forEach((m: any) => {
          if (m.profile_id && !studentProfileIds.includes(m.profile_id)) {
            studentProfileIds.push(m.profile_id);
          }
        });
      }

      const projStudentId = (Array.isArray(doc.projects) ? doc.projects[0]?.student_id : doc.projects?.student_id);
      if (projStudentId) {
        const { data: studentRecord } = await serviceClient
          .from("students")
          .select("profile_id")
          .eq("id", projStudentId)
          .maybeSingle();

        if (studentRecord?.profile_id && !studentProfileIds.includes(studentRecord.profile_id)) {
          studentProfileIds.push(studentRecord.profile_id);
        }
      }

      if (studentProfileIds.length > 0) {
        await emitNotificationToMany(serviceClient, studentProfileIds, {
          title: `Manuscript ${status === "approved" ? "Approved" : "Revision Required"}`,
          message: `Your adviser has ${status === "approved" ? "approved" : "requested revisions on"} your manuscript "${doc.title}". Remarks: ${remarks || "None"}.`,
          eventType: status === "approved" ? "document_approved" : "revision_required",
          actionUrl: `/workspace/${projId}/${doc.stage_id || ""}`,
          metadata: { documentId, projectId: projId, remarks: remarks || null },
        });
      }
    } catch (notifErr) {
      console.warn("[adviserApproveDocumentAction] Non-fatal notification notice:", notifErr);
    }

    // 5. Record workflow transition history
    if (projId) {
      try {
        await recordWorkflowTransition(serviceClient, {
          projectId: projId,
          fromStageId: null,
          toStageId: doc.stage_id ?? null,
          transitionedBy: user.id,
          performedByRole: "adviser",
          transitionType: "manual",
          transitionReason: `Adviser ${status} manuscript. Remarks: ${remarks || "None"}`,
          oldStatus: doc.adviser_approval_status || "pending",
          newStatus: status,
          metadata: { documentId, adviserId: user.id },
        });
      } catch (histErr) {
        console.warn("[adviserApproveDocumentAction] Non-fatal workflow transition notice:", histErr);
      }
    }

    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to endorse manuscript";
    console.error("[adviserApproveDocumentAction] Error:", msg);
    return { success: false, error: msg };
  }
}


/**
 * Coordinator releases the final verdict for a project.
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

  const VALID_VERDICTS = ["passed", "passed_minor", "passed_major", "failed", "conditional", "re_defense"];
  if (!VALID_VERDICTS.includes(verdictCode)) {
    throw new Error(`Invalid verdict code: "${verdictCode}". Allowed options: ${VALID_VERDICTS.join(", ")}`);
  }

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
    .select("title, student_id, status")
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
  await emitAuditLog(supabase, {
    profile_id: user.id,
    user_email: user.email || "unknown",
    user_role: "coordinator",
    action_type: "UPDATE",
    module: "workflow",
    entity_type: "projects",
    entity_id: projectId,
    description: `Final verdict released: "${verdictCode}" for project "${project.title}". Remarks: ${remarks || "None"}.`,
    old_value: { projectId, status: project.status },
    new_value: { projectId, verdictCode, remarks },
    ip_address: ip,
    user_agent: userAgent,
  });

  // 5. Notify all student team members — non-blocking batch notification
  try {
    const recipientIds = new Set<string>();

    const { data: studentRecord } = await supabase
      .from("students")
      .select("profile_id")
      .eq("id", project.student_id)
      .maybeSingle();

    if (studentRecord?.profile_id) {
      recipientIds.add(studentRecord.profile_id);
    }

    const { data: members } = await supabase
      .from("project_members")
      .select("profile_id")
      .eq("project_id", projectId);

    (members || []).forEach((m) => {
      if (m.profile_id) recipientIds.add(m.profile_id);
    });

    const recipientList = Array.from(recipientIds);
    if (recipientList.length > 0) {
      await emitNotificationToMany(supabase, recipientList, {
        title: "Final Verdict Released",
        message: `Your defense outcome has been officially recorded: ${verdictCode.replace(/_/g, " ").toUpperCase()}.${remarks ? " Remarks: " + remarks : ""}`,
        eventType: "final_verdict_released",
        link: "/dashboard/grades",
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
    oldStatus: project.status || "in_progress",
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

  // Fetch annotation to verify existence and check project context
  const { data: annotation, error: annErr } = await supabase
    .from("annotations")
    .select("id, status, created_by, project_id")
    .eq("id", annotationId)
    .maybeSingle();

  if (annErr || !annotation) {
    throw new Error("Annotation not found.");
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
    if (annotation.project_id) {
      const { data: isMember } = await supabase
        .from("project_members")
        .select("id")
        .eq("project_id", annotation.project_id)
        .eq("profile_id", user.id)
        .maybeSingle();

      if (!isMember && !codes.includes("coordinator") && !codes.includes("sys_admin")) {
        throw new Error("Permission denied. You are not a member of this research project.");
      }
    }
  } else if (targetStatus === "verified" || targetStatus === "resolved") {
    if (!codes.includes("adviser") && !codes.includes("panelist") && !codes.includes("sys_admin")) {
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
