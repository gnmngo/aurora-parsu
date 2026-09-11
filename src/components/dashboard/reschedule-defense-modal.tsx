"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  Clock,
  MapPin,
  Video,
  Users,
  Zap,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { updateDefenseScheduleAction } from "@/lib/scheduler/actions";
import { getApprovedFacultyListAction, type FacultyOptionItem } from "@/lib/projects/actions";
import { createClient } from "@/lib/supabase/client";

interface RescheduleDefenseModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schedule: {
    id: string;
    project_id: string;
    stage_id: string;
    scheduled_at: string;
    duration_minutes: number;
    room: string;
    building: string;
    is_online: boolean;
    meeting_url?: string;
    projects?: {
      title?: string;
    };
  } | null;
  onRescheduled?: () => void;
}

const DURATION_PRESETS = [
  { value: 5, label: "5m (Lightning Pitch)" },
  { value: 10, label: "10m (Concept Pitch)" },
  { value: 15, label: "15m (Concept Defense)" },
  { value: 20, label: "20m" },
  { value: 25, label: "25m" },
  { value: 30, label: "30m" },
  { value: 45, label: "45m" },
  { value: 60, label: "60m (Proposal)" },
  { value: 90, label: "90m" },
  { value: 120, label: "120m (Final Defense)" },
];

export function RescheduleDefenseModal({
  open,
  onOpenChange,
  schedule,
  onRescheduled,
}: RescheduleDefenseModalProps) {
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [duration, setDuration] = useState(60);
  const [room, setRoom] = useState("");
  const [building, setBuilding] = useState("");
  const [isOnline, setIsOnline] = useState(false);
  const [meetingUrl, setMeetingUrl] = useState("");
  const [selectedPanelists, setSelectedPanelists] = useState<string[]>([]);
  const [facultyList, setFacultyList] = useState<FacultyOptionItem[]>([]);
  const [loadingFaculty, setLoadingFaculty] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    if (!schedule || !open) return;

    // Pre-populate fields from current schedule
    try {
      const d = new Date(schedule.scheduled_at);
      if (!isNaN(d.getTime())) {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        const hours = String(d.getHours()).padStart(2, "0");
        const minutes = String(d.getMinutes()).padStart(2, "0");

        setDate(`${year}-${month}-${day}`);
        setTime(`${hours}:${minutes}`);
      }
    } catch {
      // ignore date parse fallback
    }

    setDuration(schedule.duration_minutes || 60);
    setRoom(schedule.room || "CECS Conference Room");
    setBuilding(schedule.building || "Engineering Building");
    setIsOnline(Boolean(schedule.is_online));
    setMeetingUrl(schedule.meeting_url || "");

    // Fetch existing assigned panelists for this schedule
    async function loadPanelists() {
      setLoadingFaculty(true);
      try {
        const [faculty, panelsRes] = await Promise.all([
          getApprovedFacultyListAction(),
          supabase
            .from("defense_panels")
            .select("profile_id")
            .eq("project_id", schedule!.project_id)
            .eq("stage_id", schedule!.stage_id),
        ]);

        setFacultyList(faculty);
        if (panelsRes.data) {
          setSelectedPanelists(panelsRes.data.map((p: any) => p.profile_id));
        }
      } catch (err) {
        console.error("Error loading faculty panelists:", err);
      } finally {
        setLoadingFaculty(false);
      }
    }

    loadPanelists();
  }, [schedule, open, supabase]);

  // "⚡ Set to Right Now (Live Demo / In the Moment)" handler
  const handleSetToRightNow = () => {
    const now = new Date();
    // Add 2 minutes buffer so it's strictly immediate
    const demoTime = new Date(now.getTime() + 2 * 60 * 1000);

    const year = demoTime.getFullYear();
    const month = String(demoTime.getMonth() + 1).padStart(2, "0");
    const day = String(demoTime.getDate()).padStart(2, "0");
    const hours = String(demoTime.getHours()).padStart(2, "0");
    const minutes = String(demoTime.getMinutes()).padStart(2, "0");

    setDate(`${year}-${month}-${day}`);
    setTime(`${hours}:${minutes}`);
    toast.success("Timeslot set to right now for live demonstration!");
  };

  const handlePanelistToggle = (id: string) => {
    setSelectedPanelists((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schedule) return;
    if (!date || !time) {
      toast.error("Please specify defense date and time.");
      return;
    }
    if (!isOnline && !room.trim()) {
      toast.error("Please enter a room or venue name.");
      return;
    }
    if (isOnline && !meetingUrl.trim()) {
      toast.error("Please enter an online video meeting URL.");
      return;
    }

    const scheduledAt = `${date}T${time}:00`;
    setSubmitting(true);

    try {
      await updateDefenseScheduleAction({
        scheduleId: schedule.id,
        projectId: schedule.project_id,
        stageId: schedule.stage_id,
        scheduledAt,
        durationMinutes: Number(duration),
        room: isOnline ? "Online Defense Room" : room,
        building: isOnline ? "Online / Remote" : building,
        isOnline,
        meetingUrl: isOnline ? meetingUrl : undefined,
        panelistIds: selectedPanelists,
      });

      toast.success("Defense schedule successfully updated!");
      onOpenChange(false);
      onRescheduled?.();
    } catch (err: any) {
      console.error("Reschedule error:", err);
      toast.error(err?.message || "Failed to reschedule defense.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!schedule) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between gap-2">
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              Reschedule Defense
            </DialogTitle>
            <Badge variant="outline" className="text-[10px] font-bold">
              Schedule ID: {schedule.id.slice(0, 8)}...
            </Badge>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            Update date, timeslot, venue, and appointed panel committee for{" "}
            <strong className="text-foreground">&ldquo;{schedule.projects?.title || "Research Project"}&rdquo;</strong>.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Quick Demo Action: Set to Right Now */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-950 dark:text-amber-200 text-xs">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-amber-600 shrink-0" />
              <div>
                <span className="font-bold block">Live Demonstration / Immediate Hearing?</span>
                <span className="text-[11px] text-muted-foreground">
                  Instantly set defense time to right now to test the deliberation workspace live.
                </span>
              </div>
            </div>
            <Button
              type="button"
              size="sm"
              onClick={handleSetToRightNow}
              className="h-7 text-xs font-bold gap-1.5 bg-amber-600 hover:bg-amber-700 text-white shrink-0 cursor-pointer shadow-xs"
            >
              <Zap className="h-3.5 w-3.5" />
              Set to Right Now
            </Button>
          </div>

          {/* Date & Time Picker */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="reschedule-date" className="text-xs font-bold flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-muted-foreground" /> Date
              </Label>
              <Input
                id="reschedule-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="h-9 text-xs"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="reschedule-time" className="text-xs font-bold flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-muted-foreground" /> Start Time
              </Label>
              <Input
                id="reschedule-time"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="h-9 text-xs"
                required
              />
            </div>
          </div>

          {/* Duration Selector with 5-Minute Intervals */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="reschedule-duration" className="text-xs font-bold flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-primary" /> Presentation Duration (Minutes)
              </Label>
              <span className="text-xs font-black text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                {duration} minutes
              </span>
            </div>

            {/* Quick Duration Pills (5m to 120m) */}
            <div className="flex flex-wrap gap-1.5">
              {DURATION_PRESETS.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setDuration(p.value)}
                  className={`px-2 py-1 rounded-md text-[10px] font-bold transition-all cursor-pointer border ${
                    duration === p.value
                      ? "bg-primary text-primary-foreground border-primary shadow-xs"
                      : "bg-muted/50 text-muted-foreground hover:bg-muted border-border"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 pt-1">
              <span className="text-[11px] text-muted-foreground">Custom interval:</span>
              <Input
                id="reschedule-duration"
                type="number"
                min={5}
                max={300}
                step={5}
                value={duration}
                onChange={(e) => setDuration(Math.max(5, Number(e.target.value)))}
                className="h-8 w-24 text-xs font-bold"
              />
              <span className="text-[11px] text-muted-foreground">min (5-min steps)</span>
            </div>
          </div>

          {/* Venue & Location Options */}
          <div className="border-t border-border pt-3 space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-xs font-bold">Online Videoconference Mode</Label>
                <p className="text-[11px] text-muted-foreground">
                  Deliver via Google Meet / Zoom link instead of physical campus room.
                </p>
              </div>
              <input
                type="checkbox"
                checked={isOnline}
                onChange={(e) => setIsOnline(e.target.checked)}
                className="h-4 w-4 rounded border-border accent-primary cursor-pointer"
              />
            </div>

            {isOnline ? (
              <div className="space-y-1.5">
                <Label htmlFor="reschedule-meeting-url" className="text-xs font-bold">
                  Meeting Video URL
                </Label>
                <div className="relative">
                  <Input
                    id="reschedule-meeting-url"
                    type="url"
                    placeholder="https://meet.google.com/xxx-xxxx-xxx or https://zoom.us/j/..."
                    value={meetingUrl}
                    onChange={(e) => setMeetingUrl(e.target.value)}
                    className="h-9 pl-9 text-xs"
                    required
                  />
                  <Video className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="reschedule-room" className="text-xs font-bold">
                    Room / Venue Name
                  </Label>
                  <div className="relative">
                    <Input
                      id="reschedule-room"
                      placeholder="e.g. CECS Conference Room"
                      value={room}
                      onChange={(e) => setRoom(e.target.value)}
                      className="h-9 pl-9 text-xs"
                      required
                    />
                    <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="reschedule-building" className="text-xs font-bold">
                    Building / Campus Facility
                  </Label>
                  <Input
                    id="reschedule-building"
                    placeholder="e.g. Engineering Building"
                    value={building}
                    onChange={(e) => setBuilding(e.target.value)}
                    className="h-9 text-xs"
                    required
                  />
                </div>
              </div>
            )}
          </div>

          {/* Panel Assignment */}
          <div className="border-t border-border pt-3 space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold flex items-center gap-1.5">
                <Users className="h-4 w-4 text-primary" /> Appointed Defense Panelists
              </Label>
              <Badge variant="outline" className="text-[10px] font-bold">
                {selectedPanelists.length} Panelist{selectedPanelists.length === 1 ? "" : "s"} Assigned
              </Badge>
            </div>

            {loadingFaculty ? (
              <div className="flex items-center justify-center py-4 text-xs text-muted-foreground gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                <span>Loading faculty roster...</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-36 overflow-y-auto border border-border p-2.5 rounded-xl bg-muted/20">
                {facultyList.map((fac) => (
                  <label
                    key={fac.profile_id}
                    className="flex items-center gap-2 p-1.5 hover:bg-muted/40 rounded-lg cursor-pointer select-none text-xs"
                  >
                    <input
                      type="checkbox"
                      checked={selectedPanelists.includes(fac.profile_id)}
                      onChange={() => handlePanelistToggle(fac.profile_id)}
                      className="h-4 w-4 rounded border-border accent-primary cursor-pointer"
                    />
                    <span className="font-medium text-foreground truncate">{fac.name}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          <DialogFooter className="pt-3 gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="h-9 text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className="h-9 text-xs font-bold gap-1.5 bg-primary text-primary-foreground shadow-xs"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Saving Changes...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Save Rescheduled Defense
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
