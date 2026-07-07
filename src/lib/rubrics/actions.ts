"use server";

import { createClient } from "@/lib/supabase/server";
import { headers } from "next/headers";

/** Helper to authorize coordinator/sys_admin roles */
async function authorizeCoordinatorOrAdmin(supabase: any) {
  const { data: { session }, error: authErr } = await supabase.auth.getSession();
  if (authErr || !session?.user) {
    throw new Error("Unauthorized. Please log in.");
  }

  const { data: userRoles } = await supabase
    .from("user_roles")
    .select("roles(code)")
    .eq("profile_id", session.user.id);

  const codes = userRoles?.map((ur: any) => ur.roles?.code) ?? [];
  const isAuthorized = codes.includes("coordinator") || codes.includes("sys_admin");
  if (!isAuthorized) {
    throw new Error("Permission denied. Only coordinators can manage rubrics.");
  }
  return session.user;
}

/** Helper to log audit logs */
async function logAudit(
  supabase: any,
  user: any,
  actionType: string,
  entityId: string,
  description: string,
  oldVal: any,
  newVal: any
) {
  const headersList = await headers();
  const ip = headersList.get("x-forwarded-for")?.split(",")[0] || "127.0.0.1";
  const userAgent = headersList.get("user-agent") || "unknown";

  await supabase.from("audit_logs").insert({
    profile_id: user.id,
    user_email: user.email || "unknown",
    user_role: "coordinator",
    action_type: actionType,
    module: "rubrics",
    entity_type: "rubric_templates",
    entity_id: entityId,
    description,
    old_value: oldVal,
    new_value: newVal,
    ip_address: ip,
    user_agent: userAgent,
    academic_year: "2025-2026"
  });
}

export async function cloneRubricAction(templateId: string) {
  const supabase = await createClient();
  const user = await authorizeCoordinatorOrAdmin(supabase);

  const { data: rubric, error: fetchErr } = await supabase
    .from("rubric_templates")
    .select("*")
    .eq("id", templateId)
    .single();

  if (fetchErr || !rubric) {
    throw new Error("Rubric template not found.");
  }

  const { data: cloned, error: insertErr } = await supabase
    .from("rubric_templates")
    .insert({
      project_id: rubric.project_id,
      title: `${rubric.title} (Clone)`,
      criteria: rubric.criteria,
      passing_score: rubric.passing_score,
      excellent_score: rubric.excellent_score,
      target_compliance_rate: rubric.target_compliance_rate,
      min_compliance_rate: rubric.min_compliance_rate,
      max_major_unresolved: rubric.max_major_unresolved,
      created_by: user.id,
      is_published: false,
      is_active: true,
      is_archived: false,
      version: 1,
      parent_template_id: templateId
    })
    .select()
    .single();

  if (insertErr || !cloned) {
    throw new Error(`Failed to clone rubric: ${insertErr?.message}`);
  }

  await logAudit(supabase, user, "CREATE", cloned.id, `Cloned rubric template "${rubric.title}" as "${cloned.title}"`, { template_id: templateId }, { cloned_id: cloned.id });
  return cloned;
}

export async function versionRubricAction(templateId: string) {
  const supabase = await createClient();
  const user = await authorizeCoordinatorOrAdmin(supabase);

  const { data: rubric, error: fetchErr } = await supabase
    .from("rubric_templates")
    .select("*")
    .eq("id", templateId)
    .single();

  if (fetchErr || !rubric) {
    throw new Error("Rubric template not found.");
  }

  const { data: newVersion, error: insertErr } = await supabase
    .from("rubric_templates")
    .insert({
      project_id: rubric.project_id,
      title: rubric.title,
      criteria: rubric.criteria,
      passing_score: rubric.passing_score,
      excellent_score: rubric.excellent_score,
      target_compliance_rate: rubric.target_compliance_rate,
      min_compliance_rate: rubric.min_compliance_rate,
      max_major_unresolved: rubric.max_major_unresolved,
      created_by: user.id,
      is_published: false,
      is_active: true,
      is_archived: false,
      version: (rubric.version || 1) + 1,
      parent_template_id: templateId
    })
    .select()
    .single();

  if (insertErr || !newVersion) {
    throw new Error(`Failed to create new version of rubric: ${insertErr?.message}`);
  }

  await logAudit(supabase, user, "CREATE", newVersion.id, `Created new version ${newVersion.version} of rubric template "${rubric.title}"`, { template_id: templateId }, { version_id: newVersion.id });
  return newVersion;
}

export async function publishRubricAction(templateId: string) {
  const supabase = await createClient();
  const user = await authorizeCoordinatorOrAdmin(supabase);

  const { data: updated, error: updateErr } = await supabase
    .from("rubric_templates")
    .update({ is_published: true })
    .eq("id", templateId)
    .select()
    .single();

  if (updateErr || !updated) {
    throw new Error(`Failed to publish rubric: ${updateErr?.message}`);
  }

  await logAudit(supabase, user, "UPDATE", templateId, `Published rubric template "${updated.title}"`, { is_published: false }, { is_published: true });
  return updated;
}

export async function toggleActiveRubricAction(templateId: string, isActive: boolean) {
  const supabase = await createClient();
  const user = await authorizeCoordinatorOrAdmin(supabase);

  const { data: updated, error: updateErr } = await supabase
    .from("rubric_templates")
    .update({ is_active: isActive })
    .eq("id", templateId)
    .select()
    .single();

  if (updateErr || !updated) {
    throw new Error(`Failed to toggle rubric state: ${updateErr?.message}`);
  }

  await logAudit(supabase, user, "UPDATE", templateId, `Toggled active state of rubric template "${updated.title}" to ${isActive}`, { is_active: !isActive }, { is_active: isActive });
  return updated;
}

export async function archiveRubricAction(templateId: string) {
  const supabase = await createClient();
  const user = await authorizeCoordinatorOrAdmin(supabase);

  const { data: updated, error: updateErr } = await supabase
    .from("rubric_templates")
    .update({ is_archived: true, is_active: false })
    .eq("id", templateId)
    .select()
    .single();

  if (updateErr || !updated) {
    throw new Error(`Failed to archive rubric: ${updateErr?.message}`);
  }

  await logAudit(supabase, user, "UPDATE", templateId, `Archived rubric template "${updated.title}"`, { is_archived: false }, { is_archived: true });
  return updated;
}

export async function deleteRubricAction(templateId: string) {
  const supabase = await createClient();
  const user = await authorizeCoordinatorOrAdmin(supabase);

  // Check if it's used in evaluations first to warn / log
  const { data: used } = await supabase
    .from("evaluations")
    .select("id")
    .eq("rubric_template_id", templateId)
    .limit(1);

  const { error: deleteErr } = await supabase
    .from("rubric_templates")
    .delete()
    .eq("id", templateId);

  if (deleteErr) {
    throw new Error(`Failed to delete rubric template: ${deleteErr.message}`);
  }

  if (used && used.length > 0) {
    // Aborted by trigger, soft deleted instead
    await logAudit(supabase, user, "DELETE", templateId, `Soft-deleted rubric template because it is referenced in evaluations`, { template_id: templateId }, { soft_deleted: true });
    return { softDeleted: true };
  }

  await logAudit(supabase, user, "DELETE", templateId, `Deleted rubric template`, { template_id: templateId }, null);
  return { softDeleted: false };
}
