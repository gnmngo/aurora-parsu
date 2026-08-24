"use server";

import { createClient, createServiceClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/server";
import { headers } from "next/headers";
import { currentAcademicYear } from "@/lib/utils/academic-year";

/**
 * Updates a user role and logs the event.
 * Only sys_admin can invoke this action.
 */
export async function updateUserRoleAction(profileId: string, roleCode: string) {
  const supabase = await createClient();
  const headersList = await headers();
  const ip = headersList.get("x-forwarded-for")?.split(",")[0] || "127.0.0.1";
  const userAgent = headersList.get("user-agent") || "unknown";

  // 1. Authenticate and authorize (sys_admin only)
  const caller = await requireRole(supabase, ["sys_admin"]);

  // 2. Fetch role ID of selected code
  const { data: targetRole, error: roleErr } = await supabase
    .from("roles")
    .select("id, name")
    .eq("code", roleCode)
    .single();

  if (roleErr || !targetRole) {
    throw new Error(`Role "${roleCode}" not found in database.`);
  }

  // Fetch target user's details for logging
  const { data: profile } = await supabase
    .from("profiles")
    .select("first_name, last_name, email")
    .eq("id", profileId)
    .single();

  const userName = profile ? `${profile.first_name} ${profile.last_name}` : "Unknown User";

  // Fetch current role code
  const { data: currentRoleLink } = await supabase
    .from("user_roles")
    .select("roles(code)")
    .eq("profile_id", profileId)
    .maybeSingle();

  const currentLink = currentRoleLink as { roles: { code: string } | { code: string }[] | null } | null;
  const r = currentLink?.roles;
  const oldRoleCode = (Array.isArray(r) ? r[0]?.code : r?.code) || "none";

  // 3. Update role (delete old linkage and insert new)
  await supabase
    .from("user_roles")
    .delete()
    .eq("profile_id", profileId);

  const { error: insertErr } = await supabase
    .from("user_roles")
    .insert({
      profile_id: profileId,
      role_id: targetRole.id
    });

  if (insertErr) {
    throw new Error(`Failed to assign user role: ${insertErr.message}`);
  }

  // 4. Log audit log
  await supabase.from("audit_logs").insert({
    profile_id: caller.id,
    user_email: caller.email,
    user_role: "sys_admin",
    action_type: "UPDATE",
    module: "users",
    entity_type: "user_roles",
    entity_id: profileId,
    description: `Reassigned user "${userName}" from role "${oldRoleCode}" to "${roleCode}"`,
    old_value: { role: oldRoleCode },
    new_value: { role: roleCode },
    ip_address: ip,
    user_agent: userAgent,
    academic_year: currentAcademicYear()
  });

  return { success: true };
}

/**
 * Updates a user account status (approved, rejected, pending, suspended).
 * Allowed for sys_admin and coordinator.
 */
export async function updateUserStatusAction(
  profileId: string,
  newStatus: "approved" | "rejected" | "suspended" | "pending"
) {
  const supabase = await createClient();
  const headersList = await headers();
  const ip = headersList.get("x-forwarded-for")?.split(",")[0] || "127.0.0.1";
  const userAgent = headersList.get("user-agent") || "unknown";

  // 1. Authenticate (sys_admin or coordinator)
  const caller = await requireRole(supabase, ["sys_admin", "coordinator"]);

  // 2. Fetch target profile
  const { data: profile, error: fetchErr } = await supabase
    .from("profiles")
    .select("first_name, last_name, email, status")
    .eq("id", profileId)
    .single();

  if (fetchErr || !profile) {
    throw new Error("Target user profile not found.");
  }

  const oldStatus = profile.status;
  const userName = `${profile.first_name} ${profile.last_name}`;

  // 3. Update status in database
  const { error: updateErr } = await supabase
    .from("profiles")
    .update({
      status: newStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("id", profileId);

  if (updateErr) {
    throw new Error(`Failed to update account status: ${updateErr.message}`);
  }

  // 4. Audit Log
  await supabase.from("audit_logs").insert({
    profile_id: caller.id,
    user_email: caller.email,
    user_role: "sys_admin",
    action_type: "UPDATE",
    module: "users",
    entity_type: "profiles",
    entity_id: profileId,
    description: `Changed account verification status for "${userName}" (${profile.email}) from "${oldStatus}" to "${newStatus}"`,
    old_value: { status: oldStatus },
    new_value: { status: newStatus },
    ip_address: ip,
    user_agent: userAgent,
    academic_year: currentAcademicYear(),
  });

  return { success: true, newStatus };
}

export interface CreateFacultyInput {
  email: string;
  password?: string;
  firstName: string;
  lastName: string;
  role: "adviser" | "panelist" | "coordinator";
  employeeNumber: string;
  campusId?: string | null;
  collegeId?: string | null;
  departmentId?: string | null;
  specialization?: string;
  academicRank?: string;
}

/**
 * Directly creates or invites an authorized faculty member (pre-approved).
 * Option B: Coordinators / SysAdmins can directly onboard verified faculty.
 */
export async function createFacultyAccountAction(input: CreateFacultyInput) {
  const callerClient = await createClient();
  const caller = await requireRole(callerClient, ["sys_admin", "coordinator"]);
  const serviceClient = await createServiceClient();

  const generatedPass = input.password || "ParSU-" + Math.random().toString(36).slice(-8) + "!";

  const metaData = {
    first_name: input.firstName.trim(),
    last_name: input.lastName.trim(),
    role: input.role,
    employee_number: input.employeeNumber.trim(),
    campus_id: input.campusId || null,
    college_id: input.collegeId || null,
    department_id: input.departmentId || null,
    specialization: input.specialization?.trim() || "General",
    academic_rank: input.academicRank || "Assistant Professor",
    auto_approved: true, // Mark as pre-approved
  };

  const { data, error } = await serviceClient.auth.admin.createUser({
    email: input.email.trim(),
    password: generatedPass,
    email_confirm: true,
    user_metadata: metaData,
  });

  if (error) {
    throw new Error(error.message);
  }

  // Audit log
  await serviceClient.from("audit_logs").insert({
    profile_id: caller.id,
    user_email: caller.email,
    user_role: "sys_admin",
    action_type: "CREATE",
    module: "users",
    entity_type: "profiles",
    entity_id: data.user.id,
    description: `Directly created and pre-approved faculty account for "${input.firstName} ${input.lastName}" (${input.email}) as "${input.role}"`,
    new_value: { role: input.role, email: input.email, employee_number: input.employeeNumber },
    academic_year: currentAcademicYear(),
  });

  return { 
    success: true, 
    userId: data.user.id, 
    temporaryPassword: input.password ? undefined : generatedPass 
  };
}

export async function resetDemoDataAction() {
  const supabase = await createClient();

  // Authenticate and authorize (sys_admin only)
  await requireRole(supabase, ["sys_admin"]);

  // Import seeder dynamically to avoid compile time circular dependencies
  const { runDemoSeeder } = await import("./seeder");
  await runDemoSeeder();

  return { success: true };
}
