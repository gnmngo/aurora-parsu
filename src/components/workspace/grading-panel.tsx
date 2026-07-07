"use client";

import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ChevronDown, 
  ChevronUp, 
  Calculator, 
  Save, 
  Send, 
  MessageSquare, 
  Check, 
  Clock, 
  AlertCircle,
  FileText,
  User,
  Users,
  CornerDownRight,
  Loader2,
  Sliders,
  CheckCircle2,
  Plus,
  Award
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { RubricBuilder } from "@/components/grading/rubric-builder";
import { computeWeightedScore, deriveScoreLabel } from "@/lib/rubric/scoring";
import { SignatureDialog } from "@/components/workspace/signature-dialog";
import { CertificateDialog } from "@/components/workspace/certificate-dialog";
import { signEvaluationAction, createNewEvaluationVersionAction } from "@/lib/evaluations/actions";
import { updateAnnotationStatusAction } from "@/lib/annotations/actions";
import { useAuth } from "@/hooks/use-auth";

function CollapsibleSection({
  title,
  defaultOpen = true,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <Card className="shadow-none border border-border bg-card">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between p-4 text-left hover:bg-muted/10 transition-colors"
      >
        <CardTitle className="text-sm font-semibold tracking-tight">{title}</CardTitle>
        {open ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <CardContent className="pt-0 pb-4 px-4">{children}</CardContent>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}

interface GradingPanelProps {
  projectId: string;
  stageId: string;
  documentVersionId: string | null;
  annotationRefreshKey?: number;
}

export function GradingPanel({
  projectId,
  stageId,
  documentVersionId,
  annotationRefreshKey = 0,
}: GradingPanelProps) {
  const { roles } = useAuth();
  const isFacultyOrAdmin = roles.some((r) => ["panelist", "adviser", "coordinator", "sys_admin"].includes(r));
  const [projectInfo, setProjectInfo] = useState<any>(null);
  const [rubricTemplate, setRubricTemplate] = useState<any>(null);
  const [evalStatus, setEvalStatus] = useState<string | null>(null);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [verdict, setVerdict] = useState("passed_minor");
  const [notes, setNotes] = useState("");
  const [recommendations, setRecommendations] = useState("");
  const [annotations, setAnnotations] = useState<any[]>([]);
  const [activeReplyId, setActiveReplyId] = useState<string | null>(null);
  const [replyTexts, setReplyTexts] = useState<Record<string, string>>({});
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [replyingId, setReplyingId] = useState<string | null>(null);

  const [evalId, setEvalId] = useState<string | null>(null);
  const [evalVersion, setEvalVersion] = useState<number>(1);
  const [signatureDialogOpen, setSignatureDialogOpen] = useState(false);
  const [certificateDialogOpen, setCertificateDialogOpen] = useState(false);
  const [evaluationData, setEvaluationData] = useState<any>(null);
  const [panelistProfile, setPanelistProfile] = useState<any>(null);

  const supabase = createClient();

  const loadData = async () => {
    try {
      setLoading(true);

      // 1. Fetch project and stage details in parallel
      const [projResult, stageResult, rubricResult] = await Promise.all([
        supabase
          .from("projects")
          .select(`
            title,
            departments ( name ),
            students (
              program,
              profiles ( first_name, last_name )
            )
          `)
          .eq("id", projectId)
          .single(),
        supabase
          .from("defense_stages")
          .select("name")
          .eq("id", stageId)
          .single(),
        supabase
          .from("rubric_templates")
          .select("*")
          .eq("project_id", projectId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle()
      ]);

      const projData = projResult.data;
      const stageData = stageResult.data;
      const rubricData = rubricResult.data;

      let submittedDate = null;
      if (documentVersionId) {
        const { data: verData } = await supabase
          .from("document_versions")
          .select("created_at")
          .eq("id", documentVersionId)
          .single();
        if (verData) {
          submittedDate = new Date(verData.created_at).toLocaleDateString();
        }
      }

      if (projData) {
        const rawProj = projData as any;
        const studentObj = Array.isArray(rawProj.students) 
          ? rawProj.students[0] 
          : rawProj.students;
        
        const profileObj = studentObj && Array.isArray(studentObj.profiles)
          ? studentObj.profiles[0]
          : studentObj?.profiles;

        const studentName = profileObj
          ? `${profileObj.first_name} ${profileObj.last_name}` 
          : "Unknown Student";
        
        setProjectInfo({
          title: rawProj.title,
          studentName,
          program: studentObj?.program || "Unassigned Program",
          department: rawProj.departments?.name || "General",
          stageName: stageData?.name || "Defense Stage",
          submittedAt: submittedDate || "No manuscript uploaded yet",
        });
      }

      setRubricTemplate(rubricData);

      // 2. Fetch existing evaluation for the current panelist
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;

      if (userId) {
        // Fetch panelist profile details for signature display
        const { data: profile } = await supabase
          .from("profiles")
          .select("first_name, last_name")
          .eq("id", userId)
          .single();
        if (profile) {
          setPanelistProfile(profile);
        }

        const { data: evalData } = await supabase
          .from("evaluations")
          .select("*")
          .eq("project_id", projectId)
          .eq("stage_id", stageId)
          .eq("panelist_id", userId)
          .order("version", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (evalData) {
          setEvalId(evalData.id);
          setEvalVersion(evalData.version || 1);
          setEvalStatus(evalData.status);
          setVerdict(evalData.verdict_code || "passed_minor");
          setNotes(evalData.panel_notes || "");
          setRecommendations(evalData.recommendations || "");
          setEvaluationData(evalData);

          // Fetch historical rubric template if different from latest
          if (evalData.rubric_template_id && evalData.rubric_template_id !== rubricData?.id) {
            const { data: histRubric } = await supabase
              .from("rubric_templates")
              .select("*")
              .eq("id", evalData.rubric_template_id)
              .maybeSingle();
            if (histRubric) {
              setRubricTemplate(histRubric);
            }
          }
          
          // Populate scores
          if (evalData.scores) {
            setScores(evalData.scores);
          } else if (rubricData?.criteria) {
            const initialScores: Record<string, number> = {};
            rubricData.criteria.forEach((c: any) => {
              const key = c.id || c.name;
              initialScores[key] = 0;
            });
            setScores(initialScores);
          }
        } else if (rubricData?.criteria) {
          setEvalId(null);
          setEvalVersion(1);
          setEvalStatus(null);
          setEvaluationData(null);
          const initialScores: Record<string, number> = {};
          rubricData.criteria.forEach((c: any) => {
            const key = c.id || c.name;
            initialScores[key] = 0;
          });
          setScores(initialScores);
        }
      }
    } catch (err) {
      console.error("Error loading workspace details:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadAnnotations = async () => {
    if (!documentVersionId) return;

    try {
      const { data, error } = await supabase
        .from("annotations")
        .select(`
          id,
          document_version_id,
          page_number,
          type,
          coordinates,
          selected_text,
          content,
          severity,
          status,
          created_by,
          created_at,
          profiles ( first_name, last_name ),
          annotation_replies (
            id,
            annotation_id,
            content,
            created_by,
            created_at,
            profiles ( first_name, last_name )
          ),
          annotation_history (
            id,
            from_status,
            to_status,
            notes,
            changed_at,
            profiles:changed_by ( first_name, last_name )
          )
        `)
        .eq("document_version_id", documentVersionId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      if (data) {
        // Order nested replies and history
        const sorted = data.map((ann: any) => {
          if (ann.annotation_replies) {
            ann.annotation_replies.sort(
              (a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
            );
          }
          if (ann.annotation_history) {
            ann.annotation_history.sort(
              (a: any, b: any) => new Date(a.changed_at).getTime() - new Date(b.changed_at).getTime()
            );
          }
          return ann;
        });
        setAnnotations(sorted);
      }
    } catch (err) {
      console.error("Error loading annotations:", err);
    }
  };

  useEffect(() => {
    loadData();
  }, [projectId, stageId, documentVersionId]);

  useEffect(() => {
    if (!documentVersionId) {
      setAnnotations([]);
      return;
    }

    loadAnnotations();

    // Subscribe to annotations and replies changes
    const channel = supabase
      .channel(`workspace-annotations-grading-${documentVersionId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "annotations",
          filter: `document_version_id=eq.${documentVersionId}`,
        },
        () => {
          loadAnnotations();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "annotation_replies",
        },
        () => {
          loadAnnotations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [documentVersionId, annotationRefreshKey]);

  const weightedScore = useMemo(() => {
    if (!rubricTemplate?.criteria) return 0;
    return computeWeightedScore(rubricTemplate.criteria, scores);
  }, [rubricTemplate, scores]);

  const scoreLabel = useMemo(() => {
    if (!rubricTemplate) return "failing" as const;
    return deriveScoreLabel(weightedScore, {
      passing_score: rubricTemplate.passing_score,
      excellent_score: rubricTemplate.excellent_score,
    });
  }, [rubricTemplate, weightedScore]);

  const handleUpdateAnnotationStatus = async (annotationId: string, newStatus: string) => {
    try {
      setSaving(true);
      await updateAnnotationStatusAction({
        annotationId,
        newStatus: newStatus as any,
      });

      // Fire evaluation_events trigger to let DB scoring/readiness recompute
      const eventType = newStatus === "verified" ? "annotation_verified" : "annotation_updated";
      
      await supabase.from("evaluation_events").insert({
        project_id: projectId,
        stage_id: stageId,
        event_type: eventType,
        payload: {
          annotation_id: annotationId,
          status: newStatus,
        },
      });

      toast.success(`Comment status set to "${newStatus}"`);
      await loadAnnotations();
    } catch (err: any) {
      console.error("Error updating annotation status:", err);
      toast.error(err.message || "Error updating status");
    } finally {
      setSaving(false);
    }
  };

  const handleAddReply = async (annotationId: string) => {
    const text = replyTexts[annotationId]?.trim();
    if (!text) return;

    setReplyingId(annotationId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;
      if (!userId) {
        toast.error("You must be logged in to add replies.");
        return;
      }

      const { error } = await supabase
        .from("annotation_replies")
        .insert({
          annotation_id: annotationId,
          content: text,
          created_by: userId,
        });

      if (error) throw error;

      // Clear input
      setReplyTexts(prev => ({ ...prev, [annotationId]: "" }));
      setActiveReplyId(null);
      toast.success("Reply added successfully!");
      loadAnnotations();
    } catch (err: any) {
      console.error("Error adding reply:", err);
      toast.error(`Failed to add reply: ${err.message}`);
    } finally {
      setReplyingId(null);
    }
  };

  const handleSaveEvaluation = async (submitStatus: "draft" | "submitted") => {
    if (!rubricTemplate) {
      toast.error("No rubric template loaded.");
      return;
    }

    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;
      if (!userId) {
        toast.error("You must be logged in to evaluate.");
        return;
      }

      // 1. Submit/upsert evaluation record
      const { data: evalData, error: evalError } = await supabase
        .from("evaluations")
        .upsert({
          project_id: projectId,
          stage_id: stageId,
          panelist_id: userId,
          rubric_template_id: rubricTemplate.id,
          status: "draft",
          scores: scores,
          verdict_code: verdict,
          panel_notes: notes,
          recommendations: recommendations,
          version: evalVersion,
        }, {
          onConflict: "project_id, stage_id, panelist_id, version"
        })
        .select()
        .single();

      if (evalError) throw evalError;

      setEvalId(evalData.id);
      setEvalStatus(evalData.status);
      setEvaluationData(evalData);

      if (submitStatus === "submitted") {
        setSignatureDialogOpen(true);
      } else {
        toast.success("Evaluation draft saved successfully!");
      }
    } catch (err: any) {
      console.error("Error saving evaluation:", err);
      toast.error(`Error saving evaluation: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleSignComplete = async (sig: {
    signatureType: "drawn" | "typed" | "uploaded";
    signatureImage: string;
    printedName: string;
    positionRole: string;
  }) => {
    if (!evalId) {
      toast.error("Save your draft evaluation first.");
      return;
    }

    try {
      toast.loading("Securing signature and locking evaluation...");
      const updated = await signEvaluationAction({
        evaluationId: evalId,
        signatureType: sig.signatureType,
        signatureImage: sig.signatureImage,
        printedName: sig.printedName,
        positionRole: sig.positionRole,
        scores,
        verdictCode: verdict,
        panelNotes: notes,
        recommendations,
      });

      toast.dismiss();
      toast.success("Verified electronic signature applied successfully!");
      setEvalStatus(updated.status);
      setEvaluationData(updated);
      setEvalVersion(updated.version);
    } catch (err: any) {
      toast.dismiss();
      toast.error(err?.message || "Failed to submit signature.");
    }
  };

  const handleCreateNewVersion = async () => {
    try {
      setSaving(true);
      toast.loading("Creating new evaluation version...");
      const newEval = await createNewEvaluationVersionAction(projectId, stageId);
      
      toast.dismiss();
      toast.success(`Evaluation version v${newEval.version} created!`);
      setEvalId(newEval.id);
      setEvalVersion(newEval.version);
      setEvalStatus(newEval.status);
      setVerdict(newEval.verdict_code || "passed_minor");
      setNotes(newEval.panel_notes || "");
      setRecommendations(newEval.recommendations || "");
      setEvaluationData(newEval);
      if (newEval.scores) {
        setScores(newEval.scores);
      }
    } catch (err: any) {
      toast.dismiss();
      toast.error(err?.message || "Failed to create new version.");
    } finally {
      setSaving(false);
    }
  };

  const verdicts = [
    { value: "passed", label: "Passed" },
    { value: "passed_minor", label: "Passed with Minor Revisions" },
    { value: "passed_major", label: "Passed with Major Revisions" },
    { value: "failed", label: "Failed" },
  ];

  if (loading) {
    return (
      <div className="flex h-full flex-col items-center justify-center bg-card p-6 text-sm text-muted-foreground gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span>Loading evaluation workspace...</span>
      </div>
    );
  }

  if (!rubricTemplate) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-8 text-center bg-card">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary mb-4">
          <Sliders className="h-6 w-6" />
        </div>
        <h3 className="text-base font-semibold text-foreground">No grading rubric defined</h3>
        <p className="mt-2 text-xs text-muted-foreground max-w-xs mx-auto mb-6">
          Before you can start grading this defense manuscript, you need to configure a custom grading rubric template for this project.
        </p>
        <RubricBuilder onRubricCreated={loadData} projectId={projectId} />
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="space-y-4 p-4">
        {/* Section A - Defense Information */}
        {projectInfo && (
          <CollapsibleSection title="Section A — Defense Information" defaultOpen={false}>
            <dl className="grid gap-3 text-xs pt-1">
              {[
                ["Student", projectInfo.studentName, <User className="h-3.5 w-3.5 inline mr-1 text-muted-foreground" />],
                ["Program", projectInfo.program, <FileText className="h-3.5 w-3.5 inline mr-1 text-muted-foreground" />],
                ["Department", projectInfo.department, <Users className="h-3.5 w-3.5 inline mr-1 text-muted-foreground" />],
                ["Defense Stage", projectInfo.stageName, <Badge variant="outline">{projectInfo.stageName}</Badge>],
                ["Uploaded Date", projectInfo.submittedAt, null],
              ].map(([label, value, icon]: any) => (
                <div key={label} className="flex justify-between items-center py-1 border-b border-border/40 last:border-0">
                  <dt className="text-muted-foreground flex items-center font-medium">{label}</dt>
                  <dd className="font-semibold text-foreground text-right flex items-center">
                    {icon && typeof icon !== "string" && !value.props ? icon : null}
                    {typeof value === "string" ? value : value}
                  </dd>
                </div>
              ))}
            </dl>
          </CollapsibleSection>
        )}

        {/* Section B - Rubric Grading */}
        <CollapsibleSection title="Section B — Rubric Grading">
          <div className="space-y-5 pt-1">
            {/* Status bar */}
            <div className="flex items-center justify-between pb-2 border-b border-border/40">
              <span className="text-xs text-muted-foreground font-medium">Evaluation Status</span>
              {evalStatus === "submitted" ? (
                <Badge variant="success" className="gap-1 px-2.5 py-0.5 text-[10px]">
                  <Check className="h-3 w-3" /> Submitted
                </Badge>
              ) : evalStatus === "draft" ? (
                <Badge variant="warning" className="gap-1 px-2.5 py-0.5 text-[10px]">
                  <Clock className="h-3 w-3" /> Draft
                </Badge>
              ) : (
                <Badge variant="outline" className="text-muted-foreground px-2.5 py-0.5 text-[10px]">
                  Unevaluated
                </Badge>
              )}
            </div>

            {/* Criteria list */}
            <div className="space-y-4">
              {rubricTemplate.criteria && rubricTemplate.criteria.map((criterion: any) => {
                const key = criterion.id || criterion.name;
                const scoreValue = scores[key] ?? 0;
                return (
                  <div key={key} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-semibold text-foreground">{criterion.name}</p>
                        <p className="text-[10px] text-muted-foreground">
                          Weight: {criterion.weight}%
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={scores[key] ?? ""}
                          disabled={evalStatus === "submitted"}
                          onChange={(e) => {
                            const val = Math.min(100, Math.max(0, Number(e.target.value)));
                            setScores((s) => ({
                              ...s,
                              [key]: val,
                            }));
                          }}
                          className="h-7 w-12 rounded-lg border border-border bg-card text-center text-xs font-bold focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-60"
                        />
                        <span className="text-[10px] text-muted-foreground">/ 100</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={scoreValue}
                        disabled={evalStatus === "submitted"}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setScores((s) => ({
                            ...s,
                            [key]: val,
                          }));
                        }}
                        className="h-1 flex-1 rounded bg-muted accent-primary cursor-pointer disabled:opacity-50"
                      />
                      <span className="text-[10px] font-bold text-muted-foreground w-6 text-right">
                        {scoreValue}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            <Separator className="bg-border/60" />

            {/* Weighted Score Display */}
            <div className="flex items-center justify-between rounded-xl bg-primary/5 p-4 border border-primary/10">
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <Calculator className="h-4 w-4 text-primary" />
                  <span className="text-xs font-bold text-primary">Weighted score</span>
                </div>
                <div className="flex gap-2 mt-1 text-[10px] text-muted-foreground">
                  <span>Pass: {rubricTemplate.passing_score}</span>
                  <span>•</span>
                  <span>Excel: {rubricTemplate.excellent_score}</span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-2xl font-bold text-primary">
                  {weightedScore.toFixed(1)}
                </span>
                <div className="text-[9px] mt-0.5 font-semibold">
                  {scoreLabel === "excellent" ? (
                    <Badge variant="success" className="px-1.5 py-0">Excellent</Badge>
                  ) : scoreLabel === "passing" ? (
                    <Badge variant="warning" className="px-1.5 py-0">Passing</Badge>
                  ) : (
                    <Badge variant="danger" className="px-1.5 py-0">Failing</Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Panel Notes & Recommendations */}
            <div className="space-y-3 pt-1">
              <div className="space-y-1.5">
                <label htmlFor="panel-notes" className="text-xs font-semibold text-foreground">Panel Notes / Remarks</label>
                <textarea
                  id="panel-notes"
                  disabled={evalStatus === "submitted"}
                  placeholder="Write panel remarks..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full rounded-xl border border-border bg-muted/20 px-3 py-2 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary leading-relaxed disabled:opacity-60"
                  rows={2}
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="recommendations" className="text-xs font-semibold text-foreground">Recommendations</label>
                <textarea
                  id="recommendations"
                  disabled={evalStatus === "submitted"}
                  placeholder="Write specific recommendations for revisions..."
                  value={recommendations}
                  onChange={(e) => setRecommendations(e.target.value)}
                  className="w-full rounded-xl border border-border bg-muted/20 px-3 py-2 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary leading-relaxed disabled:opacity-60"
                  rows={2}
                />
              </div>
            </div>

            {/* Verdict options */}
            <div className="space-y-2 pt-1">
              <p className="text-xs font-semibold text-foreground">Verdict</p>
              <div className="grid grid-cols-2 gap-2">
                {verdicts.map((v) => (
                  <button
                    key={v.value}
                    type="button"
                    disabled={evalStatus === "submitted"}
                    onClick={() => setVerdict(v.value)}
                    className={cn(
                      "rounded-xl border px-3 py-2.5 text-[11px] font-semibold transition-all text-center",
                      verdict === v.value
                        ? "border-primary bg-primary text-primary-foreground shadow-sm"
                        : "border-border hover:bg-muted bg-card text-muted-foreground",
                      evalStatus === "submitted" && "opacity-60 cursor-not-allowed"
                    )}
                  >
                    {v.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Save Buttons or Signature Card */}
            {evalStatus === "submitted" ? (
              <div className="space-y-4 pt-2">
                <Card className="border border-emerald-200 bg-emerald-50/40 p-4 rounded-xl shadow-inner text-emerald-900 space-y-3">
                  <div className="flex items-center gap-2 border-b border-emerald-100 pb-2">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-800">Verified Electronic Signature</h4>
                      <p className="text-[10px] text-emerald-600 font-semibold mt-0.5">✓ Verified by AURORA</p>
                    </div>
                  </div>
                  
                  {evaluationData?.signature_image && (
                    <div className="bg-white border border-emerald-100 rounded-lg p-2 flex justify-center items-center h-16 max-w-[200px] mx-auto select-none">
                      <img src={evaluationData.signature_image} alt="Electronic Signature" className="h-full object-contain pointer-events-none" />
                    </div>
                  )}

                  <dl className="grid grid-cols-2 gap-2 text-[10px] leading-relaxed pt-1 font-medium">
                    <div>
                      <dt className="text-emerald-700">Panelist</dt>
                      <dd className="font-bold">{evaluationData?.printed_name || (panelistProfile ? `${panelistProfile.first_name} ${panelistProfile.last_name}` : "Unknown")}</dd>
                    </div>
                    <div>
                      <dt className="text-emerald-700">Role</dt>
                      <dd className="font-bold capitalize">{evaluationData?.position_role || "Panelist"}</dd>
                    </div>
                    <div>
                      <dt className="text-emerald-700">Signed Date & Time</dt>
                      <dd className="font-bold">
                        {evaluationData?.signed_at ? new Date(evaluationData.signed_at).toLocaleString() : "N/A"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-emerald-700">Certificate Number</dt>
                      <dd className="font-bold font-mono">{evaluationData?.certificate_serial || "N/A"}</dd>
                    </div>
                    <div className="col-span-2 border-t border-emerald-100/50 pt-1">
                      <dt className="text-emerald-700">Integrity Hash (SHA-256)</dt>
                      <dd className="font-mono text-[9px] break-all font-bold select-all bg-emerald-100/30 p-1 rounded mt-0.5">
                        {evaluationData?.signature_hash || "N/A"}
                      </dd>
                    </div>
                  </dl>
                  <div className="border-t border-emerald-100/50 pt-2 flex justify-center">
                    <button
                      type="button"
                      onClick={() => setCertificateDialogOpen(true)}
                      className="text-xs text-primary font-bold hover:underline h-7 p-0 flex items-center gap-1.5 bg-transparent border-0 cursor-pointer"
                    >
                      <Award className="h-3.5 w-3.5" /> View Digital Certificate
                    </button>
                  </div>
                </Card>

                <Button 
                  variant="outline" 
                  className="w-full text-xs h-9 rounded-xl border-dashed border-border hover:bg-muted"
                  onClick={handleCreateNewVersion}
                  disabled={saving}
                >
                  <Plus className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                  Create New Version (Version {evalVersion + 1})
                </Button>
              </div>
            ) : (
              <div className="flex gap-2.5 pt-2">
                <Button 
                  variant="outline" 
                  className="flex-1 text-xs h-9 rounded-xl border-border hover:bg-muted"
                  onClick={() => handleSaveEvaluation("draft")}
                  disabled={saving}
                >
                  <Save className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                  Save Draft
                </Button>
                <Button 
                  className="flex-1 text-xs h-9 rounded-xl"
                  onClick={() => handleSaveEvaluation("submitted")}
                  disabled={saving}
                >
                  <Send className="h-3.5 w-3.5 mr-1.5" />
                  {saving ? "Saving..." : "Submit Grade"}
                </Button>
              </div>
            )}
          </div>
        </CollapsibleSection>

        {/* Section C - Annotations */}
        <CollapsibleSection title="Section C — Annotations" defaultOpen={true}>
          <div className="space-y-4 pt-1">
            {annotations.length === 0 ? (
              <div className="text-center py-6 text-xs text-muted-foreground bg-muted/10 rounded-xl border border-dashed border-border p-4">
                No annotations or comments on this version yet.
              </div>
            ) : (
              annotations.map((ann) => (
                <div
                  key={ann.id}
                  className="rounded-xl border border-border p-3 space-y-3 bg-card/60 shadow-sm transition-all hover:shadow-md"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <Badge
                        variant={
                          ann.severity === "critical"
                            ? "danger"
                            : ann.severity === "major"
                              ? "warning"
                              : ann.severity === "minor"
                                ? "info"
                                : "outline"
                        }
                        className="capitalize text-[10px] px-2 py-0.5 font-bold"
                      >
                        p.{ann.page_number} • {ann.severity}
                      </Badge>
                    </div>

                    <select
                      value={ann.status}
                      onChange={(e) => handleUpdateAnnotationStatus(ann.id, e.target.value)}
                      className={cn(
                        "text-[10px] font-bold rounded-lg border border-border bg-card px-2 py-1 focus:outline-none transition-colors cursor-pointer",
                        ann.status === "verified" && "text-emerald-700 bg-emerald-50 border-emerald-200",
                        ann.status === "addressed" && "text-teal-700 bg-teal-50 border-teal-200",
                        ann.status === "in_progress" && "text-amber-700 bg-amber-50 border-amber-200",
                        ann.status === "open" && "text-rose-700 bg-rose-50 border-rose-200",
                        ann.status === "resolved" && "text-sky-700 bg-sky-50 border-sky-200",
                        ann.status === "closed" && "text-slate-700 bg-slate-50 border-slate-200"
                      )}
                    >
                      <option value="open">Open</option>
                      <option value="in_progress">In Progress</option>
                      <option value="addressed">Addressed</option>
                      {isFacultyOrAdmin && (
                        <>
                          <option value="verified">Verified</option>
                          <option value="resolved">Resolved</option>
                          <option value="closed">Closed</option>
                        </>
                      )}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground font-semibold">
                      <span className="text-foreground">
                        {ann.profiles ? `${ann.profiles.first_name} ${ann.profiles.last_name}` : "Reviewer"}
                      </span>
                      <span>{new Date(ann.created_at).toLocaleDateString()}</span>
                    </div>
                    <p className="text-xs text-foreground bg-muted/40 rounded-lg p-2.5 leading-relaxed font-medium">
                      {ann.content}
                    </p>
                  </div>

                  {/* Replies List */}
                  {ann.annotation_replies && ann.annotation_replies.length > 0 && (
                    <div className="pl-3 border-l-2 border-border/80 space-y-2 mt-2">
                      {ann.annotation_replies.map((reply: any) => (
                        <div key={reply.id} className="text-xs space-y-1">
                          <div className="flex items-center justify-between text-[9px] text-muted-foreground font-semibold">
                            <span className="text-foreground flex items-center gap-1">
                              <CornerDownRight className="h-3 w-3 inline text-muted-foreground" />
                              {reply.profiles ? `${reply.profiles.first_name} ${reply.profiles.last_name}` : "User"}
                            </span>
                            <span>{new Date(reply.created_at).toLocaleDateString()}</span>
                          </div>
                          <p className="text-[11px] text-muted-foreground pl-4 bg-muted/10 rounded-lg py-1 px-2.5 font-medium leading-relaxed">
                            {reply.content}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Verification History logs list */}
                  {ann.annotation_history && ann.annotation_history.length > 0 && (
                    <div className="pl-3 border-l-2 border-primary/20 space-y-1.5 mt-2 bg-primary/5 p-2 rounded-r-lg border-y border-r border-primary/10">
                      <p className="text-[9px] font-bold text-primary uppercase tracking-wider mb-1">Status History</p>
                      {ann.annotation_history.map((hist: any) => {
                        const changerName = hist.profiles
                          ? (Array.isArray(hist.profiles) ? `${hist.profiles[0]?.first_name} ${hist.profiles[0]?.last_name}` : `${hist.profiles.first_name} ${hist.profiles.last_name}`)
                          : "User";
                        return (
                          <div key={hist.id} className="text-[10px] text-slate-700 leading-relaxed font-sans">
                            <span className="font-bold text-slate-900">{changerName}</span> marked as{" "}
                            <span className="font-extrabold capitalize text-primary">{hist.to_status}</span>
                            <span className="text-[9px] text-muted-foreground ml-1.5">
                              ({new Date(hist.changed_at).toLocaleString()})
                            </span>
                            {hist.notes && (
                              <p className="text-[9px] text-muted-foreground italic pl-2 mt-0.5">"{hist.notes}"</p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Reply Button / Textarea */}
                  <div className="pt-1">
                    {activeReplyId === ann.id ? (
                      <div className="space-y-2">
                        <textarea
                          placeholder="Type your reply..."
                          value={replyTexts[ann.id] || ""}
                          onChange={(e) =>
                            setReplyTexts((prev) => ({
                              ...prev,
                              [ann.id]: e.target.value,
                            }))
                          }
                          className="w-full rounded-xl border border-border bg-muted/30 px-3 py-2 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary leading-relaxed"
                          rows={2}
                        />
                        <div className="flex justify-end gap-1.5">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 text-[10px] px-2.5 rounded-lg text-muted-foreground hover:bg-muted"
                            onClick={() => {
                              setActiveReplyId(null);
                              setReplyTexts((prev) => ({ ...prev, [ann.id]: "" }));
                            }}
                          >
                            Cancel
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            className="h-7 text-[10px] px-3 rounded-lg"
                            onClick={() => handleAddReply(ann.id)}
                            disabled={replyingId === ann.id || !replyTexts[ann.id]?.trim()}
                          >
                            {replyingId === ann.id ? "Adding..." : "Reply"}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setActiveReplyId(ann.id)}
                        className="text-[10px] font-bold text-primary hover:text-primary/80 transition-colors flex items-center gap-1"
                      >
                        <MessageSquare className="h-3 w-3" />
                        Reply to comment
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </CollapsibleSection>

        <SignatureDialog
          open={signatureDialogOpen}
          onOpenChange={setSignatureDialogOpen}
          onSignComplete={handleSignComplete}
          totalScore={weightedScore}
          verdictLabel={verdicts.find((v) => v.value === verdict)?.label || verdict}
          panelistName={panelistProfile ? `${panelistProfile.first_name} ${panelistProfile.last_name}` : ""}
          panelistRole={evaluationData?.position_role || "Panelist"}
        />

        <CertificateDialog
          open={certificateDialogOpen}
          onOpenChange={setCertificateDialogOpen}
          evaluation={evaluationData}
          projectTitle={projectInfo?.title || "Research Project"}
          stageName={projectInfo?.defense_stages?.name || "Defense Stage"}
          panelistName={evaluationData?.printed_name || (panelistProfile ? `${panelistProfile.first_name} ${panelistProfile.last_name}` : "Panelist")}
        />
      </div>
    </ScrollArea>
  );
}
