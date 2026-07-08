"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { 
  FileBarChart, 
  Download, 
  Printer, 
  Loader2, 
  Database,
  Calendar,
  Terminal,
  Award,
  Inbox
} from "lucide-react";
import { toast } from "sonner";
import { RoleGuard } from "@/components/auth/role-guard";
import { AccessDenied } from "@/components/auth/access-denied";

export default function ReportsPage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [activeReport, setActiveReport] = useState<string | null>(null);
  const [reportData, setReportData] = useState<any[]>([]);

  const loadReportData = async (type: string) => {
    setLoading(true);
    setActiveReport(type);
    try {
      let data: any[] = [];
      if (type === "projects") {
        const { data: res } = await supabase
          .from("projects")
          .select("title, status, academic_year, created_at");
        if (res) data = res;
      } else if (type === "schedules") {
        const { data: res } = await supabase
          .from("defense_schedules")
          .select("scheduled_at, end_at, room, building, status");
        if (res) data = res;
      } else if (type === "audit") {
        const { data: res } = await supabase
          .from("audit_logs")
          .select("action_type, module, description, user_email, ip_address, created_at")
          .order("created_at", { ascending: false })
          .limit(100);
        if (res) data = res;
      } else if (type === "grades") {
        const { data: res } = await supabase
          .from("evaluations")
          .select("total_score, verdict_code, status, signed_at");
        if (res) data = res;
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
    <RoleGuard allowedRoles={["coordinator", "sys_admin"]} fallback={<AccessDenied />}>
    <div className="mx-auto max-w-7xl space-y-6 print:p-8 print:bg-white text-slate-800">
      <div className="flex items-center justify-between print:hidden">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Reports</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Generate, filter, and export system audit and academic evaluation reports
          </p>
        </div>
      </div>

      {/* Report Selection list */}
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4 print:hidden">
        {/* Projects list */}
        <Card 
          onClick={() => loadReportData("projects")}
          className={`cursor-pointer transition-all hover:border-primary/45 hover:shadow ${activeReport === "projects" ? "border-primary ring-1 ring-primary" : ""}`}
        >
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600">
              <Database className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900">Projects Directory</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Status & AY metrics</p>
            </div>
          </CardContent>
        </Card>

        {/* Schedules list */}
        <Card 
          onClick={() => loadReportData("schedules")}
          className={`cursor-pointer transition-all hover:border-primary/45 hover:shadow ${activeReport === "schedules" ? "border-primary ring-1 ring-primary" : ""}`}
        >
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900">Defense Schedules</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Venues & timeslot logs</p>
            </div>
          </CardContent>
        </Card>

        {/* Audit Logs list */}
        <Card 
          onClick={() => loadReportData("audit")}
          className={`cursor-pointer transition-all hover:border-primary/45 hover:shadow ${activeReport === "audit" ? "border-primary ring-1 ring-primary" : ""}`}
        >
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-slate-100 text-slate-800">
              <Terminal className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900">Security Audit trail</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Latest 100 system events</p>
            </div>
          </CardContent>
        </Card>

        {/* Panel Scores list */}
        <Card 
          onClick={() => loadReportData("grades")}
          className={`cursor-pointer transition-all hover:border-primary/45 hover:shadow ${activeReport === "grades" ? "border-primary ring-1 ring-primary" : ""}`}
        >
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600">
              <Award className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900">Grades & Verdicts</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Scores & lock indicators</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Report details table view */}
      {activeReport && (
        <Card className="print:border-none print:shadow-none">
          <CardHeader className="flex flex-row items-center justify-between border-b border-border/60 pb-4">
            <div>
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-800">
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
                  <tr className="bg-muted/30 border-b border-border/80 text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                    {Object.keys(reportData[0]).map((key) => (
                      <th key={key} className="p-3">{key.replace("_", " ")}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60 font-medium text-slate-800">
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
    </div>
    </RoleGuard>
  );
}
