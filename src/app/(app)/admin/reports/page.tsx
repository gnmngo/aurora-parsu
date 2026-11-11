"use client";

import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import { 
  Download, 
  Printer, 
  Loader2, 
  Database,
  Calendar,
  Terminal,
  Award,
  Inbox,
  FileText,
  FileCheck2,
  FileSpreadsheet,
  ShieldCheck,
  CheckCircle2,
  ExternalLink
} from "lucide-react";
import { toast } from "sonner";
import { RoleGuard } from "@/components/auth/role-guard";
import { AccessDenied } from "@/components/auth/access-denied";
import { useAuth } from "@/hooks/use-auth";
import { ParsuFormsModal } from "@/components/defenses/parsu-forms-modal";

export default function ReportsPage() {
  const supabase = useMemo(() => createClient(), []);
  const { profile, roles, activeRole } = useAuth();
  const effectiveRole = activeRole || roles[0] || "coordinator";
  const isSysAdmin = effectiveRole === "sys_admin";
  const scopedCollegeId = !isSysAdmin ? profile?.college_id || null : null;

  const [loading, setLoading] = useState(false);
  const [activeReport, setActiveReport] = useState<string | null>(null);
  const [reportData, setReportData] = useState<any[]>([]);

  // Institutional Forms (DCS Series) Modal State
  const [formsModalOpen, setFormsModalOpen] = useState(false);
  const [activeFormCode, setActiveFormCode] = useState<string>("DCS-CF-01");
  const [projectsList, setProjectsList] = useState<any[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [selectedProject, setSelectedProject] = useState<any>(null);

  // Fetch available projects on mount (scoped to Coordinator/Dean's college)
  useEffect(() => {
    async function fetchProjects() {
      try {
        let query = supabase
          .from("projects")
          .select("id, title, academic_year, status, college_id, current_stage_id, created_at")
          .order("created_at", { ascending: false });

        if (scopedCollegeId) {
          query = query.eq("college_id", scopedCollegeId);
        }

        const { data } = await query;

        if (data && data.length > 0) {
          setProjectsList(data);
          setSelectedProjectId(data[0].id);
          setSelectedProject(data[0]);
        }
      } catch (e) {
        console.error("Error fetching projects for forms:", e);
      }
    }
    fetchProjects();
  }, [supabase, scopedCollegeId]);

  const handleProjectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const pId = e.target.value;
    setSelectedProjectId(pId);
    const found = projectsList.find((p) => p.id === pId);
    setSelectedProject(found || null);
  };

  const handleOpenDcsForm = (formCode: "DCS-CF-01" | "DCS-CF-04" | "DCS-CF-05") => {
    setActiveFormCode(formCode);
    setFormsModalOpen(true);
  };

  const loadReportData = async (type: string) => {
    setLoading(true);
    setActiveReport(type);
    try {
      let data: any[] = [];
      if (type === "projects") {
        let q = supabase.from("projects").select("title, status, academic_year, created_at");
        if (scopedCollegeId) q = q.eq("college_id", scopedCollegeId);
        const { data: res } = await q;
        if (res) data = res;
      } else if (type === "schedules") {
        let q = supabase
          .from("defense_schedules")
          .select("scheduled_at, end_at, room, building, status, projects!inner(college_id)");
        if (scopedCollegeId) q = q.eq("projects.college_id", scopedCollegeId);
        const { data: res } = await q;
        if (res) {
          data = res.map(({ projects, ...rest }: any) => rest);
        }
      } else if (type === "audit") {
        const { data: res } = await supabase
          .from("audit_logs")
          .select("action_type, module, description, user_email, ip_address, created_at")
          .order("created_at", { ascending: false })
          .limit(100);
        if (res) data = res;
      } else if (type === "grades") {
        let q = supabase
          .from("evaluations")
          .select("total_score, verdict_code, status, signed_at, projects!inner(college_id)");
        if (scopedCollegeId) q = q.eq("projects.college_id", scopedCollegeId);
        const { data: res } = await q;
        if (res) {
          data = res.map(({ projects, ...rest }: any) => rest);
        }
      }

      setReportData(data);
      if (data.length === 0) {
        toast.info("No matching records found in the database.");
      } else {
        toast.success(`Loaded ${data.length} records successfully!`);
      }
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to fetch report records.");
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    if (reportData.length === 0) {
      toast.error("No data available to export. Please load a report first.");
      return;
    }

    try {
      const headers = Object.keys(reportData[0]).join(",");
      const rows = reportData.map((row) =>
        Object.values(row)
          .map((val) => `"${String(val ?? "").replace(/"/g, '""')}"`)
          .join(",")
      );
      const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].join("\n");
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `aurora_report_${activeReport || "export"}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("CSV report file downloaded!");
    } catch (err) {
      console.error(err);
      toast.error("Export generation failed.");
    }
  };

  const handlePrint = () => {
    if (reportData.length === 0) {
      toast.error("No data available to print.");
      return;
    }
    window.print();
  };

  return (
    <RoleGuard allowedRoles={["coordinator", "sys_admin", "college_dean"]} fallback={<AccessDenied />}>
      <div className="mx-auto max-w-7xl space-y-8 print:p-8 print:bg-white text-slate-800 dark:text-slate-200">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden border-b border-border/60 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-black tracking-tight text-foreground">Reports & Institutional Documents</h1>
              <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-wider border-primary/40 text-primary bg-primary/5">
                Annex I Compliant
              </Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Official Departmental Form Series (DCS-CF), ISO 9001:2015 institutional records, and administrative telemetry
            </p>
          </div>
        </div>

        {/* =========================================================================
            SECTION 1: OFFICIAL INSTITUTIONAL FORMS (DCS FORM SERIES)
            ========================================================================= */}
        <div className="space-y-4 print:hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                <FileCheck2 className="h-5 w-5 text-primary" />
                Official Departmental Defense Forms (DCS Series)
              </h2>
              <p className="text-xs text-muted-foreground">
                Prescribed institutional templates for BS Information Technology capstone defenses under ParSU CECS DCS
              </p>
            </div>

            {/* Project Selector for Forms */}
            {projectsList.length > 0 && (
              <div className="flex items-center gap-2 bg-muted/40 p-1.5 rounded-xl border border-border/60">
                <span className="text-xs font-semibold text-muted-foreground px-2">Project:</span>
                <select
                  value={selectedProjectId}
                  onChange={handleProjectChange}
                  className="text-xs font-medium bg-background text-foreground border border-border rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary max-w-xs truncate"
                >
                  {projectsList.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title} ({p.academic_year || "AY 2026-2027"})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {/* DCS-CF-01: Application for Oral Defense */}
            <Card className="hover:border-primary/50 transition-all hover:shadow-md flex flex-col justify-between border-border/80">
              <CardHeader className="p-4 pb-2">
                <div className="flex items-center justify-between">
                  <Badge variant="secondary" className="font-mono text-[10px] font-bold text-primary bg-primary/10">
                    DCS-CF-01
                  </Badge>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </div>
                <CardTitle className="text-sm font-bold text-foreground mt-2">
                  Application for Oral Defense
                </CardTitle>
                <CardDescription className="text-xs leading-relaxed">
                  Official application record with proponent working titles, adviser endorsement certification, and committee panel signatures.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-2">
                <div className="flex flex-col gap-2 mt-2">
                  <Button
                    size="sm"
                    className="w-full text-xs h-8 gap-1.5 font-bold"
                    onClick={() => handleOpenDcsForm("DCS-CF-01")}
                  >
                    <Printer className="h-3.5 w-3.5" />
                    Preview & Print DCS-CF-01
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    asChild
                    className="w-full text-xs h-8 gap-1.5 font-semibold"
                  >
                    <a
                      href="/forms/BSIT_Application_for_Oral_Defense.docx"
                      download="DCS-CF-01_Application_for_Oral_Defense.docx"
                    >
                      <Download className="h-3.5 w-3.5 text-primary" />
                      Download Official .docx
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* DCS-CF-04: Oral Defense Evaluation Sheet */}
            <Card className="hover:border-primary/50 transition-all hover:shadow-md flex flex-col justify-between border-border/80">
              <CardHeader className="p-4 pb-2">
                <div className="flex items-center justify-between">
                  <Badge variant="secondary" className="font-mono text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40">
                    DCS-CF-04
                  </Badge>
                  <Award className="h-4 w-4 text-muted-foreground" />
                </div>
                <CardTitle className="text-sm font-bold text-foreground mt-2">
                  Oral Defense Evaluation Sheet
                </CardTitle>
                <CardDescription className="text-xs leading-relaxed">
                  Individual panelist score sheet (30% Manuscript, 35% Prototype, 25% Presentation, 10% Q&amp;A) with weighted rating and digital signature.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-2">
                <div className="flex flex-col gap-2 mt-2">
                  <Button
                    size="sm"
                    className="w-full text-xs h-8 gap-1.5 font-bold"
                    onClick={() => handleOpenDcsForm("DCS-CF-04")}
                  >
                    <Printer className="h-3.5 w-3.5" />
                    Preview & Print DCS-CF-04
                  </Button>
                  <div className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground py-1">
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                    <span>RA 8792 Signed &amp; Verifiable</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* DCS-CF-05: Panel Deliberation Summary Sheet */}
            <Card className="hover:border-primary/50 transition-all hover:shadow-md flex flex-col justify-between border-border/80">
              <CardHeader className="p-4 pb-2">
                <div className="flex items-center justify-between">
                  <Badge variant="secondary" className="font-mono text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40">
                    DCS-CF-05
                  </Badge>
                  <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                </div>
                <CardTitle className="text-sm font-bold text-foreground mt-2">
                  Deliberation Summary Sheet
                </CardTitle>
                <CardDescription className="text-xs leading-relaxed">
                  Composite summary sheet compiling all committee ratings, final consensus verdict (Approved / Re-defense), and signatory approval.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-2">
                <div className="flex flex-col gap-2 mt-2">
                  <Button
                    size="sm"
                    className="w-full text-xs h-8 gap-1.5 font-bold"
                    onClick={() => handleOpenDcsForm("DCS-CF-05")}
                  >
                    <Printer className="h-3.5 w-3.5" />
                    Preview & Print DCS-CF-05
                  </Button>
                  <div className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground py-1">
                    <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                    <span>Multi-Panel Consensus Verified</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* =========================================================================
            SECTION 2: DATABASE AUDIT & TELEMETRY REPORTS (CSV EXPORTS)
            ========================================================================= */}
        <div className="space-y-4 print:hidden border-t border-border/60 pt-6">
          <div>
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              Administrative Audit &amp; Telemetry Reports
            </h2>
            <p className="text-xs text-muted-foreground">
              Query, inspect, and export institutional defense records and security logs to CSV format
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
            {/* Projects Directory */}
            <Card 
              onClick={() => loadReportData("projects")}
              className={`cursor-pointer transition-all hover:border-primary/45 hover:shadow ${activeReport === "projects" ? "border-primary ring-1 ring-primary" : ""}`}
            >
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400">
                  <Database className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-slate-100">Projects Directory</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Status &amp; AY metrics</p>
                </div>
              </CardContent>
            </Card>

            {/* Defense Schedules */}
            <Card 
              onClick={() => loadReportData("schedules")}
              className={`cursor-pointer transition-all hover:border-primary/45 hover:shadow ${activeReport === "schedules" ? "border-primary ring-1 ring-primary" : ""}`}
            >
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400">
                  <Calendar className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-slate-100">Defense Schedules</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Venues &amp; timeslots</p>
                </div>
              </CardContent>
            </Card>

            {/* Audit Logs */}
            <Card 
              onClick={() => loadReportData("audit")}
              className={`cursor-pointer transition-all hover:border-primary/45 hover:shadow ${activeReport === "audit" ? "border-primary ring-1 ring-primary" : ""}`}
            >
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                  <Terminal className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-slate-100">Security Audit Trail</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Latest 100 system events</p>
                </div>
              </CardContent>
            </Card>

            {/* Panel Scores */}
            <Card 
              onClick={() => loadReportData("grades")}
              className={`cursor-pointer transition-all hover:border-primary/45 hover:shadow ${activeReport === "grades" ? "border-primary ring-1 ring-primary" : ""}`}
            >
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
                  <Award className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-slate-100">Grades &amp; Verdicts</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Scores &amp; lock indicators</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Report Details Table View */}
        {activeReport && (
          <Card className="print:border-none print:shadow-none border-border/80">
            <CardHeader className="flex flex-row items-center justify-between border-b border-border/60 pb-4">
              <div>
                <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                  {activeReport} Report Preview
                </CardTitle>
                <CardDescription className="text-[10px] print:hidden">
                  Generated from live database statistics
                </CardDescription>
              </div>
              <div className="flex gap-2 print:hidden">
                <Button onClick={handlePrint} size="sm" variant="outline" className="h-8 text-xs rounded-xl gap-1">
                  <Printer className="h-3.5 w-3.5" /> Print
                </Button>
                <Button onClick={handleExportCSV} size="sm" className="h-8 text-xs rounded-xl gap-1">
                  <Download className="h-3.5 w-3.5" /> Export CSV
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              {loading ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : reportData.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center text-xs text-muted-foreground">
                  <Inbox className="h-8 w-8 opacity-30 mb-2" />
                  <p>Click export or select a report above to compile data.</p>
                </div>
              ) : (
                <table className="w-full text-xs text-left border-collapse min-w-[600px]">
                  <thead>
                    <tr className="bg-muted/30 border-b border-border/80 text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      {Object.keys(reportData[0]).map((key) => (
                        <th key={key} className="p-3">{key.replace("_", " ")}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60 font-medium text-slate-800 dark:text-slate-200">
                    {reportData.map((row, rIdx) => (
                      <tr key={rIdx} className="hover:bg-muted/10">
                        {Object.values(row).map((val: any, cIdx) => (
                          <td key={cIdx} className="p-3 truncate max-w-xs">
                            {typeof val === "string" && val.includes("T") && !isNaN(Date.parse(val))
                              ? new Date(val).toLocaleDateString()
                              : String(val ?? "—")}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        )}

        {/* Modal for Previewing and Printing Official ParSU Forms */}
        <ParsuFormsModal
          open={formsModalOpen}
          onOpenChange={setFormsModalOpen}
          defaultForm={activeFormCode}
          collegeName="College of Engineering and Computational Sciences"
          departmentName="Department of Computational Sciences"
          programCode="BSIT"
          projectData={{
            title: selectedProject?.title || "AURORA: Paperless Academic Defense Workflow System for Research, Capstone, Thesis & Dissertation Papers at Partido State University",
            program: "Bachelor of Science in Information Technology",
            college: "College of Engineering and Computational Sciences",
            department: "Department of Computational Sciences",
            academicYear: selectedProject?.academic_year || "2026-2027",
            proponents: [
              { name: "Mañago, Gene Vincent D.", isLeader: true, studentId: "2023-10021" },
              { name: "Castillo, Carol Ann B.", isLeader: false, studentId: "2023-10022" },
              { name: "Buenafe, Rona Mae S.", isLeader: false, studentId: "2023-10023" },
              { name: "Encinas, Lara Mae B.", isLeader: false, studentId: "2023-10024" },
              { name: "Bares, Leomer", isLeader: false, studentId: "2023-10025" },
            ],
            adviser: {
              name: "Froiland B. Peñalosa",
              email: "froiland.penalosa@parsu.edu.ph",
            },
            panelists: [
              { name: "Salvador V. Briones II, MAEd", role: "chair", score: 94.5 },
              { name: "Rowell John B. Artiaga, DIT", role: "member", score: 93.0 },
              { name: "Michael B. Amata", role: "member", score: 95.0 },
            ],
          }}
          defenseData={{
            scheduledDate: "2026-11-14",
            scheduledTime: "10:15 AM",
            roomOrVenue: "CECS Conference Room (Engineering Building)",
            stageName: "Final Defense",
          }}
        />

      </div>
    </RoleGuard>
  );
}
