"use server";

/**
 * Server-side authentication helpers.
 *
 * IMPORTANT: Always use getUser() (not getSession()) in server actions.
 * getUser() validates the JWT with Supabase Auth server.
 * getSession() only reads from the cookie — it can be spoofed.
 */


import type { SupabaseClient } from "@supabase/supabase-js";

export interface AuthenticatedUser {
  id: string;
  email: string;
}

/**
 * Verifies the session using the secure getUser() call.
 * Throws if not authenticated.
 */
export async function requireAuth(
  supabase: SupabaseClient
): Promise<AuthenticatedUser> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error("Unauthorized. Please log in.");
  }

  return { id: user.id, email: user.email ?? "" };
}

/**
 * Verifies the session AND checks that the caller has at least one of the required roles.
 * Throws if not authenticated or if the role check fails.
 */
export async function requireRole(
  supabase: SupabaseClient,
  allowedRoles: string[]
): Promise<AuthenticatedUser> {
  const user = await requireAuth(supabase);

  const { data: userRoles } = await supabase
    .from("user_roles")
    .select("roles(code)")
    .eq("profile_id", user.id);

  const codes =
    (userRoles as { roles: { code: string } | { code: string }[] | null }[])?.map((ur) => {
      const r = Array.isArray(ur.roles) ? ur.roles[0] : ur.roles;
      return r?.code as string | undefined;
    }).filter(Boolean) ?? [];

  const hasAccess = codes.some((code) => allowedRoles.includes(code!));
  if (!hasAccess) {
    throw new Error(
      `Permission denied. Required roles: ${allowedRoles.join(", ")}.`
    );
  }

  return user;
}

/**
 * Returns the role codes for an authenticated user.
 * Throws if not authenticated.
 */
export async function getCallerRoles(
  supabase: SupabaseClient
): Promise<{ user: AuthenticatedUser; roles: string[] }> {
  const user = await requireAuth(supabase);

  const { data: userRoles } = await supabase
    .from("user_roles")
    .select("roles(code)")
    .eq("profile_id", user.id);

  const roles =
    (userRoles as { roles: { code: string } | { code: string }[] | null }[])?.map((ur) => {
      const r = Array.isArray(ur.roles) ? ur.roles[0] : ur.roles;
      return r?.code as string | undefined;
    }).filter(Boolean) as string[] ?? [];

  return { user, roles };
}
