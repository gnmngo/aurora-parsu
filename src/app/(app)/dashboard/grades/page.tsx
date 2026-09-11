"use client";

import { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { createClient } from "@/lib/supabase/client";
import { 
  Inbox, 
  FileCheck, 
  Award, 
  Gavel, 
  Loader2, 
  ChevronDown, 
  ChevronUp, 
  Users,
  Crown,
  CheckCircle2,
  AlertCircle,
  Calculator,
  UserCheck
} from "lucide-react";
import { format } from "date-fns";
import { RoleGuard } from "@/components/auth/role-guard";
import { AccessDenied } from "@/components/auth/access-denied";
import { useAuth } from "@/hooks/use-auth";
import { releaseProjectVerdictAction } from "@/lib/workflow/actions";
import { toast } from "sonner";
import { ConsensusDashboard } from "@/components/dashboard/consensus-dashboard";
import { cn } from "@/lib/utils";

/**
 * GradesPage — displays submitted evaluation score sheets and dynamic composite average grades.
 *
 * Dynamic Averaging (Flexible Committee):
 * - Evaluates across any panel size (2, 3, 4, 5+ panelists).
 * - Composite Grade = sum(panelist_scores) / total_panelists.
 * - Displays official verdict based on stage passing threshold.
 * - Identifies Chairman vs Member roles.
 */

interface CriterionScore {
  id: string;
  name: string;
  weight: number;
}

interface EvaluationRow {
  id: string;
  total_score: number | null;
  recommendations: string | null;
  panel_notes: string | null;
  submitted_at: string | null;
  scores: Record<string, number> | null;
  panelist_id: string;
  project_id: string;
  stage_id?: string | null;
  defense_stages?: { id: string; name: string; code: string; sequence_order: number } | null;
  projects: {
    id: string;
    title: string;
    student_id: string;
    archived_at?: string | null;
    programs?: { code: string; name: string } | null;
    students?: {
      student_number: string;
      profiles?: { first_name: string; last_name: string; email: string } | null;
    } | null;
  } | null;
  profiles: { first_name: string; last_name: string; email: string } | null;
  rubric_templates: { title: string; criteria: CriterionScore[]; passing_score: number } | null;
}

export default function GradesPage() {
  const [evaluations, setEvaluations] = useState<EvaluationRow[]>([]);
  const [panelRolesMap, setPanelRolesMap] = useState<Record<string, "chair" | "member">>({});
  const [expandedGroupIds, setExpandedGroupIds] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [releasingId, setReleasingId] = useState<string | null>(null);
  const [expandedConsensusId, setExpandedConsensusId] = useState<string | null>(null);
  const supabase = createClient();
  const { user, roles } = useAuth();
  const isCoordinatorOrAdmin = roles.some((r) => ["coordinator", "sys_admin"].includes(r));

  useEffect(() => {
    if (!user) return;

    async function loadGrades() {
      try {
        const isCoordinatorOrAdmin = roles.some((r) =>
          ["coordinator", "sys_admin", "college_dean"].includes(r)
        );
        const isPanelist = roles.includes("panelist");
        const isStudent = roles.includes("student");
        const isAdviser = roles.includes("adviser");

        // Fetch panel assignments to accurately identify Chairman vs Member
        const { data: panelsData } = await supabase
          .from("defense_panels")
          .select("project_id, profile_id, panel_role");

        const pMap: Record<string, "chair" | "member"> = {};
        if (panelsData) {
          panelsData.forEach((p: any) => {
            pMap[`${p.project_id}_${p.profile_id}`] = p.panel_role;
          });
        }
        setPanelRolesMap(pMap);

        // Rich join: stage, project proponents, program, evaluator, rubric
        const baseQuery = supabase
          .from("evaluations")
          .select(`
            id,
            total_score,
            recommendations,
            panel_notes,
            submitted_at,
            scores,
            panelist_id,
            project_id,
            stage_id,
            defense_stages ( id, name, code, sequence_order ),
            projects ( 
              id, 
              title, 
              student_id, 
              archived_at,
              programs ( code, name ),
              students ( student_number, profiles ( first_name, last_name, email ) )
            ),
            profiles!panelist_id ( first_name, last_name, email ),
            rubric_templates ( title, criteria, passing_score )
          `)
          .eq("status", "submitted")
          .order("submitted_at", { ascending: false });

        if (isCoordinatorOrAdmin) {
          // Full access
          const { data, error } = await baseQuery;
          if (error) throw error;
          const activeEvals = ((data as any[]) || []).filter((e) => e.projects && !e.projects.archived_at);
          setEvaluations(activeEvals);

        } else if (isPanelist) {
          // Find all projects where user is assigned as panel member
          const { data: panelAssignments } = await supabase
            .from("defense_panels")
            .select("project_id")
            .eq("profile_id", user!.id);

          const projectIds = (panelAssignments || []).map((p: any) => p.project_id);
          if (projectIds.length > 0) {
            const { data, error } = await baseQuery.in("project_id", projectIds);
            if (error) throw error;
            setEvaluations((data as unknown as EvaluationRow[]) || []);
          } else {
            const { data, error } = await baseQuery.eq("panelist_id", user!.id);
            if (error) throw error;
            setEvaluations((data as unknown as EvaluationRow[]) || []);
          }

        } else if (isAdviser) {
          // Get projects where user is adviser member
          const { data: memberProjects } = await supabase
            .from("project_members")
            .select("project_id")
            .eq("profile_id", user!.id)
            .eq("member_role", "adviser");

          const projectIds = (memberProjects || []).map((m: { project_id: string }) => m.project_id);
          if (projectIds.length === 0) {
            setEvaluations([]);
            setLoading(false);
            return;
          }

          const { data, error } = await baseQuery.in("project_id", projectIds);
          if (error) throw error;
          setEvaluations((data as unknown as EvaluationRow[]) || []);

        } else if (isStudent) {
          // Get student record → project → evaluations for that project
          const { data: studentRecord } = await supabase
            .from("students")
            .select("id")
            .eq("profile_id", user!.id)
            .maybeSingle();

          if (!studentRecord) {
            setEvaluations([]);
            setLoading(false);
            return;
          }

          const { data: project } = await supabase
            .from("projects")
            .select("id")
            .eq("student_id", studentRecord.id)
            .maybeSingle();

          if (!project) {
            setEvaluations([]);
            setLoading(false);
            return;
          }

          const { data, error } = await baseQuery.eq("project_id", project.id);
          if (error) throw error;
          setEvaluations((data as unknown as EvaluationRow[]) || []);

        } else {
          setEvaluations([]);
        }
      } catch (err) {
        console.error("Error loading grades:", err);
      } finally {
        setLoading(false);
      }
    }

    loadGrades();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, roles.join(",")]);

  // Group evaluations by project_id and stage_id for dynamic composite averaging
  const evaluationGroups = useMemo(() => {
    const groups: Record<string, EvaluationRow[]> = {};
    evaluations.forEach((ev) => {
      const key = `${ev.project_id}_${ev.stage_id || "default"}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(ev);
    });

    return Object.entries(groups).map(([groupId, items]) => {
      const first = items[0];
      const sum = items.reduce((acc, it) => acc + Number(it.total_score || 0), 0);
      // Flexible arithmetic mean across all participating panelists (denominator = items.length)
      const average = items.length > 0 ? sum / items.length : 0;
      const passingScore = Number(first.rubric_templates?.passing_score ?? 75);
      const isPassed = average >= passingScore;

      return {
        groupId,
        projectId: first.project_id,
        stageId: first.stage_id,
        projectTitle: first.projects?.title || "Research Manuscript",
        stageName: first.defense_stages?.name || "Defense Stage",
        progCode: first.projects?.programs?.code,
        studentName: first.projects?.students?.profiles
          ? `${first.projects.students.profiles.first_name} ${first.projects.students.profiles.last_name}`
          : null,
        studentNumber: first.projects?.students?.student_number,
        evaluations: items,
        totalSum: sum,
        averageScore: average,
        passingScore,
        isPassed,
      };
    });
  }, [evaluations]);

  const toggleGroupExpand = (groupId: string) => {
    setExpandedGroupIds((prev) => ({
      ...prev,
      [groupId]: !prev[groupId],
    }));
  };

  return (
    <RoleGuard allowedRoles={["coordinator", "panelist", "adviser", "sys_admin", "college_dean"]} fallback={<AccessDenied />}>
      <div className="mx-auto max-w-7xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Grades</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Evaluation scores and rubric breakdown for submitted defenses
          </p>
        </div>

        {/* Coordinator: Release Final Verdict Panel */}
        {isCoordinatorOrAdmin && evaluations.length > 0 && (() => {
          // Collect unique projects with submitted evaluations
          const projects = evaluations.reduce<{ id: string; title: string }[]>((acc, ev) => {
            if (ev.projects && !acc.find((p) => p.id === ev.project_id)) {
              acc.push({ id: ev.project_id, title: ev.projects.title });
            }
            return acc;
          }, []);
          if (projects.length === 0) return null;
          return (
            <Card className="border-border bg-card">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Gavel className="h-4 w-4 text-primary" />
                  <span className="text-sm font-bold uppercase tracking-wider">Release Final Verdict</span>
                </div>
                <p className="text-xs text-muted-foreground">Officially record the defense outcome for each project.</p>
              </CardHeader>
              <CardContent className="p-0 divide-y divide-border">
                {projects.map((proj) => {
                  const isExpanded = expandedConsensusId === proj.id;
                  return (
                    <div key={proj.id} className="p-4 space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-bold text-foreground">&ldquo;{proj.title}&rdquo;</p>
                          <button
                            type="button"
                            onClick={() => setExpandedConsensusId(isExpanded ? null : proj.id)}
                            className="text-[11px] font-semibold text-primary hover:underline flex items-center gap-1 mt-0.5 cursor-pointer"
                          >
                            <Users className="h-3.5 w-3.5" />
                            <span>{isExpanded ? "Hide Consensus Analytics" : "View Panel Consensus & Discrepancy Analytics"}</span>
                            {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                          </button>
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5">
                          {(["passed", "passed_minor", "passed_major", "failed", "conditional"] as const).map((v) => (
                            <Button
                              key={v}
                              size="sm"
                              variant={v.startsWith("passed") ? "default" : v === "failed" ? "danger" : "outline"}
                              className="h-7 text-[10px] capitalize font-bold"
                              disabled={releasingId === proj.id}
                              onClick={async () => {
                                if (!confirm(`Release verdict "${v.replace(/_/g, " ")}" for "${proj.title}"?`)) return;
                                setReleasingId(proj.id);
                                try {
                                  await releaseProjectVerdictAction(proj.id, v);
                                  toast.success(`Verdict released: ${v.replace(/_/g, " ")}`);
                                } catch (err: unknown) {
                                  const msg = err instanceof Error ? err.message : "Failed";
                                  toast.error(msg);
                                } finally {
                                  setReleasingId(null);
                                }
                              }}
                            >
                              {releasingId === proj.id ? <Loader2 className="h-3 w-3 animate-spin" /> : v.replace(/_/g, " ")}
                            </Button>
                          ))}
                        </div>
                      </div>

                      {/* Expandable Consensus Metrics */}
                      {isExpanded && (
                        <div className="pt-2 animate-in fade-in slide-in-from-top-2 duration-200">
                          <ConsensusDashboard projectId={proj.id} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          );
        })()}

        {loading ? (
          <div className="h-44 animate-pulse rounded-xl bg-muted" />
        ) : evaluationGroups.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card p-16 text-center">
            <Inbox className="h-10 w-10 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">No Evaluations Submitted</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              No grading sheets or rubric reviews have been finalized yet.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {evaluationGroups.map((group) => {
              const isDetailsExpanded = expandedGroupIds[group.groupId] || false;

              return (
                <Card key={group.groupId} className="overflow-hidden rounded-2xl border border-border shadow-sm">
                  {/* Prominent Header Banner */}
                  <CardHeader className="bg-muted/40 border-b border-border p-5">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                      <div className="space-y-1.5 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-wider bg-primary/5 border-primary/20 text-primary">
                            {group.stageName}
                          </Badge>
                          {group.progCode && (
                            <Badge variant="secondary" className="text-[9px] font-black">
                              {group.progCode}
                            </Badge>
                          )}
                          <Badge variant="outline" className="text-[10px] font-medium text-muted-foreground border-border">
                            {group.evaluations.length} Committee {group.evaluations.length === 1 ? "Member" : "Members"}
                          </Badge>
                        </div>

                        <h2 className="text-lg md:text-xl font-black text-foreground tracking-tight truncate">
                          &ldquo;{group.projectTitle}&rdquo;
                        </h2>

                        {group.studentName && (
                          <p className="text-xs text-muted-foreground font-semibold flex items-center gap-1.5">
                            <Users className="h-3.5 w-3.5 text-primary" />
                            Research Proponent: <span className="text-foreground font-bold">{group.studentName}</span>
                            {group.studentNumber ? ` (${group.studentNumber})` : ""}
                          </p>
                        )}
                      </div>

                      {/* Final Composite Average Highlight Banner (Flexible Panel Size) */}
                      <div className="flex items-center gap-3 self-start md:self-auto shrink-0">
                        <div className="rounded-2xl border border-primary/30 bg-card p-3 shadow-sm flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                            <Calculator className="h-5 w-5" />
                          </div>
                          <div>
                            <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground block">
                              Composite Average
                            </span>
                            <div className="flex items-baseline gap-1">
                              <span className="text-2xl font-black text-foreground">
                                {group.averageScore.toFixed(2)}
                              </span>
                              <span className="text-xs text-muted-foreground font-bold">/100</span>
                            </div>
                          </div>
                        </div>

                        <Badge
                          variant={group.isPassed ? "success" : "warning"}
                          className="text-xs font-black py-2 px-3 tracking-wider"
                        >
                          {group.isPassed ? "PASSED" : "NEEDS REVISION"}
                        </Badge>
                      </div>
                    </div>

                    {/* Formula Explanation Banner */}
                    <div className="mt-3 pt-3 border-t border-border/50 flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground">
                      <div className="flex items-center gap-1.5 font-medium">
                        <Calculator className="h-3.5 w-3.5 text-primary" />
                        <span>
                          Dynamic Formula: ({group.totalSum.toFixed(1)} sum of scores ÷ {group.evaluations.length} {group.evaluations.length === 1 ? "panelist" : "panelists"}) ={" "}
                          <strong className="text-foreground">{group.averageScore.toFixed(2)}%</strong>
                        </span>
                      </div>
                      <span>
                        Passing Criterion: <strong className="text-foreground">{group.passingScore}%</strong>
                      </span>
                    </div>
                  </CardHeader>

                  <CardContent className="p-5 space-y-4">
                    {/* Committee Panelist Breakdown Cards */}
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                        <UserCheck className="h-3.5 w-3.5 text-primary" />
                        Defense Committee Evaluators ({group.evaluations.length})
                      </h4>

                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {group.evaluations.map((ev) => {
                          const panelistName = ev.profiles
                            ? `${ev.profiles.first_name} ${ev.profiles.last_name}`
                            : "Evaluation Panelist";
                          const isChair = panelRolesMap[`${group.projectId}_${ev.panelist_id}`] === "chair";
                          const score = Number(ev.total_score || 0);

                          return (
                            <div
                              key={ev.id}
                              className="rounded-xl border border-border/80 bg-card p-3 space-y-2 shadow-2xs transition-all hover:border-primary/40"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="font-bold text-xs text-foreground truncate block">
                                      {panelistName}
                                    </span>
                                    {isChair ? (
                                      <Badge variant="warning" className="text-[9px] px-1.5 py-0 font-bold gap-1 bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30">
                                        <Crown className="h-2.5 w-2.5 text-amber-500" />
                                        Chairman
                                      </Badge>
                                    ) : (
                                      <Badge variant="secondary" className="text-[9px] px-1.5 py-0 font-semibold text-muted-foreground">
                                        Member
                                      </Badge>
                                    )}
                                  </div>
                                  {ev.profiles?.email && (
                                    <p className="text-[10px] text-muted-foreground truncate">{ev.profiles.email}</p>
                                  )}
                                </div>
                                <div className="text-right shrink-0">
                                  <span className="text-sm font-black text-foreground block">
                                    {score.toFixed(1)}
                                  </span>
                                  <span className="text-[9px] text-muted-foreground font-semibold">/100</span>
                                </div>
                              </div>

                              {(ev.recommendations || ev.panel_notes) && (
                                <p className="text-[11px] text-muted-foreground line-clamp-2 bg-muted/20 rounded-md p-1.5 font-medium leading-relaxed">
                                  {ev.recommendations || ev.panel_notes}
                                </p>
                              )}

                              <p className="text-[9px] text-muted-foreground text-right pt-0.5">
                                Submitted {ev.submitted_at ? format(new Date(ev.submitted_at), "MMM d, yyyy h:mm a") : "—"}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Toggle to view detailed score sheets per panelist */}
                    <div className="pt-2 border-t border-border/60">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleGroupExpand(group.groupId)}
                        className="w-full text-xs font-bold text-primary hover:text-primary hover:bg-primary/5 flex items-center justify-center gap-1.5 h-8 cursor-pointer"
                      >
                        <span>
                          {isDetailsExpanded
                            ? "Hide Detailed Rubric Breakdown & Score Sheets"
                            : `View Detailed Rubric Criteria for All ${group.evaluations.length} Evaluators`}
                        </span>
                        {isDetailsExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </Button>

                      {isDetailsExpanded && (
                        <div className="pt-4 space-y-6 animate-in fade-in duration-200">
                          {group.evaluations.map((evalItem) => {
                            const panelistName = evalItem.profiles
                              ? `${evalItem.profiles.first_name} ${evalItem.profiles.last_name}`
                              : "Evaluation Panelist";
                            const isChair = panelRolesMap[`${group.projectId}_${evalItem.panelist_id}`] === "chair";
                            const criteria: CriterionScore[] = evalItem.rubric_templates?.criteria || [];
                            const scoresMap = evalItem.scores || {};
                            const score = Number(evalItem.total_score || 0);

                            return (
                              <div
                                key={evalItem.id}
                                className="rounded-xl border border-border p-4 space-y-4 bg-muted/10"
                              >
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-2 border-b border-border/50">
                                  <div className="flex items-center gap-2">
                                    {isChair ? (
                                      <Crown className="h-4 w-4 text-amber-500" />
                                    ) : (
                                      <Award className="h-4 w-4 text-primary" />
                                    )}
                                    <span className="font-bold text-sm text-foreground">
                                      Score Sheet: {panelistName} {isChair ? "(Chairman)" : "(Member)"}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs text-muted-foreground font-semibold">Total Score:</span>
                                    <Badge variant="outline" className="text-xs font-black px-2 py-0.5">
                                      {score.toFixed(1)} / 100
                                    </Badge>
                                  </div>
                                </div>

                                {/* Criteria breakdown */}
                                {criteria.length === 0 ? (
                                  <p className="text-xs text-muted-foreground italic">No criteria breakdown recorded.</p>
                                ) : (
                                  <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                                    {criteria.map((c) => {
                                      const critScore = Number(scoresMap[c.id] || 0);
                                      const weightedContribution = ((critScore * Number(c.weight || 0)) / 100).toFixed(1);
                                      return (
                                        <div key={c.id} className="rounded-lg border border-border/60 p-3 space-y-1.5 bg-card">
                                          <div className="flex justify-between items-center text-xs">
                                            <span className="font-bold text-foreground text-[11px] truncate">{c.name}</span>
                                            <span className="font-bold text-foreground text-[11px]">{critScore.toFixed(1)}</span>
                                          </div>
                                          <Progress value={critScore} className="h-1.5" />
                                          <div className="flex justify-between items-center text-[10px] text-muted-foreground font-semibold pt-0.5">
                                            <span>Weight: {c.weight}%</span>
                                            <span className="text-primary font-bold">+{weightedContribution} pts</span>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}

                                {/* Recommendations and Notes */}
                                {(evalItem.recommendations || evalItem.panel_notes) && (
                                  <div className="pt-2 grid gap-3 sm:grid-cols-2 text-xs">
                                    {evalItem.recommendations && (
                                      <div className="p-3 rounded-lg border border-border bg-card space-y-1">
                                        <h5 className="font-bold text-[11px] text-primary uppercase tracking-wider">
                                          Recommendations & Directives
                                        </h5>
                                        <p className="text-foreground leading-relaxed whitespace-pre-wrap text-[11px]">
                                          {evalItem.recommendations}
                                        </p>
                                      </div>
                                    )}
                                    {evalItem.panel_notes && (
                                      <div className="p-3 rounded-lg border border-border bg-card space-y-1">
                                        <h5 className="font-bold text-[11px] text-foreground uppercase tracking-wider">
                                          Deliberation Remarks
                                        </h5>
                                        <p className="text-foreground leading-relaxed whitespace-pre-wrap text-[11px]">
                                          {evalItem.panel_notes}
                                        </p>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </RoleGuard>
  );
}
