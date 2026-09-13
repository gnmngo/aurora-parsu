"use client";

import { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import {
  Shield,
  Building2,
  GraduationCap,
  Users,
  FileText,
  Calendar,
  CheckCircle2,
  Clock,
  Award,
  ChevronRight,
  Loader2,
  Layers,
  BarChart3,
  Search,
  BookOpen,
  Filter,
  ExternalLink,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { ActivityFeed } from "@/components/dashboard/activity-feed";

interface DeanDashboardProps {
  userId: string;
}

interface ProjectItem {
  id: string;
  title: string;
  status: string;
  current_stage_id: string | null;
  department_id: string | null;
  college_id: string | null;
  created_at: string;
  defense_stages?: { id: string; name: string } | null;
  departments?: { id: string; name: string; code: string } | null;
  students?: {
    student_number?: string;
    profiles?: { first_name: string; last_name: string; email: string } | null;
  } | null;
  defense_schedules?: { scheduled_at: string; room?: string; building?: string; is_online?: boolean; status: string }[] | null;
}

interface EvaluationItem {
  id: string;
  project_id: string;
  total_score: number | null;
  verdict_code: string | null;
  status: string;
  updated_at: string;
  projects?: {
    title: string;
    departments?: { code: string; name: string } | null;
  } | null;
  defense_stages?: { name: string } | null;
}

export function DeanDashboard({ userId }: DeanDashboardProps) {
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [evaluations, setEvaluations] = useState<EvaluationItem[]>([]);
  const [myAdvisees, setMyAdvisees] = useState<any[]>([]);
  const [myPanels, setMyPanels] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"pipeline" | "departments" | "my_assignments" | "verdicts">("pipeline");
  const [deptFilter, setDeptFilter] = useState<string>("all");
  const [stageFilter, setStageFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const supabase = createClient();

  useEffect(() => {
    async function loadDeanData() {
      try {
        setLoading(true);

        // 1. Resolve Dean's College ID
        const { data: prof } = await supabase
          .from("profiles")
          .select("college_id")
          .eq("id", userId)
          .maybeSingle();

        const collegeId = prof?.college_id || "10000000-0000-0000-0000-000000000003";

        // 2. Fetch all active projects within this college
        const { data: projsData } = await supabase
          .from("projects")
          .select(`
            id,
            title,
            status,
            current_stage_id,
            department_id,
            college_id,
            created_at,
            defense_stages ( id, name ),
            departments ( id, name, code ),
            students (
              student_number,
              profiles ( first_name, last_name, email )
            ),
            defense_schedules ( scheduled_at, room, building, is_online, status )
          `)
          .eq("college_id", collegeId)
          .is("archived_at", null)
          .order("updated_at", { ascending: false });

        if (projsData) {
          setProjects(projsData as unknown as ProjectItem[]);
        }

        // 3. Fetch evaluations in this college for deliberation overview
        const { data: evalsData } = await supabase
          .from("evaluations")
          .select(`
            id,
            project_id,
            total_score,
            verdict_code,
            status,
            updated_at,
            projects ( title, departments ( code, name ) ),
            defense_stages ( name )
          `)
          .order("updated_at", { ascending: false })
          .limit(20);

        if (evalsData) {
          setEvaluations(evalsData as unknown as EvaluationItem[]);
        }

        // 4. Fetch personal faculty duties (Dean as Adviser or Panelist)
        // A. Advisees
        const { data: memberRows } = await supabase
          .from("project_members")
          .select("project_id, projects ( id, title, status, defense_stages(name), students(profiles(first_name, last_name)) )")
          .eq("profile_id", userId)
          .eq("member_role", "adviser");

        if (memberRows) {
          setMyAdvisees(memberRows.map((m: any) => m.projects).filter(Boolean));
        }

        // B. Panels
        const { data: panelRows } = await supabase
          .from("defense_panels")
          .select("project_id, stage_id, projects ( id, title, status, defense_stages(name) )")
          .eq("profile_id", userId);

        if (panelRows) {
          setMyPanels(panelRows.map((p: any) => p.projects).filter(Boolean));
        }
      } catch (err) {
        console.error("Error loading dean dashboard data:", err);
      } finally {
        setLoading(false);
      }
    }

    loadDeanData();
  }, [userId, supabase]);

  // Derived metrics
  const totalProjects = projects.length;
  const underReviewCount = projects.filter((p) => p.status === "under_review" || p.status === "scheduled").length;
  const completedCount = projects.filter((p) => p.status === "completed").length;

  // Department metrics (DCS vs DOE)
  const dcsProjects = useMemo(() => projects.filter((p) => p.departments?.code === "DCS" || p.departments?.name?.includes("Computational")), [projects]);
  const doeProjects = useMemo(() => projects.filter((p) => p.departments?.code === "DOE" || p.departments?.name?.includes("Engineering")), [projects]);

  // Filtered projects list
  const filteredProjects = useMemo(() => {
    return projects.filter((p) => {
      // Dept filter
      if (deptFilter === "dcs" && !(p.departments?.code === "DCS" || p.departments?.name?.includes("Computational"))) {
        return false;
      }
      if (deptFilter === "doe" && !(p.departments?.code === "DOE" || p.departments?.name?.includes("Engineering"))) {
        return false;
      }
      // Stage filter
      if (stageFilter !== "all" && p.defense_stages?.name !== stageFilter) {
        return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = p.title.toLowerCase().includes(q);
        const matchStudent = `${p.students?.profiles?.first_name || ""} ${p.students?.profiles?.last_name || ""}`.toLowerCase().includes(q);
        if (!matchTitle && !matchStudent) return false;
      }
      return true;
    });
  }, [projects, deptFilter, stageFilter, searchQuery]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* College Dean Institutional Oversight Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-6 shadow-xs">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Badge className="bg-primary text-white hover:bg-primary/90 font-bold px-2.5 py-0.5 text-xs shadow-xs">
                <Shield className="mr-1 h-3.5 w-3.5" /> Institutional Oversight
              </Badge>
              <Badge variant="outline" className="text-muted-foreground font-semibold text-xs border-primary/20">
                CEC &bull; ParSU Goa
              </Badge>
            </div>
            <h2 className="mt-2 text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
              College of Engineering and Computational Sciences
            </h2>
            <p className="mt-1 text-xs text-muted-foreground max-w-2xl leading-relaxed">
              Dean-level executive monitoring of academic defenses, department throughput between DCS &amp; DOE,
              panel consensus verdicts, and institutional research completion.
            </p>
          </div>

          {/* Institutional Fast Links (strictly no /admin actions) */}
          <div className="flex flex-wrap items-center gap-2">
            <Link href="/dashboard/defenses">
              <Button size="sm" variant="default" className="gap-1.5 font-bold shadow-xs">
                <Calendar className="h-4 w-4" />
                College Defenses
              </Button>
            </Link>
            <Link href="/dashboard/grades">
              <Button size="sm" variant="outline" className="gap-1.5 font-bold border-border">
                <Award className="h-4 w-4 text-primary" />
                Deliberation Grades
              </Button>
            </Link>
            <Link href="/dashboard/submissions">
              <Button size="sm" variant="outline" className="gap-1.5 font-bold border-border">
                <FileText className="h-4 w-4 text-primary" />
                Manuscripts
              </Button>
            </Link>
            <Link href="/dashboard/analytics">
              <Button size="sm" variant="outline" className="gap-1.5 font-bold border-border">
                <BarChart3 className="h-4 w-4 text-primary" />
                Analytics
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* College Executive KPI Overview */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-4 flex items-center gap-4 border-border/80 shadow-xs">
          <div className="p-3 rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
            <Layers className="h-5 w-5" />
          </div>
          <div>
            <p className="text-2xl font-black text-slate-900 dark:text-slate-100">{totalProjects}</p>
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">CEC Research Groups</p>
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-4 border-border/80 shadow-xs">
          <div className="p-3 rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <p className="text-2xl font-black text-slate-900 dark:text-slate-100">{underReviewCount}</p>
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Defenses In Pipeline</p>
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-4 border-border/80 shadow-xs">
          <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <p className="text-2xl font-black text-slate-900 dark:text-slate-100">{completedCount}</p>
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Concluded &amp; Passed</p>
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-4 border-border/80 shadow-xs">
          <div className="p-3 rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <p className="text-2xl font-black text-slate-900 dark:text-slate-100">
              {dcsProjects.length} / {doeProjects.length}
            </p>
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">DCS / DOE Breakdown</p>
          </div>
        </Card>
      </div>

      {/* Tabs Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant={activeTab === "pipeline" ? "default" : "outline"}
            onClick={() => setActiveTab("pipeline")}
            className="font-bold text-xs gap-1.5 shadow-xs"
          >
            <Layers className="h-3.5 w-3.5" />
            College Pipeline ({projects.length})
          </Button>

          <Button
            size="sm"
            variant={activeTab === "departments" ? "default" : "outline"}
            onClick={() => setActiveTab("departments")}
            className="font-bold text-xs gap-1.5 shadow-xs"
          >
            <Building2 className="h-3.5 w-3.5" />
            Department Throughput
          </Button>

          <Button
            size="sm"
            variant={activeTab === "my_assignments" ? "default" : "outline"}
            onClick={() => setActiveTab("my_assignments")}
            className="font-bold text-xs gap-1.5 shadow-xs"
          >
            <GraduationCap className="h-3.5 w-3.5" />
            My Advisees &amp; Panels ({myAdvisees.length + myPanels.length})
          </Button>

          <Button
            size="sm"
            variant={activeTab === "verdicts" ? "default" : "outline"}
            onClick={() => setActiveTab("verdicts")}
            className="font-bold text-xs gap-1.5 shadow-xs"
          >
            <Award className="h-3.5 w-3.5" />
            Deliberation Verdicts
          </Button>
        </div>
      </div>

      {/* TAB 1: College Defense Pipeline */}
      {activeTab === "pipeline" && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-muted/40 p-3 rounded-xl border border-border">
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-semibold">
                <Filter className="h-3.5 w-3.5" /> Department:
              </div>
              <select
                value={deptFilter}
                onChange={(e) => setDeptFilter(e.target.value)}
                className="h-8 rounded-lg border border-border bg-card px-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
              >
                <option value="all">All CEC Departments ({projects.length})</option>
                <option value="dcs">Dept. of Computational Sciences ({dcsProjects.length})</option>
                <option value="doe">Dept. of Engineering ({doeProjects.length})</option>
              </select>

              <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-semibold ml-2">
                Stage:
              </div>
              <select
                value={stageFilter}
                onChange={(e) => setStageFilter(e.target.value)}
                className="h-8 rounded-lg border border-border bg-card px-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
              >
                <option value="all">All Stages</option>
                <option value="Concept Defense">Concept Defense</option>
                <option value="Proposal Defense">Proposal Defense</option>
                <option value="Final Defense">Final Defense</option>
              </select>
            </div>

            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search candidate or title..."
                className="h-8 w-full sm:w-56 pl-8 pr-3 text-xs bg-card border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          {/* Projects Table */}
          <Card className="overflow-hidden border-border/80 shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/50 text-[11px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border">
                  <tr>
                    <th className="px-4 py-3">Project Title &amp; Candidate</th>
                    <th className="px-4 py-3">Department</th>
                    <th className="px-4 py-3">Defense Stage</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border font-medium">
                  {filteredProjects.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-muted-foreground font-semibold">
                        No projects matching the selected criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredProjects.map((p) => {
                      const studentName = p.students?.profiles
                        ? `${p.students.profiles.first_name} ${p.students.profiles.last_name}`
                        : "Student Group";
                      const deptCode = p.departments?.code || (p.departments?.name?.includes("Computational") ? "DCS" : "DOE");

                      return (
                        <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-3 max-w-sm">
                            <p className="font-bold text-foreground line-clamp-1">{p.title}</p>
                            <p className="text-[11px] text-muted-foreground flex items-center gap-1.5 mt-0.5">
                              <Users className="h-3 w-3" />
                              {studentName}
                              {p.students?.student_number && (
                                <span className="text-[10px] text-muted-foreground/80">({p.students.student_number})</span>
                              )}
                            </p>
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant="outline" className="font-bold text-[10px] uppercase border-border">
                              {deptCode}
                            </Badge>
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-semibold text-foreground">
                              {p.defense_stages?.name || "Unassigned"}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <Badge
                              variant={
                                p.status === "completed"
                                  ? "success"
                                  : p.status === "revision_required"
                                  ? "danger"
                                  : p.status === "under_review" || p.status === "scheduled"
                                  ? "info"
                                  : "secondary"
                              }
                              className="capitalize text-[10px] font-bold"
                            >
                              {p.status.replace(/_/g, " ")}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <Link href={`/dashboard/defenses`}>
                                <Button size="sm" variant="ghost" className="h-7 px-2 text-[11px] font-bold">
                                  Defenses &rarr;
                                </Button>
                              </Link>
                              <Link href={`/workspace/${p.id}/${p.current_stage_id || "stage"}`}>
                                <Button size="sm" variant="outline" className="h-7 px-2 text-[11px] font-bold gap-1">
                                  <ExternalLink className="h-3 w-3" />
                                  Manuscript
                                </Button>
                              </Link>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* TAB 2: Department Throughput (DCS vs. DOE) */}
      {activeTab === "departments" && (
        <div className="grid gap-6 md:grid-cols-2">
          {/* Department of Computational Sciences */}
          <Card className="border-border/80 shadow-xs">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <Badge className="bg-blue-600 text-white font-bold text-[10px]">DCS</Badge>
                <span className="text-xs text-muted-foreground font-semibold">ParSU Main Campus</span>
              </div>
              <CardTitle className="text-base font-bold mt-1 text-slate-900 dark:text-slate-100">
                Department of Computational Sciences
              </CardTitle>
              <CardDescription className="text-xs">
                BS Information Technology &bull; Computer Science Programs
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-3 bg-muted/40 rounded-xl border border-border">
                  <p className="text-xl font-black text-slate-900 dark:text-slate-100">{dcsProjects.length}</p>
                  <p className="text-[10px] text-muted-foreground font-bold uppercase mt-0.5">Projects</p>
                </div>
                <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-xl border border-amber-200 dark:border-amber-800">
                  <p className="text-xl font-black text-amber-700 dark:text-amber-400">
                    {dcsProjects.filter((p) => p.status === "under_review" || p.status === "scheduled").length}
                  </p>
                  <p className="text-[10px] text-muted-foreground font-bold uppercase mt-0.5">In Review</p>
                </div>
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl border border-emerald-200 dark:border-emerald-800">
                  <p className="text-xl font-black text-emerald-700 dark:text-emerald-400">
                    {dcsProjects.filter((p) => p.status === "completed").length}
                  </p>
                  <p className="text-[10px] text-muted-foreground font-bold uppercase mt-0.5">Concluded</p>
                </div>
              </div>

              <div className="rounded-xl border border-border/60 bg-muted/20 p-3 space-y-2">
                <p className="text-xs font-bold text-foreground">Recent Candidate Defenses</p>
                {dcsProjects.slice(0, 3).map((p) => (
                  <div key={p.id} className="flex items-center justify-between text-xs py-1 border-b border-border/40 last:border-0">
                    <span className="font-semibold text-foreground line-clamp-1 max-w-xs">{p.title}</span>
                    <Badge variant="outline" className="text-[9px] font-bold shrink-0">
                      {p.defense_stages?.name || "Stage"}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Department of Engineering */}
          <Card className="border-border/80 shadow-xs">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <Badge className="bg-amber-600 text-white font-bold text-[10px]">DOE</Badge>
                <span className="text-xs text-muted-foreground font-semibold">ParSU Main Campus</span>
              </div>
              <CardTitle className="text-base font-bold mt-1 text-slate-900 dark:text-slate-100">
                Department of Engineering
              </CardTitle>
              <CardDescription className="text-xs">
                Civil, Electrical, &amp; Mechanical Engineering Programs
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-3 bg-muted/40 rounded-xl border border-border">
                  <p className="text-xl font-black text-slate-900 dark:text-slate-100">{doeProjects.length}</p>
                  <p className="text-[10px] text-muted-foreground font-bold uppercase mt-0.5">Projects</p>
                </div>
                <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-xl border border-amber-200 dark:border-amber-800">
                  <p className="text-xl font-black text-amber-700 dark:text-amber-400">
                    {doeProjects.filter((p) => p.status === "under_review" || p.status === "scheduled").length}
                  </p>
                  <p className="text-[10px] text-muted-foreground font-bold uppercase mt-0.5">In Review</p>
                </div>
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl border border-emerald-200 dark:border-emerald-800">
                  <p className="text-xl font-black text-emerald-700 dark:text-emerald-400">
                    {doeProjects.filter((p) => p.status === "completed").length}
                  </p>
                  <p className="text-[10px] text-muted-foreground font-bold uppercase mt-0.5">Concluded</p>
                </div>
              </div>

              <div className="rounded-xl border border-border/60 bg-muted/20 p-3 space-y-2">
                <p className="text-xs font-bold text-foreground">Recent Candidate Defenses</p>
                {doeProjects.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic py-2">No active engineering candidate defenses registered yet.</p>
                ) : (
                  doeProjects.slice(0, 3).map((p) => (
                    <div key={p.id} className="flex items-center justify-between text-xs py-1 border-b border-border/40 last:border-0">
                      <span className="font-semibold text-foreground line-clamp-1 max-w-xs">{p.title}</span>
                      <Badge variant="outline" className="text-[9px] font-bold shrink-0">
                        {p.defense_stages?.name || "Stage"}
                      </Badge>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 3: My Advisees & Panels (Direct faculty assignments without switcher) */}
      {activeTab === "my_assignments" && (
        <div className="space-y-6">
          <div className="rounded-xl border border-border bg-muted/30 p-4">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <GraduationCap className="h-4 w-4 text-primary" /> Faculty Roles (Personal Advisees &amp; Defense Committees)
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Because you are an active faculty member as well as College Dean, any research groups you advise or evaluate are
              accessible directly here without having to toggle role switchers.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Advised Projects */}
            <Card className="border-border/80 shadow-xs">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-blue-600" /> My Advisees ({myAdvisees.length})
                </CardTitle>
                <CardDescription className="text-xs">Groups where you serve as primary research adviser</CardDescription>
              </CardHeader>
              <CardContent>
                {myAdvisees.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground font-semibold">
                    You have no active advisees assigned at this time.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {myAdvisees.map((proj: any) => (
                      <div key={proj.id} className="p-3 rounded-lg border border-border bg-card flex items-center justify-between">
                        <div>
                          <p className="font-bold text-xs line-clamp-1">{proj.title}</p>
                          <p className="text-[10px] text-muted-foreground">{proj.defense_stages?.name || "Stage"}</p>
                        </div>
                        <Link href={`/dashboard/submissions`}>
                          <Button size="sm" variant="outline" className="h-7 text-xs font-bold">
                            Review &rarr;
                          </Button>
                        </Link>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Paneled Projects */}
            <Card className="border-border/80 shadow-xs">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Users className="h-4 w-4 text-purple-600" /> My Defense Panels ({myPanels.length})
                </CardTitle>
                <CardDescription className="text-xs">Defense committees where you serve as evaluator</CardDescription>
              </CardHeader>
              <CardContent>
                {myPanels.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground font-semibold">
                    You have no defense panels appointed at this time.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {myPanels.map((proj: any) => (
                      <div key={proj.id} className="p-3 rounded-lg border border-border bg-card flex items-center justify-between">
                        <div>
                          <p className="font-bold text-xs line-clamp-1">{proj.title}</p>
                          <p className="text-[10px] text-muted-foreground">{proj.defense_stages?.name || "Stage"}</p>
                        </div>
                        <Link href={`/dashboard/grades`}>
                          <Button size="sm" variant="outline" className="h-7 text-xs font-bold">
                            Evaluate &rarr;
                          </Button>
                        </Link>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* TAB 4: Deliberation Verdicts & Grades */}
      {activeTab === "verdicts" && (
        <Card className="overflow-hidden border-border/80 shadow-xs">
          <CardHeader className="pb-3 border-b border-border">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Award className="h-4 w-4 text-emerald-600" /> College Defense Deliberations &amp; Final Scores
            </CardTitle>
            <CardDescription className="text-xs">
              Institutional consensus scores and defense outcomes for CEC candidate presentations
            </CardDescription>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/50 text-[11px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border">
                <tr>
                  <th className="px-4 py-3">Project Title</th>
                  <th className="px-4 py-3">Department</th>
                  <th className="px-4 py-3">Stage</th>
                  <th className="px-4 py-3">Consensus Score</th>
                  <th className="px-4 py-3">Verdict</th>
                  <th className="px-4 py-3 text-right">Deliberation Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border font-medium">
                {evaluations.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-muted-foreground font-semibold">
                      No deliberations recorded yet in CEC.
                    </td>
                  </tr>
                ) : (
                  evaluations.map((ev) => (
                    <tr key={ev.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 max-w-sm">
                        <p className="font-bold text-foreground line-clamp-1">{ev.projects?.title || "Defense Project"}</p>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className="font-bold text-[10px] uppercase border-border">
                          {ev.projects?.departments?.code || "CEC"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 font-semibold text-foreground">
                        {ev.defense_stages?.name || "Defense Stage"}
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-black text-sm text-foreground">
                          {ev.total_score ? `${Number(ev.total_score).toFixed(2)}%` : "Pending"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          variant={
                            ev.verdict_code === "passed"
                              ? "success"
                              : ev.verdict_code === "passed_minor"
                              ? "warning"
                              : ev.verdict_code === "failed"
                              ? "danger"
                              : "secondary"
                          }
                          className="capitalize text-[10px] font-bold"
                        >
                          {ev.verdict_code ? ev.verdict_code.replace(/_/g, " ") : ev.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right text-muted-foreground text-[11px]">
                        {new Date(ev.updated_at).toLocaleDateString("en-PH", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* College Activity Feed */}
      <div className="pt-2">
        <ActivityFeed />
      </div>
    </div>
  );
}
