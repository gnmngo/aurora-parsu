"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import {
  createDefenseScheduleAction,
  getAcademicHierarchyAction,
  getBatchDefenseCandidatesAction,
  batchScheduleDefensesAction,
  type BatchCandidateProject,
} from "@/lib/scheduler/actions";
import { getApprovedFacultyListAction, type FacultyOptionItem } from "@/lib/projects/actions";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import {
  Calendar,
  Clock,
  MapPin,
  Loader2,
  ArrowLeft,
  Users,
  Video,
  Sparkles,
  Layers,
  CheckCircle2,
  AlertCircle,
  ShieldAlert,
  Building2,
  GraduationCap,
  ArrowRight,
  Plus,
  Zap,
} from "lucide-react";

export default function SchedulePage() {
  const router = useRouter();
  const { roles, isLoading: authLoading } = useAuth();
  const supabase = createClient();

  // Mode: "batch" is primary, "single" is fallback
  const [scheduleMode, setScheduleMode] = useState<"batch" | "single">("batch");

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  // Success state for post-scheduling confirmation screen
  const [scheduledSuccess, setScheduledSuccess] = useState<{
    projectTitle: string;
    stageName: string;
    scheduledAt: string;
    durationMinutes: number;
    room: string;
    isOnline: boolean;
    meetingUrl?: string;
    panelistCount: number;
    isBatch?: boolean;
    batchCount?: number;
  } | null>(null);

  // Lookups
  const [colleges, setColleges] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [programs, setPrograms] = useState<any[]>([]);
  const [stages, setStages] = useState<any[]>([]);
  const [facultyList, setFacultyList] = useState<FacultyOptionItem[]>([]);

  // -------------------------------------------------------------
  // BATCH SCHEDULING FORM STATE
  // -------------------------------------------------------------
  const [selectedCollegeId, setSelectedCollegeId] = useState("");
  const [selectedProgramId, setSelectedProgramId] = useState("");
  const [selectedStageId, setSelectedStageId] = useState("");

  const [batchRoom, setBatchRoom] = useState("CECS Conference Room");
  const [batchBuilding, setBatchBuilding] = useState("Engineering Building");
  const [batchIsOnline, setBatchIsOnline] = useState(false);
  const [batchMeetingUrl, setBatchMeetingUrl] = useState("");

  // Default Sept 14, 2026 to Sept 17, 2026
  const [batchStartDate, setBatchStartDate] = useState("2026-09-14");
  const [batchEndDate, setBatchEndDate] = useState("2026-09-17");
  const [dailyStartTime, setDailyStartTime] = useState("08:30");
  const [dailyEndTime, setDailyEndTime] = useState("17:00");
  const [slotDuration, setSlotDuration] = useState(90);
  const [bufferMinutes, setBufferMinutes] = useState(15);

  const [batchPanelists, setBatchPanelists] = useState<string[]>([]);
  const [candidates, setCandidates] = useState<BatchCandidateProject[]>([]);
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [selectedCandidateIds, setSelectedCandidateIds] = useState<string[]>([]);
  const [projectTimeSlots, setProjectTimeSlots] = useState<Record<string, { start: string; end: string }>>({});

  // -------------------------------------------------------------
  // SINGLE SCHEDULING FORM STATE
  // -------------------------------------------------------------
  const [singleProjects, setSingleProjects] = useState<any[]>([]);
  const [singleSelectedProject, setSingleSelectedProject] = useState("");
  const [singleSelectedStage, setSingleSelectedStage] = useState("");
  const [singleScheduledAt, setSingleScheduledAt] = useState("");
  const [singleDuration, setSingleDuration] = useState(120);
  const [singleRoom, setSingleRoom] = useState("CECS Conference Room");
  const [singleBuilding, setSingleBuilding] = useState("Engineering Building");
  const [singleIsOnline, setSingleIsOnline] = useState(false);
  const [singleMeetingUrl, setSingleMeetingUrl] = useState("");
  const [singlePanelists, setSinglePanelists] = useState<string[]>([]);

  // -------------------------------------------------------------
  // INITIAL DATA LOAD
  // -------------------------------------------------------------
  useEffect(() => {
    async function loadLookups() {
      try {
        setFetching(true);
        const [hierarchy, faculty, singleProjs] = await Promise.all([
          getAcademicHierarchyAction(),
          getApprovedFacultyListAction(),
          supabase
            .from("projects")
            .select("id, title, status, documents(id, stage_id, adviser_approval_status), project_members(profile_id, member_role, profiles!project_members_profile_id_fkey(first_name, last_name))")
            .is("archived_at", null)
            .order("title"),
        ]);

        setColleges(hierarchy.colleges);
        setDepartments(hierarchy.departments);
        setPrograms(hierarchy.programs);
        setStages(hierarchy.stages);
        setFacultyList(faculty);

        if (singleProjs.data) {
          setSingleProjects(singleProjs.data);
        }

        // Auto-select CECS college by default if present
        const cecs = hierarchy.colleges.find(
          (c) => c.code === "CECS" || c.name.toLowerCase().includes("engineering")
        );
        const defaultCollegeId = cecs?.id || hierarchy.colleges[0]?.id || "";
        setSelectedCollegeId(defaultCollegeId);

        // Auto-select BSIT program if present
        const bsit = hierarchy.programs.find(
          (p) => p.code === "BSIT" || p.name.toLowerCase().includes("information technology")
        );
        const defaultProgId = bsit?.id || hierarchy.programs[0]?.id || "";
        setSelectedProgramId(defaultProgId);

        // Auto-select Progress Report 2 (PR2) or first stage
        const pr2 = hierarchy.stages.find(
          (s) => s.code === "progress_2" || s.name.toLowerCase().includes("progress report 2")
        );
        const defaultStageId = pr2?.id || hierarchy.stages[0]?.id || "";
        setSelectedStageId(defaultStageId);
        setSingleSelectedStage(defaultStageId);
      } catch (err) {
        console.error("Failed to load setup lookups:", err);
        toast.error("Failed to load scheduling setup.");
      } finally {
        setFetching(false);
      }
    }

    if (!authLoading) {
      loadLookups();
    }
  }, [authLoading, supabase]);

  // Filter programs based on selected college
  const filteredPrograms = useMemo(() => {
    if (!selectedCollegeId) return programs;
    const collegeDeptIds = departments
      .filter((d) => d.college_id === selectedCollegeId)
      .map((d) => d.id);

    return programs.filter((p) => !p.department_id || collegeDeptIds.includes(p.department_id));
  }, [programs, departments, selectedCollegeId]);

  // Load batch candidates whenever college, program, or stage changes
  useEffect(() => {
    async function fetchCandidates() {
      if (!selectedCollegeId && !selectedProgramId) return;
      setLoadingCandidates(true);
      try {
        const results = await getBatchDefenseCandidatesAction({
          collegeId: selectedCollegeId || undefined,
          programId: selectedProgramId || undefined,
          stageId: selectedStageId || undefined,
        });

        setCandidates(results);
        // Default all candidate IDs as selected
        const ids = results.map((r) => r.id);
        setSelectedCandidateIds(ids);

        // Auto-distribute slots
        distributeSlots(results, ids);
      } catch (err: any) {
        console.error("Error fetching batch candidates:", err);
        toast.error("Failed to load eligible projects for batch.");
      } finally {
        setLoadingCandidates(false);
      }
    }

    if (!fetching) {
      fetchCandidates();
    }
  }, [selectedCollegeId, selectedProgramId, selectedStageId, fetching]);

  // Intelligent Slot Distribution
  const distributeSlots = (
    projList: BatchCandidateProject[],
    selectedIds: string[],
    sDate = batchStartDate,
    eDate = batchEndDate,
    sTime = dailyStartTime,
    eTime = dailyEndTime,
    dur = slotDuration,
    buf = bufferMinutes
  ) => {
    const activeProjects = projList.filter((p) => selectedIds.includes(p.id));
    if (activeProjects.length === 0) {
      setProjectTimeSlots({});
      return;
    }

    const slotsMap: Record<string, { start: string; end: string }> = {};

    let currentDay = new Date(`${sDate}T${sTime}:00`);

    const [dailyEndH, dailyEndM] = eTime.split(":").map(Number);
    const [dailyStartH, dailyStartM] = sTime.split(":").map(Number);

    for (const proj of activeProjects) {
      // Skip weekends (0 = Sunday, 6 = Saturday)
      while (currentDay.getDay() === 0 || currentDay.getDay() === 6) {
        currentDay.setDate(currentDay.getDate() + 1);
        currentDay.setHours(dailyStartH, dailyStartM, 0, 0);
      }

      // Check lunch break collision (12:00 PM to 1:00 PM)
      const curHour = currentDay.getHours();
      if (curHour === 12) {
        currentDay.setHours(13, 0, 0, 0);
      }

      const slotStart = new Date(currentDay);
      const slotEnd = new Date(slotStart.getTime() + dur * 60 * 1000);

      // Check if slot exceeds daily end time
      if (
        slotEnd.getHours() > dailyEndH ||
        (slotEnd.getHours() === dailyEndH && slotEnd.getMinutes() > dailyEndM)
      ) {
        // Advance to next day at daily start time
        currentDay.setDate(currentDay.getDate() + 1);
        currentDay.setHours(dailyStartH, dailyStartM, 0, 0);

        while (currentDay.getDay() === 0 || currentDay.getDay() === 6) {
          currentDay.setDate(currentDay.getDate() + 1);
          currentDay.setHours(dailyStartH, dailyStartM, 0, 0);
        }

        const nextSlotStart = new Date(currentDay);
        const nextSlotEnd = new Date(nextSlotStart.getTime() + dur * 60 * 1000);

        slotsMap[proj.id] = {
          start: toLocalISO(nextSlotStart),
          end: toLocalISO(nextSlotEnd),
        };
        currentDay = new Date(nextSlotEnd.getTime() + buf * 60 * 1000);
      } else {
        slotsMap[proj.id] = {
          start: toLocalISO(slotStart),
          end: toLocalISO(slotEnd),
        };
        currentDay = new Date(slotEnd.getTime() + buf * 60 * 1000);
      }
    }

    setProjectTimeSlots(slotsMap);
  };

  function toLocalISO(date: Date) {
    const tzOffset = date.getTimezoneOffset() * 60000;
    const localISOTime = new Date(date.getTime() - tzOffset).toISOString().slice(0, 16);
    return localISOTime;
  }

  const handleManualSlotChange = (projId: string, newStartVal: string) => {
    const startDate = new Date(newStartVal);
    if (isNaN(startDate.getTime())) return;
    const endDate = new Date(startDate.getTime() + slotDuration * 60 * 1000);

    setProjectTimeSlots((prev) => ({
      ...prev,
      [projId]: {
        start: newStartVal,
        end: toLocalISO(endDate),
      },
    }));
  };

  const handleBatchPanelistToggle = (id: string) => {
    setBatchPanelists((prev) =>
      prev.includes(id) ? prev.filter((pid) => pid !== id) : [...prev, id]
    );
  };

  const handleSinglePanelistToggle = (id: string) => {
    setSinglePanelists((prev) =>
      prev.includes(id) ? prev.filter((pid) => pid !== id) : [...prev, id]
    );
  };

  const handleToggleSelectCandidate = (id: string) => {
    setSelectedCandidateIds((prev) => {
      const next = prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id];
      distributeSlots(candidates, next);
      return next;
    });
  };

  const handleSelectAllCandidates = () => {
    if (selectedCandidateIds.length === candidates.length) {
      setSelectedCandidateIds([]);
      setProjectTimeSlots({});
    } else {
      const allIds = candidates.map((c) => c.id);
      setSelectedCandidateIds(allIds);
      distributeSlots(candidates, allIds);
    }
  };

  // -------------------------------------------------------------
  // CONFLICT OF INTEREST (COI) RESOLUTION
  // -------------------------------------------------------------
  // Single Project Adviser calculation
  const singleSelectedProjectObj = useMemo(() => {
    return singleProjects.find((p) => p.id === singleSelectedProject);
  }, [singleProjects, singleSelectedProject]);

  const singleProjectAdviser = useMemo(() => {
    if (!singleSelectedProjectObj?.project_members) return null;
    const members = Array.isArray(singleSelectedProjectObj.project_members)
      ? singleSelectedProjectObj.project_members
      : [singleSelectedProjectObj.project_members];
    const adv = members.find((m: any) => m?.member_role === "adviser");
    if (!adv) return null;
    const prof = Array.isArray(adv.profiles) ? adv.profiles[0] : adv.profiles;
    return {
      profileId: adv.profile_id as string,
      name: prof ? `${prof.first_name || ""} ${prof.last_name || ""}`.trim() : "Project Adviser",
    };
  }, [singleSelectedProjectObj]);

  // If adviser is selected as a panelist in single mode, auto-remove them
  useEffect(() => {
    if (singleProjectAdviser?.profileId && singlePanelists.includes(singleProjectAdviser.profileId)) {
      setSinglePanelists((prev) => prev.filter((id) => id !== singleProjectAdviser.profileId));
      toast.warning(
        `Auto-removed ${singleProjectAdviser.name} from panel pool (Conflict of Interest: research advisers cannot evaluate their own project).`
      );
    }
  }, [singleProjectAdviser?.profileId, singlePanelists]);

  // Batch Mode Conflicts calculation
  const batchConflicts = useMemo(() => {
    if (batchPanelists.length === 0 || selectedCandidateIds.length === 0) return [];
    const conflicts: { projectId: string; projectTitle: string; adviserName: string; adviserProfileId: string }[] = [];
    for (const id of selectedCandidateIds) {
      const cand = candidates.find((c) => c.id === id);
      if (cand?.adviserProfileId && batchPanelists.includes(cand.adviserProfileId)) {
        conflicts.push({
          projectId: cand.id,
          projectTitle: cand.title,
          adviserName: cand.adviserName,
          adviserProfileId: cand.adviserProfileId,
        });
      }
    }
    return conflicts;
  }, [batchPanelists, selectedCandidateIds, candidates]);

  // -------------------------------------------------------------
  // SUBMIT HANDLERS
  // -------------------------------------------------------------
  const handleBatchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (batchConflicts.length > 0) {
      const first = batchConflicts[0];
      return toast.error(
        `Conflict of Interest: ${first.adviserName} is selected as a panelist but advises "${first.projectTitle}". Please remove this adviser from the panel pool or exclude this project.`
      );
    }
    if (!selectedStageId) return toast.error("Please select a defense stage.");
    if (!batchIsOnline && (!batchRoom || !batchRoom.trim())) {
      return toast.error("Please specify the single venue / room for this batch.");
    }
    if (batchIsOnline && (!batchMeetingUrl || !batchMeetingUrl.trim())) {
      return toast.error("Please provide the online video meeting link.");
    }
    if (selectedCandidateIds.length === 0) {
      return toast.error("Please select at least one project for this batch.");
    }

    const allocations = selectedCandidateIds.map((pid) => {
      const slot = projectTimeSlots[pid];
      const startISO = slot?.start ? new Date(slot.start).toISOString() : new Date().toISOString();
      const endISO = slot?.end
        ? new Date(slot.end).toISOString()
        : new Date(new Date(startISO).getTime() + slotDuration * 60000).toISOString();

      return {
        projectId: pid,
        stageId: selectedStageId,
        scheduledAt: startISO,
        endAt: endISO,
        durationMinutes: slotDuration,
      };
    });

    setLoading(true);
    try {
      const result = await batchScheduleDefensesAction({
        collegeId: selectedCollegeId || undefined,
        programId: selectedProgramId || undefined,
        stageId: selectedStageId,
        room: batchIsOnline ? "Online Defense Room" : batchRoom,
        building: batchIsOnline ? "Online / Remote" : batchBuilding,
        isOnline: batchIsOnline,
        meetingUrl: batchIsOnline ? batchMeetingUrl : undefined,
        panelistIds: batchPanelists,
        allocations,
        allowPendingAdviserApproval: true,
      });

      const prog = programs.find((p) => p.id === selectedProgramId);
      const stg = stages.find((s) => s.id === selectedStageId);

      toast.success(
        `Batch Scheduled! ${result.count} defenses assigned to ${batchRoom} for ${
          prog?.code || "College"
        } (${stg?.name || "Defense Stage"}).`
      );

      // Trigger post-scheduling confirmation screen
      setScheduledSuccess({
        projectTitle: `Batch Defense Session (${prog?.code || "Academic Program"})`,
        stageName: stg?.name || "Defense Stage",
        scheduledAt: `${batchStartDate} to ${batchEndDate} (${dailyStartTime} - ${dailyEndTime})`,
        durationMinutes: slotDuration,
        room: batchIsOnline ? "Online Defense Room" : `${batchRoom} (${batchBuilding})`,
        isOnline: batchIsOnline,
        meetingUrl: batchMeetingUrl,
        panelistCount: batchPanelists.length,
        isBatch: true,
        batchCount: result.count,
      });

      // Clear batch selection
      setSelectedCandidateIds([]);
      setProjectTimeSlots({});
    } catch (err: any) {
      console.error("Batch scheduling error:", err);
      toast.error(err?.message || "Failed to batch schedule defenses.");
    } finally {
      setLoading(false);
    }
  };

  const handleSingleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!singleSelectedProject) return toast.error("Please select a project.");
    if (singleProjectAdviser && singlePanelists.includes(singleProjectAdviser.profileId)) {
      return toast.error(
        `Conflict of Interest: ${singleProjectAdviser.name} is the assigned research adviser for this project and cannot evaluate it.`
      );
    }
    if (!singleSelectedStage) return toast.error("Please select a defense stage.");
    if (!singleScheduledAt) return toast.error("Please specify date and time.");

    setLoading(true);
    try {
      await createDefenseScheduleAction({
        projectId: singleSelectedProject,
        stageId: singleSelectedStage,
        scheduledAt: singleScheduledAt,
        durationMinutes: Number(singleDuration),
        room: singleRoom,
        building: singleBuilding,
        isOnline: singleIsOnline,
        meetingUrl: singleIsOnline ? singleMeetingUrl : undefined,
        panelistIds: singlePanelists,
      });

      const stgName = stages.find((s) => s.id === singleSelectedStage)?.name || "Defense Stage";
      const projTitle = singleSelectedProjectObj?.title || "Research Manuscript";

      toast.success("Defense scheduled successfully!");

      // Trigger post-scheduling confirmation screen
      setScheduledSuccess({
        projectTitle: projTitle,
        stageName: stgName,
        scheduledAt: singleScheduledAt,
        durationMinutes: Number(singleDuration),
        room: singleIsOnline ? "Online Defense Room" : `${singleRoom} (${singleBuilding})`,
        isOnline: singleIsOnline,
        meetingUrl: singleMeetingUrl,
        panelistCount: singlePanelists.length,
        isBatch: false,
      });

      // Clear single form to prevent duplicate clicks
      setSingleSelectedProject("");
      setSingleScheduledAt("");
      setSinglePanelists([]);
    } catch (err: any) {
      toast.error(err?.message || "Scheduling conflict detected.");
    } finally {
      setLoading(false);
    }
  };

  // Guard access
  if (authLoading || fetching) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const isCoordinatorOrAdmin = roles.includes("coordinator") || roles.includes("sys_admin");
  if (!isCoordinatorOrAdmin) {
    return (
      <div className="flex flex-col items-center justify-center p-20 text-center">
        <h3 className="text-lg font-bold text-foreground">Access Denied</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Only defense coordinators or administrators can access scheduling controls.
        </p>
        <Button onClick={() => router.push("/dashboard")} className="mt-4">
          Return to Dashboard
        </Button>
      </div>
    );
  }

  const selectedProgramObj = programs.find((p) => p.id === selectedProgramId);
  const selectedStageObj = stages.find((s) => s.id === selectedStageId);

  // ── CONFIRMATION SCREEN (Displayed immediately upon successful schedule) ──
  if (scheduledSuccess) {
    return (
      <div className="mx-auto max-w-2xl space-y-6 py-8">
        <Card className="border-emerald-500/30 bg-card shadow-lg rounded-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-6 text-white text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 backdrop-blur shadow-sm mb-3">
              <CheckCircle2 className="h-9 w-9 text-white" />
            </div>
            <h2 className="text-xl font-black tracking-tight">
              {scheduledSuccess.isBatch
                ? `🎉 ${scheduledSuccess.batchCount || ""} Defenses Batch Scheduled!`
                : "🎉 Defense Successfully Scheduled!"}
            </h2>
            <p className="text-xs text-white/80 mt-1 max-w-md mx-auto">
              Official defense timeslots, venue bookings, and panel assignments have been finalized and recorded in AURORA.
            </p>
          </div>

          <CardContent className="p-6 space-y-4 text-xs">
            <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Scheduled Project
                </span>
                <Badge variant="info" className="text-[9px] font-black">
                  {scheduledSuccess.stageName}
                </Badge>
              </div>
              <h3 className="text-sm font-bold text-foreground">
                &ldquo;{scheduledSuccess.projectTitle}&rdquo;
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-border/60 text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-primary shrink-0" />
                  <div>
                    <span className="text-[10px] font-bold block text-foreground">Timeslot</span>
                    <span>{scheduledSuccess.scheduledAt}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary shrink-0" />
                  <div>
                    <span className="text-[10px] font-bold block text-foreground">Presentation Duration</span>
                    <span>{scheduledSuccess.durationMinutes} minutes</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary shrink-0" />
                  <div>
                    <span className="text-[10px] font-bold block text-foreground">Venue / Mode</span>
                    <span className="truncate max-w-[200px] block">{scheduledSuccess.room}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary shrink-0" />
                  <div>
                    <span className="text-[10px] font-bold block text-foreground">Assigned Panel Pool</span>
                    <span>{scheduledSuccess.panelistCount} Faculty Evaluator{scheduledSuccess.panelistCount === 1 ? "" : "s"}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button
                variant="outline"
                onClick={() => setScheduledSuccess(null)}
                className="w-full sm:w-auto h-9 font-bold gap-1.5 cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                Schedule Another Project
              </Button>
              <Button
                onClick={() => {
                  router.push("/dashboard/defenses");
                  router.refresh();
                }}
                className="w-full sm:w-auto h-9 font-bold gap-1.5 bg-primary text-primary-foreground shadow-sm cursor-pointer"
              >
                <Calendar className="h-4 w-4" />
                <span>View in Defenses Pipeline</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/70 pb-4">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            onClick={() => router.push("/dashboard/defenses")}
            className="h-9 w-9 rounded-xl shadow-xs"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              Defense Scheduler
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-xs font-semibold py-0.5">
                Batch Mode Active
              </Badge>
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              One dedicated venue per college batch across designated defense dates without hassle.
            </p>
          </div>
        </div>

        {/* Mode Switcher */}
        <div className="flex items-center bg-muted/60 p-1 rounded-xl border border-border/80 self-start md:self-auto">
          <button
            type="button"
            onClick={() => setScheduleMode("batch")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              scheduleMode === "batch"
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            Batch Schedule by College
          </button>
          <button
            type="button"
            onClick={() => setScheduleMode("single")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              scheduleMode === "single"
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            Single Project
          </button>
        </div>
      </div>

      {/* ============================================================= */}
      {/* BATCH SCHEDULING MODE */}
      {/* ============================================================= */}
      {scheduleMode === "batch" && (
        <form onSubmit={handleBatchSubmit} className="space-y-6 text-xs">
          {/* STEP 1: College, Program & Stage */}
          <Card className="border-border/80 shadow-xs">
            <CardHeader className="pb-3 pt-5 px-6">
              <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
                <Building2 className="h-4 w-4 text-primary" />
                1. College & Defense Batch Target
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Select the target college, program, and defense milestone (e.g. BSIT 4th Year PR2).
              </CardDescription>
            </CardHeader>
            <CardContent className="px-6 pb-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* College Selection */}
                <div className="space-y-1.5">
                  <Label htmlFor="batch-college" className="text-xs font-medium">
                    College / Faculty Division
                  </Label>
                  <select
                    id="batch-college"
                    value={selectedCollegeId}
                    onChange={(e) => setSelectedCollegeId(e.target.value)}
                    className="w-full h-9 rounded-lg border border-border bg-card px-3 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                    required
                  >
                    <option value="">-- Select College --</option>
                    {colleges.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.code})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Program Selection */}
                <div className="space-y-1.5">
                  <Label htmlFor="batch-program" className="text-xs font-medium">
                    Academic Program / Department
                  </Label>
                  <select
                    id="batch-program"
                    value={selectedProgramId}
                    onChange={(e) => setSelectedProgramId(e.target.value)}
                    className="w-full h-9 rounded-lg border border-border bg-card px-3 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                  >
                    <option value="">-- All Programs in College --</option>
                    {filteredPrograms.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.code ? `${p.code} - ` : ""}
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Defense Stage */}
                <div className="space-y-1.5">
                  <Label htmlFor="batch-stage" className="text-xs font-medium">
                    Defense Stage Milestone
                  </Label>
                  <select
                    id="batch-stage"
                    value={selectedStageId}
                    onChange={(e) => setSelectedStageId(e.target.value)}
                    className="w-full h-9 rounded-lg border border-border bg-card px-3 text-xs font-semibold text-primary focus:ring-1 focus:ring-primary focus:outline-none"
                    required
                  >
                    <option value="">-- Select Defense Stage --</option>
                    {stages.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.code.toUpperCase()})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* STEP 2: Dedicated Venue & Date Range Window */}
          <Card className="border-border/80 shadow-xs">
            <CardHeader className="pb-3 pt-5 px-6">
              <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
                <MapPin className="h-4 w-4 text-primary" />
                2. Dedicated Single Venue & Date Window
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Designate one official venue for the college batch across the scheduled defense dates.
              </CardDescription>
            </CardHeader>
            <CardContent className="px-6 pb-6 space-y-4">
              {/* Online Mode Checkbox */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/60">
                <div className="space-y-0.5">
                  <span className="font-semibold text-xs text-foreground">Online Defense Mode</span>
                  <p className="text-[11px] text-muted-foreground">
                    Host all sessions via a persistent institutional conference room link (Zoom / Google Meet).
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={batchIsOnline}
                  onChange={(e) => setBatchIsOnline(e.target.checked)}
                  className="h-4 w-4 rounded border-border accent-primary cursor-pointer"
                />
              </div>

              {batchIsOnline ? (
                <div className="space-y-1.5">
                  <Label htmlFor="batch-meeting-url" className="text-xs font-medium">
                    Batch Videoconference Link
                  </Label>
                  <div className="relative">
                    <Input
                      id="batch-meeting-url"
                      type="url"
                      placeholder="https://meet.google.com/xxx-xxxx-xxx or https://zoom.us/j/..."
                      value={batchMeetingUrl}
                      onChange={(e) => setBatchMeetingUrl(e.target.value)}
                      className="h-9 pl-9 text-xs"
                      required
                    />
                    <Video className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="batch-room" className="text-xs font-medium">
                      One Dedicated Venue / Room Name
                    </Label>
                    <div className="relative">
                      <Input
                        id="batch-room"
                        placeholder="e.g. CECS Conference Room or Computer Lab 3"
                        value={batchRoom}
                        onChange={(e) => setBatchRoom(e.target.value)}
                        className="h-9 pl-9 text-xs font-medium"
                        required
                      />
                      <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-primary" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="batch-building" className="text-xs font-medium">
                      Building / Facility
                    </Label>
                    <Input
                      id="batch-building"
                      placeholder="e.g. Engineering Building"
                      value={batchBuilding}
                      onChange={(e) => setBatchBuilding(e.target.value)}
                      className="h-9 text-xs font-medium"
                      required
                    />
                  </div>
                </div>
              )}

              {/* Date Window & Slot Rules */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2 border-t border-border/60">
                <div className="space-y-1.5">
                  <Label htmlFor="batch-start" className="text-xs font-medium flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5 text-muted-foreground" /> Start Date
                  </Label>
                  <Input
                    id="batch-start"
                    type="date"
                    value={batchStartDate}
                    onChange={(e) => {
                      setBatchStartDate(e.target.value);
                      distributeSlots(candidates, selectedCandidateIds, e.target.value, batchEndDate);
                    }}
                    className="h-9 text-xs"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="batch-end" className="text-xs font-medium flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5 text-muted-foreground" /> End Date
                  </Label>
                  <Input
                    id="batch-end"
                    type="date"
                    value={batchEndDate}
                    onChange={(e) => {
                      setBatchEndDate(e.target.value);
                      distributeSlots(candidates, selectedCandidateIds, batchStartDate, e.target.value);
                    }}
                    className="h-9 text-xs"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="daily-start" className="text-xs font-medium flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5 text-muted-foreground" /> Daily Start Time
                  </Label>
                  <Input
                    id="daily-start"
                    type="time"
                    value={dailyStartTime}
                    onChange={(e) => {
                      setDailyStartTime(e.target.value);
                      distributeSlots(
                        candidates,
                        selectedCandidateIds,
                        batchStartDate,
                        batchEndDate,
                        e.target.value
                      );
                    }}
                    className="h-9 text-xs"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="slot-duration" className="text-xs font-medium flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5 text-muted-foreground" /> Duration / Project
                  </Label>
                  <select
                    id="slot-duration"
                    value={slotDuration}
                    onChange={(e) => {
                      const dur = Number(e.target.value);
                      setSlotDuration(dur);
                      distributeSlots(
                        candidates,
                        selectedCandidateIds,
                        batchStartDate,
                        batchEndDate,
                        dailyStartTime,
                        dailyEndTime,
                        dur
                      );
                    }}
                    className="w-full h-9 rounded-lg border border-border bg-card px-3 text-xs focus:ring-1 focus:ring-primary focus:outline-none font-medium"
                  >
                    <option value={5}>5 minutes (Quick Pitch / Briefing)</option>
                    <option value={10}>10 minutes (Lightning Demo)</option>
                    <option value={15}>15 minutes (Concept / Title Defense)</option>
                    <option value={20}>20 minutes (Progress Check)</option>
                    <option value={25}>25 minutes</option>
                    <option value={30}>30 minutes (Short Defense)</option>
                    <option value={45}>45 minutes</option>
                    <option value={60}>60 minutes (1 hr - Standard Proposal)</option>
                    <option value={75}>75 minutes (1 hr 15 mins)</option>
                    <option value={90}>90 minutes (1.5 hrs)</option>
                    <option value={120}>120 minutes (2 hrs - Final Defense)</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* STEP 3: Panel Committee Pool */}
          <Card className="border-border/80 shadow-xs">
            <CardHeader className="pb-3 pt-5 px-6">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
                    <Users className="h-4 w-4 text-primary" />
                    3. Assigned Panel Committee Pool
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground">
                    Select faculty panel members assigned to evaluate this defense batch.
                  </CardDescription>
                </div>
                <Badge variant="secondary" className="text-xs">
                  {batchPanelists.length} Evaluator{batchPanelists.length === 1 ? "" : "s"} Selected
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="px-6 pb-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-48 overflow-y-auto border border-border p-3 rounded-xl bg-muted/10">
                {facultyList.map((fac) => {
                  const isChecked = batchPanelists.includes(fac.profile_id);
                  const advisesSelectedCount = candidates.filter(
                    (c) => selectedCandidateIds.includes(c.id) && c.adviserProfileId === fac.profile_id
                  ).length;
                  const hasConflict = isChecked && advisesSelectedCount > 0;

                  return (
                    <label
                      key={fac.profile_id}
                      className={`flex items-center justify-between p-2 rounded-lg cursor-pointer border transition-all select-none ${
                        hasConflict
                          ? "bg-rose-500/10 border-rose-500/50 text-rose-800 dark:text-rose-200 font-semibold"
                          : isChecked
                          ? "bg-primary/5 border-primary/40 text-foreground font-semibold"
                          : "border-transparent hover:bg-muted/40 text-muted-foreground"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 overflow-hidden">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleBatchPanelistToggle(fac.profile_id)}
                          className="h-3.5 w-3.5 rounded border-border accent-primary cursor-pointer"
                        />
                        <div className="overflow-hidden text-ellipsis whitespace-nowrap">
                          <span className="text-[11px] block">{fac.name}</span>
                          <span className="text-[9px] text-muted-foreground block truncate">
                            {fac.department || fac.email}
                          </span>
                        </div>
                      </div>
                      {advisesSelectedCount > 0 && (
                        <Badge
                          variant="outline"
                          className={`text-[9px] px-1.5 py-0 shrink-0 ml-1.5 ${
                            isChecked
                              ? "bg-rose-500/20 text-rose-700 dark:text-rose-300 border-rose-500/40"
                              : "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30"
                          }`}
                        >
                          {isChecked ? "⚠️ COI Conflict" : `Advises ${advisesSelectedCount}`}
                        </Badge>
                      )}
                    </label>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* STEP 4: Candidate Projects & Auto-Generated Schedule */}
          <Card className="border-border/80 shadow-xs">
            <CardHeader className="pb-3 pt-5 px-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
                    <GraduationCap className="h-4 w-4 text-primary" />
                    4. Projects in Batch & Intelligent Slot Allocations
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground">
                    All candidate projects under {selectedProgramObj?.code || "selected program"} for{" "}
                    {selectedStageObj?.name || "this stage"}.
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleSelectAllCandidates}
                    className="h-8 text-xs rounded-lg shadow-2xs"
                  >
                    {selectedCandidateIds.length === candidates.length && candidates.length > 0
                      ? "Deselect All"
                      : "Select All"}
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => distributeSlots(candidates, selectedCandidateIds)}
                    className="h-8 text-xs rounded-lg gap-1.5"
                  >
                    <Sparkles className="h-3.5 w-3.5 text-primary" />
                    Re-Distribute Slots
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="px-6 pb-6">
              {loadingCandidates ? (
                <div className="py-12 flex flex-col items-center justify-center text-muted-foreground gap-2">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  <span className="text-xs">Finding candidate research projects...</span>
                </div>
              ) : candidates.length === 0 ? (
                <div className="py-12 flex flex-col items-center justify-center text-center p-6 border border-dashed rounded-xl bg-muted/5">
                  <AlertCircle className="h-8 w-8 text-muted-foreground/60 mb-2" />
                  <p className="font-semibold text-foreground text-xs">No active projects found</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    No matching projects found under {selectedProgramObj?.name || "this program"}.
                  </p>
                </div>
              ) : (
                <div className="border border-border/80 rounded-xl overflow-hidden shadow-2xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-muted/40 text-muted-foreground font-semibold border-b border-border/70">
                        <tr>
                          <th className="p-3 w-10 text-center">
                            <input
                              type="checkbox"
                              checked={
                                selectedCandidateIds.length === candidates.length &&
                                candidates.length > 0
                              }
                              onChange={handleSelectAllCandidates}
                              className="h-3.5 w-3.5 rounded border-border accent-primary cursor-pointer"
                            />
                          </th>
                          <th className="p-3">Research Project & Author</th>
                          <th className="p-3">Adviser</th>
                          <th className="p-3">Manuscript Gate</th>
                          <th className="p-3 w-72">Allocated Defense Slot ({batchRoom})</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/60">
                        {candidates.map((proj) => {
                          const isSelected = selectedCandidateIds.includes(proj.id);
                          const slot = projectTimeSlots[proj.id];
                          const hasPanelConflict =
                            isSelected &&
                            !!proj.adviserProfileId &&
                            batchPanelists.includes(proj.adviserProfileId);

                          return (
                            <tr
                              key={proj.id}
                              className={`transition-colors ${
                                hasPanelConflict
                                  ? "bg-rose-500/10 border-l-4 border-l-rose-500"
                                  : isSelected
                                  ? "bg-primary/[0.02]"
                                  : "opacity-60 bg-muted/5"
                              }`}
                            >
                              <td className="p-3 text-center">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => handleToggleSelectCandidate(proj.id)}
                                  className="h-3.5 w-3.5 rounded border-border accent-primary cursor-pointer"
                                />
                              </td>
                              <td className="p-3">
                                <div className="font-semibold text-foreground">{proj.title}</div>
                                <div className="text-[11px] text-muted-foreground mt-0.5">
                                  Author: {proj.studentName}
                                </div>
                                {hasPanelConflict && (
                                  <Badge
                                    variant="danger"
                                    className="bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30 text-[10px] font-medium mt-1 inline-flex items-center gap-1"
                                  >
                                    <ShieldAlert className="h-3 w-3" />
                                    Panel Conflict: Adviser {proj.adviserName} is selected in Committee Pool
                                  </Badge>
                                )}
                              </td>
                              <td className="p-3">
                                <span
                                  className={`font-medium ${
                                    hasPanelConflict ? "text-rose-600 font-semibold" : "text-muted-foreground"
                                  }`}
                                >
                                  {proj.adviserName}
                                </span>
                              </td>
                              <td className="p-3">
                                {proj.hasApprovedDoc ? (
                                  <Badge
                                    variant="outline"
                                    className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px] font-medium"
                                  >
                                    ✓ Adviser Approved
                                  </Badge>
                                ) : (
                                  <Badge
                                    variant="outline"
                                    className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-[10px] font-medium"
                                  >
                                    ⚠️ Pending Sign-off
                                  </Badge>
                                )}
                              </td>
                              <td className="p-3">
                                {isSelected ? (
                                  <div className="space-y-1">
                                    <Input
                                      type="datetime-local"
                                      value={slot?.start || ""}
                                      onChange={(e) => handleManualSlotChange(proj.id, e.target.value)}
                                      className="h-8 text-xs font-mono font-medium"
                                      required
                                    />
                                    <div className="text-[10px] text-muted-foreground flex items-center justify-between px-1">
                                      <span>Duration: {slotDuration}m</span>
                                      <span className="text-primary font-medium truncate">
                                        Venue: {batchRoom}
                                      </span>
                                    </div>
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground text-[11px] italic">
                                    Excluded from batch
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Bottom Confirmation Bar */}
          <div className="bg-card border border-border/80 p-4 rounded-xl shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <div className="font-semibold text-foreground text-xs flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                Ready to Schedule {selectedCandidateIds.length} Defense Sessions
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Venue: <strong>{batchRoom}</strong> • Dates: <strong>{batchStartDate}</strong> to{" "}
                <strong>{batchEndDate}</strong> • Committee:{" "}
                <strong>{batchPanelists.length} Evaluators</strong>
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/dashboard/defenses")}
                className="h-9 text-xs rounded-xl"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading || selectedCandidateIds.length === 0}
                className="h-9 text-xs rounded-xl px-5 font-semibold gap-1.5 shadow-xs"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Allocating Defenses...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3.5 w-3.5" />
                    Confirm & Batch Schedule ({selectedCandidateIds.length})
                  </>
                )}
              </Button>
            </div>
          </div>
        </form>
      )}

      {/* ============================================================= */}
      {/* SINGLE PROJECT SCHEDULING MODE (FALLBACK) */}
      {/* ============================================================= */}
      {scheduleMode === "single" && (
        <Card className="border-border/80 shadow-xs">
          <CardHeader className="pb-3 pt-5 px-6">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
              <Layers className="h-4 w-4 text-primary" />
              Single Project Special / Makeup Defense
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Schedule an individual project defense outside the standard college batch.
            </CardDescription>
          </CardHeader>
          <CardContent className="px-6 pb-6">
            <form onSubmit={handleSingleSubmit} className="space-y-5 text-sm">
              {/* Project Selection */}
              <div className="space-y-1.5">
                <Label htmlFor="project" className="text-xs font-medium">
                  Research Project Title
                </Label>
                <select
                  id="project"
                  value={singleSelectedProject}
                  onChange={(e) => setSingleSelectedProject(e.target.value)}
                  className="w-full h-9 rounded-lg border border-border bg-card px-3 focus:outline-none focus:ring-1 focus:ring-primary text-xs"
                  required
                >
                  <option value="">-- Choose Project --</option>
                  {singleProjects.map((p) => {
                    const hasApprovedDoc = p.documents?.some(
                      (d: any) => d.adviser_approval_status === "approved"
                    );
                    const statusTag = hasApprovedDoc
                      ? "✓ Ready for Defense"
                      : "⚠️ Adviser Approval Pending";
                    return (
                      <option key={p.id} value={p.id}>
                        {p.title} [{statusTag}]
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Defense Stage */}
              <div className="space-y-1.5">
                <Label htmlFor="single-stage" className="text-xs font-medium">
                  Defense Stage
                </Label>
                <select
                  id="single-stage"
                  value={singleSelectedStage}
                  onChange={(e) => setSingleSelectedStage(e.target.value)}
                  className="w-full h-9 rounded-lg border border-border bg-card px-3 focus:outline-none focus:ring-1 focus:ring-primary text-xs"
                  required
                >
                  <option value="">-- Choose Defense Stage --</option>
                  {stages.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date & Time & Duration */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="single-scheduled-at" className="text-xs font-medium">
                      Date & Start Time
                    </Label>
                    <button
                      type="button"
                      onClick={() => {
                        const d = new Date(Date.now() + 2 * 60000);
                        d.setSeconds(0, 0);
                        const pad = (n: number) => String(n).padStart(2, "0");
                        setSingleScheduledAt(
                          `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
                        );
                      }}
                      className="text-[10px] text-amber-500 dark:text-amber-400 hover:underline flex items-center gap-1 font-semibold"
                    >
                      <Zap className="h-3 w-3" /> Set to Right Now (Demo)
                    </button>
                  </div>
                  <div className="relative">
                    <Input
                      id="single-scheduled-at"
                      type="datetime-local"
                      value={singleScheduledAt}
                      onChange={(e) => setSingleScheduledAt(e.target.value)}
                      className="h-9 pl-9 text-xs font-mono"
                      required
                    />
                    <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="single-duration" className="text-xs font-medium">
                      Duration (Minutes)
                    </Label>
                    <span className="text-[10px] text-primary font-semibold">{singleDuration} mins</span>
                  </div>
                  <div className="relative">
                    <Input
                      id="single-duration"
                      type="number"
                      min={5}
                      max={300}
                      step={5}
                      value={singleDuration}
                      onChange={(e) => setSingleDuration(Number(e.target.value))}
                      className="h-9 pl-9 text-xs font-mono"
                      required
                    />
                    <Clock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  </div>
                  {/* Quick 5-min interval preset buttons */}
                  <div className="flex flex-wrap gap-1 pt-1">
                    {[5, 10, 15, 20, 25, 30, 45, 60, 90, 120].map((dur) => (
                      <button
                        key={dur}
                        type="button"
                        onClick={() => setSingleDuration(dur)}
                        className={`text-[10px] px-2 py-0.5 rounded-full border transition-all ${
                          singleDuration === dur
                            ? "bg-primary text-primary-foreground border-primary font-semibold shadow-xs"
                            : "bg-muted/40 text-muted-foreground border-border hover:bg-muted"
                        }`}
                      >
                        {dur}m{dur === 15 ? " (Concept)" : dur === 60 ? " (Proposal)" : dur === 120 ? " (Final)" : ""}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Venue & Location Mode */}
              <div className="border-t border-border/60 pt-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-xs font-medium">Online Defense Mode</Label>
                    <p className="text-[10px] text-muted-foreground">
                      Deliver via videoconferencing link instead of physical room.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={singleIsOnline}
                    onChange={(e) => setSingleIsOnline(e.target.checked)}
                    className="h-4 w-4 rounded border-border accent-primary cursor-pointer"
                  />
                </div>

                {singleIsOnline ? (
                  <div className="space-y-1.5">
                    <Label htmlFor="single-meeting-url" className="text-xs font-medium">
                      Meeting Video Link
                    </Label>
                    <div className="relative">
                      <Input
                        id="single-meeting-url"
                        type="url"
                        placeholder="https://zoom.us/j/..."
                        value={singleMeetingUrl}
                        onChange={(e) => setSingleMeetingUrl(e.target.value)}
                        className="h-9 pl-9 text-xs"
                        required
                      />
                      <Video className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="single-room" className="text-xs font-medium">
                        Room / Venue Name
                      </Label>
                      <div className="relative">
                        <Input
                          id="single-room"
                          value={singleRoom}
                          onChange={(e) => setSingleRoom(e.target.value)}
                          className="h-9 pl-9 text-xs"
                          required
                        />
                        <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="single-building" className="text-xs font-medium">
                        Building Location
                      </Label>
                      <Input
                        id="single-building"
                        value={singleBuilding}
                        onChange={(e) => setSingleBuilding(e.target.value)}
                        className="h-9 text-xs"
                        required
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Panel Assignment */}
              <div className="border-t border-border/60 pt-4 space-y-2">
                <Label className="flex items-center gap-1.5 text-xs font-medium">
                  <Users className="h-4 w-4 text-primary" /> Assign Panel Evaluators
                </Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto border border-border p-3 rounded-xl bg-muted/5">
                  {facultyList.map((fac) => (
                    <label
                      key={fac.profile_id}
                      className="flex items-center gap-2 p-1.5 hover:bg-muted/10 rounded-lg cursor-pointer select-none"
                    >
                      <input
                        type="checkbox"
                        checked={singlePanelists.includes(fac.profile_id)}
                        onChange={() => handleSinglePanelistToggle(fac.profile_id)}
                        className="h-4 w-4 rounded border-border accent-primary cursor-pointer"
                      />
                      <span className="text-[11px] font-medium text-foreground">{fac.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push("/dashboard/defenses")}
                  className="h-9 text-xs rounded-xl"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={loading}
                  className="h-9 text-xs rounded-xl px-5 font-semibold"
                >
                  {loading ? "Verifying..." : "Schedule Defense"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
