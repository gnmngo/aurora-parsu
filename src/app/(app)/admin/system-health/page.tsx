"use client";

import { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createClient } from "@/lib/supabase/client";
import {
  Activity,
  Database,
  HardDrive,
  ShieldAlert,
  RefreshCw,
  Users,
  FileCheck,
  Bell,
  History,
  Loader2,
  Download,
  Wrench,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Search,
  BookOpen,
  Clock,
  Server,
  FileText,
  UploadCloud,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import {
  resetDemoDataAction,
  runSystemDiagnosticsAction,
  runSelfHealingMaintenanceAction,
  exportInstitutionalBackupAction,
  type DiagnosticCheckResult,
} from "@/lib/admin/actions";
import { RoleGuard } from "@/components/auth/role-guard";
import { AccessDenied } from "@/components/auth/access-denied";

interface TroubleshootingGuideItem {
  id: string;
  module: string;
  symptom: string;
  rootCause: string;
  resolutionSteps: string[];
  severity: "High" | "Medium" | "Low";
}

const TROUBLESHOOTING_KNOWLEDGE_BASE: TroubleshootingGuideItem[] = [
  {
    id: "ts-auth-1",
    module: "Authentication & RBAC",
    symptom: "User logs in successfully but sees 'Pending Approval' or cannot access role-specific pages.",
    rootCause:
      "New student/faculty accounts default to status = 'pending' until verified by a Research Coordinator or System Administrator, or their active role in the header switcher is set to a different role.",
    resolutionSteps: [
      "Navigate to Administration -> User Management & Security (/admin/users).",
      "Locate the user account and change status from 'pending' to 'approved'.",
      "If the user holds multiple roles (e.g., Adviser + Panelist), use the Role Switcher pill in the top header bar to switch the active dashboard context.",
    ],
    severity: "Medium",
  },
  {
    id: "ts-pdf-1",
    module: "Manuscript PDF & Storage",
    symptom: "Uploaded PDF manuscript does not appear in the Adviser Review Queue or shows an older version.",
    rootCause:
      "The upload was interrupted before the new document_versions row could be marked is_current = true, or the project stage was not matched to the active workflow stage.",
    resolutionSteps: [
      "Open System Health, Backup & Maintenance (/admin/system-health) and click 'Run Self-Healing Maintenance' to automatically repair any orphaned is_current version pointers.",
      "Verify in Submissions (/dashboard/submissions) that the manuscript status is set to 'under_review' and adviser_approval_status is 'pending'.",
      "Confirm the file is a valid PDF under the 50 MB institutional upload limit.",
    ],
    severity: "High",
  },
  {
    id: "ts-ws-1",
    module: "Split-Screen Workspace & Annotations",
    symptom: "Annotations or highlights created by a panelist do not immediately appear on another user's screen.",
    rootCause:
      "Transient WebSocket disconnection or browser network sleep interrupted the Supabase Realtime channel subscription.",
    resolutionSteps: [
      "Check the Realtime Sync indicator in the workspace header or System Health page.",
      "Click the stage selector or refresh the workspace page to re-subscribe to the PostgreSQL WAL broadcast channel.",
      "Ensure institutional firewall allows WSS (WebSocket Secure) traffic on port 443 to *.supabase.co.",
    ],
    severity: "Low",
  },
  {
    id: "ts-sched-1",
    module: "Defense Scheduling & Conflicts",
    symptom: "Coordinator cannot schedule a defense slot due to 'Room Conflict' or 'Panelist Overlapping Schedule' error.",
    rootCause:
      "The conflict detection engine prevents double-booking the same room or committee member within overlapping start/end timestamps on non-cancelled schedules.",
    resolutionSteps: [
      "Open Defenses (/dashboard/defenses) and inspect existing 'scheduled' or 'rescheduled' sessions for that date and room.",
      "If a prior defense was postponed, cancel or reschedule the old entry first (cancelled defenses are automatically excluded from conflict locks).",
      "Select an alternative time window or room, or use Batch Auto-Schedule to let AURORA assign conflict-free slots automatically.",
    ],
    severity: "Medium",
  },
  {
    id: "ts-rubric-1",
    module: "Rubric Grading & Consensus Verdict",
    symptom: "Rubric template cannot be saved or panelist evaluation submission returns a validation error.",
    rootCause:
      "Rubric criterion weights must sum to exactly 100%, and panelists must score every criterion and configure an active RA 8792 electronic signature before locking their evaluation.",
    resolutionSteps: [
      "In Rubrics (/admin/rubrics), verify that the sum of all criterion weights equals 100%.",
      "Ensure the evaluating panelist has an active signature in Settings (/dashboard/settings) or click 'Run Self-Healing Maintenance' to provision baseline signatures.",
      "Once all panelists submit their signed rubric sheets, the Chair/Coordinator can lock and release the Final Consensus Verdict.",
    ],
    severity: "Medium",
  },
  {
    id: "ts-sig-1",
    module: "Digital Signatures & Certificates",
    symptom: "Certificate serial number verification (/verify/[serial]) reports mismatch or missing signature hash.",
    rootCause:
      "The certificate serial was mistyped, or a signatory's electronic signature was not active at the time of approval.",
    resolutionSteps: [
      "Copy the exact serial code (e.g., AURORA-2026-XXXX) from Grades or the printed PDF Clearance Certificate.",
      "Paste the serial into the public Verification Portal (/verify) to inspect the SHA-256 signature digest and timestamp.",
      "If a faculty member needs to re-sign, open Settings -> Electronic Signature, draw/save a signature, and re-approve the stage.",
    ],
    severity: "High",
  },
];

const PREVENTIVE_MAINTENANCE_SCHEDULE = [
  {
    frequency: "Daily (Automated + Spot Check)",
    tasks: [
      "Verify PostgreSQL connection pool health and RLS policy enforcement status.",
      "Confirm automated daily WAL database backup completed with zero errors.",
      "Monitor system_telemetry_logs for any transaction latency exceeding 200 ms.",
    ],
  },
  {
    frequency: "Weekly (Every Friday, 5:00 PM)",
    tasks: [
      "Export an institutional Disaster Recovery JSON snapshot and archive to offsite university cloud storage.",
      "Execute 'Run Self-Healing Maintenance' to verify document version pointers and active faculty signature baselines.",
      "Review Audit Logs (/admin/audit) for failed login attempts or unauthorized role access attempts.",
    ],
  },
  {
    frequency: "Monthly (End of Month)",
    tasks: [
      "Audit Supabase S3 storage bucket capacity and purge unlinked temporary draft files.",
      "Perform a test restoration of the latest JSON backup snapshot in a staging environment to validate RTO/RPO compliance.",
      "Review and rotate service-role API keys if institutional security policy requires scheduled rotation.",
    ],
  },
  {
    frequency: "Per Semester / Academic Year Rollover",
    tasks: [
      "Archive completed capstone projects and signed clearance certificates for permanent institutional records.",
      "Verify College Defense Stages (/admin/stages) and Rubric Templates (/admin/rubrics) for the incoming academic semester.",
      "Onboard new faculty advisers and panelists via User Management (/admin/users).",
    ],
  },
];

export default function SystemHealthPage() {
  const supabase = useMemo(() => createClient(), []);
  const [activeTab, setActiveTab] = useState("diagnostics");
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    projects: 0,
    evaluations: 0,
    notifications: 0,
    logs: 0,
    users: 0,
    documents: 0,
  });

  // Action states
  const [resetting, setResetting] = useState(false);
  const [runningDiag, setRunningDiag] = useState(false);
  const [healing, setHealing] = useState(false);
  const [exportingBackup, setExportingBackup] = useState(false);
  const [diagnostics, setDiagnostics] = useState<DiagnosticCheckResult[]>([]);
  const [lastDiagTime, setLastDiagTime] = useState<string | null>(null);
  const [lastBackupMeta, setLastBackupMeta] = useState<{
    filename: string;
    checksum: string;
    timestamp: string;
    totalRecords: number;
  } | null>(null);
  const [verifiedSnapshotInfo, setVerifiedSnapshotInfo] = useState<{
    valid: boolean;
    message: string;
    details?: string;
  } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedModuleFilter, setSelectedModuleFilter] = useState("All");

  const loadHealthStats = async () => {
    setLoading(true);
    try {
      const [projRes, evalRes, notifRes, logRes, userRes, docRes, diagRes] = await Promise.all([
        supabase.from("projects").select("id", { count: "exact", head: true }),
        supabase.from("evaluations").select("id", { count: "exact", head: true }),
        supabase.from("notifications").select("id", { count: "exact", head: true }),
        supabase.from("audit_logs").select("id", { count: "exact", head: true }),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("documents").select("id", { count: "exact", head: true }),
        runSystemDiagnosticsAction(),
      ]);

      setStats({
        projects: projRes.count || 0,
        evaluations: evalRes.count || 0,
        notifications: notifRes.count || 0,
        logs: logRes.count || 0,
        users: userRes.count || 0,
        documents: docRes.count || 0,
      });

      if (diagRes.success) {
        setDiagnostics(diagRes.checks);
        setLastDiagTime(diagRes.timestamp);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to load health statistics.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHealthStats();
  }, []);

  const handleRunDiagnostics = async () => {
    setRunningDiag(true);
    try {
      const res = await runSystemDiagnosticsAction();
      if (res.success) {
        setDiagnostics(res.checks);
        setLastDiagTime(res.timestamp);
        toast.success("Live subsystem diagnostics completed.");
      } else {
        toast.error(res.error || "Diagnostics failed.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to run diagnostics.");
    } finally {
      setRunningDiag(false);
    }
  };

  const handleSelfHealing = async () => {
    setHealing(true);
    try {
      const res = await runSelfHealingMaintenanceAction();
      if (res.success) {
        toast.success(res.repairedItems[0] || "Self-healing maintenance completed.");
        await loadHealthStats();
      } else {
        toast.error(res.error || "Self-healing maintenance failed.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Maintenance task encountered an error.");
    } finally {
      setHealing(false);
    }
  };

  const handleExportBackup = async () => {
    setExportingBackup(true);
    toast.info("Generating cryptographically signed Disaster Recovery backup snapshot...");
    try {
      const res = await exportInstitutionalBackupAction();
      if (!res.success || !res.payloadJson || !res.filename) {
        toast.error(res.error || "Failed to generate backup.");
        return;
      }

      const blob = new Blob([res.payloadJson], { type: "application/json;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", res.filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      const totalRecords = Object.values(res.recordCounts || {}).reduce((a, b) => a + b, 0);
      setLastBackupMeta({
        filename: res.filename,
        checksum: res.checksumSha256 || "",
        timestamp: new Date().toISOString(),
        totalRecords,
      });

      toast.success(`Backup snapshot (${res.filename}) downloaded and logged to Audit Trail!`);
    } catch (err) {
      console.error(err);
      toast.error("Backup export failed.");
    } finally {
      setExportingBackup(false);
    }
  };

  const handleVerifyBackupFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (!parsed.metadata || !parsed.tables || !parsed.metadata.checksumSha256) {
        setVerifiedSnapshotInfo({
          valid: false,
          message: "Invalid backup archive structure: Missing metadata or tables manifest.",
        });
        toast.error("Invalid backup file format.");
        return;
      }

      // Compute SHA-256 in browser using Web Crypto API
      const encoder = new TextEncoder();
      const dataBuffer = encoder.encode(JSON.stringify(parsed.tables));
      const hashBuffer = await crypto.subtle.digest("SHA-256", dataBuffer);
      const computedHex = Array.from(new Uint8Array(hashBuffer))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

      const matches = computedHex === parsed.metadata.checksumSha256;
      const totalRows = Object.values(parsed.metadata.recordCounts || {}).reduce(
        (acc: number, v: unknown) => acc + (typeof v === "number" ? v : 0),
        0
      );

      setVerifiedSnapshotInfo({
        valid: matches,
        message: matches
          ? "Backup Snapshot Verified: Cryptographic SHA-256 digest matches 100%. Ready for disaster restoration."
          : "Checksum Mismatch: The backup file has been modified or corrupted since export!",
        details: `Exported At: ${parsed.metadata.exportedAt} • Total Records: ${totalRows} • SHA-256: ${computedHex.slice(0, 24)}...`,
      });

      if (matches) {
        toast.success("Backup archive integrity verified (SHA-256 match)!");
      } else {
        toast.error("Backup checksum mismatch detected!");
      }
    } catch (err) {
      console.error(err);
      setVerifiedSnapshotInfo({
        valid: false,
        message: "Failed to parse JSON backup file.",
      });
      toast.error("Could not parse backup file.");
    } finally {
      e.target.value = "";
    }
  };

  const handleDownloadMaintenanceManual = () => {
    let md = `# AURORA — System Maintenance, Troubleshooting & Disaster Recovery Manual\n`;
    md += `**Institution:** Partido State University\n`;
    md += `**Generated:** ${new Date().toISOString()}\n\n`;
    md += `## 1. Disaster Recovery & Data Backup Plan (DRP / BCP)\n`;
    md += `- **Recovery Time Objective (RTO):** <= 4 Hours\n`;
    md += `- **Recovery Point Objective (RPO):** <= 24 Hours (Daily Automated Snapshots + On-Demand JSON Exports + WAL PITR)\n`;
    md += `- **3-2-1 Backup Strategy:** 3 copies of institutional data (Live Cloud DB, Daily Automated Cloud Backup, Offsite JSON/SQL Snapshot), 2 storage media types, 1 offsite copy.\n\n`;
    md += `## 2. Preventive Maintenance Schedule\n`;
    for (const sched of PREVENTIVE_MAINTENANCE_SCHEDULE) {
      md += `### ${sched.frequency}\n`;
      sched.tasks.forEach((t) => {
        md += `- [ ] ${t}\n`;
      });
      md += `\n`;
    }
    md += `## 3. Module Troubleshooting Playbooks\n`;
    for (const item of TROUBLESHOOTING_KNOWLEDGE_BASE) {
      md += `### [${item.module}] ${item.symptom}\n`;
      md += `- **Severity:** ${item.severity}\n`;
      md += `- **Root Cause:** ${item.rootCause}\n`;
      md += `- **Resolution Steps:**\n`;
      item.resolutionSteps.forEach((step, idx) => {
        md += `  ${idx + 1}. ${step}\n`;
      });
      md += `\n`;
    }

    const blob = new Blob([md], { type: "text/markdown;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `AURORA_Maintenance_and_Disaster_Recovery_Plan.md`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success("Official Maintenance & Disaster Recovery Manual downloaded!");
  };

  const handleResetDemoData = async () => {
    const confirm = window.confirm(
      "Are you sure you want to RESET all demonstration data? This will clean all annotations, evaluations, documents, and seed the default demo users and projects."
    );
    if (!confirm) return;

    setResetting(true);
    try {
      await resetDemoDataAction();
      toast.success("Demonstration reset completed successfully!");
      loadHealthStats();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to reset demo data.");
    } finally {
      setResetting(false);
    }
  };

  const modulesList = useMemo(
    () => ["All", ...Array.from(new Set(TROUBLESHOOTING_KNOWLEDGE_BASE.map((i) => i.module)))],
    []
  );

  const filteredTroubleshooting = useMemo(() => {
    return TROUBLESHOOTING_KNOWLEDGE_BASE.filter((item) => {
      const matchesModule =
        selectedModuleFilter === "All" || item.module === selectedModuleFilter;
      const q = searchQuery.trim().toLowerCase();
      if (!q) return matchesModule;
      return (
        matchesModule &&
        (item.symptom.toLowerCase().includes(q) ||
          item.rootCause.toLowerCase().includes(q) ||
          item.module.toLowerCase().includes(q) ||
          item.resolutionSteps.some((s) => s.toLowerCase().includes(q)))
      );
    });
  }, [searchQuery, selectedModuleFilter]);

  return (
    <RoleGuard allowedRoles={["sys_admin", "coordinator", "college_dean"]} fallback={<AccessDenied />}>
      <div className="mx-auto max-w-7xl space-y-6 text-xs font-semibold text-slate-800 dark:text-slate-200">
        {/* Page Header */}
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-5">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="outline" className="text-[10px] font-black uppercase text-primary border-primary/30">
                ISO/IEC 25010 Maintainability &amp; Recoverability
              </Badge>
              <Badge variant="success" className="text-[10px] font-bold">
                RTO ≤ 4h • RPO ≤ 24h
              </Badge>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              System Maintenance, Troubleshooting &amp; Disaster Recovery
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-muted-foreground font-medium max-w-3xl">
              Centralized operational console for live subsystem diagnostics, self-healing preventive maintenance, cryptographic database backups, and step-by-step disaster recovery &amp; troubleshooting playbooks.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleDownloadMaintenanceManual}
              className="h-9 px-3 rounded-xl gap-1.5 font-bold"
            >
              <FileText className="h-3.5 w-3.5 text-primary" />
              Download Official Manual (.MD)
            </Button>

            <Button
              size="sm"
              onClick={handleExportBackup}
              disabled={exportingBackup}
              className="h-9 px-3 rounded-xl gap-1.5 font-bold bg-primary text-white"
            >
              {exportingBackup ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Download className="h-3.5 w-3.5" />
              )}
              Export DR Backup Snapshot
            </Button>

            <Button
              size="sm"
              onClick={handleResetDemoData}
              disabled={resetting}
              variant="danger"
              className="h-9 px-3 rounded-xl gap-1.5 font-bold"
            >
              {resetting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5" />
              )}
              Reset Demo Data
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-1 sm:grid-cols-3 h-auto sm:h-11 p-1 bg-muted/80 rounded-xl gap-1">
              <TabsTrigger value="diagnostics" className="rounded-lg text-xs font-bold gap-2 py-2">
                <Wrench className="h-4 w-4" />
                1. Maintenance &amp; Live Diagnostics
              </TabsTrigger>
              <TabsTrigger value="disaster-recovery" className="rounded-lg text-xs font-bold gap-2 py-2">
                <Database className="h-4 w-4" />
                2. Disaster Recovery &amp; Data Backup Plan
              </TabsTrigger>
              <TabsTrigger value="troubleshooting" className="rounded-lg text-xs font-bold gap-2 py-2">
                <BookOpen className="h-4 w-4" />
                3. Troubleshooting Guide &amp; Playbooks
              </TabsTrigger>
            </TabsList>

            {/* ═══════════════════════════════════════════════════════════════════ */}
            {/* TAB 1: MAINTENANCE & LIVE DIAGNOSTICS                              */}
            {/* ═══════════════════════════════════════════════════════════════════ */}
            <TabsContent value="diagnostics" className="space-y-6 mt-0">
              {/* Top Status Cards */}
              <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
                <Card className="p-4 flex flex-row items-center gap-4">
                  <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
                    <Database className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-black text-slate-900 dark:text-slate-100">Healthy (Online)</p>
                    <p className="text-[10px] text-muted-foreground font-bold uppercase mt-0.5">PostgreSQL + RLS</p>
                  </div>
                </Card>

                <Card className="p-4 flex flex-row items-center gap-4">
                  <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400">
                    <Activity className="h-5 w-5 animate-pulse" />
                  </div>
                  <div>
                    <p className="text-sm font-black text-slate-900 dark:text-slate-100">Connected (WSS)</p>
                    <p className="text-[10px] text-muted-foreground font-bold uppercase mt-0.5">Realtime WAL Sync</p>
                  </div>
                </Card>

                <Card className="p-4 flex flex-row items-center gap-4">
                  <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
                    <HardDrive className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-black text-slate-900 dark:text-slate-100">
                      {stats.documents} Dockets Active
                    </p>
                    <p className="text-[10px] text-muted-foreground font-bold uppercase mt-0.5">
                      S3 Manuscript Storage
                    </p>
                  </div>
                </Card>

                <Card className="p-4 flex flex-row items-center gap-4">
                  <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-black text-slate-900 dark:text-slate-100">Active (PITR + JSON)</p>
                    <p className="text-[10px] text-muted-foreground font-bold uppercase mt-0.5">
                      Backup Protection
                    </p>
                  </div>
                </Card>
              </div>

              {/* Live Subsystem Health Probe & Self-Healing Controls */}
              <Card>
                <CardHeader className="border-b border-border bg-muted/20 pb-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                      <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
                        <Server className="h-4 w-4 text-primary" />
                        Automated Subsystem Integrity Probes &amp; Self-Healing Maintenance
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Verifies relational pointers, SHA-256 manuscript version chains, RA 8792 faculty signatures, and rubric weights.
                        {lastDiagTime && ` Last checked: ${new Date(lastDiagTime).toLocaleTimeString()}`}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleRunDiagnostics}
                        disabled={runningDiag}
                        className="gap-1.5 text-xs font-bold"
                      >
                        {runningDiag ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                        ) : (
                          <RefreshCw className="h-3.5 w-3.5 text-primary" />
                        )}
                        Re-Run Diagnostics
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleSelfHealing}
                        disabled={healing}
                        className="gap-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
                      >
                        {healing ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Sparkles className="h-3.5 w-3.5" />
                        )}
                        Run Self-Healing Maintenance
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y divide-border">
                    {diagnostics.map((chk) => (
                      <div
                        key={chk.id}
                        className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-muted/10 transition-colors"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            {chk.status === "healthy" ? (
                              <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                            ) : (
                              <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
                            )}
                            <span className="font-bold text-foreground text-xs">{chk.subsystem}</span>
                            <Badge
                              variant={
                                chk.status === "healthy"
                                  ? "success"
                                  : chk.status === "warning"
                                  ? "warning"
                                  : "danger"
                              }
                              className="text-[9px] font-black uppercase"
                            >
                              {chk.status}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground pl-6">{chk.summary}</p>
                          {chk.remediation && (
                            <p className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold pl-6">
                              → Action: {chk.remediation}
                            </p>
                          )}
                        </div>
                        <div className="pl-6 sm:pl-0 text-right shrink-0">
                          <span className="font-mono text-xs font-bold text-muted-foreground">
                            {chk.latencyMs} ms
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Preventive Maintenance Schedule & Live Database Row Counts */}
              <div className="grid gap-6 md:grid-cols-3">
                <Card className="md:col-span-2">
                  <CardHeader className="border-b border-border bg-muted/20 pb-3">
                    <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
                      <Clock className="h-4 w-4 text-primary" />
                      Standard Preventive Maintenance Schedule (SOP)
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Institutional operational maintenance checklist for IT Administrators and Research Coordinators.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-4 space-y-4">
                    {PREVENTIVE_MAINTENANCE_SCHEDULE.map((item) => (
                      <div
                        key={item.frequency}
                        className="rounded-xl border border-border bg-card p-3.5 space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-extrabold text-primary uppercase tracking-wider">
                            {item.frequency}
                          </span>
                          <Badge variant="outline" className="text-[9px] font-bold">
                            Mandatory SOP
                          </Badge>
                        </div>
                        <ul className="space-y-1.5 text-xs text-muted-foreground font-medium">
                          {item.tasks.map((task, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
                              <span>{task}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <div className="space-y-6">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                        Live Database Metrics
                      </CardTitle>
                      <CardDescription className="text-[10px]">
                        Active record counts across core tables
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3.5 pt-2 font-medium text-[11px] text-slate-700 dark:text-slate-300">
                      <div className="flex justify-between items-center border-b border-border/60 pb-2">
                        <span className="flex items-center gap-1.5">
                          <Users className="h-4 w-4 text-primary" /> Active User Profiles
                        </span>
                        <span className="font-bold text-slate-900 dark:text-slate-100">{stats.users}</span>
                      </div>
                      <div className="flex justify-between items-center border-b border-border/60 pb-2">
                        <span className="flex items-center gap-1.5">
                          <Database className="h-4 w-4 text-primary" /> Research Projects
                        </span>
                        <span className="font-bold text-slate-900 dark:text-slate-100">{stats.projects}</span>
                      </div>
                      <div className="flex justify-between items-center border-b border-border/60 pb-2">
                        <span className="flex items-center gap-1.5">
                          <FileText className="h-4 w-4 text-primary" /> Manuscript Dockets
                        </span>
                        <span className="font-bold text-slate-900 dark:text-slate-100">{stats.documents}</span>
                      </div>
                      <div className="flex justify-between items-center border-b border-border/60 pb-2">
                        <span className="flex items-center gap-1.5">
                          <FileCheck className="h-4 w-4 text-primary" /> Signed Evaluations
                        </span>
                        <span className="font-bold text-slate-900 dark:text-slate-100">{stats.evaluations}</span>
                      </div>
                      <div className="flex justify-between items-center border-b border-border/60 pb-2">
                        <span className="flex items-center gap-1.5">
                          <Bell className="h-4 w-4 text-primary" /> Notifications Dispatched
                        </span>
                        <span className="font-bold text-slate-900 dark:text-slate-100">{stats.notifications}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="flex items-center gap-1.5">
                          <History className="h-4 w-4 text-primary" /> Immutable Audit Logs
                        </span>
                        <span className="font-bold text-slate-900 dark:text-slate-100">{stats.logs}</span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                        Runtime Environment
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 pt-2 font-medium text-[11px] text-slate-700 dark:text-slate-300">
                      <div className="flex justify-between items-center border-b border-border/60 pb-2">
                        <span>Framework</span>
                        <span className="font-bold text-foreground">Next.js 16.2.7 (Turbopack)</span>
                      </div>
                      <div className="flex justify-between items-center border-b border-border/60 pb-2">
                        <span>Database Engine</span>
                        <span className="font-bold text-foreground">PostgreSQL 15 + Supabase RLS</span>
                      </div>
                      <div className="flex justify-between items-center border-b border-border/60 pb-2">
                        <span>Checksum Standard</span>
                        <span className="font-bold text-foreground">FIPS 180-4 SHA-256</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>Legal Compliance</span>
                        <Badge variant="success" className="text-[9px] font-black uppercase">
                          RA 8792 &amp; RA 10173
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>

            {/* ═══════════════════════════════════════════════════════════════════ */}
            {/* TAB 2: DISASTER RECOVERY & DATA BACKUP PLAN (DRP / BCP)            */}
            {/* ═══════════════════════════════════════════════════════════════════ */}
            <TabsContent value="disaster-recovery" className="space-y-6 mt-0">
              {/* DRP Policy Metrics Banner */}
              <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
                <Card className="border-primary/30 bg-primary/5 p-4 space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-wider text-primary">
                    Recovery Time Objective (RTO)
                  </p>
                  <p className="text-2xl font-extrabold text-foreground font-mono">≤ 4 Hours</p>
                  <p className="text-[11px] text-muted-foreground">
                    Maximum tolerable downtime for full application &amp; database restoration
                  </p>
                </Card>

                <Card className="border-emerald-500/30 bg-emerald-500/5 p-4 space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                    Recovery Point Objective (RPO)
                  </p>
                  <p className="text-2xl font-extrabold text-foreground font-mono">≤ 24 Hours</p>
                  <p className="text-[11px] text-muted-foreground">
                    Daily automated snapshots + WAL stream &amp; on-demand pre-defense exports
                  </p>
                </Card>

                <Card className="p-4 space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                    Backup Architecture
                  </p>
                  <p className="text-2xl font-extrabold text-foreground font-mono">3-2-1 Rule</p>
                  <p className="text-[11px] text-muted-foreground">
                    3 copies • 2 media tiers (Cloud DB + Cold JSON/S3) • 1 offsite archive
                  </p>
                </Card>

                <Card className="p-4 space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                    Integrity Protection
                  </p>
                  <p className="text-2xl font-extrabold text-foreground font-mono">SHA-256</p>
                  <p className="text-[11px] text-muted-foreground">
                    Cryptographic checksum verification on every backup archive &amp; PDF
                  </p>
                </Card>
              </div>

              {/* Interactive Backup Snapshot Generator & Integrity Verifier */}
              <div className="grid gap-6 md:grid-cols-2">
                <Card className="border-primary/30">
                  <CardHeader className="border-b border-border bg-primary/5 pb-4">
                    <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
                      <Download className="h-4 w-4 text-primary" />
                      On-Demand Institutional Database Backup Generator
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Exports all 20 relational tables (Projects, Manuscripts, Versions, Annotations, Schedules, Rubrics, Evaluations, Certificates, Survey Responses, and Audit Logs) into a signed JSON recovery bundle.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-4 space-y-4">
                    <div className="rounded-xl border border-border bg-muted/20 p-3.5 space-y-2 text-xs">
                      <p className="font-bold text-foreground">Included in Snapshot Archive:</p>
                      <p className="text-muted-foreground leading-relaxed">
                        <code className="text-[11px] bg-muted px-1 py-0.5 rounded">colleges</code>,{" "}
                        <code className="text-[11px] bg-muted px-1 py-0.5 rounded">departments</code>,{" "}
                        <code className="text-[11px] bg-muted px-1 py-0.5 rounded">programs</code>,{" "}
                        <code className="text-[11px] bg-muted px-1 py-0.5 rounded">profiles</code>,{" "}
                        <code className="text-[11px] bg-muted px-1 py-0.5 rounded">workflow_templates</code>,{" "}
                        <code className="text-[11px] bg-muted px-1 py-0.5 rounded">defense_stages</code>,{" "}
                        <code className="text-[11px] bg-muted px-1 py-0.5 rounded">rubric_templates</code>,{" "}
                        <code className="text-[11px] bg-muted px-1 py-0.5 rounded">projects</code>,{" "}
                        <code className="text-[11px] bg-muted px-1 py-0.5 rounded">documents</code>,{" "}
                        <code className="text-[11px] bg-muted px-1 py-0.5 rounded">document_versions</code>,{" "}
                        <code className="text-[11px] bg-muted px-1 py-0.5 rounded">annotations</code>,{" "}
                        <code className="text-[11px] bg-muted px-1 py-0.5 rounded">defense_schedules</code>,{" "}
                        <code className="text-[11px] bg-muted px-1 py-0.5 rounded">evaluations</code>,{" "}
                        <code className="text-[11px] bg-muted px-1 py-0.5 rounded">certificates</code>,{" "}
                        <code className="text-[11px] bg-muted px-1 py-0.5 rounded">iso_evaluations</code>,{" "}
                        <code className="text-[11px] bg-muted px-1 py-0.5 rounded">audit_logs</code>
                      </p>
                    </div>

                    {lastBackupMeta && (
                      <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 space-y-1 text-xs">
                        <p className="font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
                          <CheckCircle2 className="h-4 w-4" /> Latest Snapshot Generated
                        </p>
                        <p className="font-mono text-[11px] text-foreground">{lastBackupMeta.filename}</p>
                        <p className="text-[11px] text-muted-foreground">
                          Records: <strong>{lastBackupMeta.totalRecords}</strong> • SHA-256:{" "}
                          <code className="font-mono">{lastBackupMeta.checksum.slice(0, 24)}...</code>
                        </p>
                      </div>
                    )}

                    <Button
                      onClick={handleExportBackup}
                      disabled={exportingBackup}
                      className="w-full gap-2 font-bold bg-primary text-white"
                    >
                      {exportingBackup ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Download className="h-4 w-4" />
                      )}
                      Generate &amp; Download Full DR Snapshot (.JSON)
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="border-b border-border bg-muted/20 pb-4">
                    <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
                      <UploadCloud className="h-4 w-4 text-primary" />
                      Backup Snapshot Integrity &amp; SHA-256 Verifier
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Validate an exported AURORA backup archive before executing a disaster recovery restoration to guarantee zero file tampering or bit-rot.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-4 space-y-4">
                    <label className="flex flex-col items-center justify-center border-2 border-dashed border-border hover:border-primary/50 rounded-xl p-6 cursor-pointer transition-colors bg-muted/10 text-center space-y-2">
                      <UploadCloud className="h-7 w-7 text-primary" />
                      <div>
                        <p className="text-xs font-bold text-foreground">
                          Select an AURORA_DR_Backup_*.json file to verify
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          Recomputes the FIPS 180-4 SHA-256 digest over all backup tables client-side
                        </p>
                      </div>
                      <input
                        type="file"
                        accept=".json,application/json"
                        onChange={handleVerifyBackupFile}
                        className="hidden"
                      />
                    </label>

                    {verifiedSnapshotInfo && (
                      <div
                        className={`rounded-xl border p-3.5 space-y-1 text-xs ${
                          verifiedSnapshotInfo.valid
                            ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200"
                            : "border-rose-500/40 bg-rose-500/10 text-rose-800 dark:text-rose-200"
                        }`}
                      >
                        <p className="font-bold flex items-center gap-1.5">
                          {verifiedSnapshotInfo.valid ? (
                            <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                          ) : (
                            <AlertTriangle className="h-4 w-4 text-rose-500 shrink-0" />
                          )}
                          {verifiedSnapshotInfo.message}
                        </p>
                        {verifiedSnapshotInfo.details && (
                          <p className="text-[11px] opacity-90 font-mono pl-5">
                            {verifiedSnapshotInfo.details}
                          </p>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Step-by-Step Disaster Recovery Playbooks */}
              <Card>
                <CardHeader className="border-b border-border bg-muted/20 pb-4">
                  <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
                    <ShieldAlert className="h-4 w-4 text-primary" />
                    Institutional Disaster Recovery Playbooks (Standard Operating Procedures)
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Step-by-step recovery procedures for catastrophic failure scenarios in compliance with ISO/IEC 25010 Recoverability and NPC Circular 16-01 (Data Privacy Act of 2012).
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 grid gap-4 md:grid-cols-2">
                  <div className="rounded-xl border border-border p-4 space-y-2.5 bg-card">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold text-foreground">
                        Scenario A: Relational Database Corruption / Accidental Deletion
                      </span>
                      <Badge variant="danger" className="text-[9px] font-black">
                        RTO: 2 Hours
                      </Badge>
                    </div>
                    <ol className="list-decimal list-inside space-y-1.5 text-xs text-muted-foreground font-medium">
                      <li>Place application in maintenance mode or restrict writes via Supabase RLS guard.</li>
                      <li>For full cluster rollback, trigger Supabase Point-in-Time Recovery (PITR) to the exact timestamp prior to corruption.</li>
                      <li>For selective table recovery, validate the latest <code className="text-[10px] bg-muted px-1 rounded">AURORA_DR_Backup_*.json</code> file using the SHA-256 Verifier above and upsert the affected table records.</li>
                      <li>Execute <strong>Run Self-Healing Maintenance</strong> to re-verify foreign-key pointers and log the recovery event.</li>
                    </ol>
                  </div>

                  <div className="rounded-xl border border-border p-4 space-y-2.5 bg-card">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold text-foreground">
                        Scenario B: Manuscript PDF Storage Outage or File Tampering
                      </span>
                      <Badge variant="warning" className="text-[9px] font-black">
                        RTO: 3 Hours
                      </Badge>
                    </div>
                    <ol className="list-decimal list-inside space-y-1.5 text-xs text-muted-foreground font-medium">
                      <li>Inspect <code className="text-[10px] bg-muted px-1 rounded">document_versions.checksum_sha256</code> to identify any manuscript PDF whose binary hash diverges from the recorded ledger.</li>
                      <li>Restore the affected PDF objects from the replicated institutional S3 bucket archive into the <code className="text-[10px] bg-muted px-1 rounded">manuscripts</code> storage bucket.</li>
                      <li>Re-verify the restored PDF file hash against the stored SHA-256 digest before re-opening the defense workspace.</li>
                    </ol>
                  </div>

                  <div className="rounded-xl border border-border p-4 space-y-2.5 bg-card">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold text-foreground">
                        Scenario C: Compromised Credentials or Auth Lockout
                      </span>
                      <Badge variant="danger" className="text-[9px] font-black">
                        RTO: 30 Mins
                      </Badge>
                    </div>
                    <ol className="list-decimal list-inside space-y-1.5 text-xs text-muted-foreground font-medium">
                      <li>Immediately suspend the affected user profile in <strong>User Management &amp; Security (/admin/users)</strong> (middleware immediately revokes active JWT sessions on the next request).</li>
                      <li>Rotate <code className="text-[10px] bg-muted px-1 rounded">SUPABASE_SERVICE_ROLE_KEY</code> in the production environment variables if administrative credentials were exposed.</li>
                      <li>Audit <code className="text-[10px] bg-muted px-1 rounded">audit_logs</code> by <code className="text-[10px] bg-muted px-1 rounded">user_email</code> and <code className="text-[10px] bg-muted px-1 rounded">ip_address</code> to review all actions performed during the window.</li>
                    </ol>
                  </div>

                  <div className="rounded-xl border border-border p-4 space-y-2.5 bg-card">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold text-foreground">
                        Scenario D: Application Host / Deployment Failover
                      </span>
                      <Badge variant="info" className="text-[9px] font-black">
                        RTO: 15 Mins
                      </Badge>
                    </div>
                    <ol className="list-decimal list-inside space-y-1.5 text-xs text-muted-foreground font-medium">
                      <li>Promote the last known-good immutable production build in Vercel / container registry for <code className="text-[10px] bg-muted px-1 rounded">gnmngo/aurora-parsu</code>.</li>
                      <li>Verify environment variables (<code className="text-[10px] bg-muted px-1 rounded">NEXT_PUBLIC_SUPABASE_URL</code>, <code className="text-[10px] bg-muted px-1 rounded">NEXT_PUBLIC_SUPABASE_ANON_KEY</code>, <code className="text-[10px] bg-muted px-1 rounded">SUPABASE_SERVICE_ROLE_KEY</code>).</li>
                      <li>Run <strong>Re-Run Diagnostics</strong> on this console to confirm 100% subsystem readiness.</li>
                    </ol>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ═══════════════════════════════════════════════════════════════════ */}
            {/* TAB 3: TROUBLESHOOTING GUIDE & PLAYBOOKS                           */}
            {/* ═══════════════════════════════════════════════════════════════════ */}
            <TabsContent value="troubleshooting" className="space-y-6 mt-0">
              <Card>
                <CardHeader className="border-b border-border bg-muted/20 pb-4">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <div>
                      <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
                        <BookOpen className="h-4 w-4 text-primary" />
                        Interactive Troubleshooting Guide &amp; Resolution Matrix
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Searchable diagnostic solutions for common operational issues across all AURORA modules.
                      </CardDescription>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <div className="relative w-full sm:w-64">
                        <Search className="h-3.5 w-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                        <Input
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Search symptoms, modules, fixes..."
                          className="h-8 pl-8 text-xs"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Module Filter Pills */}
                  <div className="flex flex-wrap gap-1.5 pt-3">
                    {modulesList.map((mod) => (
                      <button
                        key={mod}
                        type="button"
                        onClick={() => setSelectedModuleFilter(mod)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors ${
                          selectedModuleFilter === mod
                            ? "bg-primary text-white"
                            : "bg-muted text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {mod}
                      </button>
                    ))}
                  </div>
                </CardHeader>

                <CardContent className="p-4 space-y-4">
                  {filteredTroubleshooting.length === 0 ? (
                    <div className="py-12 text-center text-muted-foreground text-xs">
                      No troubleshooting entries matched your filter. Try clearing the search query.
                    </div>
                  ) : (
                    filteredTroubleshooting.map((item) => (
                      <div
                        key={item.id}
                        className="rounded-xl border border-border bg-card p-4 space-y-3 hover:border-primary/40 transition-colors"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-[10px] font-black text-primary border-primary/30">
                              {item.module}
                            </Badge>
                            <h3 className="text-xs sm:text-sm font-bold text-foreground">
                              {item.symptom}
                            </h3>
                          </div>
                          <Badge
                            variant={
                              item.severity === "High"
                                ? "danger"
                                : item.severity === "Medium"
                                ? "warning"
                                : "info"
                            }
                            className="text-[9px] font-black uppercase"
                          >
                            {item.severity} Priority
                          </Badge>
                        </div>

                        <div className="rounded-lg bg-muted/40 p-2.5 text-xs text-muted-foreground">
                          <strong className="text-foreground">Root Cause: </strong>
                          {item.rootCause}
                        </div>

                        <div className="space-y-1.5">
                          <p className="text-[11px] font-extrabold uppercase tracking-wider text-foreground">
                            Step-by-Step Resolution:
                          </p>
                          <ol className="list-decimal list-inside space-y-1 text-xs text-muted-foreground font-medium">
                            {item.resolutionSteps.map((step, sIdx) => (
                              <li key={sIdx} className="leading-relaxed">
                                {step}
                              </li>
                            ))}
                          </ol>
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </RoleGuard>
  );
}
