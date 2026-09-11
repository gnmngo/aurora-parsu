"use server";

import { createClient } from "@/lib/supabase/server";
import { headers } from "next/headers";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { currentAcademicYear } from "@/lib/utils/academic-year";
import { validateCriteriaWeights } from "@/lib/rubric/scoring";

/** Helper to authorize coordinator/sys_admin roles using secure getUser() */
/** Helper to authorize coordinator/sys_admin/panelist roles using secure getUser() */
async function authorizeRubricManager(supabase: SupabaseClient, allowPanelist = false) {
  // Use getUser() which validates JWT with Supabase Auth server (not just cookie)
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) {
    throw new Error("Unauthorized. Please log in.");
  }

  const { data: userRoles } = await supabase
    .from("user_roles")
    .select("roles(code)")
    .eq("profile_id", user.id);

  const codes = (userRoles as { roles: { code: string } | { code: string }[] | null }[])?.map((ur) => {
    const r = Array.isArray(ur.roles) ? ur.roles[0] : ur.roles;
    return r?.code as string | undefined;
  }).filter(Boolean) ?? [];

  const isAuthorized = codes.includes("coordinator") || codes.includes("sys_admin") || (allowPanelist && codes.includes("panelist"));
  if (!isAuthorized) {
    throw new Error("Permission denied. Only defense committee members or coordinators can manage rubrics.");
  }
  return { user, roles: codes };
}

async function authorizeCoordinatorOrAdmin(supabase: SupabaseClient) {
  const { user } = await authorizeRubricManager(supabase, false);
  return user;
}

/** Helper to log audit logs */
async function logAudit(
  supabase: SupabaseClient,
  user: User,
  actionType: string,
  entityId: string,
  description: string,
  oldVal: unknown,
  newVal: unknown
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
    academic_year: currentAcademicYear()
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

export interface RubricCriterionInput {
  id?: string;
  name: string;
  weight: number;
}

export interface CreateRubricInput {
  projectId: string;
  title: string;
  criteria: RubricCriterionInput[];
  passingScore?: number;
  excellentScore?: number;
  targetComplianceRate?: number;
  minComplianceRate?: number;
  maxMajorUnresolved?: number;
}

export async function createRubricAction(input: CreateRubricInput) {
  const supabase = await createClient();
  const { user } = await authorizeRubricManager(supabase, true);

  if (!input.projectId) {
    throw new Error("Project ID is required to associate rubric template.");
  }
  if (!input.title?.trim()) {
    throw new Error("Rubric title is required.");
  }
  if (!input.criteria || input.criteria.length === 0) {
    throw new Error("At least one grading criterion is required.");
  }

  // Ensure criteria names are non-empty
  const sanitizedCriteria = input.criteria.map((c, idx) => {
    const name = c.name?.trim();
    if (!name) {
      throw new Error(`Criterion #${idx + 1} must have a non-empty name.`);
    }
    const weight = Number(c.weight);
    if (isNaN(weight) || weight <= 0) {
      throw new Error(`Criterion "${name}" must have a positive weight.`);
    }
    return {
      id: c.id?.trim() || `c_${Date.now()}_${idx}`,
      name,
      weight,
    };
  });

  // Strict 100% weight validation
  const validation = validateCriteriaWeights(sanitizedCriteria);
  if (!validation.valid) {
    throw new Error(
      `Criteria weights must total exactly 100%. Current total is ${validation.total.toFixed(1)}%.`
    );
  }

  const { data: created, error: insertErr } = await supabase
    .from("rubric_templates")
    .insert({
      project_id: input.projectId,
      title: input.title.trim(),
      criteria: sanitizedCriteria,
      passing_score: input.passingScore ?? 75,
      excellent_score: input.excellentScore ?? 85,
      target_compliance_rate: input.targetComplianceRate ?? 90,
      min_compliance_rate: input.minComplianceRate ?? 70,
      max_major_unresolved: input.maxMajorUnresolved ?? 2,
      created_by: user.id,
      is_published: true,
      is_active: true,
      is_archived: false,
      version: 1,
    })
    .select()
    .single();

  if (insertErr || !created) {
    throw new Error(`Failed to create rubric template: ${insertErr?.message || "Unknown error"}`);
  }

  await logAudit(
    supabase,
    user,
    "CREATE",
    created.id,
    `Created customizable rubric template "${created.title}" with ${sanitizedCriteria.length} criteria`,
    null,
    created
  );

  return created;
}

export interface UpdateRubricInput {
  templateId: string;
  title?: string;
  criteria: RubricCriterionInput[];
  passingScore?: number;
  excellentScore?: number;
  targetComplianceRate?: number;
  minComplianceRate?: number;
  maxMajorUnresolved?: number;
}

export async function updateRubricAction(input: UpdateRubricInput) {
  const supabase = await createClient();
  const { user } = await authorizeRubricManager(supabase, true);

  if (!input.templateId) {
    throw new Error("Template ID is required to update rubric.");
  }
  if (!input.criteria || input.criteria.length === 0) {
    throw new Error("At least one grading criterion is required.");
  }

  // Fetch current rubric
  const { data: existing, error: fetchErr } = await supabase
    .from("rubric_templates")
    .select("*")
    .eq("id", input.templateId)
    .single();

  if (fetchErr || !existing) {
    throw new Error("Rubric template not found.");
  }

  // Sanitize and validate criteria
  const sanitizedCriteria = input.criteria.map((c, idx) => {
    const name = c.name?.trim();
    if (!name) {
      throw new Error(`Criterion #${idx + 1} must have a non-empty name.`);
    }
    const weight = Number(c.weight);
    if (isNaN(weight) || weight <= 0) {
      throw new Error(`Criterion "${name}" must have a positive weight.`);
    }
    return {
      id: c.id?.trim() || `c_${Date.now()}_${idx}`,
      name,
      weight,
    };
  });

  // Strict 100% weight check
  const validation = validateCriteriaWeights(sanitizedCriteria);
  if (!validation.valid) {
    throw new Error(
      `Criteria weights must total exactly 100%. Current total is ${validation.total.toFixed(1)}%.`
    );
  }

  const updatePayload: Record<string, any> = {
    criteria: sanitizedCriteria,
    updated_at: new Date().toISOString(),
  };

  if (input.title?.trim()) {
    updatePayload.title = input.title.trim();
  }
  if (input.passingScore !== undefined) {
    updatePayload.passing_score = Number(input.passingScore);
  }
  if (input.excellentScore !== undefined) {
    updatePayload.excellent_score = Number(input.excellentScore);
  }
  if (input.targetComplianceRate !== undefined) {
    updatePayload.target_compliance_rate = Number(input.targetComplianceRate);
  }
  if (input.minComplianceRate !== undefined) {
    updatePayload.min_compliance_rate = Number(input.minComplianceRate);
  }
  if (input.maxMajorUnresolved !== undefined) {
    updatePayload.max_major_unresolved = Number(input.maxMajorUnresolved);
  }

  const { data: updated, error: updateErr } = await supabase
    .from("rubric_templates")
    .update(updatePayload)
    .eq("id", input.templateId)
    .select()
    .single();

  if (updateErr || !updated) {
    throw new Error(`Failed to update rubric template: ${updateErr?.message || "Unknown error"}`);
  }

  await logAudit(
    supabase,
    user,
    "UPDATE",
    input.templateId,
    `Updated criteria and configurations for rubric "${updated.title}"`,
    existing,
    updated
  );

  return updated;
}

export interface UpdateDefenseChairmanRubricInput {
  projectId: string;
  stageId: string;
  templateId?: string;
  criteria: Array<{
    id: string;
    name: string;
    description?: string;
    weight: number;
    max_score?: number;
  }>;
  passingScore?: number;
  saveAsDefault?: boolean;
}

/**
 * Allows the Defense Panel Chairman (or Admin/Coordinator) to customize rubric criteria and weights.
 * This applies to all panelists assigned to this defense, and optionally updates the stage default.
 */
export async function updateDefenseChairmanRubricAction(input: UpdateDefenseChairmanRubricInput) {
  const supabase = await createClient();
  const headersList = await headers();
  const ip = headersList.get("x-forwarded-for")?.split(",")[0] || "127.0.0.1";
  const userAgent = headersList.get("user-agent") || "unknown";

  // 1. Authenticate user
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) {
    throw new Error("Unauthorized. Please log in.");
  }

  // 2. Check if user is appointed Chairman in defense_panels or admin/coordinator
  const { data: panelAssignment } = await supabase
    .from("defense_panels")
    .select("panel_role")
    .eq("project_id", input.projectId)
    .eq("stage_id", input.stageId)
    .eq("profile_id", user.id)
    .maybeSingle();

  const { data: userRolesData } = await supabase
    .from("user_roles")
    .select("roles(code)")
    .eq("profile_id", user.id);

  const codes = (userRolesData as any[])?.map((ur) => {
    const r = Array.isArray(ur.roles) ? ur.roles[0] : ur.roles;
    return r?.code as string | undefined;
  }).filter(Boolean) as string[] ?? [];

  const isChair = panelAssignment?.panel_role === "chair";
  const isPrivileged = codes.includes("coordinator") || codes.includes("sys_admin");

  if (!isChair && !isPrivileged) {
    throw new Error("Permission Denied: Only the appointed Defense Panel Chairman can customize rubric grading criteria.");
  }

  // Validate weights
  const totalWeight = input.criteria.reduce((sum, c) => sum + Number(c.weight || 0), 0);
  if (Math.abs(totalWeight - 100) > 0.5) {
    throw new Error(`Criteria weights must sum to exactly 100%. Current sum: ${totalWeight.toFixed(1)}%`);
  }

  // 3. Upsert / update project-specific rubric template
  let targetId = input.templateId;
  const { data: existingProjRubric } = await supabase
    .from("rubric_templates")
    .select("id")
    .eq("project_id", input.projectId)
    .maybeSingle();

  let savedRubric: any;

  if (existingProjRubric) {
    const { data: updated, error: updateErr } = await supabase
      .from("rubric_templates")
      .update({
        criteria: input.criteria,
        passing_score: input.passingScore ?? 75,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existingProjRubric.id)
      .select()
      .single();

    if (updateErr) throw new Error(`Failed to update rubric: ${updateErr.message}`);
    savedRubric = updated;
    targetId = existingProjRubric.id;
  } else {
    // Create new project-specific rubric
    const { data: inserted, error: insertErr } = await supabase
      .from("rubric_templates")
      .insert({
        project_id: input.projectId,
        title: `Defense Committee Rubric (Chairman Customization)`,
        criteria: input.criteria,
        passing_score: input.passingScore ?? 75,
        excellent_score: 90,
        target_compliance_rate: 80,
        min_compliance_rate: 60,
        max_major_unresolved: 3,
        created_by: user.id,
        is_published: true,
        is_active: true,
        is_archived: false,
        version: 1,
      })
      .select()
      .single();

    if (insertErr) throw new Error(`Failed to create committee rubric: ${insertErr.message}`);
    savedRubric = inserted;
    targetId = inserted.id;
  }

  // 4. If saveAsDefault is true, also update the default template
  if (input.saveAsDefault) {
    await supabase
      .from("rubric_templates")
      .update({
        criteria: input.criteria,
        passing_score: input.passingScore ?? 75,
        updated_at: new Date().toISOString(),
      })
      .is("project_id", null)
      .eq("is_active", true);
  }

  // 5. Audit log
  await supabase.from("audit_logs").insert({
    profile_id: user.id,
    user_email: user.email || "unknown",
    user_role: isChair ? "defense_chair" : codes[0] || "coordinator",
    action_type: "UPDATE",
    module: "rubrics",
    entity_type: "rubric_templates",
    entity_id: targetId || "unknown",
    description: `Defense Panel Chairman updated rubric grading criteria for project defense (applied to all panelists)`,
    new_value: { criteria: input.criteria, passingScore: input.passingScore, savedAsDefault: input.saveAsDefault },
    ip_address: ip,
    user_agent: userAgent,
    academic_year: currentAcademicYear(),
  });

  return { success: true, rubric: savedRubric };
}

