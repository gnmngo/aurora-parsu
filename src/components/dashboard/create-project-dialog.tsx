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
  const [programs, setPrograms] = useState<
    Array<{ id: string; department_id: string; name: string }>
  >([]);
  const [templates, setTemplates] = useState<
    Array<{ 
      id: string; 
      name: string; 
      program_id: string; 
      defense_stages: Array<{ id: string; name: string; sequence_order: number }> 
    }>
  >([]);
  const [selectedStudent, setSelectedStudent] = useState("");
  const [selectedFaculty, setSelectedFaculty] = useState("");
  const [selectedDept, setSelectedDept] = useState("");
  const [selectedProgram, setSelectedProgram] = useState("");
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
        setPrograms(lookups.programs);
        setTemplates(lookups.workflow_templates);

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
          const defaultPrograms = lookups.programs.filter(p => p.department_id === lookups.departments[0].id);
          if (defaultPrograms.length > 0) {
            setSelectedProgram(defaultPrograms[0].id);
          } else {
            setSelectedProgram("");
          }
        } else {
          setSelectedDept("");
          setSelectedProgram("");
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

  const activeTemplate = templates.find((t) => t.program_id === selectedProgram);
  const initialStage = activeTemplate?.defense_stages?.[0];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !selectedStudent || !selectedFaculty || !selectedDept || !selectedProgram) {
      toast.error("Please fill in all required fields.");
      return;
    }

    if (!activeTemplate || !initialStage) {
      toast.error("The selected program does not have a configured workflow template or stages.");
      return;
    }

    setSubmitting(true);
    try {
      await createProject(supabase, {
        title,
        studentId: selectedStudent,
        facultyId: selectedFaculty,
        departmentId: selectedDept,
        workflowTemplateId: activeTemplate.id,
        stageId: initialStage.id,
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

  const filteredPrograms = programs.filter(p => p.department_id === selectedDept);

  const lookupsReady =
    students.length > 0 && faculty.length > 0 && departments.length > 0 && programs.length > 0;

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
              onChange={(e) => {
                setSelectedDept(e.target.value);
                const newPrograms = programs.filter(p => p.department_id === e.target.value);
                setSelectedProgram(newPrograms.length > 0 ? newPrograms[0].id : "");
              }}
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
            <Label htmlFor="program">Program</Label>
            <select
              id="program"
              value={selectedProgram}
              onChange={(e) => setSelectedProgram(e.target.value)}
              disabled={loadingLookups || filteredPrograms.length === 0}
              className="w-full rounded-xl border border-border bg-card p-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
              required
            >
              {filteredPrograms.length === 0 ? (
                <option value="">No programs available for this department</option>
              ) : (
                filteredPrograms.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))
              )}
            </select>
          </div>

          <div className="space-y-1">
            <Label>Workflow Template & Initial Stage</Label>
            <div className="w-full rounded-xl border border-border bg-muted/50 p-3 text-sm text-muted-foreground flex flex-col gap-1">
              {!activeTemplate ? (
                <span>No workflow configured for this program.</span>
              ) : (
                <>
                  <span className="font-semibold text-foreground">{activeTemplate.name}</span>
                  <span className="text-xs">Initial Stage: {initialStage?.name || "None"}</span>
                </>
              )}
            </div>
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
