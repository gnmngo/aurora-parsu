"use client";

import { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { createClient } from "@/lib/supabase/client";
import { 
  Users, 
  FileText, 
  MessageSquare, 
  Calendar, 
  Loader2, 
  ChevronRight, 
  Inbox,
  Clock,
  History,
  Activity,
  CheckCircle2,
  XCircle,
  AlertTriangle
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { adviserApproveDocumentAction } from "@/lib/workflow/actions";

interface AdviserDashboardProps {
  userId: string;
}

export function AdviserDashboard({ userId }: AdviserDashboardProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [advisees, setAdvisees] = useState<any[]>([]);
  const [pendingManuscripts, setPendingManuscripts] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [commentsHistory, setCommentsHistory] = useState<any[]>([]);
  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const [updatingDocId, setUpdatingDocId] = useState<string | null>(null);
  const [approvalModal, setApprovalModal] = useState<{
    open: boolean;
    docId: string;
    projectTitle: string;
    status: "approved" | "rejected";
  } | null>(null);
  const [approvalRemarks, setApprovalRemarks] = useState("");
  
  const [activeTab, setActiveTab] = useState<"advisees" | "queue" | "activity">("advisees");
  const supabase = useMemo(() => createClient(), []);

  const loadAdviserData = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch project IDs where user is adviser
      const { data: memberProj } = await supabase
        .from("project_members")
        .select("project_id")
        .eq("profile_id", userId)
        .eq("member_role", "adviser");

      const projectIds = memberProj?.map((mp: any) => mp.project_id) || [];

      if (projectIds.length === 0) {
        setAdvisees([]);
        setSchedules([]);
        setPendingManuscripts([]);
        setCommentsHistory([]);
        setRecentActivities([]);
        setLoading(false);
        return;
      }

      // 2. Fetch projects & student details
      const { data: projs } = await supabase
        .from("projects")
        .select(`
          id,
          title,
          status,
          current_stage_id,
          defense_stages ( id, name ),
          students ( 
            student_number, 
            profiles ( first_name, last_name, email ) 
          )
        `)
        .is("archived_at", null)
        .in("id", projectIds);

      if (projs) {
        setAdvisees(projs);

        // 3. Fetch schedules for these projects
        const { data: scheds } = await supabase
          .from("defense_schedules")
          .select("*, projects(title)")
          .in("project_id", projectIds)
          .order("scheduled_at", { ascending: true });
        if (scheds) setSchedules(scheds);

        // 4. Fetch document versions for queue
        const { data: docs } = await supabase
          .from("documents")
          .select("*, adviser_approval_status, document_versions(*), projects(title)")
          .in("project_id", projectIds);

        if (docs) {
          const pendingList: any[] = [];
          docs.forEach((doc: any) => {
            const versions = [...(doc.document_versions || [])].sort((a: any, b: any) => (b.version_number ?? 0) - (a.version_number ?? 0));
            const latestVersion = versions[0];
            if (latestVersion && ["submitted", "under_review", "revision_required", "draft", "uploading"].includes(doc.status)) {
              pendingList.push({
                documentId: doc.id,
                projectId: doc.project_id,
                stageId: doc.stage_id,
                projectTitle: doc.projects?.title,
                fileName: latestVersion.file_name,
                uploadedAt: latestVersion.created_at,
                approvalStatus: doc.adviser_approval_status || "pending"
              });
            }
          });
          setPendingManuscripts(pendingList);
        }

        // 5. Fetch adviser's comment history
        const { data: anns } = await supabase
          .from("annotations")
          .select(`
            id,
            content,
            status,
            page_number,
            created_at,
            document_versions (
              version_number,
              documents (
                projects ( title )
              )
            )
          `)
          .eq("created_by", userId)
          .order("created_at", { ascending: false })
          .limit(10);
        if (anns) setCommentsHistory(anns);

        // 6. Fetch recent activities
        const { data: logs } = await supabase
          .from("audit_logs")
          .select("*")
          .eq("profile_id", userId)
          .order("created_at", { ascending: false })
          .limit(5);
        if (logs) setRecentActivities(logs);
      }
    } catch (err: any) {
      console.error("Error loading adviser dashboard:", err);
      setError(err?.message || "Failed to load adviser dashboard data");
      toast.error("Failed to load advisee data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdviserData();
  }, [userId]);

  const handleApproval = async (docId: string, status: "approved" | "rejected", remarks?: string) => {
    setUpdatingDocId(docId);
    try {
      const finalRemarks = remarks?.trim() || (status === "approved" ? "Endorsed for defense review" : "Revisions requested by adviser");
      await adviserApproveDocumentAction(docId, status, finalRemarks);
      toast.success(`Manuscript has been successfully ${status === "approved" ? "endorsed" : "marked for revisions"}!`);
      setApprovalModal(null);
      setApprovalRemarks("");
      loadAdviserData();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Approval action failed.");
    } finally {
      setUpdatingDocId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex h-44 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="p-8 text-center border-destructive/20 bg-destructive/5 space-y-3">
        <AlertTriangle className="h-8 w-8 text-destructive mx-auto" />
        <div>
          <p className="text-sm font-bold text-slate-800">Failed to load advisee data</p>
          <p className="text-xs text-muted-foreground">{error}</p>
        </div>
        <Button onClick={loadAdviserData} size="sm" variant="outline" className="gap-2">
          Retry Loading
        </Button>
      </Card>
    );
  }

  const activeComments = commentsHistory.filter(c => c.status !== "verified" && c.status !== "closed");

  return (
    <div className="space-y-6 text-xs font-semibold text-slate-800">
      {/* Metrics Row */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card className="p-4 flex flex-row items-center gap-4">
          <div className="p-3 rounded-xl bg-blue-50 text-blue-600">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <p className="text-2xl font-black text-slate-900">{advisees.length}</p>
            <p className="text-[10px] text-muted-foreground font-bold uppercase">Assigned Advisees</p>
          </div>
        </Card>

        <Card className="p-4 flex flex-row items-center gap-4">
          <div className="p-3 rounded-xl bg-amber-50 text-amber-600">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <p className="text-2xl font-black text-slate-900">{pendingManuscripts.length}</p>
            <p className="text-[10px] text-muted-foreground font-bold uppercase">Paperless Consultations</p>
          </div>
        </Card>

        <Card className="p-4 flex flex-row items-center gap-4">
          <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600">
            <MessageSquare className="h-5 w-5" />
          </div>
          <div>
            <p className="text-2xl font-black text-slate-900">{activeComments.length}</p>
            <p className="text-[10px] text-muted-foreground font-bold uppercase">Unresolved Comments</p>
          </div>
        </Card>

        <Card className="p-4 flex flex-row items-center gap-4">
          <div className="p-3 rounded-xl bg-indigo-50 text-indigo-600">
            <Calendar className="h-5 w-5" />
          </div>
          <div>
            <p className="text-2xl font-black text-slate-900">{schedules.length}</p>
            <p className="text-[10px] text-muted-foreground font-bold uppercase">Upcoming Defenses</p>
          </div>
        </Card>
      </div>

      {/* Tabs Menu */}
      <div className="flex items-center gap-1 bg-muted/60 p-0.5 rounded-lg border border-border/40 w-fit">
        <button
          onClick={() => setActiveTab("advisees")}
          className={`px-3 py-1.5 text-[10px] font-bold rounded-md transition-all cursor-pointer ${activeTab === "advisees" ? "bg-card text-primary shadow-sm" : "text-muted-foreground hover:text-slate-800"}`}
        >
          Guidance Directory
        </button>
        <button
          onClick={() => setActiveTab("queue")}
          className={`px-3 py-1.5 text-[10px] font-bold rounded-md transition-all cursor-pointer ${activeTab === "queue" ? "bg-card text-primary shadow-sm" : "text-muted-foreground hover:text-slate-800"}`}
        >
          Paperless Review Queue ({pendingManuscripts.length})
        </button>
        <button
          onClick={() => setActiveTab("activity")}
          className={`px-3 py-1.5 text-[10px] font-bold rounded-md transition-all cursor-pointer ${activeTab === "activity" ? "bg-card text-primary shadow-sm" : "text-muted-foreground hover:text-slate-800"}`}
        >
          Activity Trails
        </button>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Main Tab Panel */}
        <div className="md:col-span-2 space-y-6">
          {activeTab === "advisees" && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-bold flex items-center gap-1.5 uppercase text-slate-800">
                  <Users className="h-4 w-4 text-primary" /> Advisee Directory
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {advisees.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-8 text-center text-xs text-muted-foreground">
                    <Inbox className="h-8 w-8 opacity-30 mb-2" />
                    <p>No students assigned under your guidance yet.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {advisees.map((adv) => {
                      const studentName = adv.students?.profiles
                        ? `${adv.students.profiles.first_name} ${adv.students.profiles.last_name}`
                        : "Unknown Student";
                      return (
                        <div key={adv.id} className="flex items-center justify-between p-4">
                          <div>
                            <p className="font-bold text-slate-900 text-sm">Student: {studentName}</p>
                            <p className="text-[10px] text-muted-foreground truncate max-w-sm mt-0.5">
                              "{adv.title}"
                            </p>
                            <div className="flex items-center gap-1.5 mt-1.5">
                              <Badge variant="info" className="text-[8px] font-extrabold uppercase">
                                {adv.defense_stages?.name || "Concept Stage"}
                              </Badge>
                              <Badge variant="outline" className="text-[8px] font-extrabold uppercase capitalize">
                                {adv.status.replace("_", " ")}
                              </Badge>
                            </div>
                          </div>
                          <Link href={`/workspace/${adv.id}/${adv.current_stage_id || adv.defense_stages?.id || ""}`}>
                            <Button variant="outline" size="sm" className="h-8 text-[11px] gap-1 rounded-lg">
                              Open Paperless Workspace <ChevronRight className="h-3.5 w-3.5" />
                            </Button>
                          </Link>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {activeTab === "queue" && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-bold flex items-center gap-1.5 uppercase text-slate-800">
                  <FileText className="h-4 w-4 text-primary" /> Active Paperless Manuscripts Review Queue
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {pendingManuscripts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-8 text-center text-xs text-muted-foreground">
                    <Inbox className="h-8 w-8 opacity-30 mb-2" />
                    <p>All advisee manuscripts have been reviewed and endorsed!</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {pendingManuscripts.map((m, idx) => (
                      <div key={idx} className="flex items-center justify-between p-4">
                        <div className="space-y-1">
                          <p className="font-bold text-slate-900 text-sm">"{m.projectTitle}"</p>
                          <p className="text-[10px] text-muted-foreground">
                            Manuscript: {m.fileName} • Uploaded {new Date(m.uploadedAt).toLocaleDateString()}
                          </p>
                          <div className="flex items-center gap-1.5 pt-1">
                            <Badge 
                              variant={
                                m.approvalStatus === "approved" 
                                  ? "success" 
                                  : m.approvalStatus === "rejected" 
                                    ? "danger" 
                                    : "secondary"
                              }
                              className="text-[8px] font-extrabold uppercase"
                            >
                              Adviser Endorsement: {m.approvalStatus === "approved" ? "Endorsed for Defense" : m.approvalStatus === "rejected" ? "Revisions Requested" : "Pending Consultation"}
                            </Badge>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {m.approvalStatus === "pending" && (
                            <>
                              {updatingDocId === m.documentId ? (
                                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                              ) : (
                                <>
                                  <Button 
                                    onClick={() => {
                                      setApprovalRemarks("Endorsed for defense review.");
                                      setApprovalModal({
                                        open: true,
                                        docId: m.documentId,
                                        projectTitle: m.projectTitle,
                                        status: "approved",
                                      });
                                    }}
                                    size="sm" 
                                    className="h-8 text-[10px] bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg flex items-center gap-0.5"
                                  >
                                    <CheckCircle2 className="h-3 w-3" /> Endorse for Defense
                                  </Button>
                                  <Button 
                                    onClick={() => {
                                      setApprovalRemarks("");
                                      setApprovalModal({
                                        open: true,
                                        docId: m.documentId,
                                        projectTitle: m.projectTitle,
                                        status: "rejected",
                                      });
                                    }}
                                    size="sm" 
                                    variant="danger"
                                    className="h-8 text-[10px] rounded-lg flex items-center gap-0.5"
                                  >
                                    <XCircle className="h-3 w-3" /> Request Revisions
                                  </Button>
                                </>
                              )}
                            </>
                          )}
                          <Link href={`/workspace/${m.projectId}/${m.stageId}`}>
                            <Button variant="outline" size="sm" className="h-8 text-[11px] rounded-lg">
                              Open Paperless Workspace
                            </Button>
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {activeTab === "activity" && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-bold flex items-center gap-1.5 uppercase text-slate-800">
                  <Activity className="h-4 w-4 text-primary" /> Recent Guidance Activity Logs
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {recentActivities.length === 0 ? (
                  <div className="p-6 text-xs text-muted-foreground italic">No activities logged yet.</div>
                ) : (
                  <div className="divide-y divide-border">
                    {recentActivities.map((l) => (
                      <div key={l.id} className="p-4 flex items-center justify-between">
                        <div>
                          <p className="font-bold text-slate-800">{l.description}</p>
                          <p className="text-[10px] text-muted-foreground">Module: {l.module} • Date: {new Date(l.created_at).toLocaleString()}</p>
                        </div>
                        <Badge variant="outline" className="text-[8px] font-extrabold uppercase font-mono">{l.ip_address}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Side Panel: Schedules and Comments */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-bold flex items-center gap-1.5 uppercase text-slate-800">
                <Calendar className="h-4 w-4 text-primary" /> Defense Schedules
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {schedules.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-8 text-center text-xs text-muted-foreground">
                  <Calendar className="h-8 w-8 opacity-30 mb-2" />
                  <p>No defenses scheduled.</p>
                </div>
              ) : (
                <div className="divide-y divide-border max-h-80 overflow-y-auto">
                  {schedules.map((sched) => (
                    <div key={sched.id} className="p-4 text-xs space-y-1.5">
                      <p className="font-bold text-slate-900 truncate">"{sched.projects?.title}"</p>
                      <p className="text-[10px] text-muted-foreground font-semibold flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" /> {new Date(sched.scheduled_at).toLocaleString()}
                      </p>
                      <p className="text-[10px] text-primary font-bold">
                        Room: {sched.room}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-bold flex items-center gap-1.5 uppercase text-slate-800">
                <History className="h-4 w-4 text-primary" /> Comment History
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {commentsHistory.length === 0 ? (
                <div className="p-6 text-xs text-muted-foreground italic">No feedback annotations created yet.</div>
              ) : (
                <div className="divide-y divide-border max-h-80 overflow-y-auto">
                  {commentsHistory.map((c) => (
                    <div key={c.id} className="p-3 text-xs space-y-1">
                      <p className="font-bold text-slate-800">"{c.content}"</p>
                      <p className="text-[9px] text-muted-foreground">
                        Page {c.page_number} • Status: <span className="font-bold text-primary uppercase">{c.status}</span>
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Adviser Remarks Modal */}
      {approvalModal && (
        <Dialog open={approvalModal.open} onOpenChange={(isOpen) => !isOpen && setApprovalModal(null)}>
          <DialogContent className="sm:max-w-[480px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-sm font-bold">
                {approvalModal.status === "approved" ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    Endorse Manuscript for Defense
                  </>
                ) : (
                  <>
                    <XCircle className="h-4 w-4 text-destructive" />
                    Request Manuscript Revisions
                  </>
                )}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                {approvalModal.status === "approved"
                  ? `Endorse "${approvalModal.projectTitle}" to proceed to defense scheduling.`
                  : `Return "${approvalModal.projectTitle}" to students for revisions before defense.`}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-2 py-2">
              <label className="text-xs font-semibold text-slate-700">
                {approvalModal.status === "approved" ? "Endorsement Remarks (Optional)" : "Required Revision Notes *"}
              </label>
              <textarea
                value={approvalRemarks}
                onChange={(e) => setApprovalRemarks(e.target.value)}
                placeholder={
                  approvalModal.status === "approved"
                    ? "Enter any notes for the defense panel (e.g. Chapter 1-3 verified)..."
                    : "Specify what changes are required before endorsement..."
                }
                rows={4}
                className="w-full rounded-md border border-input bg-background p-3 text-xs ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setApprovalModal(null)}
                disabled={updatingDocId === approvalModal.docId}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={
                  updatingDocId === approvalModal.docId ||
                  (approvalModal.status === "rejected" && !approvalRemarks.trim())
                }
                className={approvalModal.status === "approved" ? "bg-emerald-600 hover:bg-emerald-700 text-white" : ""}
                variant={approvalModal.status === "approved" ? "default" : "danger"}
                onClick={() => handleApproval(approvalModal.docId, approvalModal.status, approvalRemarks)}
              >
                {updatingDocId === approvalModal.docId ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : approvalModal.status === "approved" ? (
                  "Confirm Endorsement"
                ) : (
                  "Submit Revision Request"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
