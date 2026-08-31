"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, BookOpen, ChevronRight, FileText, Loader2, Sparkles, UserCheck, Shield, Calendar } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function WorkspaceIndexPage() {
  const router = useRouter();
  const { user, profile, roles, isLoading: authLoading } = useAuth();
  const [projects, setProjects] = useState<any[]>([]);
  const [stages, setStages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function loadWorkspaceList() {
      if (authLoading) return;

      try {
        setLoading(true);

        // Fetch default stages
        const { data: dbStages } = await supabase
          .from("defense_stages")
          .select("id, name, sequence_order")
          .order("sequence_order");
        
        const stageList = dbStages || [];
        setStages(stageList);
        const defaultStageId = stageList[0]?.id || "";

        // If user is authenticated, query their relevant defense projects
        if (user) {
          const isStudent = roles.includes("student") && !roles.some((r) => ["panelist", "adviser", "coordinator", "sys_admin"].includes(r));
          const isPanelist = roles.includes("panelist");
          const isAdviser = roles.includes("adviser");

          let query = supabase
            .from("projects")
            .select(`
              id,
              title,
              status,
              current_stage_id,
              created_at,
              departments ( name ),
              defense_stages ( id, name ),
              students (
                profiles ( first_name, last_name )
              )
            `)
            .order("created_at", { ascending: false })
            .limit(10);

          if (isStudent) {
            // Find student's own project
            const { data: studentRecord } = await supabase
              .from("students")
              .select("id")
              .eq("profile_id", user.id)
              .maybeSingle();

            if (studentRecord) {
              query = query.eq("student_id", studentRecord.id);
            }
          } else if (isPanelist) {
            // Find projects where user is assigned as panelist
            const { data: panelAssignments } = await supabase
              .from("defense_panels")
              .select("project_id")
              .eq("profile_id", user.id);

            const projIds = panelAssignments?.map((p) => p.project_id) || [];
            if (projIds.length > 0) {
              query = query.in("id", projIds);
            }
          }

          const { data: projData } = await query;

          if (projData && projData.length > 0) {
            setProjects(projData);

            // If student only has 1 active project, auto-navigate directly to that workspace
            if (isStudent && projData.length === 1) {
              const p = projData[0] as any;
              const stageObj = Array.isArray(p.defense_stages) ? p.defense_stages[0] : p.defense_stages;
              const targetStage = p.current_stage_id || stageObj?.id || defaultStageId;
              if (targetStage) {
                router.replace(`/workspace/${p.id}/${targetStage}`);
                return;
              }
            }
          }
        }
      } catch (err) {
        console.error("Error loading workspace index:", err);
      } finally {
        setLoading(false);
      }
    }

    loadWorkspaceList();
  }, [user, roles, authLoading, router, supabase]);

  if (loading || authLoading) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-background text-sm text-muted-foreground gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span>Loading Defense Workspace...</span>
      </div>
    );
  }

  const defaultStageId = stages[0]?.id || "";

  return (
    <div className="min-h-screen bg-slate-50/50 p-6 md:p-12">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" asChild className="h-8 w-8 -ml-2">
                <Link href="/dashboard">
                  <ArrowLeft className="h-4 w-4" />
                </Link>
              </Button>
              <h1 className="text-xl font-black text-slate-900 tracking-tight">
                Defense Evaluation &amp; Review Workspace
              </h1>
            </div>
            <p className="text-xs text-muted-foreground mt-1 ml-8">
              Select a research project to open the split-screen PDF manuscript review and grading panel.
            </p>
          </div>

          <Button asChild variant="outline" size="sm" className="gap-1.5 text-xs rounded-xl shadow-xs">
            <Link href="/workspace/demo">
              <Sparkles className="h-3.5 w-3.5 text-amber-500" />
              Open Interactive Demo Workspace
            </Link>
          </Button>
        </div>

        {/* Project Selection Cards */}
        {projects.length > 0 ? (
          <div className="grid gap-4">
            <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-1">
              Your Assigned Defense Projects ({projects.length})
            </div>
            {projects.map((proj) => {
              const studentObj = Array.isArray(proj.students) ? proj.students[0] : proj.students;
              const studentProfile = studentObj && Array.isArray(studentObj.profiles) ? studentObj.profiles[0] : studentObj?.profiles;
              const studentName = studentProfile ? `${studentProfile.first_name} ${studentProfile.last_name}` : "Student Author";
              const stageObj = Array.isArray(proj.defense_stages) ? proj.defense_stages[0] : proj.defense_stages;
              const stageId = proj.current_stage_id || stageObj?.id || defaultStageId;
              const stageName = stageObj?.name || "Defense Stage";

              return (
                <Card key={proj.id} className="hover:border-primary/50 transition-all hover:shadow-md">
                  <CardContent className="p-5 flex items-center justify-between gap-4">
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px] uppercase font-bold text-primary">
                          {stageName}
                        </Badge>
                        <Badge variant="secondary" className="text-[10px] capitalize">
                          {proj.status.replace("_", " ")}
                        </Badge>
                      </div>
                      <h3 className="font-bold text-slate-900 text-sm truncate">
                        {proj.title}
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        Author: <span className="font-semibold text-foreground">{studentName}</span> • Department: {proj.departments?.name || "General"}
                      </p>
                    </div>

                    <Button asChild className="rounded-xl shrink-0 gap-1.5 font-bold text-xs">
                      <Link href={`/workspace/${proj.id}/${stageId}`}>
                        Open Workspace <ChevronRight className="h-4 w-4" />
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card className="text-center p-8 bg-card border-dashed">
            <CardHeader className="p-0 mb-4">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-2">
                <BookOpen className="h-6 w-6" />
              </div>
              <CardTitle className="text-base font-bold">No Active Defense Assigned</CardTitle>
              <CardDescription className="text-xs max-w-sm mx-auto">
                You do not have any manuscripts currently pending defense evaluation. You can test the split-screen PDF viewer and rubric grading in the interactive demo workspace.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Button asChild className="rounded-xl gap-2 font-bold">
                <Link href="/workspace/demo">
                  <Sparkles className="h-4 w-4 text-amber-300" />
                  Launch Interactive Demo Workspace
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
