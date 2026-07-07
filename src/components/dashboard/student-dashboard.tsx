"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { 
  Loader2, 
  AlertTriangle, 
  BookOpen, 
  Calendar, 
  FileText, 
  MessageSquare, 
  History, 
  Award,
  ChevronRight
} from "lucide-react";
import Link from "next/link";
import { TimelineStepper } from "@/components/ui/timeline-stepper";
import { ConsensusDashboard } from "@/components/dashboard/consensus-dashboard";

interface StudentDashboardProps {
  userId: string;
}

export function StudentDashboard({ userId }: StudentDashboardProps) {
  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState<any>(null);
  const [adviser, setAdviser] = useState<any>(null);
  const [schedule, setSchedule] = useState<any>(null);
  const [latestDoc, setLatestDoc] = useState<any>(null);
  const [submissionsList, setSubmissionsList] = useState<any[]>([]);
  const [revisionsList, setRevisionsList] = useState<any[]>([]);
  const [evaluationsList, setEvaluationsList] = useState<any[]>([]);
  const [stagesList, setStagesList] = useState<any[]>([]);
  const [annotationsCount, setAnnotationsCount] = useState({ total: 0, unresolved: 0 });
  const [activeTab, setActiveTab] = useState<"submissions" | "revisions" | "evaluations">("submissions");
  
  const supabase = createClient();

  useEffect(() => {
    async function loadStudentData() {
      try {
        // 1. Fetch student profile and associated project
        const { data: stdRecord } = await supabase
          .from("students")
          .select("id")
          .eq("profile_id", userId)
          .maybeSingle();

        if (!stdRecord) {
          setLoading(false);
          return;
        }

        const { data: proj } = await supabase
          .from("projects")
          .select("*, defense_stages ( id, name )")
          .eq("student_id", stdRecord.id)
          .maybeSingle();

        if (proj) {
          setProject(proj);

          // Fetch workflow stages dynamically for this project
          let stagesQuery = supabase
            .from("defense_stages")
            .select("*")
            .order("sequence_order");

          if (proj.workflow_template_id) {
            stagesQuery = stagesQuery.eq("workflow_template_id", proj.workflow_template_id);
          }
          const { data: dbStages } = await stagesQuery;
          if (dbStages) {
            setStagesList(dbStages);
          }

          // 2. Fetch adviser member
          const { data: advMem } = await supabase
            .from("project_members")
            .select("*, profiles(first_name, last_name, email)")
            .eq("project_id", proj.id)
            .eq("member_role", "adviser")
            .maybeSingle();
          if (advMem) setAdviser(advMem);

          // 3. Fetch latest schedule
          const { data: sched } = await supabase
            .from("defense_schedules")
            .select("*")
            .eq("project_id", proj.id)
            .order("scheduled_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          if (sched) setSchedule(sched);

          // 4. Fetch latest manuscript document
          const { data: docs } = await supabase
            .from("documents")
            .select("*, adviser_approval_status, document_versions(*)")
            .eq("project_id", proj.id);

          if (docs && docs.length > 0) {
            const activeDoc = docs.find(d => d.status === "active") || docs[0];
            setLatestDoc(activeDoc);

            // Compile submissions list
            const allVers: any[] = [];
            docs.forEach((doc: any) => {
              if (doc.document_versions) {
                doc.document_versions.forEach((ver: any) => {
                  allVers.push({
                    ...ver,
                    document_title: doc.title,
                    stage_id: doc.stage_id,
                    approvalStatus: doc.adviser_approval_status
                  });
                });
              }
            });
            setSubmissionsList(allVers.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));

            // Calculate annotations
            const versionIds = activeDoc.document_versions?.map((dv: any) => dv.id) || [];
            if (versionIds.length > 0) {
              const { data: anns } = await supabase
                .from("annotations")
                .select("*, profiles!created_by(first_name, last_name)")
                .in("document_version_id", versionIds);

              if (anns) {
                const total = anns.length;
                const unresolved = anns.filter((a: any) => a.status !== "verified" && a.status !== "resolved").length;
                setAnnotationsCount({ total, unresolved });
                setRevisionsList(anns.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
              }
            }
          }

          // 5. Fetch evaluations history
          const { data: evals } = await supabase
            .from("evaluations")
            .select(`
              id,
              total_score,
              verdict_code,
              status,
              signed_at,
              panelist_id,
              profiles ( first_name, last_name ),
              defense_stages ( name )
            `)
            .eq("project_id", proj.id)
            .eq("status", "submitted");
          if (evals) setEvaluationsList(evals);
        }
      } catch (err) {
        console.error("Error loading student dashboard:", err);
      } finally {
        setLoading(false);
      }
    }

    loadStudentData();
  }, [supabase, userId]);

  if (loading) {
    return (
      <div className="flex h-44 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!project) {
    return (
      <Card className="border-dashed border-border p-12 text-center flex flex-col items-center">
        <AlertTriangle className="h-10 w-10 text-muted-foreground opacity-40" />
        <h3 className="text-sm font-bold mt-4 text-slate-800 uppercase tracking-wider">No Project Registered</h3>
        <p className="text-xs text-muted-foreground mt-1 max-w-sm">
          You are not currently linked to any active research project. Contact your coordinator to register.
        </p>
      </Card>
    );
  }

  // Calculate dynamic steps
  const currentStage = stagesList.find((s) => s.id === project.current_stage_id);
  const currentSeq = currentStage?.sequence_order || 1;

  const timelineSteps = stagesList.map((stage) => {
    let status: "completed" | "current" | "pending" = "pending";
    if (stage.sequence_order < currentSeq) {
      status = "completed";
    } else if (stage.sequence_order === currentSeq) {
      status = "current";
    }
    return {
      name: stage.name,
      status,
      description: stage.description || ""
    };
  });

  return (
    <div className="space-y-6 text-xs font-semibold text-slate-800">
      {/* Welcome & Progress Card */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-800">
              Active Research Details
            </CardTitle>
            <CardDescription className="text-[10px]">
              Current capstone registry mappings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">Research Title</p>
              <h2 className="text-lg font-black text-slate-900 leading-snug">"{project.title}"</h2>
            </div>
            
            <div className="grid grid-cols-2 gap-4 border-t border-border/40 pt-4">
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">Academic Stage</p>
                <Badge variant="info" className="text-[8px] font-extrabold uppercase mt-1">
                  {project.defense_stages?.name || "Concept Defense"}
                </Badge>
              </div>

              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">Assigned Adviser</p>
                <p className="font-extrabold text-slate-900 mt-1">
                  {adviser?.profiles 
                    ? `Dr. ${adviser.profiles.first_name} ${adviser.profiles.last_name}` 
                    : "No adviser linked"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stepper Steppers timeline */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-800">
              Workflow Stages
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stagesList.length === 0 ? (
              <span className="text-muted-foreground">Loading template timeline...</span>
            ) : (
              <TimelineStepper steps={timelineSteps} />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tabs list menu */}
      <div className="flex items-center gap-1 bg-muted/60 p-0.5 rounded-lg border border-border/40 w-fit">
        <button
          onClick={() => setActiveTab("submissions")}
          className={`px-3 py-1.5 text-[10px] font-bold rounded-md transition-all cursor-pointer ${activeTab === "submissions" ? "bg-card text-primary shadow-sm" : "text-muted-foreground hover:text-slate-800"}`}
        >
          Uploaded Manuscripts
        </button>
        <button
          onClick={() => setActiveTab("revisions")}
          className={`px-3 py-1.5 text-[10px] font-bold rounded-md transition-all cursor-pointer ${activeTab === "revisions" ? "bg-card text-primary shadow-sm" : "text-muted-foreground hover:text-slate-800"}`}
        >
          Revisions Notes ({annotationsCount.unresolved})
        </button>
        <button
          onClick={() => setActiveTab("evaluations")}
          className={`px-3 py-1.5 text-[10px] font-bold rounded-md transition-all cursor-pointer ${activeTab === "evaluations" ? "bg-card text-primary shadow-sm" : "text-muted-foreground hover:text-slate-800"}`}
        >
          Panel Consensus Grades
        </button>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Main Tab Panels */}
        <div className="md:col-span-2 space-y-6">
          {activeTab === "submissions" && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-bold flex items-center gap-1.5 uppercase text-slate-800">
                  <FileText className="h-4 w-4 text-primary" /> Submission versions history
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {submissionsList.length === 0 ? (
                  <div className="p-8 text-center text-xs text-muted-foreground">
                    No manuscripts uploaded yet.
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {submissionsList.map((sub, idx) => (
                      <div key={sub.id || idx} className="p-4 flex items-center justify-between">
                        <div>
                          <p className="font-bold text-slate-900">{sub.file_name}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            Uploaded {new Date(sub.created_at).toLocaleString()}
                          </p>
                          <div className="flex gap-1.5 pt-1.5">
                            <Badge 
                              variant={
                                sub.approvalStatus === "approved" 
                                  ? "success" 
                                  : sub.approvalStatus === "rejected" 
                                    ? "danger" 
                                    : "secondary"
                              }
                              className="text-[8px] font-extrabold uppercase"
                            >
                              Adviser Status: {sub.approvalStatus || "pending"}
                            </Badge>
                          </div>
                        </div>

                        <Link href={`/workspace/${project.id}/${sub.stage_id}`}>
                          <Button variant="outline" size="sm" className="h-8 text-[11px] gap-1 rounded-lg">
                            Open in Workspace <ChevronRight className="h-3.5 w-3.5" />
                          </Button>
                        </Link>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {activeTab === "revisions" && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-bold flex items-center gap-1.5 uppercase text-slate-800">
                  <MessageSquare className="h-4 w-4 text-primary" /> Active Revision Annotations
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {revisionsList.length === 0 ? (
                  <div className="p-8 text-center text-xs text-muted-foreground">
                    All revision comments have been verified and closed!
                  </div>
                ) : (
                  <div className="divide-y divide-border max-h-96 overflow-y-auto">
                    {revisionsList.map((rev) => (
                      <div key={rev.id} className="p-4 text-xs space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900">
                            {rev.profiles ? `${rev.profiles.first_name} ${rev.profiles.last_name}` : "Evaluator"}
                          </span>
                          <div className="flex gap-1.5">
                            <Badge variant="outline" className="text-[8px] font-extrabold uppercase">
                              Page {rev.page_number}
                            </Badge>
                            <Badge variant="outline" className="text-[8px] font-extrabold uppercase capitalize">
                              Status: {rev.status}
                            </Badge>
                          </div>
                        </div>
                        <p className="text-[11px] text-muted-foreground leading-relaxed">
                          "{rev.comment || rev.content}"
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {activeTab === "evaluations" && (
            <ConsensusDashboard projectId={project.id} />
          )}
        </div>

        {/* Side Panel: defense session calendar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-bold flex items-center gap-1.5 uppercase text-slate-800">
                <Calendar className="h-4 w-4 text-primary" /> Scheduled Defense Slot
              </CardTitle>
            </CardHeader>
            <CardContent>
              {schedule ? (
                <div className="space-y-3">
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">Room / Venue</p>
                    <p className="text-sm font-black text-slate-900 mt-0.5">{schedule.room}</p>
                    <p className="text-[10px] text-muted-foreground">{schedule.building}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">Scheduled At</p>
                    <p className="text-sm font-black text-primary mt-0.5">
                      {new Date(schedule.scheduled_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-center text-xs text-muted-foreground py-6">
                  No defense timeslot scheduled for this stage yet.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
