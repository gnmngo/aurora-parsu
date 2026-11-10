"use client";

import { useEffect, useState, useMemo } from "react";
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
import { cn } from "@/lib/utils";

interface PanelistDashboardProps {
  userId: string;
}

export function PanelistDashboard({ userId }: PanelistDashboardProps) {
  const [loading, setLoading] = useState(true);
  const [defenses, setDefenses] = useState<any[]>([]);
  const [evaluations, setEvaluations] = useState<any[]>([]);
  const [activeProjects, setActiveProjects] = useState<any[]>([]);
  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"defenses" | "pending" | "completed">("defenses");
  
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    async function loadPanelistData() {
      try {
        setLoading(true);

        // 1. Fetch defense panels where user is panelist
        const { data: panels } = await supabase
          .from("defense_panels")
          .select("project_id, stage_id")
          .eq("profile_id", userId);

        const assignedProjectIds = panels?.map((p: any) => p.project_id) || [];

        // Guard: if no panel assignments, show empty state immediately — never query all projects!
        if (assignedProjectIds.length === 0) {
          setActiveProjects([]);
          setDefenses([]);
          setEvaluations([]);
          setRecentActivities([]);
          setLoading(false);
          return;
        }

        // 2. Fetch only assigned defense projects
        const { data: projs } = await supabase
          .from("projects")
          .select(`
            id,
            title,
            status,
            current_stage_id,
            defense_stages ( id, name ),
            departments ( name ),
            students (
              profiles ( first_name, last_name )
            )
          `)
          .is("archived_at", null)
          .in("id", assignedProjectIds)
          .order("created_at", { ascending: false });

        if (projs) setActiveProjects(projs);

        // 3. Fetch defense schedules for assigned projects
        const { data: scheds } = await supabase
          .from("defense_schedules")
          .select("*, projects(title, id)")
          .in("project_id", assignedProjectIds)
          .order("scheduled_at", { ascending: true });
        if (scheds) setDefenses(scheds);

        // 4. Fetch evaluations for this panelist
        const { data: evs } = await supabase
          .from("evaluations")
          .select("*, projects(title), defense_stages(name)")
          .eq("panelist_id", userId)
          .order("updated_at", { ascending: false });
        if (evs) setEvaluations(evs);

        // 5. Fetch recent logs
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
  }, [userId]);

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
    <div className="space-y-6 text-xs font-semibold text-slate-800 dark:text-slate-200">
      {/* Quick Workspace Launcher Banner */}
      <Card className="border-primary/30 bg-gradient-to-r from-primary/5 via-background to-primary/10 shadow-xs">
        <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-[9px] font-bold uppercase text-primary border-primary/40">
                Core Feature
              </Badge>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Split-Screen Manuscript Review &amp; Rubric Grading Workspace
              </h3>
            </div>
            <p className="text-xs text-muted-foreground">
              Review research manuscripts, add inline comments/remarks, score defense rubrics, and apply electronic signatures.
            </p>
          </div>
          <Link href="/workspace">
            <Button className="rounded-xl h-9 text-xs font-bold gap-1.5 shadow-sm shrink-0">
              Open Defense Workspace <ChevronRight className="h-4 w-4" />
            </Button>
          </Link>
        </CardContent>
      </Card>

      {/* Metrics Row */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-4 flex flex-row items-center gap-4">
          <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400">
            <Calendar className="h-5 w-5" />
          </div>
          <div>
            <p className="text-2xl font-black text-slate-900 dark:text-slate-100">{activeProjects.length}</p>
            <p className="text-[10px] text-muted-foreground font-bold uppercase">Assigned Manuscripts</p>
          </div>
        </Card>

        <Card className="p-4 flex flex-row items-center gap-4">
          <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400">
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <p className="text-2xl font-black text-slate-900 dark:text-slate-100">{draftEvals.length}</p>
            <p className="text-[10px] text-muted-foreground font-bold uppercase">Pending Evaluations</p>
          </div>
        </Card>

        <Card className="p-4 flex flex-row items-center gap-4">
          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
            <UserCheck className="h-5 w-5" />
          </div>
          <div>
            <p className="text-2xl font-black text-slate-900 dark:text-slate-100">{signedEvals.length}</p>
            <p className="text-[10px] text-muted-foreground font-bold uppercase">Signed Certificates</p>
          </div>
        </Card>
      </div>

      {/* Tabs Menu */}
      <div className="flex items-center gap-1.5 bg-slate-100/90 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200/90 dark:border-slate-700 shadow-2xs w-fit">
        <button
          type="button"
          onClick={() => setActiveTab("defenses")}
          className={cn(
            "px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer shadow-2xs flex items-center gap-1.5",
            activeTab === "defenses"
              ? "bg-white dark:bg-slate-900 text-primary border border-slate-200 dark:border-slate-700 shadow-xs"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-700/50"
          )}
        >
          <span>Research Manuscripts</span>
          <span className={cn(
            "px-1.5 py-0.5 rounded-full text-[10px] font-black leading-none",
            activeTab === "defenses" ? "bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary-light" : "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300"
          )}>
            {activeProjects.length}
          </span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("pending")}
          className={cn(
            "px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer shadow-2xs flex items-center gap-1.5",
            activeTab === "pending"
              ? "bg-white dark:bg-slate-900 text-primary border border-slate-200 dark:border-slate-700 shadow-xs"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-700/50"
          )}
        >
          <span>Pending Drafts</span>
          {draftEvals.length > 0 && (
            <span className={cn(
              "px-1.5 py-0.5 rounded-full text-[10px] font-black leading-none",
              activeTab === "pending" ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300" : "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300"
            )}>
              {draftEvals.length}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("completed")}
          className={cn(
            "px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer shadow-2xs flex items-center gap-1.5",
            activeTab === "completed"
              ? "bg-white dark:bg-slate-900 text-primary border border-slate-200 dark:border-slate-700 shadow-xs"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-700/50"
          )}
        >
          <span>Signature History</span>
          <span className={cn(
            "px-1.5 py-0.5 rounded-full text-[10px] font-black leading-none",
            activeTab === "completed" ? "bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary-light" : "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300"
          )}>
            {signedEvals.length}
          </span>
        </button>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Main Tab Panel */}
        <div className="md:col-span-2 space-y-6">
          {activeTab === "defenses" && (
            <div className="space-y-4">
              {/* Scheduled Defenses if any */}
              {defenses.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-xs font-bold flex items-center gap-1.5 uppercase text-slate-800 dark:text-slate-200">
                      <Calendar className="h-4 w-4 text-primary" /> Scheduled Defense Sessions
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="divide-y divide-border">
                      {defenses.map((def) => (
                        <div key={def.id} className="flex items-center justify-between p-4">
                          <div>
                            <p className="font-bold text-slate-900 dark:text-slate-100 text-sm">"{def.projects?.title}"</p>
                            <p className="text-[10px] text-muted-foreground font-semibold flex items-center gap-1 mt-1">
                              <Clock className="h-3.5 w-3.5 text-muted-foreground" /> {new Date(def.scheduled_at).toLocaleString()}
                            </p>
                            <p className="text-[10px] text-primary font-bold mt-0.5">Venue: Room {def.room}</p>
                          </div>
                          <Link href={`/workspace/${def.project_id}/${def.stage_id}`}>
                            <Button variant="outline" size="sm" className="h-8 text-[11px] gap-1 rounded-lg font-bold">
                              Evaluate <ChevronRight className="h-3.5 w-3.5" />
                            </Button>
                          </Link>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* All Assigned Manuscripts */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-xs font-bold flex items-center gap-1.5 uppercase text-slate-800 dark:text-slate-200">
                    <FileText className="h-4 w-4 text-primary" /> Active Research Manuscripts
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Click "Open Workspace" to launch the split-screen PDF review, add comments, and grade.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  {activeProjects.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-8 text-center text-xs text-muted-foreground">
                      <FileText className="h-8 w-8 opacity-30 mb-2" />
                      <p>No research manuscripts assigned yet.</p>
                      <Link href="/workspace/demo" className="mt-3">
                        <Button variant="outline" size="sm" className="text-xs rounded-xl font-bold">
                          Launch Demo Workspace
                        </Button>
                      </Link>
                    </div>
                  ) : (
                    <div className="divide-y divide-border">
                      {activeProjects.map((p) => {
                        const studentObj = Array.isArray(p.students) ? p.students[0] : p.students;
                        const studentProfile = studentObj && Array.isArray(studentObj.profiles) ? studentObj.profiles[0] : studentObj?.profiles;
                        const studentName = studentProfile ? `${studentProfile.first_name} ${studentProfile.last_name}` : "Student Author";
                        const stageObj = Array.isArray(p.defense_stages) ? p.defense_stages[0] : p.defense_stages;
                        const stageId = p.current_stage_id || stageObj?.id || "";
                        const stageName = stageObj?.name || "Defense Stage";

                        return (
                          <div key={p.id} className="flex items-center justify-between p-4 gap-4">
                            <div className="space-y-1 min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-[9px] font-bold uppercase text-primary">
                                  {stageName}
                                </Badge>
                                <Badge variant="secondary" className="text-[9px] capitalize">
                                  {p.status.replace("_", " ")}
                                </Badge>
                              </div>
                              <p className="font-bold text-slate-900 dark:text-slate-100 text-sm truncate">
                                "{p.title}"
                              </p>
                              <p className="text-[10px] text-muted-foreground">
                                Author: <span className="font-semibold text-foreground">{studentName}</span> • Department: {p.departments?.name || "General"}
                              </p>
                            </div>
                            <Link href={`/workspace/${p.id}/${stageId}`}>
                              <Button size="sm" className="h-8 text-xs font-bold gap-1 rounded-xl shrink-0">
                                Open Workspace <ChevronRight className="h-3.5 w-3.5" />
                              </Button>
                            </Link>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === "pending" && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-bold flex items-center gap-1.5 uppercase text-slate-800 dark:text-slate-200">
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
                          <p className="font-bold text-slate-900 dark:text-slate-100 text-sm">"{e.projects?.title}"</p>
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
                <CardTitle className="text-sm font-bold flex items-center gap-1.5 uppercase text-slate-800 dark:text-slate-200">
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
                          <p className="font-bold text-slate-900 dark:text-slate-100 text-sm">"{e.projects?.title}"</p>
                          <p className="text-[10px] text-muted-foreground">
                            Stage: {e.defense_stages?.name} • Signed {e.signed_at ? new Date(e.signed_at).toLocaleString() : e.updated_at ? new Date(e.updated_at).toLocaleString() : "—"}
                          </p>
                          <div className="flex gap-2 mt-1.5 font-mono text-[9px] text-slate-600 dark:text-slate-300 bg-muted px-2 py-0.5 rounded border border-border w-fit">
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
            <CardTitle className="text-sm font-bold flex items-center gap-1.5 uppercase text-slate-800 dark:text-slate-200">
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
                    <p className="font-bold text-slate-800 dark:text-slate-200">{l.description}</p>
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
