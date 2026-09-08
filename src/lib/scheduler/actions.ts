"use server";

import { createClient, createServiceClient } from "@/lib/supabase/server";
import { headers } from "next/headers";
import { currentAcademicYear } from "@/lib/utils/academic-year";
import { emitNotificationToMany } from "@/lib/notifications/emit";

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

  // Check Adviser Approval Gate (Hard Gate)
  if (!doc || doc.adviser_approval_status !== "approved") {
    throw new Error("Adviser Approval Gate: A manuscript for this defense stage must be uploaded and officially approved by the research adviser before a defense can be scheduled.");
  }

  const studentProfileId = Array.isArray(project.students)
    ? (project.students[0] as { profile_id?: string })?.profile_id
    : (project.students as { profile_id?: string })?.profile_id;

  const { data: adviserMember } = await supabase
    .from("project_members")
    .select("profile_id, profiles!project_members_profile_id_fkey(first_name, last_name)")
    .eq("project_id", input.projectId)
    .eq("member_role", "adviser")
    .maybeSingle();

  const adviserProfileId = adviserMember?.profile_id;

  // Conflict of Interest Guard: An adviser cannot be a panel evaluator for their own advisee
  if (adviserProfileId && input.panelistIds.includes(adviserProfileId)) {
    const prof = Array.isArray(adviserMember?.profiles)
      ? adviserMember.profiles[0]
      : adviserMember?.profiles;
    const adviserName = prof
      ? `${prof.first_name || ""} ${prof.last_name || ""}`.trim()
      : "The designated research adviser";
    throw new Error(
      `Conflict of Interest Violation: ${adviserName} is the assigned research adviser for this project. Academic policy strictly prohibits an adviser from serving on the evaluation panel for their own advisee's defense.`
    );
  }

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
        .select("profile_id, project_id, profiles!defense_panels_profile_id_fkey(first_name, last_name)")
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
        .select("profile_id, profiles!defense_panels_profile_id_fkey(first_name, last_name)")
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
    academic_year: currentAcademicYear()
  });

  // 10. Emit defense_scheduled notifications to all participants
  try {
    const { data: teamMembers } = await supabase
      .from("project_members")
      .select("profile_id")
      .eq("project_id", input.projectId)
      .in("member_role", ["student_leader", "student"]);

    const teamProfileIds = teamMembers?.map((m: any) => m.profile_id).filter(Boolean) || [];

    const recipientIds = [
      ...teamProfileIds,
      ...(studentProfileId ? [studentProfileId] : []),
      ...(adviserProfileId ? [adviserProfileId] : []),
      ...input.panelistIds,
    ].filter((id, i, arr) => arr.indexOf(id) === i); // deduplicate

    const formattedDate = new Date(startTimeISO).toLocaleString("en-US", {
      dateStyle: "long",
      timeStyle: "short",
    });

    if (recipientIds.length > 0) {
      await emitNotificationToMany(supabase, recipientIds, {
        title: "Defense Schedule Set",
        message: `Your defense for "${project.title}" has been scheduled on ${formattedDate} in ${input.room}${input.building ? ", " + input.building : ""}.`,
        eventType: "defense_scheduled",
        metadata: { scheduleId: newSchedule.id, projectId: input.projectId, stageId: input.stageId },
      });
    }
  } catch (notifEx: unknown) {
    console.error("[createDefenseScheduleAction] Notification failed:", notifEx instanceof Error ? notifEx.message : notifEx);
  }

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
    .select("profile_id, profiles!project_members_profile_id_fkey(first_name, last_name)")
    .eq("project_id", input.projectId)
    .eq("member_role", "adviser")
    .maybeSingle();

  const adviserProfileId = adviserMember?.profile_id;

  // Conflict of Interest Guard: An adviser cannot be a panel evaluator for their own advisee
  if (adviserProfileId && input.panelistIds.includes(adviserProfileId)) {
    const prof = Array.isArray(adviserMember?.profiles)
      ? adviserMember.profiles[0]
      : adviserMember?.profiles;
    const adviserName = prof
      ? `${prof.first_name || ""} ${prof.last_name || ""}`.trim()
      : "The designated research adviser";
    throw new Error(
      `Conflict of Interest Violation: ${adviserName} is the assigned research adviser for this project. Academic policy strictly prohibits an adviser from serving on the evaluation panel for their own advisee's defense.`
    );
  }

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
        .select("profile_id, project_id, profiles!defense_panels_profile_id_fkey(first_name, last_name)")
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
    academic_year: currentAcademicYear()
  });

  // 10. Emit defense_rescheduled notifications to all participants
  try {
    const studentProfileIdUpd = Array.isArray(project.students)
      ? (project.students[0] as { profile_id?: string })?.profile_id
      : (project.students as { profile_id?: string })?.profile_id;
    const { data: adviserMemberUpd } = await supabase
      .from("project_members")
      .select("profile_id")
      .eq("project_id", input.projectId)
      .eq("member_role", "adviser")
      .maybeSingle();
    const recipientIds = [
      ...(studentProfileIdUpd ? [studentProfileIdUpd] : []),
      ...(adviserMemberUpd?.profile_id ? [adviserMemberUpd.profile_id] : []),
      ...input.panelistIds,
    ].filter((id, i, arr) => arr.indexOf(id) === i);
    const formattedDate = new Date(startTimeISO).toLocaleString("en-US", {
      dateStyle: "long",
      timeStyle: "short",
    });
    if (recipientIds.length > 0) {
      await emitNotificationToMany(supabase, recipientIds, {
        title: "Defense Rescheduled",
        message: `Your defense for "${project.title}" has been rescheduled to ${formattedDate} in ${input.room}${input.building ? ", " + input.building : ""}.`,
        eventType: "defense_rescheduled",
        metadata: { scheduleId: input.scheduleId, projectId: input.projectId, stageId: input.stageId },
      });
    }
  } catch (notifEx: unknown) {
    console.error("[updateDefenseScheduleAction] Notification failed:", notifEx instanceof Error ? notifEx.message : notifEx);
  }

  return updatedSchedule;
}

/**
 * Cancels a defense schedule and notifies all participants.
 * Only coordinators or sys_admin can cancel a schedule.
 */
export async function cancelDefenseScheduleAction(
  scheduleId: string,
  projectId: string,
  stageId: string,
  reason?: string
) {
  const supabase = await createClient();
  const headersList = await headers();
  const ip = headersList.get("x-forwarded-for")?.split(",")[0] || "127.0.0.1";
  const userAgent = headersList.get("user-agent") || "unknown";

  // 1. Auth — only coordinators / sys_admin
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) throw new Error("Unauthorized. Please log in.");

  const { data: userRoles } = await supabase
    .from("user_roles")
    .select("roles(code)")
    .eq("profile_id", user.id);

  const codes = (userRoles as { roles: { code: string } | { code: string }[] | null }[])
    ?.map((ur) => {
      const r = Array.isArray(ur.roles) ? ur.roles[0] : ur.roles;
      return r?.code as string | undefined;
    }).filter(Boolean) ?? [];

  if (!codes.includes("coordinator") && !codes.includes("sys_admin")) {
    throw new Error("Permission denied. Only coordinators or administrators can cancel schedules.");
  }

  // 2. Fetch project + participant info before deleting
  const { data: project } = await supabase
    .from("projects")
    .select("title, student_id, students(profile_id)")
    .eq("id", projectId)
    .single();

  const { data: adviserMember } = await supabase
    .from("project_members")
    .select("profile_id")
    .eq("project_id", projectId)
    .eq("member_role", "adviser")
    .maybeSingle();

  const { data: panelMembers } = await supabase
    .from("defense_panels")
    .select("profile_id")
    .eq("project_id", projectId)
    .eq("stage_id", stageId);

  // 3. Delete the schedule
  const { error: deleteErr } = await supabase
    .from("defense_schedules")
    .delete()
    .eq("id", scheduleId);

  if (deleteErr) throw new Error("Failed to cancel defense schedule: " + deleteErr.message);

  // 4. Audit log
  await supabase.from("audit_logs").insert({
    profile_id: user.id,
    user_email: user.email || "unknown",
    user_role: "coordinator",
    action_type: "DELETE",
    module: "scheduling",
    entity_type: "defense_schedules",
    entity_id: scheduleId,
    description: "Defense schedule cancelled for project " + JSON.stringify(project?.title) + ". Reason: " + (reason || "None") + ".",
    old_value: { scheduleId, projectId, stageId },
    ip_address: ip,
    user_agent: userAgent,
    academic_year: currentAcademicYear(),
  });

  // 5. Notify all participants — non-blocking
  try {
    const studentProfileId = Array.isArray(project?.students)
      ? (project.students[0] as { profile_id?: string })?.profile_id
      : (project?.students as unknown as { profile_id?: string })?.profile_id;

    const panelistIds = (panelMembers ?? []).map((pm) => pm.profile_id);
    const recipientIds = [
      ...(studentProfileId ? [studentProfileId] : []),
      ...(adviserMember?.profile_id ? [adviserMember.profile_id] : []),
      ...panelistIds,
    ].filter((id, i, arr) => arr.indexOf(id) === i);

    if (recipientIds.length > 0) {
      await emitNotificationToMany(supabase, recipientIds, {
        title: "Defense Cancelled",
        message: "The defense schedule for " + JSON.stringify(project?.title || "your project") + " has been cancelled. Reason: " + (reason || "None") + ".",
        eventType: "defense_cancelled",
        metadata: { scheduleId, projectId, stageId, reason },
      });
    }
  } catch (notifEx: unknown) {
    console.error("[cancelDefenseScheduleAction] Notification failed:",
      notifEx instanceof Error ? notifEx.message : notifEx);
  }

  return { success: true };
}

export interface BatchCandidateProject {
  id: string;
  title: string;
  status: string;
  academicYear: string;
  collegeId?: string;
  departmentId?: string;
  programId?: string;
  college?: string;
  department?: string;
  program?: string;
  programCode?: string;
  studentName: string;
  studentEmail?: string;
  adviserName: string;
  adviserProfileId?: string;
  hasApprovedDoc: boolean;
  adviserApprovalStatus: string;
  existingSchedule: {
    id: string;
    scheduledAt: string;
    endAt?: string;
    room?: string;
    status: string;
  } | null;
}

export interface BatchScheduleSlotAllocation {
  projectId: string;
  stageId: string;
  scheduledAt: string; // ISO String
  endAt: string;       // ISO String
  durationMinutes: number;
}

export interface BatchScheduleInput {
  collegeId?: string;
  departmentId?: string;
  programId?: string;
  stageId: string;
  room: string;
  building: string;
  isOnline: boolean;
  meetingUrl?: string;
  panelistIds: string[];
  allocations: BatchScheduleSlotAllocation[];
  allowPendingAdviserApproval?: boolean;
}

/**
 * Returns full university academic hierarchy (colleges, departments, programs, stages)
 */
export async function getAcademicHierarchyAction() {
  const serviceClient = createServiceClient();
  const [collegesRes, deptsRes, progsRes, stagesRes] = await Promise.all([
    serviceClient.from("colleges").select("id, name, code").order("name"),
    serviceClient.from("departments").select("id, name, code, college_id").order("name"),
    serviceClient.from("programs").select("id, name, code, department_id").order("name"),
    serviceClient.from("defense_stages").select("id, name, code, sequence_order").order("sequence_order"),
  ]);

  return {
    colleges: collegesRes.data || [],
    departments: deptsRes.data || [],
    programs: progsRes.data || [],
    stages: stagesRes.data || [],
  };
}

/**
 * Retrieves eligible project candidates for batch defense scheduling
 */
export async function getBatchDefenseCandidatesAction(filters: {
  collegeId?: string;
  departmentId?: string;
  programId?: string;
  stageId?: string;
}): Promise<BatchCandidateProject[]> {
  const serviceClient = createServiceClient();
  let query = serviceClient
    .from("projects")
    .select(`
      id,
      title,
      status,
      academic_year,
      college_id,
      department_id,
      program_id,
      current_stage_id,
      colleges ( id, name, code ),
      departments ( id, name, code ),
      programs ( id, name, code ),
      students (
        id,
        student_number,
        profiles ( id, first_name, last_name, email )
      ),
      project_members (
        id,
        member_role,
        profiles!project_members_profile_id_fkey ( id, first_name, last_name, email )
      ),
      documents (
        id,
        stage_id,
        adviser_approval_status
      ),
      defense_schedules (
        id,
        stage_id,
        scheduled_at,
        end_at,
        room,
        status
      )
    `)
    .is("archived_at", null);

  if (filters.collegeId) {
    query = query.eq("college_id", filters.collegeId);
  }
  if (filters.departmentId) {
    query = query.eq("department_id", filters.departmentId);
  }
  if (filters.programId) {
    query = query.eq("program_id", filters.programId);
  }

  const { data, error } = await query.order("title");
  if (error) {
    console.error("[getBatchDefenseCandidatesAction] Error:", error);
    throw new Error(`Failed to load batch candidate projects: ${error.message}`);
  }

  return (data || []).map((proj: any) => {
    const studentProfile = proj.students?.profiles;
    const studentName = studentProfile
      ? `${studentProfile.first_name || ""} ${studentProfile.last_name || ""}`.trim()
      : "Unknown Student";

    const adviserMember = (proj.project_members as any[])?.find(
      (m: any) => m.member_role === "adviser"
    );
    const adviserProfile = adviserMember?.profiles;
    const adviserName = adviserProfile
      ? `${adviserProfile.first_name || ""} ${adviserProfile.last_name || ""}`.trim()
      : "No Adviser Assigned";
    const adviserProfileId = adviserMember?.profile_id || adviserProfile?.id || undefined;

    const docForStage = filters.stageId
      ? (proj.documents as any[])?.find((d: any) => d.stage_id === filters.stageId)
      : (proj.documents as any[])?.[0];

    const hasApprovedDoc = docForStage?.adviser_approval_status === "approved";
    const existingSched = filters.stageId
      ? (proj.defense_schedules as any[])?.find(
          (s: any) => s.stage_id === filters.stageId && s.status !== "cancelled"
        )
      : (proj.defense_schedules as any[])?.find(
          (s: any) => s.status !== "cancelled"
        );

    return {
      id: proj.id,
      title: proj.title,
      status: proj.status,
      academicYear: proj.academic_year,
      collegeId: proj.college_id,
      departmentId: proj.department_id,
      programId: proj.program_id,
      college: proj.colleges?.name,
      department: proj.departments?.name,
      program: proj.programs?.name,
      programCode: proj.programs?.code,
      studentName,
      studentEmail: studentProfile?.email,
      adviserName,
      adviserProfileId,
      hasApprovedDoc,
      adviserApprovalStatus: docForStage?.adviser_approval_status || "not_uploaded",
      existingSchedule: existingSched
        ? {
            id: existingSched.id,
            scheduledAt: existingSched.scheduled_at,
            endAt: existingSched.end_at,
            room: existingSched.room,
            status: existingSched.status,
          }
        : null,
    };
  });
}

/**
 * Batch schedules defense sessions for multiple projects across a dedicated venue & date window.
 */
export async function batchScheduleDefensesAction(input: BatchScheduleInput) {
  const supabase = await createClient();
  const headersList = await headers();
  const ip = headersList.get("x-forwarded-for")?.split(",")[0] || "127.0.0.1";
  const userAgent = headersList.get("user-agent") || "unknown";

  // 1. Authenticate user and verify coordinator or admin role
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
    throw new Error("Permission denied. Only coordinators or administrators can schedule batch defenses.");
  }

  if (!input.allocations || input.allocations.length === 0) {
    throw new Error("Please select at least one project to batch schedule.");
  }

  // 1.5 Conflict of Interest Check upfront for all allocations in the batch
  if (input.panelistIds && input.panelistIds.length > 0) {
    const allocProjIds = input.allocations.map((a) => a.projectId);
    const { data: batchAdvisers } = await supabase
      .from("project_members")
      .select("project_id, profile_id, projects(title), profiles!project_members_profile_id_fkey(first_name, last_name)")
      .in("project_id", allocProjIds)
      .eq("member_role", "adviser");

    if (batchAdvisers && batchAdvisers.length > 0) {
      const conflictingAdvisers = batchAdvisers.filter((adv) => input.panelistIds.includes(adv.profile_id));
      if (conflictingAdvisers.length > 0) {
        const first = conflictingAdvisers[0];
        const prof = Array.isArray(first.profiles) ? first.profiles[0] : first.profiles;
        const advName = prof ? `${prof.first_name || ""} ${prof.last_name || ""}`.trim() : "A research adviser";
        const proj = Array.isArray(first.projects) ? first.projects[0] : first.projects;
        const projTitle = proj?.title || "one of the selected projects";
        throw new Error(
          `Conflict of Interest Detected: ${advName} is the assigned research adviser for "${projTitle}". Academic policy strictly prohibits an adviser from evaluating their own advisee's defense. Please remove this faculty member from the panel committee or exclude this project from the batch.`
        );
      }
    }
  }

  const scheduledResults: any[] = [];

  // Process each allocation
  for (const alloc of input.allocations) {
    // 2. Resolve project details
    const { data: project } = await supabase
      .from("projects")
      .select("title, student_id, students(profile_id)")
      .eq("id", alloc.projectId)
      .single();

    if (!project) continue;

    const studentProfileId = Array.isArray(project.students)
      ? (project.students[0] as { profile_id?: string })?.profile_id
      : (project.students as { profile_id?: string })?.profile_id;

    const { data: adviserMember } = await supabase
      .from("project_members")
      .select("profile_id")
      .eq("project_id", alloc.projectId)
      .eq("member_role", "adviser")
      .maybeSingle();

    const adviserProfileId = adviserMember?.profile_id;

    // Remove any existing active schedule for this project and stage
    await supabase
      .from("defense_schedules")
      .delete()
      .eq("project_id", alloc.projectId)
      .eq("stage_id", alloc.stageId);

    // 3. Insert new schedule
    const { data: newSchedule, error: schedError } = await supabase
      .from("defense_schedules")
      .insert({
        project_id: alloc.projectId,
        stage_id: alloc.stageId,
        scheduled_at: alloc.scheduledAt,
        end_at: alloc.endAt,
        room: input.room,
        building: input.building,
        is_online: input.isOnline,
        meeting_url: input.isOnline ? input.meetingUrl : null,
        duration_minutes: alloc.durationMinutes,
        status: "scheduled",
        created_by: user.id,
      })
      .select()
      .single();

    if (schedError || !newSchedule) {
      console.error(`[batchScheduleDefensesAction] Error scheduling ${alloc.projectId}:`, schedError);
      continue;
    }

    // 4. Assign panel committee members (safely excluding project adviser if present)
    const safePanelistIds = input.panelistIds.filter((pid) => pid !== adviserProfileId);
    if (safePanelistIds.length > 0) {
      await supabase
        .from("defense_panels")
        .delete()
        .eq("project_id", alloc.projectId)
        .eq("stage_id", alloc.stageId);

      const panelsToInsert = safePanelistIds.map((pid) => ({
        project_id: alloc.projectId,
        stage_id: alloc.stageId,
        profile_id: pid,
        panel_role: "member" as const,
        assigned_by: user.id,
      }));

      await supabase.from("defense_panels").insert(panelsToInsert);
    }

    // 5. Update project status
    await supabase
      .from("projects")
      .update({
        status: "scheduled",
        current_stage_id: alloc.stageId,
      })
      .eq("id", alloc.projectId);

    // 6. Write audit log
    await supabase.from("audit_logs").insert({
      profile_id: user.id,
      user_email: user.email || "unknown",
      user_role: "coordinator",
      action_type: "CREATE",
      module: "scheduling",
      entity_type: "defense_schedules",
      entity_id: newSchedule.id,
      description: `Batch scheduled defense for "${project.title}" in room ${input.room}`,
      new_value: {
        schedule_id: newSchedule.id,
        project_id: alloc.projectId,
        stage_id: alloc.stageId,
        scheduled_at: alloc.scheduledAt,
        end_at: alloc.endAt,
        room: input.room,
        panelist_count: input.panelistIds.length,
        batch: true,
      },
      ip_address: ip,
      user_agent: userAgent,
      academic_year: currentAcademicYear(),
    });

    // 7. Emit notifications
    try {
      const { data: teamMembers } = await supabase
        .from("project_members")
        .select("profile_id")
        .eq("project_id", alloc.projectId)
        .in("member_role", ["student_leader", "student"]);

      const teamProfileIds = teamMembers?.map((m: any) => m.profile_id).filter(Boolean) || [];

      const recipientIds = [
        ...teamProfileIds,
        ...(studentProfileId ? [studentProfileId] : []),
        ...(adviserProfileId ? [adviserProfileId] : []),
        ...input.panelistIds,
      ].filter((id, i, arr) => arr.indexOf(id) === i);

      const formattedDate = new Date(alloc.scheduledAt).toLocaleString("en-US", {
        dateStyle: "long",
        timeStyle: "short",
      });

      if (recipientIds.length > 0) {
        await emitNotificationToMany(supabase, recipientIds, {
          title: "Defense Scheduled",
          message: `Your defense for "${project.title}" has been scheduled on ${formattedDate} at ${input.room}${input.building ? ", " + input.building : ""}.`,
          eventType: "defense_scheduled",
          metadata: { scheduleId: newSchedule.id, projectId: alloc.projectId, stageId: alloc.stageId, batch: true },
        });
      }
    } catch (notifErr) {
      console.error("[batchScheduleDefensesAction] Notification failed for project:", alloc.projectId, notifErr);
    }

    scheduledResults.push(newSchedule);
  }

  return {
    success: true,
    count: scheduledResults.length,
    schedules: scheduledResults,
  };
}

