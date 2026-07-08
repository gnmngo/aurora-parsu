"use server";

import { createClient } from "@/lib/supabase/server";
import { headers } from "next/headers";

export interface CreateScheduleInput {
  projectId: string;
  stageId: string;
  scheduledAt: string; // ISO String
  durationMinutes: number;
  room: string;
  building: string;
  isOnline: boolean;
  meetingUrl?: string;
  panelistIds: string[]; // Profile IDs
}

/**
 * Validates and creates a defense schedule checking for overlaps
 */
export async function createDefenseScheduleAction(input: CreateScheduleInput) {
  const supabase = await createClient();
  const headersList = await headers();
  const ip = headersList.get("x-forwarded-for")?.split(",")[0] || "127.0.0.1";
  const userAgent = headersList.get("user-agent") || "unknown";

  // 1. Authenticate user and verify coordinator or admin role (secure — uses getUser())
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) {
    throw new Error("Unauthorized. Please log in.");
  }

  const { data: userRoles } = await supabase
    .from("user_roles")
    .select("roles(code)")
    .eq("profile_id", user.id);

  const codes = (userRoles as { roles: { code: string } | { code: string }[] | null }[])?.map((ur) => {
    const r = Array.isArray(ur.roles) ? ur.roles[0] : ur.roles;
    return r?.code as string | undefined;
  }).filter(Boolean) ?? [];
  const isAuthorized = codes.includes("coordinator") || codes.includes("sys_admin");
  if (!isAuthorized) {
    throw new Error("Permission denied. Only coordinators or administrators can schedule defenses.");
  }

  // Calculate start and end times
  const startTime = new Date(input.scheduledAt);
  const endTime = new Date(startTime.getTime() + input.durationMinutes * 60 * 1000);
  const startTimeISO = startTime.toISOString();
  const endTimeISO = endTime.toISOString();

  // Prevent scheduling on weekends
  const dayOfWeek = startTime.getDay();
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    throw new Error("Scheduling is not permitted on weekends (Saturday/Sunday).");
  }

  // 2. Fetch student and adviser profile IDs of the project
  const { data: project, error: projErr } = await supabase
    .from("projects")
    .select("title, student_id, students(profile_id)")
    .eq("id", input.projectId)
    .single();

  if (projErr || !project) {
    throw new Error("Project not found.");
  }

  // Check Adviser Approval Gate
  const { data: doc } = await supabase
    .from("documents")
    .select("adviser_approval_status")
    .eq("project_id", input.projectId)
    .eq("stage_id", input.stageId)
    .maybeSingle();

  if (doc && doc.adviser_approval_status !== "approved") {
    throw new Error("Adviser Approval Gate: The uploaded manuscript for this stage has not been approved by the adviser yet. Scheduling is locked.");
  }

  const studentProfileId = Array.isArray(project.students)
    ? (project.students[0] as { profile_id?: string })?.profile_id
    : (project.students as { profile_id?: string })?.profile_id;

  const { data: adviserMember } = await supabase
    .from("project_members")
    .select("profile_id")
    .eq("project_id", input.projectId)
    .eq("member_role", "adviser")
    .maybeSingle();

  const adviserProfileId = adviserMember?.profile_id;

  // 3. Validation A: Room / Venue Conflict
  const { data: roomConflict } = await supabase
    .from("defense_schedules")
    .select("room, project_id, projects(title)")
    .eq("room", input.room)
    .lt("scheduled_at", endTimeISO)
    .gt("end_at", startTimeISO)
    .maybeSingle();

  if (roomConflict) {
    const conflictTitle = (roomConflict as { projects?: { title?: string } }).projects?.title || "another project";
    throw new Error(`Room Conflict: ${input.room} is already booked for "${conflictTitle}" during this timeslot.`);
  }

  // 4. Validation B: Panelist Conflicts
  if (input.panelistIds.length > 0) {


    // Wait! Let's check overlaps manually by joining with defense_schedules
    const { data: activeSchedules } = await supabase
      .from("defense_schedules")
      .select("project_id, stage_id, projects(title)")
      .lt("scheduled_at", endTimeISO)
      .gt("end_at", startTimeISO);

    if (activeSchedules && activeSchedules.length > 0) {
      const activeProjIds = activeSchedules.map(s => s.project_id);
      const { data: conflictingPanels } = await supabase
        .from("defense_panels")
        .select("profile_id, project_id, profiles(first_name, last_name)")
        .in("project_id", activeProjIds)
        .in("profile_id", input.panelistIds);

      if (conflictingPanels && conflictingPanels.length > 0) {
        const conf = conflictingPanels[0];
        const profiles = conf.profiles as { first_name?: string; last_name?: string } | { first_name?: string; last_name?: string }[];
        const p = Array.isArray(profiles) ? profiles[0] : profiles;
        const panelistName = `${p?.first_name} ${p?.last_name}`;
        throw new Error(`Panelist Conflict: Evaluator ${panelistName} is already assigned to a defense during this timeslot.`);
      }
    }
  }

  // 5. Validation C: Adviser Conflicts
  if (adviserProfileId) {
    const { data: activeSchedules } = await supabase
      .from("defense_schedules")
      .select("project_id")
      .lt("scheduled_at", endTimeISO)
      .gt("end_at", startTimeISO);

    if (activeSchedules && activeSchedules.length > 0) {
      const activeProjIds = activeSchedules.map(s => s.project_id);
      
      // Check if adviser is a panelist on conflicting slots
      const { data: adviserPanel } = await supabase
        .from("defense_panels")
        .select("profile_id, profiles(first_name, last_name)")
        .in("project_id", activeProjIds)
        .eq("profile_id", adviserProfileId)
        .maybeSingle();

      // Check if adviser is adviser on conflicting slots
      const { data: adviserMemberConflict } = await supabase
        .from("project_members")
        .select("profile_id")
        .in("project_id", activeProjIds)
        .eq("profile_id", adviserProfileId)
        .eq("member_role", "adviser")
        .maybeSingle();

      if (adviserPanel || adviserMemberConflict) {
        throw new Error(`Adviser Conflict: The project adviser is already scheduled for a defense during this timeslot.`);
      }
    }
  }

  // 6. Validation D: Student / Project Conflicts
  if (studentProfileId) {
    const { data: activeSchedules } = await supabase
      .from("defense_schedules")
      .select("project_id")
      .lt("scheduled_at", endTimeISO)
      .gt("end_at", startTimeISO);

    if (activeSchedules && activeSchedules.length > 0) {
      const activeProjIds = activeSchedules.map(s => s.project_id);

      const { data: studentProjectConflict } = await supabase
        .from("projects")
        .select("title")
        .in("id", activeProjIds)
        .eq("student_id", project.student_id)
        .maybeSingle();

      if (studentProjectConflict) {
        throw new Error(`Student Conflict: The student is already scheduled for a defense during this timeslot.`);
      }
    }
  }

  // 7. Insert Schedule
  const { data: newSchedule, error: schedError } = await supabase
    .from("defense_schedules")
    .insert({
      project_id: input.projectId,
      stage_id: input.stageId,
      scheduled_at: startTimeISO,
      end_at: endTimeISO,
      room: input.room,
      building: input.building,
      is_online: input.isOnline,
      meeting_url: input.meetingUrl,
      duration_minutes: input.durationMinutes,
      status: "scheduled",
      created_by: user.id
    })
    .select()
    .single();

  if (schedError || !newSchedule) {
    throw new Error(`Failed to create defense schedule: ${schedError?.message}`);
  }

  // 8. Assign Panelists in defense_panels
  if (input.panelistIds.length > 0) {
    const panelsToInsert = input.panelistIds.map(pid => ({
      project_id: input.projectId,
      stage_id: input.stageId,
      profile_id: pid,
      panel_role: "member" as const,
      assigned_by: user.id
    }));

    const { error: panelError } = await supabase
      .from("defense_panels")
      .insert(panelsToInsert);

    if (panelError) {
      console.error("Error inserting defense panels:", panelError);
    }
  }

  // 9. Write audit log
  await supabase.from("audit_logs").insert({
    profile_id: user.id,
    user_email: user.email || "unknown",
    user_role: "coordinator",
    action_type: "CREATE",
    module: "scheduling",
    entity_type: "defense_schedules",
    entity_id: newSchedule.id,
    description: `Created defense schedule for project "${project.title}" in room ${input.room}`,
    new_value: {
      schedule_id: newSchedule.id,
      project_id: input.projectId,
      stage_id: input.stageId,
      scheduled_at: startTimeISO,
      end_at: endTimeISO,
      room: input.room,
      panelist_count: input.panelistIds.length
    },
    ip_address: ip,
    user_agent: userAgent,
    academic_year: "2025-2026"
  });

  return newSchedule;
}

export interface UpdateScheduleInput {
  scheduleId: string;
  projectId: string;
  stageId: string;
  scheduledAt: string; // ISO String
  durationMinutes: number;
  room: string;
  building: string;
  isOnline: boolean;
  meetingUrl?: string;
  panelistIds: string[]; // Profile IDs
}

export async function updateDefenseScheduleAction(input: UpdateScheduleInput) {
  const supabase = await createClient();
  const headersList = await headers();
  const ip = headersList.get("x-forwarded-for")?.split(",")[0] || "127.0.0.1";
  const userAgent = headersList.get("user-agent") || "unknown";

  // 1. Authenticate user and verify coordinator or admin role (secure — uses getUser())
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) {
    throw new Error("Unauthorized. Please log in.");
  }

  const { data: userRoles } = await supabase
    .from("user_roles")
    .select("roles(code)")
    .eq("profile_id", user.id);

  const codes = (userRoles as { roles: { code: string } | { code: string }[] | null }[])?.map((ur) => {
    const r = Array.isArray(ur.roles) ? ur.roles[0] : ur.roles;
    return r?.code as string | undefined;
  }).filter(Boolean) ?? [];
  const isAuthorized = codes.includes("coordinator") || codes.includes("sys_admin");
  if (!isAuthorized) {
    throw new Error("Permission denied. Only coordinators or administrators can schedule defenses.");
  }

  // Calculate start and end times
  const startTime = new Date(input.scheduledAt);
  const endTime = new Date(startTime.getTime() + input.durationMinutes * 60 * 1000);
  const startTimeISO = startTime.toISOString();
  const endTimeISO = endTime.toISOString();

  // Prevent scheduling on weekends
  const dayOfWeek = startTime.getDay();
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    throw new Error("Scheduling is not permitted on weekends (Saturday/Sunday).");
  }

  // 2. Fetch student and adviser profile IDs of the project
  const { data: project, error: projErr } = await supabase
    .from("projects")
    .select("title, student_id, students(profile_id)")
    .eq("id", input.projectId)
    .single();

  if (projErr || !project) {
    throw new Error("Project not found.");
  }

  // Check Adviser Approval Gate
  const { data: doc } = await supabase
    .from("documents")
    .select("adviser_approval_status")
    .eq("project_id", input.projectId)
    .eq("stage_id", input.stageId)
    .maybeSingle();

  if (doc && doc.adviser_approval_status !== "approved") {
    throw new Error("Adviser Approval Gate: The uploaded manuscript for this stage has not been approved by the adviser yet. Scheduling is locked.");
  }

  const studentProfileId = Array.isArray(project.students)
    ? (project.students[0] as { profile_id?: string })?.profile_id
    : (project.students as { profile_id?: string })?.profile_id;

  const { data: adviserMember } = await supabase
    .from("project_members")
    .select("profile_id")
    .eq("project_id", input.projectId)
    .eq("member_role", "adviser")
    .maybeSingle();

  const adviserProfileId = adviserMember?.profile_id;

  // 3. Validation A: Room / Venue Conflict
  const { data: roomConflict } = await supabase
    .from("defense_schedules")
    .select("room, project_id, projects(title)")
    .eq("room", input.room)
    .neq("id", input.scheduleId) // Exclude current schedule!
    .lt("scheduled_at", endTimeISO)
    .gt("end_at", startTimeISO)
    .maybeSingle();

  if (roomConflict) {
    const conflictTitle = (roomConflict as { projects?: { title?: string } }).projects?.title || "another project";
    throw new Error(`Room Conflict: ${input.room} is already booked for "${conflictTitle}" during this timeslot.`);
  }

  // 4. Validation B: Panelist Conflicts
  if (input.panelistIds.length > 0) {
    const { data: activeSchedules } = await supabase
      .from("defense_schedules")
      .select("project_id, stage_id, id, projects(title)")
      .neq("id", input.scheduleId) // Exclude current schedule!
      .lt("scheduled_at", endTimeISO)
      .gt("end_at", startTimeISO);

    if (activeSchedules && activeSchedules.length > 0) {
      const activeProjIds = activeSchedules.map(s => s.project_id);
      const { data: conflictingPanels } = await supabase
        .from("defense_panels")
        .select("profile_id, project_id, profiles(first_name, last_name)")
        .in("project_id", activeProjIds)
        .in("profile_id", input.panelistIds);

      if (conflictingPanels && conflictingPanels.length > 0) {
        const conf = conflictingPanels[0];
        const profiles = conf.profiles as { first_name?: string; last_name?: string } | { first_name?: string; last_name?: string }[];
        const p = Array.isArray(profiles) ? profiles[0] : profiles;
        const panelistName = `${p?.first_name} ${p?.last_name}`;
        throw new Error(`Panelist Conflict: Evaluator ${panelistName} is already assigned to a defense during this timeslot.`);
      }
    }
  }

  // 5. Validation C: Adviser Conflicts
  if (adviserProfileId) {
    const { data: activeSchedules } = await supabase
      .from("defense_schedules")
      .select("project_id")
      .neq("id", input.scheduleId) // Exclude current schedule!
      .lt("scheduled_at", endTimeISO)
      .gt("end_at", startTimeISO);

    if (activeSchedules && activeSchedules.length > 0) {
      const activeProjIds = activeSchedules.map(s => s.project_id);
      
      const { data: adviserPanel } = await supabase
        .from("defense_panels")
        .select("profile_id")
        .in("project_id", activeProjIds)
        .eq("profile_id", adviserProfileId)
        .maybeSingle();

      const { data: adviserMemberConflict } = await supabase
        .from("project_members")
        .select("profile_id")
        .in("project_id", activeProjIds)
        .eq("profile_id", adviserProfileId)
        .eq("member_role", "adviser")
        .maybeSingle();

      if (adviserPanel || adviserMemberConflict) {
        throw new Error(`Adviser Conflict: The project adviser is already scheduled for a defense during this timeslot.`);
      }
    }
  }

  // 6. Validation D: Student / Project Conflicts
  if (studentProfileId) {
    const { data: activeSchedules } = await supabase
      .from("defense_schedules")
      .select("project_id")
      .neq("id", input.scheduleId) // Exclude current schedule!
      .lt("scheduled_at", endTimeISO)
      .gt("end_at", startTimeISO);

    if (activeSchedules && activeSchedules.length > 0) {
      const activeProjIds = activeSchedules.map(s => s.project_id);

      const { data: studentProjectConflict } = await supabase
        .from("projects")
        .select("title")
        .in("id", activeProjIds)
        .eq("student_id", project.student_id)
        .maybeSingle();

      if (studentProjectConflict) {
        throw new Error(`Student Conflict: The student is already scheduled for a defense during this timeslot.`);
      }
    }
  }

  // 7. Update Schedule details
  const { data: updatedSchedule, error: schedError } = await supabase
    .from("defense_schedules")
    .update({
      scheduled_at: startTimeISO,
      end_at: endTimeISO,
      room: input.room,
      building: input.building,
      is_online: input.isOnline,
      meeting_url: input.meetingUrl,
      duration_minutes: input.durationMinutes
    })
    .eq("id", input.scheduleId)
    .select()
    .single();

  if (schedError || !updatedSchedule) {
    throw new Error(`Failed to update defense schedule: ${schedError?.message}`);
  }

  // 8. Re-assign Panelists (delete old and insert new)
  await supabase
    .from("defense_panels")
    .delete()
    .eq("project_id", input.projectId)
    .eq("stage_id", input.stageId);

  if (input.panelistIds.length > 0) {
    const panelsToInsert = input.panelistIds.map(pid => ({
      project_id: input.projectId,
      stage_id: input.stageId,
      profile_id: pid,
      panel_role: "member" as const,
      assigned_by: user.id
    }));

    const { error: panelError } = await supabase
      .from("defense_panels")
      .insert(panelsToInsert);

    if (panelError) {
      console.error("Error inserting defense panels:", panelError);
    }
  }

  // 9. Write audit log
  await supabase.from("audit_logs").insert({
    profile_id: user.id,
    user_email: user.email || "unknown",
    user_role: "coordinator",
    action_type: "UPDATE",
    module: "scheduling",
    entity_type: "defense_schedules",
    entity_id: input.scheduleId,
    description: `Updated defense schedule for project "${project.title}" to room ${input.room}`,
    old_value: { schedule_id: input.scheduleId },
    new_value: {
      schedule_id: input.scheduleId,
      project_id: input.projectId,
      stage_id: input.stageId,
      scheduled_at: startTimeISO,
      end_at: endTimeISO,
      room: input.room,
      panelist_count: input.panelistIds.length
    },
    ip_address: ip,
    user_agent: userAgent,
    academic_year: "2025-2026"
  });

  return updatedSchedule;
}
