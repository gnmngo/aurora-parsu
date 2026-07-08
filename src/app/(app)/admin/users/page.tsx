"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { 
  ShieldAlert, 
  Database, 
  Activity, 
  HardDrive, 
  Terminal, 
  Settings, 
  Loader2, 
  Shield, 
  CheckCircle,
  Inbox
} from "lucide-react";
import { updateUserRoleAction } from "@/lib/admin/actions";
import { RoleGuard } from "@/components/auth/role-guard";
import { AccessDenied } from "@/components/auth/access-denied";

export default function UsersPage() {
  const supabase = createClient();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const loadUsersData = async () => {
    setLoading(true);
    try {
      // Fetch profiles and roles
      const { data, error } = await supabase
        .from("profiles")
        .select(`
          id,
          first_name,
          last_name,
          email,
          status,
          user_roles (
            roles ( code, name )
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to fetch profiles registry.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsersData();
  }, []);

  const handleRoleChange = async (profileId: string, roleCode: string) => {
    setUpdatingId(profileId);
    try {
      await updateUserRoleAction(profileId, roleCode);
      toast.success("User role reassigned successfully!");
      loadUsersData();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to reassign role.");
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <RoleGuard allowedRoles={["sys_admin"]} fallback={<AccessDenied />}>
    <div className="mx-auto max-w-7xl space-y-6 text-xs font-semibold text-slate-800">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">SysAdmin Control Console</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Monitor system diagnostics, server configurations, database health parameters, and manage RBAC matrix.
        </p>
      </div>

      {/* Health & Diagnostic widgets */}
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
        {/* Server status */}
        <Card className="p-4 flex flex-row items-center gap-4">
          <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600">
            <Activity className="h-5 w-5 animate-pulse" />
          </div>
          <div>
            <p className="text-sm font-black text-slate-900">Online</p>
            <p className="text-[10px] text-muted-foreground font-bold uppercase mt-0.5">Server Health</p>
          </div>
        </Card>

        {/* Realtime Status */}
        <Card className="p-4 flex flex-row items-center gap-4">
          <div className="p-3 rounded-xl bg-blue-50 text-blue-600">
            <Database className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-black text-slate-900">Active</p>
            <p className="text-[10px] text-muted-foreground font-bold uppercase mt-0.5">Realtime sync</p>
          </div>
        </Card>

        {/* Storage */}
        <Card className="p-4 flex flex-row items-center gap-4">
          <div className="p-3 rounded-xl bg-indigo-50 text-indigo-600">
            <HardDrive className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-black text-slate-900">12.4 GB / 50 GB</p>
            <p className="text-[10px] text-muted-foreground font-bold uppercase mt-0.5">Storage Usage</p>
          </div>
        </Card>

        {/* Environment Diagnostics */}
        <Card className="p-4 flex flex-row items-center gap-4">
          <div className="p-3 rounded-xl bg-slate-100 text-slate-800">
            <Settings className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-black text-slate-900">v0.1.0 • Windows</p>
            <p className="text-[10px] text-muted-foreground font-bold uppercase mt-0.5">System Build</p>
          </div>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* User directory lists */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm font-bold flex items-center gap-1.5 uppercase text-slate-800">
              <Shield className="h-4 w-4 text-primary" /> RBAC Permission Matrix & Directory
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex justify-center items-center py-16">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : users.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center text-xs text-muted-foreground">
                <Inbox className="h-8 w-8 opacity-30 mb-2" />
                <p>No user profiles found in database registration.</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {users.map((user) => {
                  const roleLink = user.user_roles?.[0]?.roles;
                  const currentRole = roleLink?.code || "student";
                  const currentRoleName = roleLink?.name || "Student";
                  const name = `${user.first_name} ${user.last_name}`;

                  return (
                    <div key={user.id} className="flex items-center justify-between p-4 gap-4 text-xs font-semibold">
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar>
                          <AvatarFallback className="font-extrabold uppercase">
                            {user.first_name?.[0]}{user.last_name?.[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="font-bold text-slate-900">{name}</p>
                          <p className="text-[10px] text-muted-foreground truncate">{user.email}</p>
                          <div className="flex gap-1.5 pt-1">
                            <Badge variant="info" className="text-[8px] font-extrabold uppercase">{currentRoleName}</Badge>
                            <Badge variant="outline" className="text-[8px] font-extrabold uppercase capitalize">{user.status}</Badge>
                          </div>
                        </div>
                      </div>

                      {/* Dropdown for role changes */}
                      <div className="flex items-center gap-2 print:hidden shrink-0">
                        {updatingId === user.id ? (
                          <Loader2 className="h-4 w-4 animate-spin text-primary" />
                        ) : (
                          <select
                            value={currentRole}
                            onChange={(e) => handleRoleChange(user.id, e.target.value)}
                            className="h-8 rounded-lg border border-border bg-card px-2 text-[10px] font-bold focus:outline-none cursor-pointer"
                          >
                            <option value="student">Student</option>
                            <option value="adviser">Adviser</option>
                            <option value="panelist">Panelist</option>
                            <option value="coordinator">Coordinator</option>
                            <option value="sys_admin">System Admin</option>
                          </select>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Configuration management widget */}
        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="text-sm font-bold flex items-center gap-1.5 uppercase text-slate-800">
              <Terminal className="h-4 w-4 text-primary" /> Configurations
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-2 font-medium text-[11px] text-slate-700">
            <div className="border-b border-border/60 pb-2.5">
              <p className="text-muted-foreground uppercase text-[9px] font-bold">Automatic Backups</p>
              <div className="flex justify-between items-center mt-1">
                <span>Daily Backup Strategy</span>
                <Badge variant="success" className="text-[8px] gap-0.5 px-1.5 font-bold">
                  <CheckCircle className="h-2.5 w-2.5" /> Scheduled
                </Badge>
              </div>
            </div>

            <div className="border-b border-border/60 pb-2.5">
              <p className="text-muted-foreground uppercase text-[9px] font-bold">Session Configuration</p>
              <div className="flex justify-between items-center mt-1">
                <span>Inactivity Time Limit</span>
                <span className="font-bold text-slate-900">30 Minutes</span>
              </div>
            </div>

            <div>
              <p className="text-muted-foreground uppercase text-[9px] font-bold">Authentication Options</p>
              <div className="flex justify-between items-center mt-1">
                <span>Supabase Auth Token</span>
                <span className="font-bold text-slate-900">Enforced HTTPS</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
    </RoleGuard>
  );
}
