"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { 
  Calendar as CalendarIcon, 
  Clock, 
  MapPin, 
  Users, 
  ChevronLeft, 
  ChevronRight, 
  User, 
  Plus,
  Loader2
} from "lucide-react";
import { toast } from "sonner";
import { updateDefenseScheduleAction } from "@/lib/scheduler/actions";

interface CalendarViewProps {
  userRole: string;
}

export function CalendarView({ userRole }: CalendarViewProps) {
  const supabase = createClient();
  const [viewMode, setViewMode] = useState<"month" | "week" | "day">("month");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [schedules, setSchedules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSchedule, setSelectedSchedule] = useState<any>(null);
  
  // Reschedule Form States
  const [editRoom, setEditRoom] = useState("");
  const [editBuilding, setEditBuilding] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editTime, setEditTime] = useState("");
  const [editDuration, setEditDuration] = useState(60);
  const [saving, setSaving] = useState(false);

  // Load schedules
  const loadSchedules = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("defense_schedules")
        .select(`
          id,
          project_id,
          stage_id,
          scheduled_at,
          end_at,
          room,
          building,
          duration_minutes,
          is_online,
          meeting_url,
          status,
          projects (
            title,
            student_id,
            students (
              profile_id,
              profiles ( first_name, last_name )
            )
          ),
          defense_stages ( name )
        `);
      if (error) throw error;
      setSchedules(data || []);
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to load defense schedules.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSchedules();
  }, []);

  const handlePrevDate = () => {
    const d = new Date(currentDate);
    if (viewMode === "month") {
      d.setMonth(d.getMonth() - 1);
    } else if (viewMode === "week") {
      d.setDate(d.getDate() - 7);
    } else {
      d.setDate(d.getDate() - 1);
    }
    setCurrentDate(d);
  };

  const handleNextDate = () => {
    const d = new Date(currentDate);
    if (viewMode === "month") {
      d.setMonth(d.getMonth() + 1);
    } else if (viewMode === "week") {
      d.setDate(d.getDate() + 7);
    } else {
      d.setDate(d.getDate() + 1);
    }
    setCurrentDate(d);
  };

  // Reschedule trigger
  const handleOpenEditModal = (sched: any) => {
    if (userRole !== "coordinator" && userRole !== "sys_admin") {
      toast.error("Access denied. Only coordinators can reschedule defenses.");
      return;
    }
    setSelectedSchedule(sched);
    setEditRoom(sched.room);
    setEditBuilding(sched.building || "Goa Campus");
    const d = new Date(sched.scheduled_at);
    
    // format as YYYY-MM-DD
    const dateStr = d.toISOString().split("T")[0];
    // format as HH:MM
    const timeStr = d.toTimeString().slice(0, 5);

    setEditDate(dateStr);
    setEditTime(timeStr);
    setEditDuration(sched.duration_minutes || 60);
  };

  const handleSaveReschedule = async () => {
    if (!selectedSchedule) return;
    setSaving(true);
    try {
      const scheduledAt = new Date(`${editDate}T${editTime}:00`);

      // Fetch panelist IDs currently assigned to this project/stage
      const { data: panels } = await supabase
        .from("defense_panels")
        .select("profile_id")
        .eq("project_id", selectedSchedule.project_id)
        .eq("stage_id", selectedSchedule.stage_id);

      const panelistIds = panels?.map((p: any) => p.profile_id) || [];

      await updateDefenseScheduleAction({
        scheduleId: selectedSchedule.id,
        projectId: selectedSchedule.project_id,
        stageId: selectedSchedule.stage_id,
        scheduledAt: scheduledAt.toISOString(),
        durationMinutes: Number(editDuration),
        room: editRoom,
        building: editBuilding,
        isOnline: selectedSchedule.is_online,
        meetingUrl: selectedSchedule.meeting_url,
        panelistIds
      });

      toast.success("Schedule updated successfully!");
      setSelectedSchedule(null);
      loadSchedules();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Conflict detected. Rescheduling aborted.");
    } finally {
      setSaving(false);
    }
  };

  // Month Math
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const days = new Date(year, month + 1, 0).getDate();
    
    const arr = [];
    // padding for empty cells
    for (let i = 0; i < firstDay; i++) {
      arr.push(null);
    }
    for (let i = 1; i <= days; i++) {
      arr.push(new Date(year, month, i));
    }
    return arr;
  };

  const daysGrid = getDaysInMonth(currentDate);

  return (
    <div className="space-y-6 text-xs font-semibold text-slate-800">
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Navigation */}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handlePrevDate} className="h-8 w-8 p-0 rounded-lg">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-bold min-w-36 text-center">
            {currentDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
          </span>
          <Button variant="outline" size="sm" onClick={handleNextDate} className="h-8 w-8 p-0 rounded-lg">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* View Switchers */}
        <div className="flex items-center gap-1 bg-muted p-0.5 rounded-lg border border-border/40">
          <button
            onClick={() => setViewMode("month")}
            className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all cursor-pointer ${viewMode === "month" ? "bg-card text-primary shadow-sm" : "text-muted-foreground hover:text-slate-800"}`}
          >
            Month View
          </button>
          <button
            onClick={() => setViewMode("week")}
            className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all cursor-pointer ${viewMode === "week" ? "bg-card text-primary shadow-sm" : "text-muted-foreground hover:text-slate-800"}`}
          >
            Week View
          </button>
          <button
            onClick={() => setViewMode("day")}
            className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all cursor-pointer ${viewMode === "day" ? "bg-card text-primary shadow-sm" : "text-muted-foreground hover:text-slate-800"}`}
          >
            Day View
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex h-96 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid gap-6">
          {viewMode === "month" && (
            <div className="grid grid-cols-7 border border-border rounded-xl overflow-hidden bg-card text-center divide-x divide-y divide-border">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                <div key={day} className="py-2.5 bg-muted/40 font-bold text-[10px] text-muted-foreground uppercase tracking-wider">
                  {day}
                </div>
              ))}
              {daysGrid.map((day, idx) => {
                if (!day) return <div key={`empty-${idx}`} className="bg-muted/10 min-h-24" />;
                const daySchedules = schedules.filter((s) => {
                  const sDate = new Date(s.scheduled_at);
                  return (
                    sDate.getDate() === day.getDate() &&
                    sDate.getMonth() === day.getMonth() &&
                    sDate.getFullYear() === day.getFullYear()
                  );
                });

                return (
                  <div key={day.toISOString()} className="p-1 min-h-24 bg-card hover:bg-muted/10 transition-colors flex flex-col items-stretch">
                    <span className="text-left font-bold text-slate-800 text-[10px] pl-1 pt-0.5">{day.getDate()}</span>
                    <div className="mt-1 space-y-1 flex-1 flex flex-col justify-start">
                      {daySchedules.map((s) => (
                        <div
                          key={s.id}
                          onClick={() => handleOpenEditModal(s)}
                          className="text-[9px] p-1 rounded bg-blue-50 border border-blue-100 text-blue-800 cursor-pointer hover:bg-blue-100/60 truncate font-semibold leading-tight"
                        >
                          {s.projects?.title}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {viewMode !== "month" && (
            <Card>
              <CardContent className="pt-6">
                <div className="divide-y divide-border/60">
                  {schedules
                    .filter((s) => {
                      const sDate = new Date(s.scheduled_at);
                      if (viewMode === "day") {
                        return (
                          sDate.getDate() === currentDate.getDate() &&
                          sDate.getMonth() === currentDate.getMonth() &&
                          sDate.getFullYear() === currentDate.getFullYear()
                        );
                      }
                      // Week filter approximation
                      const diffTime = Math.abs(currentDate.getTime() - sDate.getTime());
                      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                      return diffDays <= 7;
                    })
                    .map((s) => {
                      const startTime = new Date(s.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                      const endTime = new Date(s.end_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                      const studentName = s.projects?.students?.profiles
                        ? `${s.projects.students.profiles.first_name} ${s.projects.students.profiles.last_name}`
                        : "Unknown Student";

                      return (
                        <div key={s.id} className="flex flex-col md:flex-row md:items-center justify-between py-4 gap-4 hover:bg-muted/5 px-2 rounded-xl transition-all">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <Badge variant="info" className="text-[8px] tracking-wider uppercase font-extrabold">
                                {s.defense_stages?.name}
                              </Badge>
                              <Badge variant="outline" className="text-[8px] tracking-wider uppercase font-extrabold capitalize">
                                {s.status}
                              </Badge>
                            </div>
                            <h4 className="text-sm font-bold text-slate-900">"{s.projects?.title}"</h4>
                            <div className="flex flex-wrap items-center gap-3 text-[10px] text-muted-foreground pt-0.5">
                              <span className="flex items-center gap-1">
                                <User className="h-3.5 w-3.5" /> Student: {studentName}
                              </span>
                              <span>•</span>
                              <span className="flex items-center gap-1">
                                <Clock className="h-3.5 w-3.5" /> {startTime} - {endTime}
                              </span>
                              <span>•</span>
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3.5 w-3.5" /> Room {s.room} ({s.building})
                              </span>
                            </div>
                          </div>
                          <Button size="sm" variant="outline" className="h-8 rounded-lg" onClick={() => handleOpenEditModal(s)}>
                            Reschedule
                          </Button>
                        </div>
                      );
                    })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Edit schedule modal overlay */}
      {selectedSchedule && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-md border border-border shadow-2xl rounded-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="bg-muted/20 border-b border-border/80 px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Reschedule Defense</h3>
                <p className="text-[10px] text-muted-foreground">Conflict checking is done automatically</p>
              </div>
              <button onClick={() => setSelectedSchedule(null)} className="text-muted-foreground hover:text-slate-900 font-bold text-lg">×</button>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] text-muted-foreground uppercase font-bold">Room / Venue</label>
                <Input value={editRoom} onChange={(e) => setEditRoom(e.target.value)} placeholder="e.g. Room 204" className="h-9 text-xs" />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] text-muted-foreground uppercase font-bold">Date</label>
                  <Input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} className="h-9 text-xs" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] text-muted-foreground uppercase font-bold">Time</label>
                  <Input type="time" value={editTime} onChange={(e) => setEditTime(e.target.value)} className="h-9 text-xs" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] text-muted-foreground uppercase font-bold">Duration (Minutes)</label>
                <Input type="number" value={editDuration} onChange={(e) => setEditDuration(Number(e.target.value))} className="h-9 text-xs" />
              </div>
            </div>

            <div className="bg-muted/10 border-t border-border px-6 py-4 flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setSelectedSchedule(null)} disabled={saving} className="h-8 rounded-lg">Cancel</Button>
              <Button size="sm" onClick={handleSaveReschedule} disabled={saving} className="h-8 rounded-lg">
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Save Changes"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
