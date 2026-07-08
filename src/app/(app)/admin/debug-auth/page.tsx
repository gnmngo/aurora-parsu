"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Shield, User, AlertCircle, Database, RefreshCw, CheckCircle2, XCircle } from "lucide-react";
import { RoleGuard } from "@/components/auth/role-guard";
import { AccessDenied } from "@/components/auth/access-denied";

export default function DebugAuthPage() {
  const { user, session, profile, roles, permissions, isLoading } = useAuth();
  const [counts, setCounts] = useState<{
    projects: number | null;
    students: number | null;
    faculty: number | null;
    error: string | null;
  }>({
    projects: null,
    students: null,
    faculty: null,
    error: null,
  });
  const [loadingCounts, setLoadingCounts] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const supabase = createClient();

  useEffect(() => {
    async function fetchCounts() {
      setLoadingCounts(true);
      try {
        const { count: projectsCount, error: projectsError } = await supabase
          .from("projects")
          .select("*", { count: "exact", head: true });

        const { count: studentsCount, error: studentsError } = await supabase
          .from("students")
          .select("*", { count: "exact", head: true });

        const { count: facultyCount, error: facultyError } = await supabase
          .from("faculty")
          .select("*", { count: "exact", head: true });

        const errors = [
          projectsError ? `projects: ${projectsError.message}` : null,
          studentsError ? `students: ${studentsError.message}` : null,
          facultyError ? `faculty: ${facultyError.message}` : null,
        ].filter(Boolean);

        setCounts({
          projects: projectsCount,
          students: studentsCount,
          faculty: facultyCount,
          error: errors.length > 0 ? errors.join(" | ") : null,
        });
      } catch (err: any) {
        setCounts((prev) => ({
          ...prev,
          error: err.message || "Unknown error fetching counts",
        }));
      } finally {
        setLoadingCounts(false);
      }
    }

    fetchCounts();
  }, [refreshTrigger, supabase]);

  const handleRefresh = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  return (
    <RoleGuard allowedRoles={["sys_admin"]} fallback={<AccessDenied />}>
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Authentication & System Diagnostic</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Debug page to immediately diagnose login, session, profile, role issues and table permissions.
          </p>
        </div>
        <Button onClick={handleRefresh} disabled={loadingCounts} className="flex items-center gap-2">
          <RefreshCw className={`h-4 w-4 ${loadingCounts ? "animate-spin" : ""}`} />
          Refresh Diagnostics
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Auth / Session State */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold">Client-Side Authentication State</CardTitle>
            <Shield className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-2 text-sm border-b pb-3 border-border">
              <span className="text-muted-foreground">Auth Provider Loading:</span>
              <span className="font-semibold">{isLoading ? "YES" : "NO"}</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm border-b pb-3 border-border">
              <span className="text-muted-foreground">Session Exists:</span>
              <span className="font-semibold flex items-center gap-1">
                {session ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-success" /> Yes
                  </>
                ) : (
                  <>
                    <XCircle className="h-4 w-4 text-danger" /> No
                  </>
                )}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm border-b pb-3 border-border">
              <span className="text-muted-foreground">Current User ID:</span>
              <span className="font-mono text-xs truncate" title={user?.id || "None"}>
                {user?.id || "None"}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <span className="text-muted-foreground">Email:</span>
              <span className="font-semibold truncate" title={user?.email || "None"}>
                {user?.email || "None"}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Profile Status & Role State */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold">User Profile & Access Roles</CardTitle>
            <User className="h-4 w-4 text-info" />
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-2 text-sm border-b pb-3 border-border">
              <span className="text-muted-foreground">Profile ID:</span>
              <span className="font-mono text-xs truncate" title={profile?.id || "None"}>
                {profile?.id || "None"}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm border-b pb-3 border-border">
              <span className="text-muted-foreground">Profile Status:</span>
              <span>
                {profile?.status ? (
                  <Badge variant={(profile.status as string) === "approved" ? "success" : "warning"}>
                    {profile.status}
                  </Badge>
                ) : (
                  <span className="font-semibold text-danger">No Profile Loaded</span>
                )}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm border-b pb-3 border-border">
              <span className="text-muted-foreground">User Roles:</span>
              <div className="flex flex-wrap gap-1">
                {roles.length > 0 ? (
                  roles.map((role) => (
                    <Badge key={role} variant="secondary">
                      {role}
                    </Badge>
                  ))
                ) : (
                  <span className="text-xs text-muted-foreground">None</span>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <span className="text-muted-foreground">Permissions:</span>
              <div className="max-h-24 overflow-y-auto text-xs font-mono">
                {permissions.length > 0 ? permissions.join(", ") : "None"}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Statistics Counts to verify table privileges */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-muted-foreground">Projects Count</p>
                <p className="text-3xl font-bold mt-1">
                  {counts.projects === null ? "..." : counts.projects}
                </p>
              </div>
              <Database className="h-8 w-8 text-muted-foreground/40" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-muted-foreground">Students Count</p>
                <p className="text-3xl font-bold mt-1">
                  {counts.students === null ? "..." : counts.students}
                </p>
              </div>
              <Database className="h-8 w-8 text-muted-foreground/40" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-muted-foreground">Faculty Count</p>
                <p className="text-3xl font-bold mt-1">
                  {counts.faculty === null ? "..." : counts.faculty}
                </p>
              </div>
              <Database className="h-8 w-8 text-muted-foreground/40" />
            </div>
          </CardContent>
        </Card>
      </div>

      {counts.error && (
        <Card className="border-danger/30 bg-danger/5 text-danger">
          <CardContent className="flex items-center gap-3 p-4">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <div className="text-sm">
              <p className="font-semibold">Table Access Privilege Error Detected</p>
              <p className="mt-0.5 opacity-90">{counts.error}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Raw JSON Responses */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Raw Diagnostics Payloads (JSON)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-xs font-semibold uppercase text-muted-foreground mb-1">Supabase auth.user()</p>
            <pre className="p-4 rounded-xl bg-muted text-xs font-mono max-h-60 overflow-auto border">
              {JSON.stringify(user, null, 2)}
            </pre>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase text-muted-foreground mb-1">Supabase auth.session()</p>
            <pre className="p-4 rounded-xl bg-muted text-xs font-mono max-h-60 overflow-auto border">
              {JSON.stringify(
                session
                  ? {
                      access_token: session.access_token ? `[EXISTS - ${session.access_token.substring(0, 15)}...]` : null,
                      refresh_token: session.refresh_token ? `[EXISTS - ${session.refresh_token.substring(0, 15)}...]` : null,
                      expires_at: session.expires_at,
                      user: session.user ? "[EXISTS]" : null,
                    }
                  : null,
                null,
                2
              )}
            </pre>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase text-muted-foreground mb-1">Profiles Table Record</p>
            <pre className="p-4 rounded-xl bg-muted text-xs font-mono max-h-60 overflow-auto border">
              {JSON.stringify(profile, null, 2)}
            </pre>
          </div>
        </CardContent>
      </Card>
    </div>
    </RoleGuard>
  );
}
