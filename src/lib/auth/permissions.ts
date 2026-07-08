/**
 * Centralized authorization layer for AURORA.
 *
 * This is the SINGLE source of truth for:
 * 1. Which routes each role can access
 * 2. Which server actions each role can invoke
 *
 * Import this in middleware AND in RoleGuard to avoid duplication.
 */

/** Every defined role code in AURORA */
export type RoleCode =
  | "student"
  | "adviser"
  | "panelist"
  | "coordinator"
  | "sys_admin";

/**
 * Routes accessible to each role.
 *
 * Rules:
 * - coordinator and sys_admin inherit ALL routes.
 * - Every entry must be a prefix (e.g., "/dashboard/defenses" covers all sub-paths).
 */
export const ROLE_ROUTE_PERMISSIONS: Record<RoleCode, string[]> = {
  student: [
    "/dashboard",
    "/dashboard/my-project",
    "/dashboard/search",
    "/dashboard/defenses",
    "/dashboard/annotations",
    "/dashboard/grades",
    "/dashboard/settings",
    "/dashboard/notifications",
  ],
  adviser: [
    "/dashboard",
    "/dashboard/search",
    "/dashboard/defenses",
    "/dashboard/submissions",
    "/dashboard/settings",
    "/dashboard/notifications",
  ],
  panelist: [
    "/dashboard",
    "/dashboard/search",
    "/dashboard/defenses",
    "/dashboard/annotations",
    "/dashboard/grades",
    "/dashboard/settings",
    "/dashboard/notifications",
  ],
  coordinator: [
    "/dashboard",
    "/dashboard/search",
    "/dashboard/defenses",
    "/dashboard/submissions",
    "/dashboard/annotations",
    "/dashboard/grades",
    "/dashboard/analytics",
    "/dashboard/settings",
    "/dashboard/notifications",
    "/admin",
  ],
  sys_admin: [
    "/dashboard",
    "/dashboard/search",
    "/dashboard/defenses",
    "/dashboard/submissions",
    "/dashboard/annotations",
    "/dashboard/grades",
    "/dashboard/analytics",
    "/dashboard/settings",
    "/dashboard/notifications",
    "/admin",
  ],
};

/**
 * Returns true if the given role is allowed to access the given pathname.
 *
 * @param role   The user's role code
 * @param path   The request pathname (e.g., "/dashboard/grades")
 */
export function isRouteAllowedForRole(
  role: RoleCode | string,
  path: string
): boolean {
  const allowed =
    ROLE_ROUTE_PERMISSIONS[role as RoleCode] ??
    ROLE_ROUTE_PERMISSIONS.student; // Fallback to most restrictive

  return allowed.some((prefix) => path === prefix || path.startsWith(prefix + "/"));
}

/**
 * Sidebar navigation links for each role.
 * Consumed by AppSidebar to avoid duplicating filter logic.
 */
export const ROLE_SIDEBAR_LINKS: Record<RoleCode, string[]> = {
  student: [
    "/dashboard",
    "/dashboard/my-project",
    "/dashboard/annotations",
    "/dashboard/grades",
    "/dashboard/defenses",
    "/dashboard/search",
    "/dashboard/settings",
    "/dashboard/notifications",
  ],
  adviser: [
    "/dashboard",
    "/dashboard/search",
    "/dashboard/defenses",
    "/dashboard/submissions",
    "/dashboard/settings",
    "/dashboard/notifications",
  ],
  panelist: [
    "/dashboard",
    "/dashboard/search",
    "/dashboard/defenses",
    "/dashboard/annotations",
    "/dashboard/grades",
    "/dashboard/settings",
    "/dashboard/notifications",
  ],
  coordinator: [
    "/dashboard",
    "/dashboard/search",
    "/dashboard/defenses",
    "/dashboard/submissions",
    "/dashboard/annotations",
    "/dashboard/grades",
    "/dashboard/analytics",
    "/dashboard/settings",
    "/dashboard/notifications",
  ],
  sys_admin: [
    "/dashboard",
    "/dashboard/search",
    "/dashboard/defenses",
    "/dashboard/submissions",
    "/dashboard/annotations",
    "/dashboard/grades",
    "/dashboard/analytics",
    "/dashboard/settings",
    "/dashboard/notifications",
  ],
};

/** Admin nav only shown for coordinator / sys_admin */
export const ADMIN_ROLES: RoleCode[] = ["coordinator", "sys_admin"];
