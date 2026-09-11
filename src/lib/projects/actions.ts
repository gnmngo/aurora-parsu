"use server";

import { createClient, createServiceClient } from "@/lib/supabase/server";
import { headers } from "next/headers";
import { currentAcademicYear } from "@/lib/utils/academic-year";
import { emitNotification } from "@/lib/notifications/emit";

export interface CreateProjectActionInput {
  title: string;
  teamName?: string;
  abstract?: string;
  adviserProfileId?: string;
  stageId?: string;
}

export interface CreateProjectActionResult {
  success: boolean;
  project?: {
    id: string;
    title: string;
    team_name?: string | null;
    join_code: string | null;
    current_stage_id: string | null;
  };
  error?: string;
}

/**
 * Creates a new research project on behalf of the authenticated student.
 * - Resolves student profile and academic hierarchy.
 * - Automatically assigns Stage 1 (Concept Defense) as current_stage_id.
 * - Links creator as 'student_leader'.
 * - Links chosen research adviser as 'adviser'.
 * - Emits notification to adviser and records audit log.
 */
export async function createProjectAction(
  input: CreateProjectActionInput
): Promise<CreateProjectActionResult> {
  const supabase = await createClient();
  const serviceClient = createServiceClient();
  const headersList = await headers();
  const ip = headersList.get("x-forwarded-for")?.split(",")[0] || "127.0.0.1";
  const userAgent = headersList.get("user-agent") || "unknown";

  try {
    // 1. Authenticate user
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();

    if (authErr || !user) {
      return { success: false, error: "Unauthorized. Please log in." };
    }

    if (!input.title || !input.title.trim()) {
      return { success: false, error: "Project title is required." };
    }

    // 2. Resolve student record (or create if missing)
    let { data: student } = await serviceClient
      .from("students")
      .select("id, profile_id, campus_id, college_id, department_id, program_id, major_id")
      .eq("profile_id", user.id)
      .maybeSingle();

    if (!student) {
      const { data: newStudent, error: createStudentErr } = await serviceClient
        .from("students")
        .insert({
          profile_id: user.id,
          year_level: 4,
        })
        .select()
        .single();

      if (createStudentErr || !newStudent) {
        return { success: false, error: "Failed to initialize student profile." };
      }
      student = newStudent;
    }

    if (!student) {
      return { success: false, error: "Student profile not available." };
    }

    // 3. Resolve default campus and department if not already present
    let resolvedCampusId = student.campus_id;
    let resolvedDeptId = student.department_id;
    let resolvedCollegeId = student.college_id;
    let resolvedProgId = student.program_id;

    if (!resolvedCampusId || !resolvedDeptId) {
      const { data: defaultDept } = await serviceClient
        .from("departments")
        .select("id, college_id, colleges(campus_id)")
        .limit(1)
        .maybeSingle();

      if (defaultDept) {
        resolvedDeptId = resolvedDeptId || defaultDept.id;
        resolvedCollegeId = resolvedCollegeId || defaultDept.college_id;
        const campus = Array.isArray(defaultDept.colleges)
          ? defaultDept.colleges[0]
          : defaultDept.colleges;
        resolvedCampusId =
          resolvedCampusId ||
          (campus as { campus_id: string })?.campus_id ||
          "00000000-0000-0000-0000-000000000001";

        // Save hierarchy back to student record
        await serviceClient
          .from("students")
          .update({
            campus_id: resolvedCampusId,
            college_id: resolvedCollegeId,
            department_id: resolvedDeptId,
          })
          .eq("id", student.id);
      } else {
        resolvedCampusId = resolvedCampusId || "00000000-0000-0000-0000-000000000001";
      }
    }

    // 4. Resolve Stage 1 (Concept Defense) if not explicitly provided
    let initialStageId = input.stageId;
    if (!initialStageId) {
      const { data: firstStage } = await serviceClient
        .from("defense_stages")
        .select("id")
        .order("sequence_order", { ascending: true })
        .limit(1)
        .maybeSingle();

      initialStageId = firstStage?.id || null;
    }

    // 5. Look up workflow template if program exists
    let workflowTemplateId: string | null = null;
    if (resolvedProgId) {
      const { data: workflows } = await serviceClient
        .from("workflow_templates")
        .select("id")
        .eq("program_id", resolvedProgId)
        .limit(1);
      workflowTemplateId = workflows?.[0]?.id ?? null;
    }

    // 6. Insert the Project
    const { data: project, error: insertProjErr } = await serviceClient
      .from("projects")
      .insert({
        title: input.title.trim(),
        team_name: input.teamName?.trim() || null,
        abstract: input.abstract?.trim() || null,
        student_id: student.id,
        campus_id: resolvedCampusId,
        college_id: resolvedCollegeId,
        department_id: resolvedDeptId,
        program_id: resolvedProgId,
        major_id: student.major_id,
        current_stage_id: initialStageId,
        status: "draft",
        academic_year: currentAcademicYear(),
        workflow_template_id: workflowTemplateId,
        created_by: user.id,
      })
      .select("id, title, team_name, join_code, current_stage_id")
      .single();

    if (insertProjErr || !project) {
      return {
        success: false,
        error: insertProjErr?.message || "Failed to create project record.",
      };
    }

    // 7. Insert student creator as 'student_leader' in project_members
    await serviceClient.from("project_members").upsert(
      {
        project_id: project.id,
        profile_id: user.id,
        member_role: "student_leader",
        is_primary: true,
      },
      { onConflict: "project_id,profile_id,member_role" }
    );

    // 8. If adviser was selected, link adviser into project_members
    if (input.adviserProfileId && input.adviserProfileId.trim()) {
      await serviceClient.from("project_members").upsert(
        {
          project_id: project.id,
          profile_id: input.adviserProfileId.trim(),
          member_role: "adviser",
          is_primary: false,
        },
        { onConflict: "project_id,profile_id,member_role" }
      );

      // Notify adviser
      const { data: creatorProfile } = await serviceClient
        .from("profiles")
        .select("first_name, last_name")
        .eq("id", user.id)
        .maybeSingle();

      const creatorName = creatorProfile
        ? `${creatorProfile.first_name} ${creatorProfile.last_name}`
        : "A student";

      await emitNotification({
        supabase: serviceClient,
        recipientProfileId: input.adviserProfileId.trim(),
        title: "Selected as Research Adviser",
        message: `${creatorName} has registered you as Research Adviser for their project "${project.title}".`,
        eventType: "project_joined",
        actionUrl: `/dashboard`,
        metadata: { projectId: project.id },
      });
    }

    // 9. Log audit trail
    await serviceClient.from("audit_logs").insert({
      profile_id: user.id,
      user_email: user.email || "unknown",
      user_role: "student",
      action_type: "CREATE",
      module: "projects",
      entity_type: "projects",
      entity_id: project.id,
      description: `Student created research project "${project.title}" (Join Code: ${project.join_code || "N/A"})`,
      new_value: {
        title: project.title,
        current_stage_id: initialStageId,
        adviser_assigned: Boolean(input.adviserProfileId),
      },
      ip_address: ip,
      user_agent: userAgent,
      academic_year: currentAcademicYear(),
    });

    return {
      success: true,
      project: {
        id: project.id,
        title: project.title,
        join_code: project.join_code,
        current_stage_id: project.current_stage_id,
      },
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unexpected error creating project.";
    return { success: false, error: msg };
  }
}

/**
 * Assigns or updates the research adviser for an existing project.
 */
export async function assignProjectAdviserAction(
  projectId: string,
  facultyProfileId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const serviceClient = createServiceClient();
  const headersList = await headers();
  const ip = headersList.get("x-forwarded-for")?.split(",")[0] || "127.0.0.1";
  const userAgent = headersList.get("user-agent") || "unknown";

  try {
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();

    if (authErr || !user) {
      return { success: false, error: "Unauthorized. Please log in." };
    }

    // 1. Verify caller has permission (must be student member of project or coordinator/admin)
    const { data: membership } = await serviceClient
      .from("project_members")
      .select("member_role")
      .eq("project_id", projectId)
      .eq("profile_id", user.id)
      .maybeSingle();

    const { data: userRoles } = await serviceClient
      .from("user_roles")
      .select("roles(code)")
      .eq("profile_id", user.id);

    const rolesList =
      userRoles?.map((r: any) => {
        const roleObj = Array.isArray(r.roles) ? r.roles[0] : r.roles;
        return roleObj?.code;
      }) || [];
    const isCoordinatorOrAdmin = rolesList.some((r) =>
      ["coordinator", "sys_admin"].includes(r as string)
    );
    const isStudentLeader =
      membership?.member_role === "student_leader" || membership?.member_role === "student";

    if (!isCoordinatorOrAdmin && !isStudentLeader) {
      return {
        success: false,
        error: "Permission denied. Only project members or coordinators can assign an adviser.",
      };
    }

    // 2. Fetch project details
    const { data: project, error: projErr } = await serviceClient
      .from("projects")
      .select("id, title")
      .eq("id", projectId)
      .single();

    if (projErr || !project) {
      return { success: false, error: "Project not found." };
    }

    // 3. Remove existing adviser member if any
    await serviceClient
      .from("project_members")
      .delete()
      .eq("project_id", projectId)
      .eq("member_role", "adviser");

    // 4. Insert new adviser
    const { error: insertAdviserErr } = await serviceClient
      .from("project_members")
      .insert({
        project_id: projectId,
        profile_id: facultyProfileId,
        member_role: "adviser",
        is_primary: false,
      });

    if (insertAdviserErr) {
      return { success: false, error: `Failed to link adviser: ${insertAdviserErr.message}` };
    }

    // 5. Emit notification to the newly assigned adviser
    const { data: assignerProfile } = await serviceClient
      .from("profiles")
      .select("first_name, last_name")
      .eq("id", user.id)
      .maybeSingle();

    const assignerName = assignerProfile
      ? `${assignerProfile.first_name} ${assignerProfile.last_name}`
      : "A team member";

    await emitNotification({
      supabase: serviceClient,
      recipientProfileId: facultyProfileId,
      title: "Assigned as Research Adviser",
      message: `${assignerName} designated you as the official Research Adviser for "${project.title}".`,
      eventType: "project_joined",
      actionUrl: `/dashboard`,
      metadata: { projectId: project.id },
    });

    // 6. Log audit trail
    await serviceClient.from("audit_logs").insert({
      profile_id: user.id,
      user_email: user.email || "unknown",
      user_role: isCoordinatorOrAdmin ? "coordinator" : "student",
      action_type: "UPDATE",
      module: "projects",
      entity_type: "project_members",
      entity_id: projectId,
      description: `Assigned research adviser (${facultyProfileId}) to project "${project.title}"`,
      ip_address: ip,
      user_agent: userAgent,
      academic_year: currentAcademicYear(),
    });

    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to assign adviser.";
    return { success: false, error: msg };
  }
}

/**
 * Emits a notification to the project's assigned adviser when a manuscript is uploaded.
 */
export async function notifyAdviserManuscriptUploadedAction(
  projectId: string,
  versionNumber: number
): Promise<void> {
  const supabase = await createClient();
  const serviceClient = createServiceClient();

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    // Fetch adviser for project
    const { data: adviserMember } = await serviceClient
      .from("project_members")
      .select("profile_id")
      .eq("project_id", projectId)
      .eq("member_role", "adviser")
      .maybeSingle();

    if (!adviserMember?.profile_id) return;

    // Fetch project title
    const { data: project } = await serviceClient
      .from("projects")
      .select("title, current_stage_id")
      .eq("id", projectId)
      .maybeSingle();

    const { data: uploaderProfile } = await serviceClient
      .from("profiles")
      .select("first_name, last_name")
      .eq("id", user.id)
      .maybeSingle();

    const uploaderName = uploaderProfile
      ? `${uploaderProfile.first_name} ${uploaderProfile.last_name}`
      : "A student";

    await emitNotification({
      supabase: serviceClient,
      recipientProfileId: adviserMember.profile_id,
      title: "New Manuscript Uploaded",
      message: `${uploaderName} submitted manuscript v${versionNumber} for "${project?.title || "your advised project"}" for review.`,
      eventType: "document_uploaded",
      actionUrl: `/workspace/${projectId}/${project?.current_stage_id || ""}`,
      metadata: { projectId, versionNumber },
    });
  } catch (err) {
    console.error("Failed to notify adviser of manuscript upload:", err);
  }
}

export interface FacultyOptionItem {
  profile_id: string;
  name: string;
  email: string;
  department?: string;
}

/**
 * Returns the list of approved university faculty members for adviser selection.
 * Uses service client to bypass RLS restrictions on un-joined profiles.
 */
export async function getApprovedFacultyListAction(): Promise<FacultyOptionItem[]> {
  const serviceClient = createServiceClient();
  try {
    const { data, error } = await serviceClient
      .from("faculty")
      .select("profile_id, specialization, profiles(first_name, last_name, email, status, department_id, departments(name))")
      .order("created_at", { ascending: true });

    if (error || !data) return [];

    const list: FacultyOptionItem[] = [];
    for (const item of data) {
      const prof = Array.isArray(item.profiles) ? item.profiles[0] : item.profiles;
      if (prof && prof.status === "approved") {
        const profAny = prof as Record<string, any>;
        const dept = Array.isArray(profAny?.departments) ? profAny.departments[0]?.name : profAny?.departments?.name;
        list.push({
          profile_id: item.profile_id,
          name: `${prof.first_name} ${prof.last_name}`,
          email: prof.email,
          department: dept || item.specialization || undefined,
        });
      }
    }
    return list.sort((a, b) => a.name.localeCompare(b.name));
  } catch (err) {
    console.error("Failed to load approved faculty list:", err);
    return [];
  }
}

export interface JoinProjectActionResult {
  success: boolean;
  project?: {
    id: string;
    title: string;
  };
  error?: string;
  alreadyMember?: boolean;
}

/**
 * Links an authenticated student to an existing research project via Join Code.
 * Uses service client to bypass RLS restrictions on projects before membership exists.
 */
export async function joinProjectAction(rawJoinCode: string): Promise<JoinProjectActionResult> {
  const supabase = await createClient();
  const serviceClient = createServiceClient();
  const headersList = await headers();
  const ip = headersList.get("x-forwarded-for")?.split(",")[0] || "127.0.0.1";
  const userAgent = headersList.get("user-agent") || "unknown";

  try {
    // 1. Authenticate user
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();

    if (authErr || !user) {
      return { success: false, error: "You must be signed in to join a project." };
    }

    const code = rawJoinCode.trim().toUpperCase().replace(/\s+/g, "");
    if (!code || code.length < 4) {
      return { success: false, error: "Please enter a valid join code." };
    }

    // 2. Look up the project by join code using serviceClient (bypasses RLS)
    const { data: project, error: searchErr } = await serviceClient
      .from("projects")
      .select("id, title, student_id, join_code")
      .eq("join_code", code)
      .maybeSingle();

    if (searchErr) {
      return { success: false, error: `Error searching for project: ${searchErr.message}` };
    }
    if (!project) {
      return { success: false, error: "Invalid join code. No project found with that code." };
    }

    // 3. Ensure student record exists for this user
    let { data: existingStudent } = await serviceClient
      .from("students")
      .select("id, profile_id")
      .eq("profile_id", user.id)
      .maybeSingle();

    if (!existingStudent) {
      await serviceClient.from("students").insert({
        profile_id: user.id,
        year_level: 4,
      });
    }

    // 4. Check for duplicate membership
    const { data: existingMember } = await serviceClient
      .from("project_members")
      .select("id, member_role")
      .eq("project_id", project.id)
      .eq("profile_id", user.id)
      .maybeSingle();

    if (existingMember) {
      return {
        success: true,
        alreadyMember: true,
        project: { id: project.id, title: project.title },
      };
    }

    // 5. Insert new project member as student / co-author
    const { error: joinErr } = await serviceClient.from("project_members").insert({
      project_id: project.id,
      profile_id: user.id,
      member_role: "student",
      is_primary: false,
    });

    if (joinErr) {
      return { success: false, error: `Failed to join project: ${joinErr.message}` };
    }

    // 6. Notify project leader and existing members
    const { data: userProfile } = await serviceClient
      .from("profiles")
      .select("first_name, last_name")
      .eq("id", user.id)
      .maybeSingle();

    const joinerName = userProfile
      ? `${userProfile.first_name} ${userProfile.last_name}`
      : "A new student";

    const { data: otherMembers } = await serviceClient
      .from("project_members")
      .select("profile_id")
      .eq("project_id", project.id)
      .neq("profile_id", user.id);

    if (otherMembers) {
      for (const m of otherMembers) {
        await emitNotification({
          supabase: serviceClient,
          recipientProfileId: m.profile_id,
          title: "New Team Member Joined",
          message: `${joinerName} joined "${project.title}" as a co-author.`,
          eventType: "project_joined",
          actionUrl: `/dashboard/my-project`,
          metadata: { projectId: project.id },
        });
      }
    }

    // 7. Log audit trail
    await serviceClient.from("audit_logs").insert({
      profile_id: user.id,
      user_email: user.email || "unknown",
      user_role: "student",
      action_type: "CREATE",
      module: "projects",
      entity_type: "project_members",
      entity_id: project.id,
      description: `${joinerName} joined project "${project.title}" using code "${code}"`,
      ip_address: ip,
      user_agent: userAgent,
      academic_year: currentAcademicYear(),
    });

    return {
      success: true,
      project: { id: project.id, title: project.title },
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "An unexpected error occurred.";
    return { success: false, error: msg };
  }
}

/**
 * Updates or assigns a team name for a research project.
 * Allows the student leader or linked project members to set/modify the team name.
 */
export async function updateProjectTeamNameAction(
  projectId: string,
  teamName: string
): Promise<{ success: boolean; team_name?: string | null; error?: string }> {
  const supabase = await createClient();
  const serviceClient = createServiceClient();
  const headersList = await headers();
  const ip = headersList.get("x-forwarded-for")?.split(",")[0] || "127.0.0.1";
  const userAgent = headersList.get("user-agent") || "unknown";

  try {
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();

    if (authErr || !user) {
      return { success: false, error: "Unauthorized. Please log in." };
    }

    if (!projectId) {
      return { success: false, error: "Project ID is required." };
    }

    // Verify user is either project creator or an active project member
    const [projRes, memberRes] = await Promise.all([
      serviceClient
        .from("projects")
        .select("id, title, created_by")
        .eq("id", projectId)
        .maybeSingle(),
      serviceClient
        .from("project_members")
        .select("id, member_role")
        .eq("project_id", projectId)
        .eq("profile_id", user.id)
        .maybeSingle(),
    ]);

    const project = projRes.data;
    if (!project) {
      return { success: false, error: "Project not found." };
    }

    const isAuthorized =
      project.created_by === user.id ||
      memberRes.data !== null;

    if (!isAuthorized) {
      return { success: false, error: "You are not authorized to update this project's team name." };
    }

    const cleanTeamName = teamName.trim() || null;

    const { error: updateErr } = await serviceClient
      .from("projects")
      .update({ team_name: cleanTeamName })
      .eq("id", projectId);

    if (updateErr) {
      return { success: false, error: updateErr.message };
    }

    // Audit log
    await serviceClient.from("audit_logs").insert({
      profile_id: user.id,
      user_email: user.email || "unknown",
      user_role: "student",
      action_type: "UPDATE",
      module: "projects",
      entity_type: "projects",
      entity_id: projectId,
      description: `Updated team name for "${project.title}" to "${cleanTeamName || "None"}"`,
      ip_address: ip,
      user_agent: userAgent,
      academic_year: currentAcademicYear(),
    });

    return { success: true, team_name: cleanTeamName };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "An unexpected error occurred.";
    return { success: false, error: msg };
  }
}
