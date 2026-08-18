const fs = require('fs');
const path = 'src/lib/scheduler/actions.ts';

const addition = `
/**
 * Cancels a defense schedule and notifies all participants.
 * Only coordinators or sys_admin can cancel a schedule.
 * Sprint 3: wires defense_cancelled notification.
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
      : (project?.students as { profile_id?: string })?.profile_id;

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
`;

const current = fs.readFileSync(path, 'utf8');
fs.writeFileSync(path, current + addition);
console.log('DONE: appended cancelDefenseScheduleAction to', path);
