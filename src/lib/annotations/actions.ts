"use server";

import { createClient } from "@/lib/supabase/server";
import { headers } from "next/headers";

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
  const { data: { session }, error: authErr } = await supabase.auth.getSession();
  if (authErr || !session?.user) {
    throw new Error("Unauthorized. Please log in.");
  }

  // Fetch roles
  const { data: userRoles } = await supabase
    .from("user_roles")
    .select("roles(code)")
    .eq("profile_id", session.user.id);

  const codes = userRoles?.map((ur: any) => ur.roles?.code) ?? [];
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
      changed_by: session.user.id
    });

  if (histErr) {
    console.error("Error inserting annotation history:", histErr);
  }

  // 5. Log audit trail
  const projectId = (annotation.document_versions as any)?.documents?.project_id || "00000000-0000-0000-0000-000000000000";
  await supabase.from("audit_logs").insert({
    profile_id: session.user.id,
    user_email: session.user.email || "unknown",
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
    academic_year: "2025-2026"
  });

  return { success: true };
}
