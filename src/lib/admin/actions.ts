"use server";

import { createClient } from "@/lib/supabase/server";
import { headers } from "next/headers";

/**
 * Updates a user role and logs the event
 */
export async function updateUserRoleAction(profileId: string, roleCode: string) {
  const supabase = await createClient();
  const headersList = await headers();
  const ip = headersList.get("x-forwarded-for")?.split(",")[0] || "127.0.0.1";
  const userAgent = headersList.get("user-agent") || "unknown";

  // 1. Authenticate user and verify sys_admin role
  const { data: { session }, error: authErr } = await supabase.auth.getSession();
  if (authErr || !session?.user) {
    throw new Error("Unauthorized. Please log in.");
  }

  const { data: callerRoles } = await supabase
    .from("user_roles")
    .select("roles(code)")
    .eq("profile_id", session.user.id);

  const codes = callerRoles?.map((ur: any) => ur.roles?.code) ?? [];
  if (!codes.includes("sys_admin")) {
    throw new Error("Permission denied. Only System Administrators can reassign roles.");
  }

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

  const oldRoleCode = (currentRoleLink as any)?.roles?.code || "none";

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
    profile_id: session.user.id,
    user_email: session.user.email || "unknown",
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
    academic_year: "2025-2026"
  });

  return { success: true };
}

export async function resetDemoDataAction() {
  const supabase = await createClient();

  // 1. Authenticate user and verify sys_admin role
  const { data: { session }, error: authErr } = await supabase.auth.getSession();
  if (authErr || !session?.user) {
    throw new Error("Unauthorized. Please log in.");
  }

  const { data: userRoles } = await supabase
    .from("user_roles")
    .select("roles(code)")
    .eq("profile_id", session.user.id);

  const codes = userRoles?.map((ur: any) => ur.roles?.code) ?? [];
  if (!codes.includes("sys_admin")) {
    throw new Error("Permission denied. Only System Administrators can reset demo data.");
  }

  // 2. Import seeder dynamically to avoid compile time circular dependencies and execute seeder
  const { runDemoSeeder } = await import("./seeder");
  await runDemoSeeder();

  return { success: true };
}
