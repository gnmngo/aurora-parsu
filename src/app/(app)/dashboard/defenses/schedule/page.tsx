"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { createDefenseScheduleAction } from "@/lib/scheduler/actions";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { Calendar, Clock, MapPin, Loader2, ArrowLeft, Users, Video } from "lucide-react";

export default function SchedulePage() {
  const router = useRouter();
  const { roles, isLoading: authLoading } = useAuth();
  const supabase = createClient();

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [projects, setProjects] = useState<any[]>([]);
  const [stages, setStages] = useState<any[]>([]);
  const [facultyList, setFacultyList] = useState<any[]>([]);

  // Form states
  const [selectedProject, setSelectedProject] = useState("");
  const [selectedStage, setSelectedStage] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [duration, setDuration] = useState(120);
  const [room, setRoom] = useState("CECS Conference Room");
  const [building, setBuilding] = useState("Engineering Building");
  const [isOnline, setIsOnline] = useState(false);
  const [meetingUrl, setMeetingUrl] = useState("");
  const [selectedPanelists, setSelectedPanelists] = useState<string[]>([]);

  useEffect(() => {
    async function loadFormLookups() {
      try {
        // Fetch projects
        const { data: projs } = await supabase
          .from("projects")
          .select("id, title");
        if (projs) setProjects(projs);

        // Fetch stages
        const { data: stgs } = await supabase
          .from("defense_stages")
          .select("id, name")
          .order("sequence_order");
        if (stgs) setStages(stgs);

        // Fetch faculty (for panelists)
        const { data: fac } = await supabase
          .from("faculty")
          .select("profile_id, profiles(first_name, last_name)")
          .eq("is_panelist", true);
        if (fac) {
          const formatted = fac.map((f: any) => ({
            id: f.profile_id,
            name: f.profiles ? `${f.profiles.first_name} ${f.profiles.last_name}` : "Unknown Faculty",
          }));
          setFacultyList(formatted);
        }
      } catch (err) {
        console.error("Error loading lookups:", err);
        toast.error("Failed to load setup dropdowns.");
      } finally {
        setFetching(false);
      }
    }

    if (!authLoading) {
      loadFormLookups();
    }
  }, [authLoading, supabase]);

  const handlePanelistToggle = (id: string) => {
    setSelectedPanelists((prev) =>
      prev.includes(id) ? prev.filter((pid) => pid !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject) return toast.error("Please select a project.");
    if (!selectedStage) return toast.error("Please select a defense stage.");
    if (!scheduledAt) return toast.error("Please specify date and time.");

    setLoading(true);
    try {
      await createDefenseScheduleAction({
        projectId: selectedProject,
        stageId: selectedStage,
        scheduledAt,
        durationMinutes: Number(duration),
        room,
        building,
        isOnline,
        meetingUrl: isOnline ? meetingUrl : undefined,
        panelistIds: selectedPanelists,
      });

      toast.success("Defense defense scheduled successfully!");
      router.push("/dashboard/defenses");
      router.refresh();
    } catch (err: any) {
      toast.error(err?.message || "Overlap scheduling conflict detected.");
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

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="icon"
          onClick={() => router.push("/dashboard/defenses")}
          className="h-8 w-8 rounded-lg"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Schedule New Defense</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Assign venue, panels, and confirm time allocations.
          </p>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-5 text-sm">
            {/* Project Selection */}
            <div className="space-y-1.5">
              <Label htmlFor="project">Research Project Title</Label>
              <select
                id="project"
                value={selectedProject}
                onChange={(e) => setSelectedProject(e.target.value)}
                className="w-full h-9 rounded-lg border border-border bg-card px-3 focus:outline-none focus:ring-1 focus:ring-primary text-xs"
                required
              >
                <option value="">-- Choose Project --</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))}
              </select>
            </div>

            {/* Defense Stage */}
            <div className="space-y-1.5">
              <Label htmlFor="stage">Defense Stage</Label>
              <select
                id="stage"
                value={selectedStage}
                onChange={(e) => setSelectedStage(e.target.value)}
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
                <Label htmlFor="scheduled-at">Date & Start Time</Label>
                <div className="relative">
                  <Input
                    id="scheduled-at"
                    type="datetime-local"
                    value={scheduledAt}
                    onChange={(e) => setScheduledAt(e.target.value)}
                    className="h-9 pl-9 text-xs"
                    required
                  />
                  <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="duration">Duration (Minutes)</Label>
                <div className="relative">
                  <Input
                    id="duration"
                    type="number"
                    min={30}
                    max={300}
                    step={15}
                    value={duration}
                    onChange={(e) => setDuration(Number(e.target.value))}
                    className="h-9 pl-9 text-xs"
                    required
                  />
                  <Clock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            </div>

            {/* Venue & Location Mode */}
            <div className="border-t border-border/60 pt-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Online Defense Mode</Label>
                  <p className="text-[10px] text-muted-foreground">Deliver via videoconferencing link instead of room allocation.</p>
                </div>
                <input
                  type="checkbox"
                  checked={isOnline}
                  onChange={(e) => setIsOnline(e.target.checked)}
                  className="h-4 w-4 rounded border-border text-primary focus:ring-primary/20 accent-primary cursor-pointer"
                />
              </div>

              {isOnline ? (
                <div className="space-y-1.5">
                  <Label htmlFor="meeting-url">Meeting Video Link</Label>
                  <div className="relative">
                    <Input
                      id="meeting-url"
                      type="url"
                      placeholder="https://zoom.us/j/..."
                      value={meetingUrl}
                      onChange={(e) => setMeetingUrl(e.target.value)}
                      className="h-9 pl-9 text-xs"
                      required
                    />
                    <Video className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="room">Room / Venue Name</Label>
                    <div className="relative">
                      <Input
                        id="room"
                        value={room}
                        onChange={(e) => setRoom(e.target.value)}
                        className="h-9 pl-9 text-xs"
                        required
                      />
                      <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="building">Building Location</Label>
                    <Input
                      id="building"
                      value={building}
                      onChange={(e) => setBuilding(e.target.value)}
                      className="h-9 text-xs"
                      required
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Panel Assignment Checkboxes */}
            <div className="border-t border-border/60 pt-4 space-y-2">
              <Label className="flex items-center gap-1.5">
                <Users className="h-4 w-4 text-primary" /> Assign Panel Evaluators
              </Label>
              <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto border border-border p-3 rounded-lg bg-muted/5 mt-1">
                {facultyList.map((fac) => (
                  <label
                    key={fac.id}
                    className="flex items-center gap-2 p-1.5 hover:bg-muted/10 rounded cursor-pointer select-none"
                  >
                    <input
                      type="checkbox"
                      checked={selectedPanelists.includes(fac.id)}
                      onChange={() => handlePanelistToggle(fac.id)}
                      className="h-4 w-4 rounded border-border accent-primary cursor-pointer"
                    />
                    <span className="text-[11px] font-medium text-slate-800">{fac.name}</span>
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
              <Button type="submit" disabled={loading} className="h-9 text-xs rounded-xl px-5">
                {loading ? "Verifying..." : "Schedule Defense"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
