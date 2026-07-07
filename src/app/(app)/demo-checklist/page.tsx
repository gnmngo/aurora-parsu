"use client";

import { useEffect, useState } from "react";
import { 
  CheckCircle2, 
  XCircle, 
  RefreshCw, 
  Database, 
  User, 
  FileText, 
  Sliders, 
  MessageSquare, 
  Award,
  ChevronDown,
  ChevronUp,
  FileCheck
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";

interface ChecklistItem {
  id: string;
  title: string;
  description: string;
  status: "pending" | "pass" | "fail";
  details: any;
}

export default function DemoChecklistPage() {
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<ChecklistItem[]>([
    { id: "auth", title: "User Authentication Status", description: "Verifies if there is a logged-in user and displays their role.", status: "pending", details: null },
    { id: "projects", title: "Project Creation Check", description: "Verifies that at least one research project exists in the database.", status: "pending", details: null },
    { id: "rubrics", title: "Rubric Configuration Check", description: "Verifies that rubric templates are configured and active.", status: "pending", details: null },
    { id: "manuscript", title: "PDF Manuscript Check", description: "Verifies if a PDF document version exists and checks storage.", status: "pending", details: null },
    { id: "annotations", title: "Workspace Annotations Check", description: "Verifies if page-anchored comments exist on uploaded manuscripts.", status: "pending", details: null },
    { id: "evaluations", title: "Grading & Evaluation Check", description: "Verifies if evaluations (draft or final) exist in the system.", status: "pending", details: null },
  ]);
  const [expandedItem, setExpandedItem] = useState<string | null>(null);

  const supabase = createClient();

  const runDiagnostics = async () => {
    setLoading(true);
    const updated = [...items];

    try {
      // 1. Auth check
      const { data: { session }, error: sessionErr } = await supabase.auth.getSession();
      const authItem = updated.find(i => i.id === "auth")!;
      if (sessionErr || !session?.user) {
        authItem.status = "fail";
        authItem.details = { error: sessionErr?.message || "No logged-in user found." };
      } else {
        // Query user roles
        const { data: roles } = await supabase
          .from("user_roles")
          .select("roles(code)")
          .eq("profile_id", session.user.id);

        authItem.status = "pass";
        authItem.details = {
          userId: session.user.id,
          email: session.user.email,
          metadata: session.user.user_metadata,
          roles: roles?.map((r: any) => r.roles?.code) ?? []
        };
      }

      // 2. Project check
      const projItem = updated.find(i => i.id === "projects")!;
      const { data: projData, error: projErr } = await supabase
        .from("projects")
        .select("id, title, status, academic_year, created_at")
        .order("created_at", { ascending: false });

      if (projErr) {
        projItem.status = "fail";
        projItem.details = { error: projErr.message };
      } else if (!projData || projData.length === 0) {
        projItem.status = "fail";
        projItem.details = { error: "No projects found in database." };
      } else {
        projItem.status = "pass";
        projItem.details = {
          count: projData.length,
          latest: projData[0],
          allProjects: projData
        };
      }

      // 3. Rubrics check
      const rubricItem = updated.find(i => i.id === "rubrics")!;
      const { data: rubData, error: rubErr } = await supabase
        .from("rubric_templates")
        .select("id, title, criteria, passing_score, created_at")
        .order("created_at", { ascending: false });

      if (rubErr) {
        rubricItem.status = "fail";
        rubricItem.details = { error: rubErr.message };
      } else if (!rubData || rubData.length === 0) {
        rubricItem.status = "fail";
        rubricItem.details = { error: "No rubric templates configured." };
      } else {
        rubricItem.status = "pass";
        rubricItem.details = {
          count: rubData.length,
          latest: rubData[0],
          allRubrics: rubData
        };
      }

      // 4. Manuscript check
      const manItem = updated.find(i => i.id === "manuscript")!;
      const { data: docVerData, error: docVerErr } = await supabase
        .from("document_versions")
        .select("id, file_name, storage_path, file_size, is_current, created_at")
        .order("created_at", { ascending: false });

      if (docVerErr) {
        manItem.status = "fail";
        manItem.details = { error: docVerErr.message };
      } else if (!docVerData || docVerData.length === 0) {
        manItem.status = "fail";
        manItem.details = { error: "No document versions found in database." };
      } else {
        // List storage folder to check manuscripts bucket
        const { data: files, error: filesErr } = await supabase.storage.from("manuscripts").list();
        manItem.status = "pass";
        manItem.details = {
          databaseVersionsCount: docVerData.length,
          latestDbVersion: docVerData[0],
          storageBucketFiles: files ?? [],
          storageError: filesErr ? filesErr.message : null
        };
      }

      // 5. Annotations check
      const annItem = updated.find(i => i.id === "annotations")!;
      const { data: annData, error: annErr } = await supabase
        .from("annotations")
        .select("id, page_number, content, severity, status, created_at")
        .order("created_at", { ascending: false });

      if (annErr) {
        annItem.status = "fail";
        annItem.details = { error: annErr.message };
      } else if (!annData || annData.length === 0) {
        annItem.status = "fail";
        annItem.details = { error: "No annotations or review feedback comments found." };
      } else {
        annItem.status = "pass";
        annItem.details = {
          count: annData.length,
          latest: annData[0],
          allAnnotations: annData
        };
      }

      // 6. Evaluations check
      const evalItem = updated.find(i => i.id === "evaluations")!;
      const { data: evalData, error: evalErr } = await supabase
        .from("evaluations")
        .select("id, status, verdict_code, scores, created_at")
        .order("created_at", { ascending: false });

      if (evalErr) {
        evalItem.status = "fail";
        evalItem.details = { error: evalErr.message };
      } else if (!evalData || evalData.length === 0) {
        evalItem.status = "fail";
        evalItem.details = { error: "No evaluation grading sheets found." };
      } else {
        evalItem.status = "pass";
        evalItem.details = {
          count: evalData.length,
          latest: evalData[0],
          allEvaluations: evalData
        };
      }

    } catch (err: any) {
      console.error("Diagnostic error:", err);
    } finally {
      setItems(updated);
      setLoading(false);
    }
  };

  useEffect(() => {
    runDiagnostics();
  }, []);

  const getIcon = (id: string) => {
    switch (id) {
      case "auth": return <User className="h-5 w-5 text-primary" />;
      case "projects": return <Database className="h-5 w-5 text-indigo-500" />;
      case "rubrics": return <Sliders className="h-5 w-5 text-amber-500" />;
      case "manuscript": return <FileText className="h-5 w-5 text-sky-500" />;
      case "annotations": return <MessageSquare className="h-5 w-5 text-pink-500" />;
      case "evaluations": return <Award className="h-5 w-5 text-emerald-500" />;
      default: return <FileCheck className="h-5 w-5" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pass":
        return (
          <Badge variant="success" className="gap-1 px-2.5 py-0.5">
            <CheckCircle2 className="h-3.5 w-3.5" /> Pass
          </Badge>
        );
      case "fail":
        return (
          <Badge variant="danger" className="gap-1 px-2.5 py-0.5">
            <XCircle className="h-3.5 w-3.5" /> Fail
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-muted-foreground animate-pulse">
            Checking...
          </Badge>
        );
    }
  };

  return (
    <div className="min-h-screen bg-background p-6 md:p-12 space-y-8 max-w-4xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/60 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground bg-gradient-to-r from-primary to-indigo-500 bg-clip-text text-transparent">
            AURORA System Diagnostics
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            End-to-End Workspace Checklist & Database Integrity Verification
          </p>
        </div>
        <Button 
          onClick={runDiagnostics} 
          disabled={loading}
          className="rounded-xl shadow-lg shadow-primary/15"
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Run Health Diagnostics
        </Button>
      </div>

      <div className="grid gap-4">
        {items.map((item) => {
          const isExpanded = expandedItem === item.id;
          return (
            <Card 
              key={item.id} 
              className={`transition-all duration-200 border-border bg-card/40 backdrop-blur-sm shadow-sm hover:shadow-md ${
                item.status === 'fail' ? 'border-danger/30 hover:border-danger/50' : 'hover:border-primary/30'
              }`}
            >
              <button
                type="button"
                onClick={() => setExpandedItem(isExpanded ? null : item.id)}
                className="w-full flex items-start justify-between p-5 text-left"
              >
                <div className="flex gap-4">
                  <div className="p-2 rounded-xl bg-card border border-border/80 shadow-sm mt-0.5">
                    {getIcon(item.id)}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-foreground leading-none">{item.title}</h3>
                    <p className="text-xs text-muted-foreground mt-1.5 max-w-md md:max-w-xl">{item.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {getStatusBadge(item.status)}
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
              </button>

              {isExpanded && (
                <CardContent className="px-5 pb-5 pt-0 border-t border-border/20 bg-muted/5">
                  <div className="mt-4">
                    <p className="text-[10px] font-bold text-muted-foreground tracking-wider uppercase mb-2">
                      Raw Query Payload & Response (JSON)
                    </p>
                    <pre className="text-[11px] font-mono bg-card border border-border p-4 rounded-xl overflow-x-auto text-foreground/90 max-h-[300px] leading-relaxed shadow-inner">
                      {JSON.stringify(item.details, null, 2)}
                    </pre>
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
