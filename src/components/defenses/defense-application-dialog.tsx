"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  FileText,
  CheckCircle2,
  Clock,
  AlertCircle,
  Calendar,
  Users,
  Building2,
  ShieldCheck,
  Award,
  Printer,
  ChevronRight,
  Send,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import {
  submitDefenseApplicationAction,
  certifyDefenseApplicationAction,
  approveDefenseApplicationAction,
  getProjectDefenseApplicationAction,
} from "@/lib/defenses/application-actions";
import {
  DefenseApplication,
  DefenseApplicationRequirements,
  DefenseApplicationStatus,
} from "@/types/database";
import { ParsuFormsModal } from "@/components/defenses/parsu-forms-modal";
import { getProgramFormMetadata } from "@/lib/workflow/template-resolver";

export interface DefenseApplicationDialogProps {
  projectId: string;
  stageId: string;
  projectTitle: string;
  programName?: string;
  collegeName?: string;
  departmentName?: string;
  programCode?: string;
  proponents: Array<{ name: string; isLeader?: boolean }>;
  adviser?: { name: string; id?: string };
  isAdviser?: boolean;
  isChairOrCoordinator?: boolean;
  triggerButton?: React.ReactNode;
  onApplicationUpdated?: (application: DefenseApplication) => void;
}

export function DefenseApplicationDialog({
  projectId,
  stageId,
  projectTitle,
  programName = "BS Information Technology",
  collegeName,
  departmentName,
  programCode,
  proponents,
  adviser,
  isAdviser = false,
  isChairOrCoordinator = false,
  triggerButton,
  onApplicationUpdated,
}: DefenseApplicationDialogProps) {
  const meta = getProgramFormMetadata({
    programCode: programCode || programName,
    programName,
    collegeName,
    departmentName,
  });

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [application, setApplication] = useState<DefenseApplication | null>(null);

  // Form states
  const [accomplishmentReport, setAccomplishmentReport] = useState(true);
  const [documentationChapters, setDocumentationChapters] = useState(true);
  const [presentationFiles, setPresentationFiles] = useState(true);
  const [preferredDate, setPreferredDate] = useState("");
  const [preferredTime, setPreferredTime] = useState("");
  const [notes, setNotes] = useState("");

  // Adviser / Chair action states
  const [adviserRemarks, setAdviserRemarks] = useState(
    "The manuscript and requirements have been verified and endorsed for oral defense."
  );

  // Printable Form modal state
  const [printModalOpen, setPrintModalOpen] = useState(false);

  // Load existing application
  useEffect(() => {
    if (!open && !projectId) return;

    async function loadApp() {
      setLoading(true);
      try {
        const res = await getProjectDefenseApplicationAction(projectId, stageId);
        if (res.success && res.application) {
          setApplication(res.application);
          const reqs = res.application.requirements_checklist;
          if (reqs) {
            setAccomplishmentReport(!!reqs.accomplishment_report);
            setDocumentationChapters(!!reqs.documentation_chapters);
            setPresentationFiles(!!reqs.presentation_files);
          }
          if (res.application.preferred_dates && res.application.preferred_dates.length > 0) {
            setPreferredDate(res.application.preferred_dates[0].date || "");
            setPreferredTime(res.application.preferred_dates[0].time || "");
          }
          if (res.application.notes) {
            setNotes(res.application.notes);
          }
        }
      } catch (err) {
        console.error("Failed to load defense application:", err);
      } finally {
        setLoading(false);
      }
    }

    loadApp();
  }, [open, projectId, stageId]);

  const handleSubmitApplication = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!accomplishmentReport || !documentationChapters || !presentationFiles) {
      toast.error("All institutional defense requirements must be checked off.");
      return;
    }

    setSubmitting(true);
    try {
      const requirements: DefenseApplicationRequirements = {
        accomplishment_report: accomplishmentReport,
        documentation_chapters: documentationChapters,
        presentation_files: presentationFiles,
      };

      const preferredDates = preferredDate
        ? [{ date: preferredDate, time: preferredTime || undefined }]
        : [];

      const res = await submitDefenseApplicationAction({
        projectId,
        stageId,
        defenseType: "Oral Defense",
        formCode: meta.formCodeApplication,
        requirements,
        preferredDates,
        notes,
      });

      if (!res.success || !res.application) {
        throw new Error(res.error || "Failed to submit defense application");
      }

      setApplication(res.application);
      toast.success(`Application for Oral Defense (${meta.formCodeApplication}) submitted successfully!`);
      if (onApplicationUpdated) onApplicationUpdated(res.application);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to submit application";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCertify = async () => {
    if (!application?.id) return;
    setSubmitting(true);
    try {
      const res = await certifyDefenseApplicationAction({
        applicationId: application.id,
        remarks: adviserRemarks,
      });

      if (!res.success || !res.application) {
        throw new Error(res.error || "Failed to certify application");
      }

      setApplication(res.application);
      toast.success("Adviser certification recorded and endorsed!");
      if (onApplicationUpdated) onApplicationUpdated(res.application);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to certify application";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleApproveChair = async () => {
    if (!application?.id) return;
    setSubmitting(true);
    try {
      const res = await approveDefenseApplicationAction({
        applicationId: application.id,
        chairName: meta.chairpersonName,
      });

      if (!res.success || !res.application) {
        throw new Error(res.error || "Failed to approve application");
      }

      setApplication(res.application);
      toast.success("Department Chair approval officially signed!");
      if (onApplicationUpdated) onApplicationUpdated(res.application);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to approve application";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status?: DefenseApplicationStatus) => {
    switch (status) {
      case "approved_by_chair":
        return (
          <Badge variant="success" className="gap-1 text-[10px] font-bold">
            <CheckCircle2 className="h-3 w-3" /> Approved by Dept. Chair
          </Badge>
        );
      case "scheduled":
        return (
          <Badge variant="default" className="gap-1 text-[10px] font-bold">
            <Calendar className="h-3 w-3" /> Defense Scheduled
          </Badge>
        );
      case "certified_by_adviser":
        return (
          <Badge variant="warning" className="gap-1 text-[10px] font-bold">
            <ShieldCheck className="h-3 w-3" /> Certified by Adviser
          </Badge>
        );
      case "submitted_by_student":
        return (
          <Badge variant="secondary" className="gap-1 text-[10px] font-bold">
            <Clock className="h-3 w-3" /> Awaiting Adviser Sign-off
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-[10px] text-muted-foreground">
            Not Yet Applied
          </Badge>
        );
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        {triggerButton ? (
          <DialogTrigger asChild>{triggerButton}</DialogTrigger>
        ) : (
          <DialogTrigger asChild>
            <Button
              size="sm"
              variant={application ? "outline" : "default"}
              className="gap-1.5 h-8 text-xs font-semibold cursor-pointer"
            >
              <FileText className="h-4 w-4" />
              {application ? `View Defense Application (${meta.formCodeApplication})` : "Apply for Oral Defense"}
            </Button>
          </DialogTrigger>
        )}

        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between gap-3 border-b border-border pb-3">
              <div>
                <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  Application for Oral Defense ({meta.formCodeApplication})
                </DialogTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {meta.departmentHeader} • Partido State University
                </p>
              </div>
              <div>{getStatusBadge(application?.status)}</div>
            </div>
          </DialogHeader>

          {/* Workflow Stepper */}
          <div className="py-2">
            <div className="grid grid-cols-4 gap-2 text-center text-[10px] font-bold">
              <div
                className={`p-2 rounded-lg border ${
                  application
                    ? "bg-primary/10 border-primary/30 text-primary"
                    : "bg-muted/40 border-border text-muted-foreground"
                }`}
              >
                1. Proponents Submit
              </div>
              <div
                className={`p-2 rounded-lg border ${
                  application?.adviser_certification
                    ? "bg-primary/10 border-primary/30 text-primary"
                    : "bg-muted/40 border-border text-muted-foreground"
                }`}
              >
                2. Adviser Certifies
              </div>
              <div
                className={`p-2 rounded-lg border ${
                  application?.defense_schedule_id || application?.status === "scheduled"
                    ? "bg-primary/10 border-primary/30 text-primary"
                    : "bg-muted/40 border-border text-muted-foreground"
                }`}
              >
                3. Defense Scheduled
              </div>
              <div
                className={`p-2 rounded-lg border ${
                  application?.chair_approval || application?.status === "approved_by_chair"
                    ? "bg-primary/10 border-primary/30 text-primary"
                    : "bg-muted/40 border-border text-muted-foreground"
                }`}
              >
                4. Chair Approved
              </div>
            </div>
          </div>

          {/* Project Details Overview */}
          <Card className="p-3.5 bg-muted/20 border-border/60 rounded-xl space-y-2 text-xs">
            <div className="grid grid-cols-3 gap-2">
              <span className="font-semibold text-muted-foreground col-span-1">Research Title:</span>
              <span className="font-bold text-foreground col-span-2">{projectTitle}</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <span className="font-semibold text-muted-foreground col-span-1">Degree Program:</span>
              <span className="text-foreground col-span-2">{programName}</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <span className="font-semibold text-muted-foreground col-span-1">Proponents:</span>
              <span className="text-foreground col-span-2">
                {proponents.map((p) => p.name).join(", ")}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <span className="font-semibold text-muted-foreground col-span-1">Research Adviser:</span>
              <span className="text-foreground col-span-2 font-medium">
                {adviser?.name || "Not yet assigned"}
              </span>
            </div>
          </Card>

          {/* Main Form Content */}
          <form onSubmit={handleSubmitApplication} className="space-y-4 pt-1">
            {/* Checklist of Requirements */}
            <div className="space-y-2">
              <Label className="text-xs font-bold text-foreground uppercase tracking-wide">
                I. Checklist of Defense Requirements
              </Label>
              <div className="space-y-2 p-3 rounded-xl border border-border bg-card">
                <label className="flex items-center gap-2.5 cursor-pointer text-xs">
                  <input
                    type="checkbox"
                    checked={accomplishmentReport}
                    onChange={(e) => setAccomplishmentReport(e.target.checked)}
                    className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                  />
                  <div>
                    <span className="font-semibold text-foreground">
                      Accomplishment Report / Progress Log
                    </span>
                    <p className="text-[10px] text-muted-foreground">
                      Verified record of milestones and adviser consultation hours.
                    </p>
                  </div>
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer text-xs">
                  <input
                    type="checkbox"
                    checked={documentationChapters}
                    onChange={(e) => setDocumentationChapters(e.target.checked)}
                    className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                  />
                  <div>
                    <span className="font-semibold text-foreground">
                      Complete Manuscript Documentation (Chapters 1 to 4)
                    </span>
                    <p className="text-[10px] text-muted-foreground">
                      Draft uploaded to workspace and endorsed by adviser.
                    </p>
                  </div>
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer text-xs">
                  <input
                    type="checkbox"
                    checked={presentationFiles}
                    onChange={(e) => setPresentationFiles(e.target.checked)}
                    className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                  />
                  <div>
                    <span className="font-semibold text-foreground">
                      Audio-Visual Presentation Slides (PowerPoint / PDF)
                    </span>
                    <p className="text-[10px] text-muted-foreground">
                      Slide deck prepared for the 20-minute oral defense delivery.
                    </p>
                  </div>
                </label>
              </div>
            </div>

            {/* Target Date Preferences */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="pref-date" className="text-xs font-semibold">
                  Preferred Defense Date
                </Label>
                <Input
                  type="date"
                  id="pref-date"
                  value={preferredDate}
                  onChange={(e) => setPreferredDate(e.target.value)}
                  className="text-xs h-8"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="pref-time" className="text-xs font-semibold">
                  Preferred Time Slot
                </Label>
                <Input
                  type="time"
                  id="pref-time"
                  value={preferredTime}
                  onChange={(e) => setPreferredTime(e.target.value)}
                  className="text-xs h-8"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="app-notes" className="text-xs font-semibold">
                Special Requests or Notes for the Panel
              </Label>
              <Input
                id="app-notes"
                placeholder="e.g., Audio-visual hardware equipment needed or schedule constraints"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="text-xs h-8"
              />
            </div>

            {/* Section II: Adviser Certification Status */}
            {application?.adviser_certification ? (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs space-y-1">
                <div className="flex items-center justify-between font-bold text-emerald-800 dark:text-emerald-300">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    Certified by Research Adviser
                  </span>
                  <span className="text-[10px] font-normal">
                    {new Date(application.adviser_certification.certified_at).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-[11px] text-emerald-900/80 dark:text-emerald-200">
                  &ldquo;{application.adviser_certification.remarks}&rdquo;
                </p>
                <p className="text-[10px] font-bold text-emerald-800 dark:text-emerald-300 pt-0.5">
                  Signed: {application.adviser_certification.adviser_name}
                </p>
              </div>
            ) : isAdviser && application ? (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs space-y-2">
                <div className="flex items-center gap-1.5 font-bold text-amber-800 dark:text-amber-300">
                  <ShieldCheck className="h-4 w-4 text-amber-600" />
                  Research Adviser Action Required
                </div>
                <p className="text-[11px] text-muted-foreground">
                  As the research adviser, certify that the proponents have completed the requirements and are ready to defend.
                </p>
                <Input
                  value={adviserRemarks}
                  onChange={(e) => setAdviserRemarks(e.target.value)}
                  placeholder="Adviser remarks / endorsement note"
                  className="text-xs h-8"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="default"
                  disabled={submitting}
                  onClick={handleCertify}
                  className="h-8 text-xs font-bold gap-1.5"
                >
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Certify &amp; Endorse for Defense
                </Button>
              </div>
            ) : null}

            {/* Section IV: Chair Approval */}
            {application?.chair_approval ? (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs space-y-1">
                <div className="flex items-center justify-between font-bold text-emerald-800 dark:text-emerald-300">
                  <span className="flex items-center gap-1.5">
                    <Award className="h-4 w-4 text-emerald-600" />
                    Officially Approved by Department Chairperson
                  </span>
                  <span className="text-[10px] font-normal">
                    {new Date(application.chair_approval.approved_at).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-[10px] font-bold text-emerald-800 dark:text-emerald-300">
                  KENNEDY C. CUYA, DIT • Department Chairperson, DCS
                </p>
              </div>
            ) : isChairOrCoordinator && application?.status === "certified_by_adviser" ? (
              <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 text-xs space-y-2">
                <div className="flex items-center gap-1.5 font-bold text-primary">
                  <Building2 className="h-4 w-4" />
                  Department Chairperson Approval (DCS-CF-03)
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Sign official approval on behalf of the Department of Computational Sciences.
                </p>
                <Button
                  type="button"
                  size="sm"
                  variant="default"
                  disabled={submitting}
                  onClick={handleApproveChair}
                  className="h-8 text-xs font-bold gap-1.5"
                >
                  <Award className="h-3.5 w-3.5" />
                  Approve Application as Chair
                </Button>
              </div>
            ) : null}

            {/* Bottom Toolbar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-3 border-t border-border">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setPrintModalOpen(true)}
                className="h-8 text-xs font-semibold gap-1.5 w-full sm:w-auto"
              >
                <Printer className="h-3.5 w-3.5 text-primary" />
                View &amp; Print Official {meta.formCodeApplication}
              </Button>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setOpen(false)}
                  className="h-8 text-xs"
                >
                  Close
                </Button>

                <Button
                  type="submit"
                  size="sm"
                  disabled={submitting}
                  className="h-8 text-xs font-bold gap-1.5"
                >
                  <Send className="h-3.5 w-3.5" />
                  {submitting
                    ? "Submitting..."
                    : application
                    ? "Update Application"
                    : "Submit Application"}
                </Button>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Printable ParSU Forms Modal */}
      <ParsuFormsModal
        open={printModalOpen}
        onOpenChange={setPrintModalOpen}
        defaultForm={meta.formCodeApplication as any}
        collegeName={collegeName}
        departmentName={departmentName}
        programCode={programCode}
        projectData={{
          title: projectTitle,
          program: programName,
          college: collegeName,
          department: departmentName,
          proponents,
          adviser,
        }}
        application={application}
      />
    </>
  );
}
