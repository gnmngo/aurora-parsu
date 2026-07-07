"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { 
  FileText, 
  Calendar, 
  Clock, 
  Award, 
  CheckCircle, 
  Inbox, 
  Loader2, 
  ChevronRight,
  UserCheck,
  History,
  Activity
} from "lucide-react";
import Link from "next/link";

interface PanelistDashboardProps {
  userId: string;
}

export function PanelistDashboard({ userId }: PanelistDashboardProps) {
  const [loading, setLoading] = useState(true);
  const [defenses, setDefenses] = useState<any[]>([]);
  const [evaluations, setEvaluations] = useState<any[]>([]);
  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"defenses" | "pending" | "completed">("defenses");
  
  const supabase = createClient();

  useEffect(() => {
    async function loadPanelistData() {
      try {
        // 1. Fetch defense panels where user is panelist
        const { data: panels } = await supabase
          .from("defense_panels")
          .select("project_id, stage_id")
          .eq("profile_id", userId);

        const projectIds = panels?.map((p: any) => p.project_id) || [];

        if (projectIds.length === 0) {
          setLoading(false);
          return;
        }

        // 2. Fetch schedules for these projects
        const { data: scheds } = await supabase
          .from("defense_schedules")
          .select("*, projects(title, id)")
          .in("project_id", projectIds)
          .order("scheduled_at", { ascending: true });
        if (scheds) setDefenses(scheds);

        // 3. Fetch evaluations for this panelist
        const { data: evs } = await supabase
          .from("evaluations")
          .select("*, projects(title), defense_stages(name)")
          .eq("panelist_id", userId)
          .order("updated_at", { ascending: false });
        if (evs) setEvaluations(evs);

        // 4. Fetch recent logs
        const { data: logs } = await supabase
          .from("audit_logs")
          .select("*")
          .eq("profile_id", userId)
          .order("created_at", { ascending: false })
          .limit(5);
        if (logs) setRecentActivities(logs);

      } catch (err) {
        console.error("Error loading panelist data:", err);
      } finally {
        setLoading(false);
      }
    }

    loadPanelistData();
  }, [supabase, userId]);

  if (loading) {
    return (
      <div className="flex h-44 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const draftEvals = evaluations.filter((e) => e.status === "draft");
  const signedEvals = evaluations.filter((e) => e.status === "submitted");

  return (
    <div className="space-y-6 text-xs font-semibold text-slate-800">
      {/* Metrics Row */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-4 flex flex-row items-center gap-4">
          <div className="p-3 rounded-xl bg-indigo-50 text-indigo-600">
            <Calendar className="h-5 w-5" />
          </div>
          <div>
            <p className="text-2xl font-black text-slate-900">{defenses.length}</p>
            <p className="text-[10px] text-muted-foreground font-bold uppercase">Assigned Defenses</p>
          </div>
        </Card>

        <Card className="p-4 flex flex-row items-center gap-4">
          <div className="p-3 rounded-xl bg-amber-50 text-amber-600">
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <p className="text-2xl font-black text-slate-900">{draftEvals.length}</p>
            <p className="text-[10px] text-muted-foreground font-bold uppercase">Pending Evaluations</p>
          </div>
        </Card>

        <Card className="p-4 flex flex-row items-center gap-4">
          <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600">
            <UserCheck className="h-5 w-5" />
          </div>
          <div>
            <p className="text-2xl font-black text-slate-900">{signedEvals.length}</p>
            <p className="text-[10px] text-muted-foreground font-bold uppercase">Signed Certificates</p>
          </div>
        </Card>
      </div>

      {/* Tabs Menu */}
      <div className="flex items-center gap-1 bg-muted/60 p-0.5 rounded-lg border border-border/40 w-fit">
        <button
          onClick={() => setActiveTab("defenses")}
          className={`px-3 py-1.5 text-[10px] font-bold rounded-md transition-all cursor-pointer ${activeTab === "defenses" ? "bg-card text-primary shadow-sm" : "text-muted-foreground hover:text-slate-800"}`}
        >
          Assigned Defenses ({defenses.length})
        </button>
        <button
          onClick={() => setActiveTab("pending")}
          className={`px-3 py-1.5 text-[10px] font-bold rounded-md transition-all cursor-pointer ${activeTab === "pending" ? "bg-card text-primary shadow-sm" : "text-muted-foreground hover:text-slate-800"}`}
        >
          Pending Evaluations ({draftEvals.length})
        </button>
        <button
          onClick={() => setActiveTab("completed")}
          className={`px-3 py-1.5 text-[10px] font-bold rounded-md transition-all cursor-pointer ${activeTab === "completed" ? "bg-card text-primary shadow-sm" : "text-muted-foreground hover:text-slate-800"}`}
        >
          Signature History ({signedEvals.length})
        </button>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Main Tab Panel */}
        <div className="md:col-span-2 space-y-6">
          {activeTab === "defenses" && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-bold flex items-center gap-1.5 uppercase text-slate-800">
                  <Calendar className="h-4 w-4 text-primary" /> Defense Calendar
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {defenses.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-8 text-center text-xs text-muted-foreground">
                    <Calendar className="h-8 w-8 opacity-30 mb-2" />
                    <p>No defenses currently scheduled.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {defenses.map((def) => (
                      <div key={def.id} className="flex items-center justify-between p-4">
                        <div>
                          <p className="font-bold text-slate-900 text-sm">"{def.projects?.title}"</p>
                          <p className="text-[10px] text-muted-foreground font-semibold flex items-center gap-1 mt-1">
                            <Clock className="h-3.5 w-3.5 text-muted-foreground" /> {new Date(def.scheduled_at).toLocaleString()}
                          </p>
                          <p className="text-[10px] text-primary font-bold mt-0.5">Venue: Room {def.room}</p>
                        </div>
                        <Link href={`/workspace/${def.project_id}/${def.stage_id}`}>
                          <Button variant="outline" size="sm" className="h-8 text-[11px] gap-1 rounded-lg">
                            Evaluate <ChevronRight className="h-3.5 w-3.5" />
                          </Button>
                        </Link>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {activeTab === "pending" && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-bold flex items-center gap-1.5 uppercase text-slate-800">
                  <FileText className="h-4 w-4 text-primary" /> Draft Evaluations
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {draftEvals.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-8 text-center text-xs text-muted-foreground">
                    <Inbox className="h-8 w-8 opacity-30 mb-2" />
                    <p>No evaluations left to compile!</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {draftEvals.map((e) => (
                      <div key={e.id} className="flex items-center justify-between p-4">
                        <div className="space-y-1">
                          <p className="font-bold text-slate-900 text-sm">"{e.projects?.title}"</p>
                          <p className="text-[10px] text-muted-foreground">
                            Stage: {e.defense_stages?.name} • Last Saved {new Date(e.updated_at).toLocaleDateString()}
                          </p>
                        </div>
                        <Link href={`/workspace/${e.project_id}/${e.stage_id}`}>
                          <Button size="sm" className="h-8 text-[11px] rounded-lg">
                            Complete
                          </Button>
                        </Link>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {activeTab === "completed" && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-bold flex items-center gap-1.5 uppercase text-slate-800">
                  <UserCheck className="h-4 w-4 text-primary" /> E-Signature Verification Records
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {signedEvals.length === 0 ? (
                  <div className="p-6 text-xs text-muted-foreground italic">No evaluations signed yet.</div>
                ) : (
                  <div className="divide-y divide-border">
                    {signedEvals.map((e) => (
                      <div key={e.id} className="p-4 flex items-center justify-between">
                        <div>
                          <p className="font-bold text-slate-900 text-sm">"{e.projects?.title}"</p>
                          <p className="text-[10px] text-muted-foreground">
                            Stage: {e.defense_stages?.name} • Signed {new Date(e.signed_at).toLocaleString()}
                          </p>
                          <div className="flex gap-2 mt-1.5 font-mono text-[9px] text-slate-600 bg-muted px-2 py-0.5 rounded border border-border w-fit">
                            Serial: {e.certificate_serial || "—"}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-black text-primary">{e.total_score ? Number(e.total_score).toFixed(1) : "0.0"}</p>
                          <Badge variant="outline" className="text-[8px] font-extrabold uppercase mt-1">Immutable</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Side Panel: Audit Logs */}
        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="text-sm font-bold flex items-center gap-1.5 uppercase text-slate-800">
              <History className="h-4 w-4 text-primary" /> Recent Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {recentActivities.length === 0 ? (
              <div className="p-6 text-xs text-muted-foreground italic">No activity logged.</div>
            ) : (
              <div className="divide-y divide-border">
                {recentActivities.map((l) => (
                  <div key={l.id} className="p-3 text-xs space-y-1">
                    <p className="font-bold text-slate-800">{l.description}</p>
                    <p className="text-[9px] text-muted-foreground">Date: {new Date(l.created_at).toLocaleDateString()}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
