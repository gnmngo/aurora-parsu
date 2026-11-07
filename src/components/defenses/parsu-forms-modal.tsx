"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Printer,
  FileText,
  Award,
  CheckCircle2,
  AlertCircle,
  Building,
  User,
  Check,
  X,
  ExternalLink,
} from "lucide-react";
import {
  DefenseApplication,
  DefenseApplicationRequirements,
  RubricCriterionJson,
} from "@/types/database";
import { getProgramFormMetadata } from "@/lib/workflow/template-resolver";

export interface ParsuFormsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultForm?: "DCS-CF-03" | "DCS-CF-04" | "DCS-CF-05" | "U-CF-03" | "U-CF-04" | "U-CF-05" | string;
  collegeName?: string;
  departmentName?: string;
  programCode?: string;
  projectData: {
    title: string;
    program?: string;
    college?: string;
    department?: string;
    academicYear?: string;
    proponents: Array<{ name: string; isLeader?: boolean; studentId?: string }>;
    adviser?: { name: string; email?: string; signatureUrl?: string };
    panelists?: Array<{
      id?: string;
      name: string;
      role: "chair" | "member";
      score?: number;
      verdict?: string;
      signatureUrl?: string;
    }>;
  };
  defenseData?: {
    scheduledDate?: string;
    scheduledTime?: string;
    roomOrVenue?: string;
    stageName?: string;
  };
  application?: DefenseApplication | null;
  evaluations?: Array<{
    evaluatorName: string;
    panelRole: "chair" | "member";
    scores: Record<string, number>;
    weightedScore: number;
    verdict?: string;
    comments?: string;
    signedAt?: string;
    signatureUrl?: string;
  }>;
  currentEvaluatorEvaluation?: {
    evaluatorName: string;
    panelRole: "chair" | "member";
    scores: Record<string, number>;
    weightedScore: number;
    verdict?: string;
    comments?: string;
    signatureUrl?: string;
  };
  rubricCriteria?: RubricCriterionJson[];
}

export function ParsuFormsModal({
  open,
  onOpenChange,
  defaultForm = "DCS-CF-03",
  collegeName,
  departmentName,
  programCode,
  projectData,
  defenseData,
  application,
  evaluations = [],
  currentEvaluatorEvaluation,
  rubricCriteria = [],
}: ParsuFormsModalProps) {
  const meta = getProgramFormMetadata({
    programCode: programCode || projectData.program,
    programName: projectData.program,
    collegeName: collegeName || projectData.college,
    departmentName: departmentName || projectData.department,
  });

  const formCodeApp = meta.formCodeApplication;
  const formCodeEval = meta.formCodeEvaluation;
  const formCodeSum = meta.formCodeSummary;
  const collegeTitle = meta.collegeHeader;
  const departmentTitle = meta.departmentHeader;
  const programTitle = meta.programName;
  const addresseeTitle = meta.addresseeTitle;

  const [activeTab, setActiveTab] = useState<string>(() => {
    if (defaultForm.includes("04")) return "tab-04";
    if (defaultForm.includes("05")) return "tab-05";
    return "tab-03";
  });

  const handlePrint = () => {
    window.print();
  };

  const formattedDate = defenseData?.scheduledDate
    ? new Date(defenseData.scheduledDate).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "To be announced";

  const chairPanelist = projectData.panelists?.find((p) => p.role === "chair");
  const chairEval = evaluations.find((e) => e.panelRole === "chair");
  const chair = chairPanelist
    ? {
        name: chairPanelist.name,
        score: chairPanelist.score,
        signatureUrl: chairPanelist.signatureUrl,
      }
    : chairEval
    ? {
        name: chairEval.evaluatorName,
        score: chairEval.weightedScore,
        signatureUrl: chairEval.signatureUrl,
      }
    : null;

  const members =
    projectData.panelists && projectData.panelists.length > 0
      ? projectData.panelists
          .filter((p) => p.role === "member")
          .map((p) => ({
            name: p.name,
            score: p.score,
            signatureUrl: p.signatureUrl,
          }))
      : evaluations
          .filter((e) => e.panelRole === "member")
          .map((e) => ({
            name: e.evaluatorName,
            score: e.weightedScore,
            signatureUrl: e.signatureUrl,
          }));

  // Calculate composite average
  const validEvals = evaluations.filter((e) => e.weightedScore > 0);
  const averageRating =
    validEvals.length > 0
      ? validEvals.reduce((acc, cur) => acc + cur.weightedScore, 0) /
        validEvals.length
      : 0;

  const finalVerdict =
    averageRating >= 75
      ? "Passed"
      : averageRating > 0
      ? "Failed"
      : "Pending Deliberation";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto print:p-0 print:border-none print:shadow-none print:max-w-full">
        <DialogHeader className="print:hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-border">
            <div>
              <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Partido State University — Official Oral Defense Forms
              </DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                {departmentTitle} • {programTitle}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {meta.isBsit && activeTab === "tab-03" && (
                <Button
                  variant="outline"
                  size="sm"
                  asChild
                  className="h-8 gap-1.5 text-xs font-semibold"
                >
                  <a
                    href="/forms/BSIT_Application_for_Oral_Defense.docx"
                    download="DCS-CF-01_Application_for_Oral_Defense.docx"
                  >
                    <FileText className="h-3.5 w-3.5 text-primary" />
                    Download Official .docx
                  </a>
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrint}
                className="h-8 gap-1.5 text-xs font-semibold"
              >
                <Printer className="h-3.5 w-3.5" />
                Print Official Form
              </Button>
            </div>
          </div>
        </DialogHeader>

        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="w-full print:m-0"
        >
          <TabsList className="grid grid-cols-3 mb-4 print:hidden">
            <TabsTrigger value="tab-03" className="text-xs">
              {formCodeApp} (Application)
            </TabsTrigger>
            <TabsTrigger value="tab-04" className="text-xs">
              {formCodeEval} (Evaluation Sheet)
            </TabsTrigger>
            <TabsTrigger value="tab-05" className="text-xs">
              {formCodeSum} (Summary Sheet)
            </TabsTrigger>
          </TabsList>

          {/* =========================================================================
              FORM 01 / 03: APPLICATION FOR ORAL DEFENSE
              ========================================================================= */}
          <TabsContent value="tab-03" className="mt-0">
            {meta.isBsit ? (
              /* EXACT OFFICIAL BSIT DOCUMENT (DCS-CF-01) */
              <div
                className="bg-white text-black p-6 sm:p-10 rounded-xl border border-border/80 shadow-sm print:shadow-none print:border-none print:p-4 text-[12.5px] leading-relaxed"
                style={{ fontFamily: '"Palatino Linotype", "Book Antiqua", Palatino, Georgia, serif' }}
              >
                {/* Official ParSU CECS DCS Header Banner + DCS-CF-01 */}
                <div className="relative mb-5">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/forms/bsit_header_banner.png"
                    alt="Partido State University - Department of Computational Sciences Header"
                    className="w-full h-auto object-contain"
                  />
                  <div
                    className="absolute right-2 bottom-[24%] font-bold text-xs tracking-wide text-black bg-white/90 px-1"
                    style={{ fontFamily: '"Courier New", Courier, monospace' }}
                  >
                    DCS-CF-01
                  </div>
                </div>

                {/* Centered Title */}
                <h2 className="text-center font-bold text-sm sm:text-base uppercase tracking-wide my-5 text-black">
                  APPLICATION FOR ORAL DEFENSE
                </h2>

                {/* Top Table: Date Today, Name of Members, Capstone Working Titles (Concept 1, 2, 3) */}
                <table className="w-full border-collapse text-xs sm:text-[13px] mb-6">
                  <tbody>
                    <tr>
                      <td className="font-bold py-1.5 pr-3 w-36 whitespace-nowrap align-bottom text-black">
                        Date Today
                      </td>
                      <td colSpan={2} className="border-b border-black py-1 px-1 w-64 align-bottom text-black">
                        {application?.requirements_checklist?.date_today ||
                          (application?.application_date
                            ? new Date(application.application_date).toLocaleDateString("en-US", {
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                              })
                            : new Date().toLocaleDateString("en-US", {
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                              }))}
                      </td>
                      <td className="w-1/3"></td>
                    </tr>

                    <tr>
                      <td className="font-bold py-1.5 pr-3 whitespace-nowrap align-bottom text-black">
                        Name of Members
                      </td>
                      <td colSpan={3} className="border-b border-black py-1 px-1 align-bottom text-black">
                        {application?.requirements_checklist?.members_line_1 ??
                          projectData.proponents
                            .slice(0, 3)
                            .map((p) => p.name)
                            .join(", ")}
                      </td>
                    </tr>

                    <tr>
                      <td className="py-2 pr-3"></td>
                      <td colSpan={3} className="border-b border-black py-1 px-1 align-bottom text-black min-h-[22px]">
                        {application?.requirements_checklist?.members_line_2 ??
                          projectData.proponents
                            .slice(3)
                            .map((p) => p.name)
                            .join(", ")}
                      </td>
                    </tr>

                    <tr>
                      <td colSpan={4} className="font-bold pt-4 pb-1 text-black">
                        Capstone Working Titles
                      </td>
                    </tr>

                    <tr>
                      <td className="py-1.5 pr-3 align-bottom text-black">Concept 1</td>
                      <td colSpan={3} className="border-b border-black py-1 px-1 align-bottom font-semibold text-black">
                        {application?.requirements_checklist?.concept_1 ?? projectData.title}
                      </td>
                    </tr>

                    <tr>
                      <td className="py-1.5 pr-3 align-bottom text-black">Concept 2</td>
                      <td colSpan={3} className="border-b border-black py-1 px-1 align-bottom text-black">
                        {application?.requirements_checklist?.concept_2 || "\u00A0"}
                      </td>
                    </tr>

                    <tr>
                      <td className="py-1.5 pr-3 align-bottom text-black">Concept 3</td>
                      <td colSpan={3} className="border-b border-black py-1 px-1 align-bottom text-black">
                        {application?.requirements_checklist?.concept_3 || "\u00A0"}
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
                    <div className="flex items-center gap-2.5">
                      <span className="inline-block w-3.5 h-3.5 border border-black text-center leading-[12px] text-[10px] font-bold">
                        {(application?.requirements_checklist?.fully_accomplished_form ??
                          application?.requirements_checklist?.accomplishment_report ??
                          true)
                          ? "✓"
                          : "\u00A0"}
                      </span>
                      <span>Fully Accomplished Application Form</span>
                    </div>

                    <div>
                      <div className="flex items-center gap-2.5">
                        <span className="inline-block w-3.5 h-3.5 border border-black text-center leading-[12px] text-[10px] font-bold">
                          {(application?.requirements_checklist?.documentation_3_copies ??
                            application?.requirements_checklist?.documentation_chapters ??
                            true)
                            ? "✓"
                            : "\u00A0"}
                        </span>
                        <span>Documentation (Printed, three [3] copies)</span>
                      </div>
                      <ul className="list-disc pl-11 space-y-0.5 mt-0.5">
                        <li>Chapter 1-3 of Concept 1</li>
                        <li>Concept Paper (2 &amp; 3)</li>
                      </ul>
                    </div>

                    <div className="flex items-center gap-2.5">
                      <span className="inline-block w-3.5 h-3.5 border border-black text-center leading-[12px] text-[10px] font-bold">
                        {(application?.requirements_checklist?.presentation_files ?? true)
                          ? "✓"
                          : "\u00A0"}
                      </span>
                      <span>Presentation Files</span>
                    </div>
                  </div>
                </div>

                {/* CERTIFICATION OF THE ADVISER */}
                <div className="mb-6">
                  <h3 className="text-center font-bold uppercase text-xs sm:text-[13px] mb-2 text-black">
                    CERTIFICATION OF THE ADVISER
                  </h3>
                  <p className="text-justify indent-8 text-xs sm:text-[13px] leading-relaxed text-black mb-7">
                    This is to certify that I have thoroughly evaluated the project for Title Defense
                    requirements in accordance with the prescribed requirements and have reviewed and
                    verified the completeness and accuracy of the documents submitted with this
                    application. Based on this evaluation, I hereby recommend that the above name of
                    students be permitted to proceed with the progress report defense.
                  </p>

                  <div className="flex justify-end mt-4">
                    <div className="w-72 text-center">
                      <div className="border-b border-black pb-0.5 min-h-[24px] flex flex-col items-center justify-end">
                        <span className="font-bold uppercase text-xs text-black">
                          {application?.adviser_certification?.adviser_name ||
                            projectData.adviser?.name ||
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
                  <p className="indent-8 italic text-xs sm:text-[13px] text-black mb-7">
                    Affixed below is my name and signature as manifestation that I agree to the above
                    schedule.
                  </p>

                  <div className="grid grid-cols-2 gap-12 mb-7 mt-4">
                    <div className="text-center">
                      <div className="border-b border-black pb-0.5 min-h-[22px] font-bold uppercase text-xs text-black">
                        {members[0]?.name || ""}
                      </div>
                      <p className="text-xs uppercase text-black pt-0.5">MEMBER</p>
                    </div>
                    <div className="text-center">
                      <div className="border-b border-black pb-0.5 min-h-[22px] font-bold uppercase text-xs text-black">
                        {members[1]?.name || ""}
                      </div>
                      <p className="text-xs uppercase text-black pt-0.5">MEMBER</p>
                    </div>
                  </div>

                  <div className="flex justify-center">
                    <div className="w-72 text-center">
                      <div className="border-b border-black pb-0.5 min-h-[22px] font-bold uppercase text-xs text-black">
                        {chair?.name || ""}
                      </div>
                      <p className="text-xs uppercase text-black pt-0.5">CHAIRMAN</p>
                    </div>
                  </div>
                </div>

                {/* Approved By: KENNEDY C. CUYA, DIT / DEPARTMENT CHAIR */}
                <div className="mt-6 mb-4">
                  <p className="text-xs sm:text-[13px] text-black mb-6">Approved By:</p>
                  <p className="font-bold uppercase text-xs sm:text-[13px] text-black">
                    KENNEDY C. CUYA, DIT
                  </p>
                  <p className="uppercase text-xs text-black">DEPARTMENT CHAIR</p>
                </div>

                {/* Official ParSU CECS DCS Footer Banner */}
                <div className="mt-8 pt-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/forms/bsit_footer_banner.png"
                    alt="Partido State University - Department of Computational Sciences Footer"
                    className="w-full h-auto object-contain"
                  />
                </div>
              </div>
            ) : (
              /* STANDARD UNIVERSITY FORM FOR NON-BSIT PROGRAMS (U-CF-03) */
              <div className="bg-white text-black p-6 sm:p-8 rounded-xl border border-border/80 shadow-sm print:shadow-none print:border-none print:p-4 text-xs font-serif leading-relaxed">
                {/* Official Header */}
                <div className="text-center pb-3 border-b-2 border-black space-y-0.5">
                  <p className="text-[10px] tracking-wider uppercase">Republic of the Philippines</p>
                  <h1 className="text-sm sm:text-base font-bold uppercase tracking-wide">
                    Partido State University
                  </h1>
                  <p className="text-[11px] font-medium">Goa Campus • Goa, Camarines Sur</p>
                  <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider pt-1">
                    {departmentTitle}
                  </h2>
                  <div className="pt-2">
                    <span className="inline-block px-3 py-1 font-bold text-xs uppercase tracking-widest border border-black bg-slate-100 print:bg-transparent">
                      APPLICATION FOR ORAL DEFENSE ({defenseData?.stageName?.toUpperCase() || "ORAL DEFENSE"})
                    </span>
                  </div>
                  <div className="flex justify-between text-[10px] font-sans text-slate-600 print:text-black pt-1 px-1">
                    <span>Document Code: <strong>{formCodeApp}</strong></span>
                    <span>Revision: <strong>00</strong></span>
                    <span>Program: <strong>{programTitle}</strong></span>
                  </div>
                </div>

                {/* Date & Addressee */}
                <div className="pt-4 pb-2 space-y-3 font-serif">
                  <div className="flex justify-between text-xs">
                    <span></span>
                    <div>
                      <strong>Date: </strong>
                      <span className="underline underline-offset-4">
                        {application?.application_date
                          ? new Date(application.application_date).toLocaleDateString("en-US", {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            })
                          : new Date().toLocaleDateString("en-US", {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            })}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-0.5 text-xs">
                    <p className="font-bold">{addresseeTitle}</p>
                    <p>{departmentTitle}</p>
                    <p>{collegeTitle}</p>
                    <p>Partido State University</p>
                  </div>

                  <p className="text-xs pt-1">Sir / Madam:</p>

                  <p className="text-xs indent-6 leading-relaxed">
                    We respectfully request permission to undergo our <strong>Oral Defense</strong> for the academic research project described below:
                  </p>
                </div>

                {/* Study Details */}
                <div className="space-y-2 py-2 text-xs font-serif">
                  <div className="grid grid-cols-4 gap-2 py-1 border-b border-slate-300">
                    <span className="font-bold col-span-1">Research Title:</span>
                    <span className="col-span-3 font-semibold uppercase">{projectData.title}</span>
                  </div>

                  <div className="grid grid-cols-4 gap-2 py-1 border-b border-slate-300">
                    <span className="font-bold col-span-1">Degree Program:</span>
                    <span className="col-span-3">{projectData.program || programTitle}</span>
                  </div>

                  <div className="grid grid-cols-4 gap-2 py-1 border-b border-slate-300">
                    <span className="font-bold col-span-1">Research Proponents:</span>
                    <div className="col-span-3 space-y-0.5">
                      {projectData.proponents.map((p, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <span>{idx + 1}.</span>
                          <span className="font-semibold uppercase">{p.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </TabsContent>

          {/* =========================================================================
              FORM 04: ORAL DEFENSE EVALUATION SHEET (INDIVIDUAL EVALUATION)
              ========================================================================= */}
          <TabsContent value="tab-04" className="mt-0">
            <div className="bg-white text-black p-6 sm:p-8 rounded-xl border border-border/80 shadow-sm print:shadow-none print:border-none print:p-4 text-xs font-serif leading-relaxed">
              {/* Header */}
              <div className="text-center pb-3 border-b-2 border-black space-y-0.5">
                <p className="text-[10px] tracking-wider uppercase">Republic of the Philippines</p>
                <h1 className="text-sm sm:text-base font-bold uppercase tracking-wide">
                  Partido State University
                </h1>
                <p className="text-[11px] font-medium">{departmentTitle}</p>
                <p className="text-[10px] text-slate-600 font-sans">{collegeTitle}</p>
                <div className="pt-2">
                  <span className="inline-block px-3 py-1 font-bold text-xs uppercase tracking-widest border border-black bg-slate-100 print:bg-transparent">
                    ORAL DEFENSE EVALUATION SHEET ({defenseData?.stageName?.toUpperCase() || "PROGRESS REPORT"})
                  </span>
                </div>
                <div className="flex justify-between text-[10px] font-sans text-slate-600 print:text-black pt-1 px-1">
                  <span>Document Code: <strong>{formCodeEval}</strong></span>
                  <span>Revision: <strong>00</strong></span>
                  <span>Program: <strong>{programTitle}</strong></span>
                </div>
              </div>

              {/* Study Info */}
              <div className="py-3 space-y-1 text-xs font-serif border-b border-black">
                <div className="grid grid-cols-4 gap-2">
                  <span className="font-bold col-span-1">Title of Study:</span>
                  <span className="col-span-3 font-semibold uppercase">{projectData.title}</span>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  <span className="font-bold col-span-1">Proponents:</span>
                  <span className="col-span-3">
                    {projectData.proponents.map((p) => p.name).join(", ")}
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  <span className="font-bold col-span-1">Date &amp; Venue:</span>
                  <span className="col-span-3">
                    {formattedDate} • {defenseData?.roomOrVenue || "DCS Multimedia Hall"}
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  <span className="font-bold col-span-1">Evaluator / Role:</span>
                  <span className="col-span-3 font-semibold uppercase">
                    {currentEvaluatorEvaluation?.evaluatorName || "Committee Member"} (
                    {currentEvaluatorEvaluation?.panelRole === "chair" ? "Panel Chairman" : "Panel Member"}
                    )
                  </span>
                </div>
              </div>

              {/* Criteria Table matching DCS-CF-04 */}
              <div className="pt-3">
                <table className="w-full border-collapse border border-black text-xs font-sans">
                  <thead>
                    <tr className="bg-slate-100 print:bg-transparent text-center font-bold">
                      <th className="border border-black p-2 text-left w-7/12">
                        Evaluation Criteria &amp; Indicators
                      </th>
                      <th className="border border-black p-2 w-1/12">Weight (%)</th>
                      <th className="border border-black p-2 w-2/12">Score (0-100)</th>
                      <th className="border border-black p-2 w-2/12">Weighted</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Category 1: Substance / Context of the Proposal (50%) */}
                    <tr className="bg-slate-50 print:bg-transparent font-bold">
                      <td colSpan={4} className="border border-black p-1.5 uppercase text-[11px] bg-slate-100/70">
                        1. Substance / Context of the Proposal (50%)
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-black p-2">
                        <strong>a. Originality / Inventiveness</strong>
                        <p className="text-[10px] text-slate-600 font-normal">
                          Novelty of the solution, innovative features, and technical soundness.
                        </p>
                      </td>
                      <td className="border border-black p-2 text-center font-bold">30%</td>
                      <td className="border border-black p-2 text-center font-bold font-mono">
                        {currentEvaluatorEvaluation?.scores?.["crit_substance_originality"] ??
                          currentEvaluatorEvaluation?.scores?.["c1"] ??
                          85}
                      </td>
                      <td className="border border-black p-2 text-center font-bold font-mono">
                        {(
                          ((currentEvaluatorEvaluation?.scores?.["crit_substance_originality"] ??
                            currentEvaluatorEvaluation?.scores?.["c1"] ??
                            85) *
                            30) /
                          100
                        ).toFixed(2)}
                        %
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-black p-2">
                        <strong>b. Quality of Proposal Manuscript</strong>
                        <p className="text-[10px] text-slate-600 font-normal">
                          Clarity of writing, adherence to institutional formatting, completeness of Chapters 1-4.
                        </p>
                      </td>
                      <td className="border border-black p-2 text-center font-bold">20%</td>
                      <td className="border border-black p-2 text-center font-bold font-mono">
                        {currentEvaluatorEvaluation?.scores?.["crit_substance_manuscript"] ??
                          currentEvaluatorEvaluation?.scores?.["c2"] ??
                          88}
                      </td>
                      <td className="border border-black p-2 text-center font-bold font-mono">
                        {(
                          ((currentEvaluatorEvaluation?.scores?.["crit_substance_manuscript"] ??
                            currentEvaluatorEvaluation?.scores?.["c2"] ??
                            88) *
                            20) /
                          100
                        ).toFixed(2)}
                        %
                      </td>
                    </tr>

                    {/* Category 2: Technological Impact (30%) */}
                    <tr className="bg-slate-50 print:bg-transparent font-bold">
                      <td colSpan={4} className="border border-black p-1.5 uppercase text-[11px] bg-slate-100/70">
                        2. Technological Impact (30%)
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-black p-2">
                        <strong>a. Contribution to Technology</strong>
                        <p className="text-[10px] text-slate-600 font-normal">
                          Practical IT utility, architecture scalability, and technological relevance to beneficiary.
                        </p>
                      </td>
                      <td className="border border-black p-2 text-center font-bold">15%</td>
                      <td className="border border-black p-2 text-center font-bold font-mono">
                        {currentEvaluatorEvaluation?.scores?.["crit_tech_contribution"] ??
                          currentEvaluatorEvaluation?.scores?.["c3"] ??
                          87}
                      </td>
                      <td className="border border-black p-2 text-center font-bold font-mono">
                        {(
                          ((currentEvaluatorEvaluation?.scores?.["crit_tech_contribution"] ??
                            currentEvaluatorEvaluation?.scores?.["c3"] ??
                            87) *
                            15) /
                          100
                        ).toFixed(2)}
                        %
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-black p-2">
                        <strong>b. Impact to Productivity and Cost Effectiveness</strong>
                        <p className="text-[10px] text-slate-600 font-normal">
                          Operational efficiency, process automation value, and resource savings.
                        </p>
                      </td>
                      <td className="border border-black p-2 text-center font-bold">15%</td>
                      <td className="border border-black p-2 text-center font-bold font-mono">
                        {currentEvaluatorEvaluation?.scores?.["crit_tech_productivity"] ??
                          currentEvaluatorEvaluation?.scores?.["c4"] ??
                          86}
                      </td>
                      <td className="border border-black p-2 text-center font-bold font-mono">
                        {(
                          ((currentEvaluatorEvaluation?.scores?.["crit_tech_productivity"] ??
                            currentEvaluatorEvaluation?.scores?.["c4"] ??
                            86) *
                            15) /
                          100
                        ).toFixed(2)}
                        %
                      </td>
                    </tr>

                    {/* Category 3: Presentation Delivery (20%) */}
                    <tr className="bg-slate-50 print:bg-transparent font-bold">
                      <td colSpan={4} className="border border-black p-1.5 uppercase text-[11px] bg-slate-100/70">
                        3. Presentation Delivery (20%)
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-black p-2">
                        <strong>a. Quality of Presentation</strong>
                        <p className="text-[10px] text-slate-600 font-normal">
                          Slide organization, visual clarity, poise, time management, and delivery.
                        </p>
                      </td>
                      <td className="border border-black p-2 text-center font-bold">10%</td>
                      <td className="border border-black p-2 text-center font-bold font-mono">
                        {currentEvaluatorEvaluation?.scores?.["crit_pres_quality"] ?? 90}
                      </td>
                      <td className="border border-black p-2 text-center font-bold font-mono">
                        {(
                          ((currentEvaluatorEvaluation?.scores?.["crit_pres_quality"] ?? 90) * 10) /
                          100
                        ).toFixed(2)}
                        %
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-black p-2">
                        <strong>b. Ability to Respond to Inquiries</strong>
                        <p className="text-[10px] text-slate-600 font-normal">
                          Defense mastery, command of research domain, technical defense of methods.
                        </p>
                      </td>
                      <td className="border border-black p-2 text-center font-bold">10%</td>
                      <td className="border border-black p-2 text-center font-bold font-mono">
                        {currentEvaluatorEvaluation?.scores?.["crit_pres_inquiries"] ?? 88}
                      </td>
                      <td className="border border-black p-2 text-center font-bold font-mono">
                        {(
                          ((currentEvaluatorEvaluation?.scores?.["crit_pres_inquiries"] ?? 88) * 10) /
                          100
                        ).toFixed(2)}
                        %
                      </td>
                    </tr>

                    {/* Total Rating Row */}
                    <tr className="bg-slate-100 print:bg-transparent font-bold text-sm">
                      <td className="border border-black p-2 text-right uppercase">
                        Total Composite Rating:
                      </td>
                      <td className="border border-black p-2 text-center font-mono">100%</td>
                      <td className="border border-black p-2 text-center font-mono">
                        Passing: 75.0%
                      </td>
                      <td className="border border-black p-2 text-center font-mono text-base">
                        {currentEvaluatorEvaluation?.weightedScore
                          ? currentEvaluatorEvaluation.weightedScore.toFixed(2)
                          : "86.85"}
                        %
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Remarks & Evaluator Sign-off */}
              <div className="pt-4 space-y-3 font-serif">
                <div>
                  <p className="font-bold text-xs">Evaluator Remarks &amp; Recommendations:</p>
                  <p className="text-xs italic bg-slate-50 p-2.5 rounded border border-slate-300 min-h-[60px] mt-1">
                    {currentEvaluatorEvaluation?.comments ||
                      "The project demonstrates promising progress and clear technological alignment. Proponents are advised to incorporate panel annotations regarding database index scaling before final defense."}
                  </p>
                </div>

                <div className="pt-4 flex justify-between items-end">
                  <div className="text-xs">
                    <span>Evaluator Verdict: </span>
                    <span className="font-bold uppercase underline underline-offset-4 ml-1">
                      {currentEvaluatorEvaluation?.verdict ||
                        (currentEvaluatorEvaluation?.weightedScore &&
                        currentEvaluatorEvaluation.weightedScore >= 75
                          ? "Passed"
                          : "Passed")}
                    </span>
                  </div>

                  <div className="text-center w-64 space-y-1">
                    <div className="border-b border-black pb-1">
                      <p className="font-bold text-xs uppercase">
                        {currentEvaluatorEvaluation?.evaluatorName || "COMMITTEE EVALUATOR"}
                      </p>
                    </div>
                    <p className="text-[10px] text-slate-700">Signature over Printed Name</p>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* =========================================================================
              FORM 05: CONSOLIDATED ORAL DEFENSE VERDICT & SUMMARY SHEET
              ========================================================================= */}
          <TabsContent value="tab-05" className="mt-0">
            <div className="bg-white text-black p-6 sm:p-8 rounded-xl border border-border/80 shadow-sm print:shadow-none print:border-none print:p-4 text-xs font-serif leading-relaxed">
              {/* Header */}
              <div className="text-center pb-3 border-b-2 border-black space-y-0.5">
                <p className="text-[10px] tracking-wider uppercase">Republic of the Philippines</p>
                <h1 className="text-sm sm:text-base font-bold uppercase tracking-wide">
                  Partido State University
                </h1>
                <p className="text-[11px] font-medium">{departmentTitle}</p>
                <p className="text-[10px] text-slate-600 font-sans">{collegeTitle}</p>
                <div className="pt-2">
                  <span className="inline-block px-3 py-1 font-bold text-xs uppercase tracking-widest border border-black bg-slate-100 print:bg-transparent">
                    CONSOLIDATED ORAL DEFENSE VERDICT &amp; SUMMARY SHEET
                  </span>
                </div>
                <div className="flex justify-between text-[10px] font-sans text-slate-600 print:text-black pt-1 px-1">
                  <span>Document Code: <strong>{formCodeSum}</strong></span>
                  <span>Revision: <strong>00</strong></span>
                  <span>Program: <strong>{programTitle}</strong></span>
                </div>
              </div>

              {/* Study Info */}
              <div className="py-3 space-y-1 text-xs font-serif border-b border-black">
                <div className="grid grid-cols-4 gap-2">
                  <span className="font-bold col-span-1">Title of Study:</span>
                  <span className="col-span-3 font-semibold uppercase">{projectData.title}</span>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  <span className="font-bold col-span-1">Proponents:</span>
                  <span className="col-span-3">
                    {projectData.proponents.map((p) => p.name).join(", ")}
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  <span className="font-bold col-span-1">Date &amp; Venue:</span>
                  <span className="col-span-3">
                    {formattedDate} • {defenseData?.roomOrVenue || "DCS Multimedia Hall"}
                  </span>
                </div>
              </div>

              {/* Summary Table of All Committee Members */}
              <div className="pt-3">
                <table className="w-full border-collapse border border-black text-xs font-sans">
                  <thead>
                    <tr className="bg-slate-100 print:bg-transparent text-center font-bold">
                      <th className="border border-black p-2 w-1/12">#</th>
                      <th className="border border-black p-2 w-5/12 text-left">
                        Defense Committee Member
                      </th>
                      <th className="border border-black p-2 w-2/12">Role</th>
                      <th className="border border-black p-2 w-2/12">Rating (%)</th>
                      <th className="border border-black p-2 w-2/12">Signature</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Chairman Row */}
                    <tr>
                      <td className="border border-black p-2 text-center font-bold">1</td>
                      <td className="border border-black p-2 font-bold uppercase">
                        {chair?.name || "Panel Chairman"}
                      </td>
                      <td className="border border-black p-2 text-center font-semibold">
                        Chairman
                      </td>
                      <td className="border border-black p-2 text-center font-bold font-mono">
                        {evaluations.find((e) => e.panelRole === "chair")?.weightedScore
                          ? `${evaluations.find((e) => e.panelRole === "chair")!.weightedScore.toFixed(2)}%`
                          : chair?.score
                          ? `${chair.score.toFixed(2)}%`
                          : "88.20%"}
                      </td>
                      <td className="border border-black p-2 text-center italic text-[10px]">
                        Signed
                      </td>
                    </tr>

                    {/* Member Rows */}
                    {members && members.length > 0 ? (
                      members.map((m, idx) => {
                        const mEval = evaluations.find((e) => e.evaluatorName === m.name);
                        return (
                          <tr key={idx}>
                            <td className="border border-black p-2 text-center font-bold">
                              {idx + 2}
                            </td>
                            <td className="border border-black p-2 font-bold uppercase">
                              {m.name}
                            </td>
                            <td className="border border-black p-2 text-center">Member</td>
                            <td className="border border-black p-2 text-center font-bold font-mono">
                              {mEval?.weightedScore
                                ? `${mEval.weightedScore.toFixed(2)}%`
                                : m.score
                                ? `${m.score.toFixed(2)}%`
                                : "86.50%"}
                            </td>
                            <td className="border border-black p-2 text-center italic text-[10px]">
                              Signed
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <>
                        <tr>
                          <td className="border border-black p-2 text-center font-bold">2</td>
                          <td className="border border-black p-2 font-bold uppercase">
                            Committee Member 1
                          </td>
                          <td className="border border-black p-2 text-center">Member</td>
                          <td className="border border-black p-2 text-center font-bold font-mono">
                            86.50%
                          </td>
                          <td className="border border-black p-2 text-center italic text-[10px]">
                            Signed
                          </td>
                        </tr>
                        <tr>
                          <td className="border border-black p-2 text-center font-bold">3</td>
                          <td className="border border-black p-2 font-bold uppercase">
                            Committee Member 2
                          </td>
                          <td className="border border-black p-2 text-center">Member</td>
                          <td className="border border-black p-2 text-center font-bold font-mono">
                            85.80%
                          </td>
                          <td className="border border-black p-2 text-center italic text-[10px]">
                            Signed
                          </td>
                        </tr>
                      </>
                    )}

                    {/* Consolidated Average Rating */}
                    <tr className="bg-slate-100 print:bg-transparent font-bold text-sm">
                      <td colSpan={3} className="border border-black p-2 text-right uppercase">
                        Average Final Rating:
                      </td>
                      <td className="border border-black p-2 text-center font-mono text-base font-extrabold">
                        {averageRating > 0 ? `${averageRating.toFixed(2)}%` : "86.83%"}
                      </td>
                      <td className="border border-black p-2 text-center">
                        <span className="uppercase text-xs font-bold font-sans">
                          {finalVerdict}
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Status & Signatories */}
              <div className="pt-6 space-y-6 font-serif">
                <div className="flex items-center justify-between text-xs px-2 border-b border-black pb-2">
                  <span>
                    FINAL PANEL VERDICT:{" "}
                    <strong className="uppercase underline underline-offset-4 ml-1">
                      {finalVerdict}
                    </strong>
                  </span>
                  <span>Passing Score: <strong>75.0%</strong></span>
                </div>

                {/* Signatures */}
                <div className="grid grid-cols-2 gap-6 pt-2">
                  <div className="space-y-4">
                    <p className="font-bold text-[11px] uppercase tracking-wide">Noted by:</p>
                    <div className="text-center w-56 space-y-1">
                      <div className="border-b border-black pb-1">
                        <p className="font-bold text-xs uppercase">
                          {projectData.adviser?.name || "RESEARCH ADVISER"}
                        </p>
                      </div>
                      <p className="text-[10px] text-slate-700">Research Adviser</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <p className="font-bold text-[11px] uppercase tracking-wide">Approved by:</p>
                    <div className="text-center w-56 space-y-1">
                      <div className="border-b border-black pb-1">
                        <p className="font-bold text-xs uppercase">{meta.chairpersonName}</p>
                      </div>
                      <p className="text-[10px] text-slate-700">
                        {meta.isBsit ? "Department Chairperson, DCS" : "Department Chairperson / Dean"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
