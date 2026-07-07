"use client";

import React from "react";
import { useAuth } from "@/hooks/use-auth";

interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles?: string[];
  allowedPermissions?: string[];
  fallback?: React.ReactNode;
}

export function RoleGuard({
  children,
  allowedRoles,
  allowedPermissions,
  fallback = null,
}: RoleGuardProps) {
  const { hasRole, hasPermission, isLoading } = useAuth();

  if (isLoading) {
    return null; // Or skeleton loading
  }

  // If both are undefined, let it render
  if (!allowedRoles && !allowedPermissions) {
    return <>{children}</>;
  }

  // Check roles
  const roleMatch = allowedRoles ? hasRole(allowedRoles) : false;

  // Check permissions
  const permissionMatch = allowedPermissions
    ? allowedPermissions.some((permission) => hasPermission(permission))
    : false;

  if (roleMatch || permissionMatch) {
    return <>{children}</>;
  }

  return <>{fallback}</>;
}
