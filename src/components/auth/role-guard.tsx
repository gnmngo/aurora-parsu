"use client";

import React from "react";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";

interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles?: string[];
  allowedPermissions?: string[];
  fallback?: React.ReactNode;
  /** Show a loading spinner while auth hydrates. Defaults to true. */
  showLoader?: boolean;
}

/**
 * RoleGuard — Centralized authorization wrapper.
 *
 * Renders children only when the authenticated user satisfies at least one
 * of the allowedRoles or allowedPermissions constraints.
 *
 * - Returns a loader while auth state is hydrating (no content flash).
 * - Returns fallback (default: null) when the user is unauthorized.
 * - If neither allowedRoles nor allowedPermissions is set, renders children unconditionally.
 *
 * Usage:
 *   <RoleGuard allowedRoles={["coordinator", "sys_admin"]} fallback={<AccessDenied />}>
 *     <ProtectedContent />
 *   </RoleGuard>
 */
export function RoleGuard({
  children,
  allowedRoles,
  allowedPermissions,
  fallback = null,
  showLoader = true,
}: RoleGuardProps) {
  const { hasRole, hasPermission, isLoading } = useAuth();

  // While auth is hydrating show spinner — prevents flash of unauthorized content
  if (isLoading) {
    if (!showLoader) return null;
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // If no constraints set, render unconditionally
  if (!allowedRoles && !allowedPermissions) {
    return <>{children}</>;
  }

  // Check roles (OR logic: any matching role grants access)
  const roleMatch = allowedRoles ? hasRole(allowedRoles) : false;

  // Check permissions (OR logic: any matching permission grants access)
  const permissionMatch = allowedPermissions
    ? allowedPermissions.some((permission) => hasPermission(permission))
    : false;

  if (roleMatch || permissionMatch) {
    return <>{children}</>;
  }

  return <>{fallback}</>;
}
