"use server";

import { createClient } from "@/lib/supabase/server";
import { headers } from "next/headers";
import { emitAuditLog } from "@/lib/audit/log";

export interface UpdateAnnotationStatusInput {
  annotationId: string;
  newStatus: "open" | "in_progress" | "addressed" | "verified" | "resolved" | "archived" | "closed";
  notes?: string;
}

/**
 * Updates annotation status and records history
 */
export async function updateAnnotationStatusAction(input: UpdateAnnotationStatusInput) {
  try {
    const supabase = await createClient();
    const headersList = await headers();
    const ip = headersList.get("x-forwarded-for")?.split(",")[0] || "127.0.0.1";
    const userAgent = headersList.get("user-agent") || "unknown";

    // 1. Authenticate user
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) {
      return { success: false, error: "Unauthorized. Please log in." };
    }

    // Fetch roles
    const { data: userRolesData } = await supabase
      .from("user_roles")
      .select("roles(code)")
      .eq("profile_id", user.id);

    const codes = (userRolesData as { roles: { code: string } | { code: string }[] | null }[])?.map((ur) => {
      const r = Array.isArray(ur.roles) ? ur.roles[0] : ur.roles;
      return r?.code as string | undefined;
    }).filter(Boolean) as string[] ?? [];

    const isStudent = codes.includes("student");
    const isFaculty = codes.includes("adviser") || codes.includes("panelist");
    const isAdminOrCoord = codes.includes("coordinator") || codes.includes("sys_admin");

    if (isStudent && ["verified", "resolved", "archived", "closed"].includes(input.newStatus)) {
      return { success: false, error: "Student Permission Denied: Students can only mark annotations as Addressed." };
    }
    if (isFaculty && ["archived", "closed"].includes(input.newStatus)) {
      return { success: false, error: "Faculty Permission Denied: Only coordinators and administrators can archive or close annotations." };
    }
    if (!isStudent && !isFaculty && !isAdminOrCoord) {
      return { success: false, error: "Permission Denied: Unauthorized role for annotation transitions." };
    }

    // 2. Fetch current annotation status
    const { data: annotation, error: annErr } = await supabase
      .from("annotations")
      .select("status, document_version_id, document_versions(document_id, documents(project_id))")
      .eq("id", input.annotationId)
      .single();

    if (annErr || !annotation) {
      return { success: false, error: "Annotation not found." };
    }

    const oldStatus = annotation.status;

    // 3. Update status in annotations table
    const { error: updateErr } = await supabase
      .from("annotations")
      .update({ status: input.newStatus })
      .eq("id", input.annotationId);

    if (updateErr) {
      return { success: false, error: `Failed to update annotation status: ${updateErr.message}` };
    }

    // 4. Record entry in annotation_history (non-fatal)
    try {
      const { error: histErr } = await supabase
        .from("annotation_history")
        .insert({
          annotation_id: input.annotationId,
          from_status: oldStatus,
          to_status: input.newStatus,
          notes: input.notes || null,
          changed_by: user.id,
        });

      if (histErr) {
        console.warn("[updateAnnotationStatusAction] Error inserting annotation history (non-fatal):", histErr);
      }
    } catch (histEx) {
      console.warn("[updateAnnotationStatusAction] History exception (non-fatal):", histEx);
    }

    // 5. Log audit trail (non-fatal)
    await emitAuditLog(supabase, {
      profile_id: user.id,
      user_email: user.email || "unknown",
      user_role: "authenticated",
      action_type: "UPDATE",
      module: "revisions",
      entity_type: "annotations",
      entity_id: input.annotationId,
      description: `Updated annotation status from "${oldStatus}" to "${input.newStatus}"`,
      old_value: { status: oldStatus },
      new_value: { status: input.newStatus, notes: input.notes },
      ip_address: ip,
      user_agent: userAgent,
    });

    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[updateAnnotationStatusAction] Unexpected error:", msg);
    return { success: false, error: msg };
  }
}

/**
 * Creates annotation reply + emits annotation_replied notification.
 * Non-blocking notification: reply succeeds even if notification fails.
 */
export async function createAnnotationReplyAction(annotationId: string, content: string) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) return { success: false, error: "Unauthorized. Please log in." };
    if (!content?.trim()) return { success: false, error: "Reply cannot be empty." };

    const { error } = await supabase
      .from("annotation_replies")
      .insert({ annotation_id: annotationId, content: content.trim(), created_by: user.id });

    if (error) return { success: false, error: "Failed to add reply: " + error.message };

    try {
      const { emitNotification } = await import("@/lib/notifications/emit");
      const { data: ann } = await supabase
        .from("annotations")
        .select(`
          created_by,
          document_version_id,
          document_versions (
            document_id,
            documents ( project_id, stage_id )
          )
        `)
        .eq("id", annotationId)
        .maybeSingle();
      if (ann?.created_by && ann.created_by !== user.id) {
        const doc = (ann.document_versions as any)?.documents;
        const replyProjectId = doc?.project_id;
        const replyStageId = doc?.stage_id;
        const targetUrl = replyProjectId
          ? `/workspace/${replyProjectId}/${replyStageId || ""}?annotation=${annotationId}`
          : "/dashboard/my-project";

        const preview = content.trim().slice(0, 80) + (content.length > 80 ? "..." : "");
        await emitNotification({
          supabase,
          recipientProfileId: ann.created_by,
          title: "New Reply on Your Annotation",
          message: "A reply was added to your annotation: \"" + preview + "\"",
          eventType: "annotation_replied",
          actionUrl: targetUrl,
          metadata: { annotationId, replyAuthorId: user.id },
        });
      }
    } catch (e) {
      console.warn("[createAnnotationReplyAction] Notification notice (non-fatal):", e instanceof Error ? e.message : e);
    }

    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[createAnnotationReplyAction] Unexpected error:", msg);
    return { success: false, error: msg };
  }
}

export interface CreateAnnotationInput {
  documentVersionId: string;
  pageNumber: number;
  content: string;
  severity?: "info" | "minor" | "major" | "critical";
  selectedText?: string;
  coordinates?: {
    isDrawing?: boolean;
    svgPath?: string;
    strokeColor?: string;
    strokeWidth?: number;
    left: number;
    top: number;
    width: number;
    height: number;
    [key: string]: any;
  };
  type?: string;
}

/**
 * Creates a coordinate or text annotation on a document version, logs history,
 * and notifies all project student authors.
 */
export async function createAnnotationAction(input: CreateAnnotationInput) {
  try {
    const supabase = await createClient();
    const headersList = await headers();
    const ip = headersList.get("x-forwarded-for")?.split(",")[0] || "127.0.0.1";
    const userAgent = headersList.get("user-agent") || "unknown";

    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();
    if (authErr || !user) return { success: false, error: "Unauthorized. Please log in to add annotations." };
    if (!input.content?.trim()) return { success: false, error: "Annotation content cannot be empty." };

    // Verify role authorization: only faculty / admins can create reviewer annotations
    const { data: userRolesData } = await supabase
      .from("user_roles")
      .select("roles(code)")
      .eq("profile_id", user.id);

    const codes = (userRolesData as { roles: { code: string } | { code: string }[] | null }[])
      ?.map((ur) => {
        const r = Array.isArray(ur.roles) ? ur.roles[0] : ur.roles;
        return r?.code as string | undefined;
      })
      .filter(Boolean) as string[] ?? [];

    const isStudentOnly =
      codes.includes("student") &&
      !codes.some((c) => ["adviser", "panelist", "coordinator", "college_dean", "sys_admin"].includes(c));

    if (isStudentOnly) {
      return {
        success: false,
        error: "Permission denied: Students cannot create reviewer annotations on the manuscript. You can review comments and submit replies.",
      };
    }

    // 1. Resolve document, project, and stage details
    const { data: docVer, error: verErr } = await supabase
      .from("document_versions")
      .select("document_id, documents(id, stage_id, project_id, projects(id, title, student_id))")
      .eq("id", input.documentVersionId)
      .single();

    if (verErr || !docVer) {
      return { success: false, error: "Target manuscript document version not found." };
    }

    const doc = Array.isArray(docVer.documents) ? docVer.documents[0] : docVer.documents;
    const project = doc?.projects ? (Array.isArray(doc.projects) ? doc.projects[0] : doc.projects) : null;
    const projectId = project?.id;
    const stageId = doc?.stage_id;

    // 2. Insert annotation
    const { data: newAnnotation, error: insertErr } = await supabase
      .from("annotations")
      .insert({
        document_version_id: input.documentVersionId,
        type: input.type || "text_comment",
        page_number: input.pageNumber || 1,
        selected_text: input.selectedText?.trim() || null,
        content: input.content.trim(),
        severity: input.severity || "minor",
        status: "open",
        coordinates: input.coordinates || { left: 10, top: 10, width: 80, height: 5 },
        created_by: user.id,
      })
      .select()
      .single();

    if (insertErr || !newAnnotation) {
      return { success: false, error: `Failed to create annotation: ${insertErr?.message || "database error"}` };
    }

    // 3. Record in annotation_history (non-fatal)
    try {
      await supabase.from("annotation_history").insert({
        annotation_id: newAnnotation.id,
        from_status: null,
        to_status: "open",
        notes: "Initial feedback comment created",
        changed_by: user.id,
      });
    } catch (histErr) {
      console.warn("[createAnnotationAction] History error (non-fatal):", histErr);
    }

    // 4. Log evaluation event if projectId & stageId exist (non-fatal)
    if (projectId && stageId) {
      try {
        await supabase.from("evaluation_events").insert({
          project_id: projectId,
          stage_id: stageId,
          event_type: "annotation_created",
          payload: {
            annotation_id: newAnnotation.id,
            page_number: input.pageNumber || 1,
            severity: input.severity || "minor",
          },
        });
      } catch (evErr) {
        console.warn("[createAnnotationAction] Evaluation event error (non-fatal):", evErr);
      }
    }

    // 5. Notify all student members of the project (non-fatal)
    if (projectId) {
      try {
        const { data: members } = await supabase
          .from("project_members")
          .select("profile_id")
          .eq("project_id", projectId)
          .in("member_role", ["student_leader", "student"]);

        const studentIds = members?.map((m: any) => m.profile_id).filter(Boolean) || [];

        if (project?.student_id) {
          const { data: studentRecord } = await supabase
            .from("students")
            .select("profile_id")
            .eq("id", project.student_id)
            .maybeSingle();

          if (studentRecord?.profile_id && !studentIds.includes(studentRecord.profile_id)) {
            studentIds.push(studentRecord.profile_id);
          }
        }

        const otherStudentIds = studentIds.filter((id) => id !== user.id);

        if (otherStudentIds.length > 0) {
          const { emitNotificationToMany } = await import("@/lib/notifications/emit");
          const preview = input.content.trim().slice(0, 70);
          const targetUrl = projectId
            ? `/workspace/${projectId}/${stageId || ""}?annotation=${newAnnotation.id}`
            : "/dashboard/my-project";

          await emitNotificationToMany(supabase, otherStudentIds, {
            title: `New Feedback Comment (p. ${input.pageNumber || 1})`,
            message: `A ${input.severity || "minor"} feedback remark was added: "${preview}..."`,
            eventType: "annotation_created",
            actionUrl: targetUrl,
            metadata: {
              annotationId: newAnnotation.id,
              pageNumber: input.pageNumber || 1,
              severity: input.severity || "minor",
            },
          });
        }
      } catch (notifErr) {
        console.warn("[createAnnotationAction] Notification warning (non-fatal):", notifErr);
      }
    }

    // 6. Audit trail (non-fatal)
    await emitAuditLog(supabase, {
      profile_id: user.id,
      user_email: user.email || "unknown",
      user_role: "faculty",
      action_type: "CREATE",
      module: "revisions",
      entity_type: "annotations",
      entity_id: newAnnotation.id,
      description: `Added ${input.severity || "minor"} annotation on page ${input.pageNumber || 1}`,
      new_value: { content: input.content.slice(0, 100), severity: input.severity },
      ip_address: ip,
      user_agent: userAgent,
    });

    return { success: true, annotation: newAnnotation };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[createAnnotationAction] Unexpected error:", msg);
    return { success: false, error: msg };
  }
}

/**
 * Deletes an annotation and its replies/history.
 * Allowed for:
 * 1. The original author of the annotation
 * 2. Assigned panelist or adviser on the project
 * 3. Coordinators / system administrators
 */
export async function deleteAnnotationAction(annotationId: string) {
  try {
    const supabase = await createClient();
    const headersList = await headers();
    const ip = headersList.get("x-forwarded-for")?.split(",")[0] || "127.0.0.1";
    const userAgent = headersList.get("user-agent") || "unknown";

    // 1. Authenticate user
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) {
      return { success: false, error: "Unauthorized. Please log in." };
    }

    // 2. Fetch annotation to check ownership
    const { data: ann, error: annErr } = await supabase
      .from("annotations")
      .select("id, created_by, content, page_number, severity, document_version_id")
      .eq("id", annotationId)
      .single();

    if (annErr || !ann) {
      return { success: false, error: "Annotation not found or already deleted." };
    }

    // Check roles
    const { data: userRolesData } = await supabase
      .from("user_roles")
      .select("roles(code)")
      .eq("profile_id", user.id);

    const codes = (userRolesData as { roles: { code: string } | { code: string }[] | null }[])?.map((ur) => {
      const r = Array.isArray(ur.roles) ? ur.roles[0] : ur.roles;
      return r?.code as string | undefined;
    }).filter(Boolean) as string[] ?? [];

    const isAuthor = ann.created_by === user.id;
    const isPrivileged = codes.some(c => ["coordinator", "sys_admin", "panelist", "adviser"].includes(c));

    if (!isAuthor && !isPrivileged) {
      return { success: false, error: "Permission Denied: You do not have permission to delete this annotation." };
    }

    // 3. Delete dependent records first if any (replies, history)
    try {
      await supabase.from("annotation_replies").delete().eq("annotation_id", annotationId);
      await supabase.from("annotation_history").delete().eq("annotation_id", annotationId);
    } catch (cleanupErr) {
      console.warn("[deleteAnnotationAction] Dependent cleanup warning (non-fatal):", cleanupErr);
    }

    // 4. Delete the annotation
    const { error: delErr } = await supabase
      .from("annotations")
      .delete()
      .eq("id", annotationId);

    if (delErr) {
      return { success: false, error: `Failed to delete annotation: ${delErr.message}` };
    }

    // 5. Audit log (non-fatal)
    await emitAuditLog(supabase, {
      profile_id: user.id,
      user_email: user.email || "unknown",
      user_role: codes[0] || "authenticated",
      action_type: "DELETE",
      module: "revisions",
      entity_type: "annotations",
      entity_id: annotationId,
      description: `Deleted annotation on page ${ann.page_number || 1}`,
      old_value: { content: ann.content?.slice(0, 100), severity: ann.severity },
      ip_address: ip,
      user_agent: userAgent,
    });

    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[deleteAnnotationAction] Unexpected error:", msg);
    return { success: false, error: msg };
  }
}
