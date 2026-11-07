"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
  Calendar,
  Building2,
  ShieldCheck,
  Award,
  Printer,
  Send,
  Download,
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
  panelists?: Array<{
    id?: string;
    name: string;
    role: "chair" | "member";
    score?: number;
    verdict?: string;
    signatureUrl?: string;
  }>;
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
  panelists = [],
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
  const [, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [application, setApplication] = useState<DefenseApplication | null>(null);

  // Default member strings split across 2 lines for BSIT official table
  const defaultMembersLine1 = proponents.slice(0, 3).map((p) => p.name).join(", ");
  const defaultMembersLine2 = proponents.slice(3).map((p) => p.name).join(", ");
  const todayFormatted = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // Official BSIT (DCS-CF-01) fields
  const [dateToday, setDateToday] = useState(todayFormatted);
  const [membersLine1, setMembersLine1] = useState(defaultMembersLine1);
  const [membersLine2, setMembersLine2] = useState(defaultMembersLine2);
  const [concept1, setConcept1] = useState(projectTitle || "");
  const [concept2, setConcept2] = useState("");
  const [concept3, setConcept3] = useState("");

  // Shared / Checklist states
  const [accomplishmentReport, setAccomplishmentReport] = useState(true);
  const [documentationChapters, setDocumentationChapters] = useState(true);
  const [presentationFiles, setPresentationFiles] = useState(true);
  const [preferredDate, setPreferredDate] = useState("");
  const [preferredTime, setPreferredTime] = useState("");
  const [notes, setNotes] = useState("");

  // Adviser action state
  const [adviserRemarks, setAdviserRemarks] = useState(
    "This is to certify that I have thoroughly evaluated the project for Title Defense requirements in accordance with the prescribed requirements and have reviewed and verified the completeness and accuracy of the documents submitted with this application. Based on this evaluation, I hereby recommend that the above name of students be permitted to proceed with the progress report defense."
  );

  // Printable Form modal state
  const [printModalOpen, setPrintModalOpen] = useState(false);

  // Sync defaults if props change before application loads
  useEffect(() => {
    if (!application) {
      setMembersLine1(proponents.slice(0, 3).map((p) => p.name).join(", "));
      setMembersLine2(proponents.slice(3).map((p) => p.name).join(", "));
      setConcept1(projectTitle || "");
    }
  }, [proponents, projectTitle, application]);

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
            setAccomplishmentReport(
              reqs.fully_accomplished_form ?? !!reqs.accomplishment_report
            );
            setDocumentationChapters(
              reqs.documentation_3_copies ?? !!reqs.documentation_chapters
            );
            setPresentationFiles(!!reqs.presentation_files);
            if (reqs.date_today) setDateToday(reqs.date_today);
            if (reqs.members_line_1 !== undefined) setMembersLine1(reqs.members_line_1);
            if (reqs.members_line_2 !== undefined) setMembersLine2(reqs.members_line_2);
            if (reqs.concept_1 !== undefined) setConcept1(reqs.concept_1);
            if (reqs.concept_2 !== undefined) setConcept2(reqs.concept_2);
            if (reqs.concept_3 !== undefined) setConcept3(reqs.concept_3);
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
      toast.error("All defense requirements must be checked off.");
      return;
    }

    setSubmitting(true);
    try {
      const requirements: DefenseApplicationRequirements = {
        accomplishment_report: accomplishmentReport,
        documentation_chapters: documentationChapters,
        presentation_files: presentationFiles,
        ...(meta.isBsit
          ? {
              date_today: dateToday,
              members_line_1: membersLine1,
              members_line_2: membersLine2,
              concept_1: concept1 || projectTitle,
              concept_2: concept2,
              concept_3: concept3,
              fully_accomplished_form: accomplishmentReport,
              documentation_3_copies: documentationChapters,
            }
          : {}),
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
      toast.success(
        `Application for Oral Defense (${meta.formCodeApplication}) submitted successfully!`
      );
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
      toast.success("Certification of the Adviser recorded and endorsed!");
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

  const chairPanelist = panelists.find((p) => p.role === "chair");
  const memberPanelists = panelists.filter((p) => p.role === "member");

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
              {application
                ? `View Defense Application (${meta.formCodeApplication})`
                : "Apply for Oral Defense"}
            </Button>
          </DialogTrigger>
        )}

        <DialogContent className="sm:max-w-3xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between gap-3 border-b border-border pb-3">
              <div>
                <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  APPLICATION FOR ORAL DEFENSE ({meta.formCodeApplication})
                </DialogTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {meta.isBsit
                    ? "Official BSIT Document • Department of Computational Sciences • Partido State University"
                    : `${meta.departmentHeader} • Partido State University`}
                </p>
              </div>
              <div>{getStatusBadge(application?.status)}</div>
            </div>
          </DialogHeader>

          {/* =====================================================================
              OFFICIAL BSIT DOCUMENT (DCS-CF-01) — EXACT UNMODIFIED STRUCTURE
              ===================================================================== */}
          {meta.isBsit ? (
            <form onSubmit={handleSubmitApplication} className="space-y-4">
              <div
                className="bg-white text-black p-6 sm:p-8 rounded-xl border border-slate-300 shadow-sm text-[12.5px] leading-relaxed"
                style={{ fontFamily: '"Palatino Linotype", "Book Antiqua", Palatino, Georgia, serif' }}
              >
                {/* Official ParSU CECS DCS Header Banner + DCS-CF-01 */}
                <div className="relative mb-4">
                  <div className="flex items-end justify-between">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src="/forms/bsit_header_banner.png"
                      alt="Partido State University - Department of Computational Sciences Header"
                      className="w-full h-auto object-contain"
                    />
                  </div>
                  <div
                    className="absolute right-2 bottom-[24%] font-bold text-xs tracking-wide text-black bg-white/90 px-1"
                    style={{ fontFamily: '"Courier New", Courier, monospace' }}
                  >
                    DCS-CF-01
                  </div>
                </div>

                {/* Centered Title: APPLICATION FOR ORAL DEFENSE */}
                <h2 className="text-center font-bold text-sm sm:text-base uppercase tracking-wide my-4 text-black">
                  APPLICATION FOR ORAL DEFENSE
                </h2>

                {/* Table 0: Date Today, Name of Members, Capstone Working Titles (Concept 1, 2, 3) */}
                <table className="w-full border-collapse text-xs sm:text-[13px] mb-5">
                  <tbody>
                    {/* Row 1: Date Today */}
                    <tr>
                      <td className="font-bold py-1.5 pr-3 w-36 whitespace-nowrap align-bottom text-black">
                        Date Today
                      </td>
                      <td colSpan={2} className="border-b border-black py-1 px-1 w-64 align-bottom">
                        <input
                          type="text"
                          value={dateToday}
                          onChange={(e) => setDateToday(e.target.value)}
                          className="w-full bg-transparent text-black focus:outline-none text-xs sm:text-[13px]"
                        />
                      </td>
                      <td className="w-1/3"></td>
                    </tr>

                    {/* Row 2: Name of Members (Line 1) */}
                    <tr>
                      <td className="font-bold py-1.5 pr-3 whitespace-nowrap align-bottom text-black">
                        Name of Members
                      </td>
                      <td colSpan={3} className="border-b border-black py-1 px-1 align-bottom">
                        <input
                          type="text"
                          value={membersLine1}
                          onChange={(e) => setMembersLine1(e.target.value)}
                          placeholder="Enter member names..."
                          className="w-full bg-transparent text-black focus:outline-none text-xs sm:text-[13px]"
                        />
                      </td>
                    </tr>

                    {/* Row 3: Name of Members (Line 2) */}
                    <tr>
                      <td className="py-1.5 pr-3"></td>
                      <td colSpan={3} className="border-b border-black py-1 px-1 align-bottom">
                        <input
                          type="text"
                          value={membersLine2}
                          onChange={(e) => setMembersLine2(e.target.value)}
                          placeholder="Additional member names (optional)..."
                          className="w-full bg-transparent text-black focus:outline-none text-xs sm:text-[13px]"
                        />
                      </td>
                    </tr>

                    {/* Row 4: Capstone Working Titles */}
                    <tr>
                      <td colSpan={4} className="font-bold pt-4 pb-1 text-black">
                        Capstone Working Titles
                      </td>
                    </tr>

                    {/* Row 5: Concept 1 */}
                    <tr>
                      <td className="py-1.5 pr-3 align-bottom text-black">Concept 1</td>
                      <td colSpan={3} className="border-b border-black py-1 px-1 align-bottom">
                        <input
                          type="text"
                          value={concept1}
                          onChange={(e) => setConcept1(e.target.value)}
                          placeholder="Enter Concept 1 working title..."
                          className="w-full bg-transparent text-black font-semibold focus:outline-none text-xs sm:text-[13px]"
                        />
                      </td>
                    </tr>

                    {/* Row 6: Concept 2 */}
                    <tr>
                      <td className="py-1.5 pr-3 align-bottom text-black">Concept 2</td>
                      <td colSpan={3} className="border-b border-black py-1 px-1 align-bottom">
                        <input
                          type="text"
                          value={concept2}
                          onChange={(e) => setConcept2(e.target.value)}
                          placeholder="Enter Concept 2 working title (if applicable)..."
                          className="w-full bg-transparent text-black focus:outline-none text-xs sm:text-[13px]"
                        />
                      </td>
                    </tr>

                    {/* Row 7: Concept 3 */}
                    <tr>
                      <td className="py-1.5 pr-3 align-bottom text-black">Concept 3</td>
                      <td colSpan={3} className="border-b border-black py-1 px-1 align-bottom">
                        <input
                          type="text"
                          value={concept3}
                          onChange={(e) => setConcept3(e.target.value)}
                          placeholder="Enter Concept 3 working title (if applicable)..."
                          className="w-full bg-transparent text-black focus:outline-none text-xs sm:text-[13px]"
                        />
                      </td>
                    </tr>
                  </tbody>
                </table>

                {/* REQUIREMENTS */}
                <div className="mb-6">
                  <p className="font-bold uppercase text-xs sm:text-[13px] mb-1.5 text-black">
                    REQUIREMENTS
                  </p>
                  <div className="space-y-1 pl-4 text-xs sm:text-[13px] text-black">
                    <label className="flex items-center gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={accomplishmentReport}
                        onChange={(e) => setAccomplishmentReport(e.target.checked)}
                        className="h-3.5 w-3.5 rounded-none border-black accent-black"
                      />
                      <span>Fully Accomplished Application Form</span>
                    </label>

                    <div>
                      <label className="flex items-center gap-2.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={documentationChapters}
                          onChange={(e) => setDocumentationChapters(e.target.checked)}
                          className="h-3.5 w-3.5 rounded-none border-black accent-black"
                        />
                        <span>Documentation (Printed, three [3] copies)</span>
                      </label>
                      <ul className="list-disc pl-11 space-y-0.5 mt-0.5">
                        <li>Chapter 1-3 of Concept 1</li>
                        <li>Concept Paper (2 &amp; 3)</li>
                      </ul>
                    </div>

                    <label className="flex items-center gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={presentationFiles}
                        onChange={(e) => setPresentationFiles(e.target.checked)}
                        className="h-3.5 w-3.5 rounded-none border-black accent-black"
                      />
                      <span>Presentation Files</span>
                    </label>
                  </div>
                </div>

                {/* CERTIFICATION OF THE ADVISER */}
                <div className="mb-6">
                  <h3 className="text-center font-bold uppercase text-xs sm:text-[13px] mb-2 text-black">
                    CERTIFICATION OF THE ADVISER
                  </h3>
                  <p className="text-justify indent-8 text-xs sm:text-[13px] leading-relaxed text-black mb-6">
                    This is to certify that I have thoroughly evaluated the project for Title Defense
                    requirements in accordance with the prescribed requirements and have reviewed and
                    verified the completeness and accuracy of the documents submitted with this
                    application. Based on this evaluation, I hereby recommend that the above name of
                    students be permitted to proceed with the progress report defense.
                  </p>

                  {/* Signature of Adviser over Printed Name */}
                  <div className="flex justify-end mt-4">
                    <div className="w-72 text-center">
                      <div className="border-b border-black pb-0.5 min-h-[24px] flex flex-col items-center justify-end">
                        {application?.adviser_certification && (
                          <span className="text-[10px] italic text-emerald-700 font-sans">
                            [Digitally Certified{" "}
                            {new Date(
                              application.adviser_certification.certified_at
                            ).toLocaleDateString()}
                            ]
                          </span>
                        )}
                        <span className="font-bold uppercase text-xs text-black">
                          {application?.adviser_certification?.adviser_name ||
                            adviser?.name ||
                            ""}
                        </span>
                      </div>
                      <p className="text-xs text-black pt-0.5">
                        Signature of Adviser over Printed Name
                      </p>
                    </div>
                  </div>
                </div>

                {/* Evaluation Committee Members */}
                <div className="mb-6">
                  <p className="text-xs sm:text-[13px] text-black mb-1">
                    Evaluation Committee Members:
                  </p>
                  <p className="indent-8 italic text-xs sm:text-[13px] text-black mb-6">
                    Affixed below is my name and signature as manifestation that I agree to the above
                    schedule.
                  </p>

                  {/* Two MEMBER lines */}
                  <div className="grid grid-cols-2 gap-10 mb-6 mt-4">
                    <div className="text-center">
                      <div className="border-b border-black pb-0.5 min-h-[22px] font-bold uppercase text-xs text-black">
                        {memberPanelists[0]?.name || ""}
                      </div>
                      <p className="text-xs uppercase text-black pt-0.5">MEMBER</p>
                    </div>
                    <div className="text-center">
                      <div className="border-b border-black pb-0.5 min-h-[22px] font-bold uppercase text-xs text-black">
                        {memberPanelists[1]?.name || ""}
                      </div>
                      <p className="text-xs uppercase text-black pt-0.5">MEMBER</p>
                    </div>
                  </div>

                  {/* Centered CHAIRMAN line */}
                  <div className="flex justify-center">
                    <div className="w-72 text-center">
                      <div className="border-b border-black pb-0.5 min-h-[22px] font-bold uppercase text-xs text-black">
                        {chairPanelist?.name || ""}
                      </div>
                      <p className="text-xs uppercase text-black pt-0.5">CHAIRMAN</p>
                    </div>
                  </div>
                </div>

                {/* Approved By: KENNEDY C. CUYA, DIT / DEPARTMENT CHAIR */}
                <div className="mt-6 mb-4">
                  <p className="text-xs sm:text-[13px] text-black mb-5">Approved By:</p>
                  {application?.chair_approval && (
                    <p className="text-[10px] italic text-emerald-700 font-sans mb-0.5">
                      [Approved{" "}
                      {new Date(application.chair_approval.approved_at).toLocaleDateString()}]
                    </p>
                  )}
                  <p className="font-bold uppercase text-xs sm:text-[13px] text-black">
                    KENNEDY C. CUYA, DIT
                  </p>
                  <p className="uppercase text-xs text-black">DEPARTMENT CHAIR</p>
                </div>

                {/* Official ParSU CECS DCS Footer Banner */}
                <div className="mt-6 pt-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/forms/bsit_footer_banner.png"
                    alt="Partido State University - Department of Computational Sciences Footer"
                    className="w-full h-auto object-contain"
                  />
                </div>
              </div>

              {/* Role Action Boxes for Adviser / Department Chair */}
              {!application?.adviser_certification && isAdviser && application && (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs space-y-2">
                  <div className="flex items-center gap-1.5 font-bold text-amber-800 dark:text-amber-300">
                    <ShieldCheck className="h-4 w-4 text-amber-600" />
                    Adviser Certification Action (DCS-CF-01)
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="default"
                    disabled={submitting}
                    onClick={handleCertify}
                    className="h-8 text-xs font-bold gap-1.5"
                  >
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Sign Certification of the Adviser
                  </Button>
                </div>
              )}

              {!application?.chair_approval &&
                isChairOrCoordinator &&
                application?.status === "certified_by_adviser" && (
                  <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 text-xs space-y-2">
                    <div className="flex items-center gap-1.5 font-bold text-primary">
                      <Building2 className="h-4 w-4" />
                      Department Chair Approval (KENNEDY C. CUYA, DIT)
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="default"
                      disabled={submitting}
                      onClick={handleApproveChair}
                      className="h-8 text-xs font-bold gap-1.5"
                    >
                      <Award className="h-3.5 w-3.5" />
                      Approve Application as Department Chair
                    </Button>
                  </div>
                )}

              {/* Bottom Action Bar */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-2 border-t border-border">
                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setPrintModalOpen(true)}
                    className="h-8 text-xs font-semibold gap-1.5"
                  >
                    <Printer className="h-3.5 w-3.5 text-primary" />
                    Print Preview ({meta.formCodeApplication})
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    asChild
                    className="h-8 text-xs font-semibold gap-1.5"
                  >
                    <a
                      href="/forms/BSIT_Application_for_Oral_Defense.docx"
                      download="DCS-CF-01_Application_for_Oral_Defense.docx"
                    >
                      <Download className="h-3.5 w-3.5 text-primary" />
                      Download Official Word (.docx)
                    </a>
                  </Button>
                </div>

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
                      ? "Saving..."
                      : application
                      ? "Save / Update Application"
                      : "Submit Application"}
                  </Button>
                </div>
              </div>
            </form>
          ) : (
            /* =====================================================================
               NON-BSIT GENERAL UNIVERSITY FORM (U-CF-03)
               ===================================================================== */
            <>
              <Card className="p-3.5 bg-muted/20 border-border/60 rounded-xl space-y-2 text-xs">
                <div className="grid grid-cols-3 gap-2">
                  <span className="font-semibold text-muted-foreground col-span-1">
                    Research Title:
                  </span>
                  <span className="font-bold text-foreground col-span-2">{projectTitle}</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <span className="font-semibold text-muted-foreground col-span-1">
                    Degree Program:
                  </span>
                  <span className="text-foreground col-span-2">{programName}</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <span className="font-semibold text-muted-foreground col-span-1">
                    Proponents:
                  </span>
                  <span className="text-foreground col-span-2">
                    {proponents.map((p) => p.name).join(", ")}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <span className="font-semibold text-muted-foreground col-span-1">
                    Research Adviser:
                  </span>
                  <span className="text-foreground col-span-2 font-medium">
                    {adviser?.name || "Not yet assigned"}
                  </span>
                </div>
              </Card>

              <form onSubmit={handleSubmitApplication} className="space-y-4 pt-1">
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
                          Complete Manuscript Documentation
                        </span>
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
                          Presentation Files
                        </span>
                      </div>
                    </label>
                  </div>
                </div>

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
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Printable ParSU Forms Modal */}
      <ParsuFormsModal
        open={printModalOpen}
        onOpenChange={setPrintModalOpen}
        defaultForm={meta.formCodeApplication}
        collegeName={collegeName}
        departmentName={departmentName}
        programCode={programCode}
        projectData={{
          title: concept1 || projectTitle,
          program: programName,
          college: collegeName,
          department: departmentName,
          proponents,
          adviser,
          panelists,
        }}
        application={
          application
            ? {
                ...application,
                requirements_checklist: {
                  ...application.requirements_checklist,
                  date_today: dateToday,
                  members_line_1: membersLine1,
                  members_line_2: membersLine2,
                  concept_1: concept1 || projectTitle,
                  concept_2: concept2,
                  concept_3: concept3,
                  fully_accomplished_form: accomplishmentReport,
                  documentation_3_copies: documentationChapters,
                  presentation_files: presentationFiles,
                },
              }
            : {
                id: "preview",
                project_id: projectId,
                stage_id: stageId,
                form_code: meta.formCodeApplication,
                defense_type: "Oral Defense",
                application_date: new Date().toISOString(),
                status: "draft",
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                requirements_checklist: {
                  accomplishment_report: accomplishmentReport,
                  documentation_chapters: documentationChapters,
                  presentation_files: presentationFiles,
                  date_today: dateToday,
                  members_line_1: membersLine1,
                  members_line_2: membersLine2,
                  concept_1: concept1 || projectTitle,
                  concept_2: concept2,
                  concept_3: concept3,
                  fully_accomplished_form: accomplishmentReport,
                  documentation_3_copies: documentationChapters,
                },
              }
        }
      />
    </>
  );
}
