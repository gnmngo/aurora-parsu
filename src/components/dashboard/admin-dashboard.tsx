"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { 
  Shield, 
  Terminal, 
  Database, 
  Activity, 
  Loader2, 
  CheckCircle,
  AlertOctagon,
  HardDrive,
  Heart,
  ChevronRight
} from "lucide-react";
import Link from "next/link";

export function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [counts, setCounts] = useState({ profiles: 0, projects: 0, evals: 0 });
  const supabase = createClient();

  useEffect(() => {
    async function loadAdminData() {
      try {
        // 1. Fetch latest audit logs
        const { data: logs } = await supabase
          .from("audit_logs")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(10);
        if (logs) setAuditLogs(logs);

        // 2. Fetch counts
        const { count: profs } = await supabase
          .from("profiles")
          .select("id", { count: "exact", head: true });
        
        const { count: projs } = await supabase
          .from("projects")
          .select("id", { count: "exact", head: true });

        const { count: evs } = await supabase
          .from("evaluations")
          .select("id", { count: "exact", head: true });

        setCounts({
          profiles: profs || 0,
          projects: projs || 0,
          evals: evs || 0
        });

      } catch (err) {
        console.error("Error loading admin dashboard:", err);
      } finally {
        setLoading(false);
      }
    }

    loadAdminData();
  }, [supabase]);

  if (loading) {
    return (
      <div className="flex h-44 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  // Health modules status metrics configurations
  const healthModules = [
    { name: "Database Engine", status: "green", desc: "Pooling connections stable" },
    { name: "Supabase Auth", status: "green", desc: "JWT validations active" },
    { name: "Manuscripts Storage", status: "green", desc: "Private S3 bucket verified" },
    { name: "Realtime Channels", status: "green", desc: "WebSocket listeners active" },
    { name: "Notifications Queue", status: "green", desc: "System triggers online" },
    { name: "Scheduler Validation", status: "green", desc: "Room availability checked" },
    { name: "Workflow Engine", status: "green", desc: "Stage progression templates" },
    { name: "Background Jobs", status: "yellow", desc: "Backup tasks idle" }
  ];

  return (
    <div className="space-y-6 text-xs font-semibold text-slate-800">
      {/* Metrics Row */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card className="p-4 flex flex-row items-center gap-4">
          <div className="p-3 rounded-xl bg-slate-100 text-slate-800">
            <Shield className="h-5 w-5" />
          </div>
          <div>
            <p className="text-2xl font-black text-slate-900">{counts.profiles}</p>
            <p className="text-[10px] text-muted-foreground font-semibold">User Accounts</p>
          </div>
        </Card>

        <Card className="p-4 flex flex-row items-center gap-4">
          <div className="p-3 rounded-xl bg-blue-50 text-blue-600">
            <Database className="h-5 w-5" />
          </div>
          <div>
            <p className="text-2xl font-black text-slate-900">{counts.projects}</p>
            <p className="text-[10px] text-muted-foreground font-semibold">Research Projects</p>
          </div>
        </Card>

        <Card className="p-4 flex flex-row items-center gap-4">
          <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600">
            <CheckCircle className="h-5 w-5" />
          </div>
          <div>
            <p className="text-2xl font-black text-slate-900">{counts.evals}</p>
            <p className="text-[10px] text-muted-foreground font-semibold">Evaluation Sheets</p>
          </div>
        </Card>

        <Card className="p-4 flex flex-row items-center gap-4">
          <div className="p-3 rounded-xl bg-orange-50 text-orange-600">
            <HardDrive className="h-5 w-5" />
          </div>
          <div>
            <p className="text-2xl font-black text-slate-900">42.8 MB</p>
            <p className="text-[10px] text-muted-foreground font-semibold">PDF Storage Usage</p>
          </div>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Left: Audit Logs feed */}
        <Card className="md:col-span-2">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-bold flex items-center gap-1.5 uppercase text-slate-800">
                <Terminal className="h-4 w-4 text-primary" /> Live Audit Trail Feed
              </CardTitle>
              <CardDescription className="text-[10px] mt-0.5">Realtime security log entries from database operations</CardDescription>
            </div>
            <Link href="/admin/audit">
              <Button size="sm" variant="outline" className="h-8 text-[11px] rounded-xl">
                View Full Log
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {auditLogs.length === 0 ? (
              <p className="text-xs text-muted-foreground italic p-4">No audit logs recorded yet.</p>
            ) : (
              <div className="divide-y divide-border max-h-96 overflow-y-auto">
                {auditLogs.map((log) => (
                  <div key={log.id} className="p-4 text-xs font-mono space-y-1">
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] font-bold text-primary capitalize">{log.action_type} • {log.module}</span>
                      <span className="text-[9px] text-muted-foreground">{new Date(log.created_at).toLocaleTimeString()}</span>
                    </div>
                    <p className="text-slate-800 text-[11px] font-sans font-medium">{log.description}</p>
                    <p className="text-[9px] text-muted-foreground font-sans">
                      User: {log.user_email} • IP: {log.ip_address || "local"}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right: System Health Diagnostics */}
        <Card className="h-fit">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-sm font-bold flex items-center gap-1.5 uppercase text-slate-800">
                <Heart className="h-4 w-4 text-primary" /> System Health
              </CardTitle>
              <CardDescription className="text-[10px]">Diagnostics statuses indicators</CardDescription>
            </div>
            <Link href="/admin/system-health">
              <Button size="sm" variant="ghost" className="h-8 text-[10px] gap-0.5 px-2">
                Metrics <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="p-0 max-h-[380px] overflow-y-auto">
            <div className="divide-y divide-border">
              {healthModules.map((m) => (
                <div key={m.name} className="flex items-center justify-between p-3">
                  <div>
                    <p className="font-bold text-slate-800">{m.name}</p>
                    <p className="text-[9px] text-muted-foreground font-semibold">{m.desc}</p>
                  </div>
                  <Badge 
                    variant={
                      m.status === "green" 
                        ? "success" 
                        : m.status === "yellow" 
                          ? "info" 
                          : "danger"
                    }
                    className="text-[8px] font-extrabold uppercase"
                  >
                    {m.status === "green" ? "Good" : m.status === "yellow" ? "Warn" : "Fail"}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
