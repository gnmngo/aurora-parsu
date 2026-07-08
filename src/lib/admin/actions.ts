"use server";

import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/server";
import { headers } from "next/headers";

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
    academic_year: "2025-2026"
  });

  return { success: true };
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
