"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createClient } from "@/lib/supabase/client";
import {
  GitCommit,
  FileText,
  CheckCircle,
  Clock,
  Calendar,
  UserCheck,
  History,
  Lock,
  ExternalLink,
  ShieldAlert,
  Loader2,
  FileCheck
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ProjectTimelineAndHistoryProps {
  userId?: string;
}

export function ProjectTimelineAndHistory({ userId }: ProjectTimelineAndHistoryProps) {
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [timelineData, setTimelineData] = useState<any[]>([]);
  const [stageHistory, setStageHistory] = useState<any[]>([]);
  const supabase = createClient();

  useEffect(() => {
    async function loadProjects() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const currentUserId = userId || session?.user?.id;
        if (!currentUserId) return;

        // Fetch projects where the user is a member or coordinator/admin
        const { data: projs, error } = await supabase
          .from("projects")
          .select("id, title, status");

        if (error) throw error;
        if (projs && projs.length > 0) {
          setProjects(projs);
          setSelectedProjectId(projs[0].id);
        }
      } catch (err) {
        console.error("Error loading projects for timeline:", err);
      } finally {
        setLoading(false);
      }
    }
    loadProjects();
  }, [supabase, userId]);

  useEffect(() => {
    if (!selectedProjectId) return;

    async function loadProjectDetails() {
      try {
        // Fetch project workflow template
        const { data: projDetails } = await supabase
          .from("projects")
          .select("workflow_template_id")
          .eq("id", selectedProjectId)
          .single();

        // Fetch defense stages filtered by workflow template
        let stagesQuery = supabase
          .from("defense_stages")
          .select("*")
          .order("sequence_order");

        if (projDetails?.workflow_template_id) {
          stagesQuery = stagesQuery.eq("workflow_template_id", projDetails.workflow_template_id);
        }

        const { data: stages } = await stagesQuery;

        // 2. Fetch documents
        const { data: docs } = await supabase
          .from("documents")
          .select("*, document_versions(*)")
          .eq("project_id", selectedProjectId);

        // 3. Fetch evaluations
        const { data: evals } = await supabase
          .from("evaluations")
          .select("*, profiles(first_name, last_name, email)")
          .eq("project_id", selectedProjectId)
          .order("version", { ascending: false });

        // 4. Fetch project members
        const { data: members } = await supabase
          .from("project_members")
          .select("*, profiles(first_name, last_name)")
          .eq("project_id", selectedProjectId);

        // 5. Fetch audit logs
        const { data: logs } = await supabase
          .from("audit_logs")
          .select("*")
          .eq("entity_id", selectedProjectId)
          .order("created_at", { ascending: false });

        if (!stages) return;

        // Generate Timeline Data based on active stage & submissions
        const activeDoc = docs?.find((d) => d.status === "active") || docs?.[0];
        const activeStage = stages.find((s) => s.id === activeDoc?.stage_id) || stages[0];

        const calculatedTimeline = [
          {
            title: "Project Created",
            description: "Research project was initialized in the AURORA system.",
            status: "completed",
            date: activeDoc?.created_at ? new Date(activeDoc.created_at).toLocaleDateString() : new Date().toLocaleDateString()
          },
          {
            title: "Proposal Manuscript Uploaded",
            description: "PDF file of the proposal manuscript was submitted to coordinator.",
            status: docs && docs.length > 0 ? "completed" : "current",
            date: docs && docs[0]?.created_at ? new Date(docs[0].created_at).toLocaleDateString() : null
          },
          {
            title: "Coordinator Approval & Panel Assignment",
            description: "Defense coordinators approved manuscript structure and assigned evaluation panel.",
            status: members && members.length > 1 ? "completed" : (docs && docs.length > 0 ? "current" : "pending"),
            date: null
          },
          {
            title: "Defense Session Conducted",
            description: "Live panel presentation and query defense session.",
            status: evals && evals.some(e => e.status === "submitted") ? "completed" : "pending",
            date: null
          },
          {
            title: "Manuscript Annotations Logged",
            description: "Panelists marked specific revisions and concerns directly on PDF.",
            status: evals && evals.some(e => e.status === "submitted") ? "completed" : "pending",
            date: null
          },
          {
            title: "Evaluations Electronically Signed",
            description: "Panel members digitally signed and verified grading sheet.",
            status: evals && evals.some(e => e.status === "submitted") ? "completed" : "pending",
            date: evals && evals.find(e => e.status === "submitted")?.signed_at 
              ? new Date(evals.find(e => e.status === "submitted")!.signed_at).toLocaleDateString() 
              : null
          },
          {
            title: "Student Revisions & Verification",
            description: "Compliance revisions uploaded and verified by panel members.",
            status: "pending",
            date: null
          }
        ];

        setTimelineData(calculatedTimeline);

        // Generate History Data group by Stage
        const calculatedHistory = stages.map((stage) => {
          const stageDoc = docs?.find((d) => d.stage_id === stage.id);
          const stageVersions = stageDoc?.document_versions || [];
          const stageEvals = evals?.filter((e) => e.stage_id === stage.id) || [];
          const stageLogs = logs?.filter((l) => l.description.toLowerCase().includes(stage.name.toLowerCase())) || [];

          return {
            id: stage.id,
            name: stage.name,
            code: stage.code,
            manuscript: stageDoc ? {
              title: stageDoc.title,
              versionCount: stageVersions.length,
              latestFile: stageVersions[stageVersions.length - 1]?.file_path
            } : null,
            evaluations: stageEvals,
            avgScore: stageEvals.length > 0 
              ? (stageEvals.reduce((acc, curr) => acc + Number(curr.total_score || 0), 0) / stageEvals.length).toFixed(1)
              : null,
            verdict: stageEvals.find(e => e.status === "submitted")?.verdict_code || null,
            auditLogsCount: stageLogs.length
          };
        });

        setStageHistory(calculatedHistory);

      } catch (err) {
        console.error("Error loading project timeline/history details:", err);
      }
    }

    loadProjectDetails();
  }, [selectedProjectId, supabase]);

  if (loading) {
    return (
      <div className="flex h-44 items-center justify-center rounded-xl border border-border bg-card">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (projects.length === 0) {
    return null;
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="bg-muted/10 border-b border-border flex flex-row items-center justify-between py-4">
        <div>
          <CardTitle className="text-base font-bold">Defense Traceability & History</CardTitle>
          <p className="text-xs text-muted-foreground mt-0.5">Audit-grade records across all defense cycles</p>
        </div>
        
        {/* Project Selector dropdown */}
        <select
          value={selectedProjectId}
          onChange={(e) => setSelectedProjectId(e.target.value)}
          className="h-8 rounded-lg border border-border bg-card px-2.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-primary w-56"
        >
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.title}
            </option>
          ))}
        </select>
      </CardHeader>
      
      <CardContent className="p-6">
        <Tabs defaultValue="timeline" className="w-full">
          <TabsList className="grid w-full grid-cols-2 max-w-[400px] mb-6">
            <TabsTrigger value="timeline" className="text-xs gap-1.5 py-1.5">
              <GitCommit className="h-3.5 w-3.5" /> Workflow Timeline
            </TabsTrigger>
            <TabsTrigger value="history" className="text-xs gap-1.5 py-1.5">
              <History className="h-3.5 w-3.5" /> Defense Stages History
            </TabsTrigger>
          </TabsList>

          {/* Timeline Tab */}
          <TabsContent value="timeline" className="mt-0">
            <div className="relative border-l-2 border-border pl-6 ml-4 space-y-6">
              {timelineData.map((step, idx) => (
                <div key={idx} className="relative">
                  {/* Indicator Dot */}
                  <span className={cn(
                    "absolute -left-[31px] top-0.5 flex h-4 w-4 items-center justify-center rounded-full border-2 bg-white",
                    step.status === "completed" && "border-success bg-success text-white",
                    step.status === "current" && "border-info bg-info text-white animate-pulse",
                    step.status === "pending" && "border-border bg-slate-100"
                  )}>
                    {step.status === "completed" && <CheckCircle className="h-3 w-3 text-white" />}
                  </span>

                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className={cn(
                        "text-xs font-bold",
                        step.status === "completed" && "text-slate-900",
                        step.status === "current" && "text-info",
                        step.status === "pending" && "text-muted-foreground"
                      )}>
                        {step.title}
                      </h4>
                      {step.date && (
                        <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded font-semibold">
                          {step.date}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed max-w-2xl">
                      {step.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="mt-0 space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              {stageHistory.map((item) => (
                <Card key={item.id} className="border border-border shadow-sm">
                  <CardHeader className="bg-muted/10 border-b border-border/60 py-3 px-4 flex flex-row items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-slate-800">{item.name}</h4>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">Code: {item.code}</p>
                    </div>
                    {item.avgScore && (
                      <Badge variant="success" className="text-[10px] font-extrabold">
                        Avg: {item.avgScore}
                      </Badge>
                    )}
                  </CardHeader>
                  <CardContent className="p-4 space-y-3.5 text-xs">
                    {/* Manuscript info */}
                    <div>
                      <h5 className="font-semibold text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Manuscript</h5>
                      {item.manuscript ? (
                        <div className="flex items-center justify-between bg-muted/20 p-2 rounded-lg border border-border/40">
                          <span className="truncate max-w-[200px] font-medium text-[11px] text-slate-800">
                            {item.manuscript.title}
                          </span>
                          <span className="text-[9px] text-muted-foreground font-bold bg-muted px-1.5 py-0.5 rounded">
                            {item.manuscript.versionCount} vers
                          </span>
                        </div>
                      ) : (
                        <p className="text-[11px] text-muted-foreground italic">No manuscript uploaded for this stage yet.</p>
                      )}
                    </div>

                    {/* Evaluations & Signatures */}
                    <div>
                      <h5 className="font-semibold text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Evaluations & Signatures</h5>
                      {item.evaluations.length > 0 ? (
                        <div className="space-y-1.5">
                          {item.evaluations.map((ev: any) => (
                            <div key={ev.id} className="flex items-center justify-between border-b border-slate-100 pb-1.5 last:border-0 last:pb-0">
                              <div>
                                <p className="font-bold text-[11px] text-slate-800">
                                  {ev.printed_name || `${ev.profiles?.first_name} ${ev.profiles?.last_name}`}
                                </p>
                                <p className="text-[9px] text-emerald-600 font-semibold flex items-center gap-0.5 mt-0.5">
                                  <Lock className="h-2.5 w-2.5" /> {ev.certificate_serial || "Signed"}
                                </p>
                              </div>
                              <Badge variant="secondary" className="text-[9px] font-bold">
                                Score: {ev.total_score}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[11px] text-muted-foreground italic">No evaluations submitted yet.</p>
                      )}
                    </div>

                    {/* Stage status overview */}
                    <div className="border-t border-slate-100 pt-2 flex items-center justify-between text-[10px] text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <FileCheck className="h-3 w-3" /> Verdict: <strong className="text-slate-800 capitalize">{item.verdict?.replace("_", " ") || "Pending"}</strong>
                      </span>
                      <span>
                        {item.auditLogsCount} audit logs
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
