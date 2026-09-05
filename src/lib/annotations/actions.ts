"use server";

import { createClient } from "@/lib/supabase/server";
import { headers } from "next/headers";
import { currentAcademicYear } from "@/lib/utils/academic-year";

export interface UpdateAnnotationStatusInput {
  annotationId: string;
  newStatus: "open" | "in_progress" | "addressed" | "verified" | "resolved" | "closed";
  notes?: string;
}

/**
 * Updates annotation status and records history
 */
export async function updateAnnotationStatusAction(input: UpdateAnnotationStatusInput) {
  const supabase = await createClient();
  const headersList = await headers();
  const ip = headersList.get("x-forwarded-for")?.split(",")[0] || "127.0.0.1";
  const userAgent = headersList.get("user-agent") || "unknown";

  // 1. Authenticate user
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) {
    throw new Error("Unauthorized. Please log in.");
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
    throw new Error("Student Permission Denied: Students can only mark annotations as Addressed.");
  }
  if (isFaculty && ["archived", "closed"].includes(input.newStatus)) {
    throw new Error("Faculty Permission Denied: Only coordinators and administrators can archive or close annotations.");
  }
  if (!isStudent && !isFaculty && !isAdminOrCoord) {
    throw new Error("Permission Denied: Unauthorized role for annotation transitions.");
  }

  // 2. Fetch current annotation status
  const { data: annotation, error: annErr } = await supabase
    .from("annotations")
    .select("status, document_version_id, document_versions(document_id, documents(project_id))")
    .eq("id", input.annotationId)
    .single();

  if (annErr || !annotation) {
    throw new Error("Annotation not found.");
  }

  const oldStatus = annotation.status;

  // 3. Update status in annotations table
  const { error: updateErr } = await supabase
    .from("annotations")
    .update({ status: input.newStatus })
    .eq("id", input.annotationId);

  if (updateErr) {
    throw new Error(`Failed to update annotation status: ${updateErr.message}`);
  }

  // 4. Record entry in annotation_history
  const { error: histErr } = await supabase
    .from("annotation_history")
    .insert({
      annotation_id: input.annotationId,
      from_status: oldStatus,
      to_status: input.newStatus,
      notes: input.notes || null,
      changed_by: user.id
    });

  if (histErr) {
    console.error("Error inserting annotation history:", histErr);
  }

  // 5. Log audit trail
  await supabase.from("audit_logs").insert({
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
    academic_year: currentAcademicYear()
  });

  return { success: true };
}


/**
 * Creates annotation reply + emits annotation_replied notification. Sprint 2E.
 * Non-blocking notification: reply succeeds even if notification fails.
 */
export async function createAnnotationReplyAction(annotationId: string, content: string) {
  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) throw new Error("Unauthorized. Please log in.");
  if (!content?.trim()) throw new Error("Reply cannot be empty.");

  const { error } = await supabase
    .from("annotation_replies")
    .insert({ annotation_id: annotationId, content: content.trim(), created_by: user.id });

  if (error) throw new Error("Failed to add reply: " + error.message);

  try {
    const { emitNotification } = await import("@/lib/notifications/emit");
    const { data: ann } = await supabase
      .from("annotations")
      .select("created_by")
      .eq("id", annotationId)
      .maybeSingle();
    if (ann?.created_by && ann.created_by !== user.id) {
      const preview = content.trim().slice(0, 80) + (content.length > 80 ? "..." : "");
      await emitNotification({
        supabase,
        recipientProfileId: ann.created_by,
        title: "New Reply on Your Annotation",
        message: "A reply was added to your annotation: \"" + preview + "\"",
        eventType: "annotation_replied",
        metadata: { annotationId, replyAuthorId: user.id },
      });
    }
  } catch (e) {
    console.error("[createAnnotationReplyAction] Notification failed:", e instanceof Error ? e.message : e);
  }

  return { success: true };
}

export interface CreateAnnotationInput {
  documentVersionId: string;
  pageNumber: number;
  content: string;
  severity?: "info" | "minor" | "major" | "critical";
  selectedText?: string;
  coordinates?: { left: number; top: number; width: number; height: number };
  boundingBoxes?: any;
  type?: string;
}

/**
 * Creates a coordinate or text annotation on a document version, logs history,
 * and notifies all project student authors.
 */
export async function createAnnotationAction(input: CreateAnnotationInput) {
  const supabase = await createClient();
  const headersList = await headers();
  const ip = headersList.get("x-forwarded-for")?.split(",")[0] || "127.0.0.1";
  const userAgent = headersList.get("user-agent") || "unknown";

  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();
  if (authErr || !user) throw new Error("Unauthorized. Please log in.");
  if (!input.content?.trim()) throw new Error("Annotation content cannot be empty.");

  // 1. Resolve document, project, and stage details
  const { data: docVer, error: verErr } = await supabase
    .from("document_versions")
    .select("document_id, documents(id, stage_id, project_id, projects(id, title, student_id))")
    .eq("id", input.documentVersionId)
    .single();

  if (verErr || !docVer) {
    throw new Error("Target document version not found.");
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
      bounding_boxes: input.boundingBoxes || null,
      created_by: user.id,
    })
    .select()
    .single();

  if (insertErr || !newAnnotation) {
    throw new Error(`Failed to create annotation: ${insertErr?.message}`);
  }

  // 3. Record in annotation_history
  await supabase.from("annotation_history").insert({
    annotation_id: newAnnotation.id,
    from_status: null,
    to_status: "open",
    notes: "Initial feedback comment created",
    changed_by: user.id,
  });

  // 4. Log evaluation event if projectId & stageId exist
  if (projectId && stageId) {
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
  }

  // 5. Notify all student members of the project
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
        await emitNotificationToMany(supabase, otherStudentIds, {
          title: `New Feedback Comment (p. ${input.pageNumber || 1})`,
          message: `A ${input.severity || "minor"} feedback remark was added: "${preview}..."`,
          eventType: "annotation_created",
          actionUrl: `/dashboard/my-project`,
          metadata: {
            annotationId: newAnnotation.id,
            pageNumber: input.pageNumber || 1,
            severity: input.severity || "minor",
          },
        });
      }
    } catch (notifErr) {
      console.error("[createAnnotationAction] Notification warning:", notifErr);
    }
  }

  // 6. Audit trail
  await supabase.from("audit_logs").insert({
    profile_id: user.id,
    user_email: user.email || "unknown",
    user_role: "faculty",
    action_type: "INSERT",
    module: "revisions",
    entity_type: "annotations",
    entity_id: newAnnotation.id,
    description: `Added ${input.severity || "minor"} annotation on page ${input.pageNumber || 1}`,
    new_value: { content: input.content.slice(0, 100), severity: input.severity },
    ip_address: ip,
    user_agent: userAgent,
    academic_year: currentAcademicYear(),
  });

  return { success: true, annotation: newAnnotation };
}

