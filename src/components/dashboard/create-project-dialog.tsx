"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { PARSU_CAMPUS_ID } from "@/constants/app";
import { createProject, fetchProjectLookups } from "@/lib/projects/queries";

export function CreateProjectDialog({
  onProjectCreated,
}: {
  onProjectCreated: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [students, setStudents] = useState<
    Array<{
      id: string;
      profile_id: string;
      profiles: { first_name: string; last_name: string } | null;
    }>
  >([]);
  const [faculty, setFaculty] = useState<
    Array<{
      id: string;
      profile_id: string;
      profiles: { first_name: string; last_name: string } | null;
    }>
  >([]);
  const [departments, setDepartments] = useState<
    Array<{ id: string; name: string }>
  >([]);
  const [stages, setStages] = useState<
    Array<{ id: string; name: string; sequence_order: number }>
  >([]);
  const [selectedStudent, setSelectedStudent] = useState("");
  const [selectedFaculty, setSelectedFaculty] = useState("");
  const [selectedDept, setSelectedDept] = useState("");
  const [selectedStage, setSelectedStage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loadingLookups, setLoadingLookups] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    if (!open) return;

    async function loadData() {
      setLoadingLookups(true);
      try {
        const lookups = await fetchProjectLookups(supabase);
        setStudents(lookups.students);
        setFaculty(lookups.faculty);
        setDepartments(lookups.departments);
        setStages(lookups.stages);

        if (lookups.students.length > 0) {
          setSelectedStudent(lookups.students[0].id);
        } else {
          setSelectedStudent("");
        }
        if (lookups.faculty.length > 0) {
          setSelectedFaculty(lookups.faculty[0].id);
        } else {
          setSelectedFaculty("");
        }
        if (lookups.departments.length > 0) {
          setSelectedDept(lookups.departments[0].id);
        } else {
          setSelectedDept("");
        }
        if (lookups.stages.length > 0) {
          setSelectedStage(lookups.stages[0].id);
        } else {
          setSelectedStage("");
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Unknown error";
        console.error("Error loading dialog data:", err);
        toast.error(`Failed to load form data: ${message}`);
      } finally {
        setLoadingLookups(false);
      }
    }

    loadData();
  }, [open, supabase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !selectedStudent || !selectedFaculty || !selectedDept || !selectedStage) {
      toast.error("Please fill in all required fields.");
      return;
    }

    setSubmitting(true);
    try {
      await createProject(supabase, {
        title,
        studentId: selectedStudent,
        facultyId: selectedFaculty,
        departmentId: selectedDept,
        stageId: selectedStage,
        campusId: PARSU_CAMPUS_ID,
      });

      toast.success("Project created successfully!");
      setTitle("");
      setOpen(false);
      onProjectCreated();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      console.error(err);
      toast.error(`Error creating project: ${message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const lookupsReady =
    students.length > 0 && faculty.length > 0 && departments.length > 0 && stages.length > 0;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="mr-1.5 h-4 w-4" />
          Create Project
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create New Research Project</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-1">
            <Label htmlFor="title">Project Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. AURORA: Academic Unified Review System"
              required
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="student">Student Researcher</Label>
            <select
              id="student"
              value={selectedStudent}
              onChange={(e) => setSelectedStudent(e.target.value)}
              disabled={loadingLookups || students.length === 0}
              className="w-full rounded-xl border border-border bg-card p-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
              required
            >
              {students.length === 0 ? (
                <option value="">No students available</option>
              ) : (
                students.map((s) => {
                  const name = s.profiles
                    ? `${s.profiles.first_name} ${s.profiles.last_name}`
                    : "Unknown Student";
                  return (
                    <option key={s.id} value={s.id}>
                      {name}
                    </option>
                  );
                })
              )}
            </select>
            {students.length === 0 && !loadingLookups && (
              <p className="text-xs text-danger">
                No student profiles found. Approve student accounts first.
              </p>
            )}
          </div>

          <div className="space-y-1">
            <Label htmlFor="faculty">Faculty Adviser</Label>
            <select
              id="faculty"
              value={selectedFaculty}
              onChange={(e) => setSelectedFaculty(e.target.value)}
              disabled={loadingLookups || faculty.length === 0}
              className="w-full rounded-xl border border-border bg-card p-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
              required
            >
              {faculty.length === 0 ? (
                <option value="">No faculty available</option>
              ) : (
                faculty.map((f) => {
                  const name = f.profiles
                    ? `${f.profiles.first_name} ${f.profiles.last_name}`
                    : "Unknown Faculty";
                  return (
                    <option key={f.id} value={f.id}>
                      {name}
                    </option>
                  );
                })
              )}
            </select>
            {faculty.length === 0 && !loadingLookups && (
              <p className="text-xs text-danger">
                No faculty profiles found. Approve faculty accounts first.
              </p>
            )}
          </div>

          <div className="space-y-1">
            <Label htmlFor="dept">Department</Label>
            <select
              id="dept"
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              disabled={loadingLookups || departments.length === 0}
              className="w-full rounded-xl border border-border bg-card p-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
              required
            >
              {departments.length === 0 ? (
                <option value="">No departments available</option>
              ) : (
                departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))
              )}
            </select>
          </div>

          <div className="space-y-1">
            <Label htmlFor="stage">Initial Defense Stage</Label>
            <select
              id="stage"
              value={selectedStage}
              onChange={(e) => setSelectedStage(e.target.value)}
              disabled={loadingLookups || stages.length === 0}
              className="w-full rounded-xl border border-border bg-card p-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
              required
            >
              {stages.length === 0 ? (
                <option value="">No defense stages available</option>
              ) : (
                stages.map((st) => (
                  <option key={st.id} value={st.id}>
                    {st.name}
                  </option>
                ))
              )}
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </DialogClose>
            <Button
              type="submit"
              disabled={submitting || loadingLookups || !lookupsReady}
            >
              {submitting ? "Creating..." : "Create Project"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
