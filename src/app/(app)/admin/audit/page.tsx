"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, Inbox } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { RoleGuard } from "@/components/auth/role-guard";
import { AccessDenied } from "@/components/auth/access-denied";

export default function AuditPage() {
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const supabase = createClient();

  useEffect(() => {
    async function loadAuditLogs() {
      try {
        const { data, error } = await supabase
          .from("audit_logs")
          .select(`
            id,
            created_at,
            user_email,
            user_role,
            action_type,
            description,
            old_value,
            new_value,
            ip_address,
            profiles ( first_name, last_name )
          `)
          .order("created_at", { ascending: false });

        if (error) throw error;
        if (data) {
          setAuditLogs(data);
        }
      } catch (err) {
        console.error("Error loading audit logs:", err);
      } finally {
        setLoading(false);
      }
    }
    loadAuditLogs();
  }, [supabase]);

  const filteredLogs = auditLogs.filter((log) =>
    log.description?.toLowerCase().includes(searchText.toLowerCase()) ||
    log.user_email?.toLowerCase().includes(searchText.toLowerCase())
  );

  return (
    <RoleGuard allowedRoles={["coordinator", "sys_admin"]} fallback={<AccessDenied />}>
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Audit Logs</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Government-grade accountability trail for all system actions
          </p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input 
            placeholder="Search audit logs..." 
            className="pl-9" 
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-12 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card p-16 text-center">
          <Inbox className="h-10 w-10 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-semibold">No Audit Logs Found</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            There are no system actions logged in the database yet.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border">
          <div className="hidden overflow-x-auto md:block bg-card">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium">Timestamp</th>
                  <th className="px-4 py-3 text-left font-medium">User</th>
                  <th className="px-4 py-3 text-left font-medium">Action</th>
                  <th className="px-4 py-3 text-left font-medium">Description</th>
                  <th className="px-4 py-3 text-left font-medium">Changes</th>
                  <th className="px-4 py-3 text-left font-medium">IP</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((log) => {
                  const userName = log.profiles 
                    ? `${log.profiles.first_name} ${log.profiles.last_name}`
                    : log.user_email;
                  return (
                    <tr
                      key={log.id}
                      className="border-b border-border transition-colors hover:bg-muted/30"
                    >
                      <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                        {format(new Date(log.created_at), "MMM d, h:mm a")}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-xs">{userName}</p>
                        <p className="text-[10px] text-muted-foreground">{log.user_role || "User"}</p>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className="text-[10px]">{log.action_type}</Badge>
                      </td>
                      <td className="px-4 py-3 text-xs max-w-xs">{log.description}</td>
                      <td className="px-4 py-3 text-xs">
                        {log.old_value && (
                          <pre className="text-[10px] max-w-xs overflow-x-auto bg-muted/30 p-1 rounded font-mono text-danger">
                            {JSON.stringify(log.old_value)}
                          </pre>
                        )}
                        {log.old_value && log.new_value && <div className="text-center my-0.5 text-muted-foreground text-[10px]">↓</div>}
                        {log.new_value && (
                          <pre className="text-[10px] max-w-xs overflow-x-auto bg-muted/30 p-1 rounded font-mono text-success">
                            {JSON.stringify(log.new_value)}
                          </pre>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground font-mono">
                        {log.ip_address || "127.0.0.1"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="space-y-3 p-4 md:hidden">
            {filteredLogs.map((log) => {
              const userName = log.profiles 
                ? `${log.profiles.first_name} ${log.profiles.last_name}`
                : log.user_email;
              return (
                <Card key={log.id}>
                  <CardContent className="p-4 space-y-2">
                    <div className="flex justify-between">
                      <Badge variant="outline" className="text-[10px]">{log.action_type}</Badge>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(log.created_at), "MMM d, h:mm a")}
                      </span>
                    </div>
                    <p className="text-xs font-semibold">{userName} ({log.user_role})</p>
                    <p className="text-xs">{log.description}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
    </RoleGuard>
  );
}
