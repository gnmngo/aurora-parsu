"use server";

import { createClient, createServiceClient } from "@/lib/supabase/server";
import { headers } from "next/headers";
import { currentAcademicYear } from "@/lib/utils/academic-year";
import { emitNotification } from "@/lib/notifications/emit";
import { resolveWorkflowTemplate } from "@/lib/workflow/template-resolver";

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
      .select("id, profile_id, campus_id, college_id, department_id, program_id, major_id, year_level, section")
      .eq("profile_id", user.id)
      .maybeSingle();

    if (!student) {
      const { data: newStudent, error: createStudentErr } = await serviceClient
        .from("students")
        .insert({
          profile_id: user.id,
          year_level: 4,
          section: "A",
        })
        .select("id, profile_id, campus_id, college_id, department_id, program_id, major_id, year_level, section")
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
    const resolvedProgId = student.program_id;

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

    // 4. Resolve Workflow Template (Program-specific -> College-specific -> University Default)
    const resolvedWorkflow = await resolveWorkflowTemplate(serviceClient, {
      programId: resolvedProgId,
      collegeId: resolvedCollegeId,
    });
    const workflowTemplateId: string | null = resolvedWorkflow?.id || null;

    // 5. Resolve Initial Defense Stage (First stage of resolved workflow, or explicitly provided)
    let initialStageId = input.stageId;
    if (!initialStageId && resolvedWorkflow?.stages && resolvedWorkflow.stages.length > 0) {
      initialStageId = resolvedWorkflow.stages[0].id;
    } else if (!initialStageId) {
      const { data: firstStage } = await serviceClient
        .from("defense_stages")
        .select("id")
        .order("sequence_order", { ascending: true })
        .limit(1)
        .maybeSingle();

      initialStageId = firstStage?.id || null;
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

    // 8. Automatic Section Adviser Assignment for Concept & Title Defense stages
    let resolvedAdviserId = input.adviserProfileId?.trim() || null;

    if (!resolvedAdviserId && student.program_id) {
      const studentYear = student.year_level || 4;
      const studentSec = student.section || "A";

      // Look up designated Section Adviser for this class
      const { data: sectionMapping } = await serviceClient
        .from("program_sections")
        .select("adviser_id")
        .eq("program_id", student.program_id)
        .eq("year_level", studentYear)
        .eq("section", studentSec)
        .maybeSingle();

      if (sectionMapping?.adviser_id) {
        resolvedAdviserId = sectionMapping.adviser_id;
      } else {
        // Fallback: check any section in this program or default demo adviser
        const { data: fallbackSec } = await serviceClient
          .from("program_sections")
          .select("adviser_id")
          .eq("program_id", student.program_id)
          .limit(1)
          .maybeSingle();

        resolvedAdviserId = fallbackSec?.adviser_id || "6f9c27b6-5f28-4469-abc5-a2141e92b706";
      }
    }

    if (resolvedAdviserId) {
      await serviceClient.from("project_members").upsert(
        {
          project_id: project.id,
          profile_id: resolvedAdviserId,
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
        recipientProfileId: resolvedAdviserId,
        title: "Assigned as Section / Research Adviser",
        message: `${creatorName} registered project "${project.title}". You are assigned as the Section / Research Adviser for this defense stage.`,
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
        team_name: project.team_name,
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

    // 3. Insert new adviser first to ensure project never has zero advisers on failure
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

    // 4. Remove any previous adviser member (excluding the new adviser just linked)
    await serviceClient
      .from("project_members")
      .delete()
      .eq("project_id", projectId)
      .eq("member_role", "adviser")
      .neq("profile_id", facultyProfileId);

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

    // Role check: ensure user is a student
    const { data: callerRoles } = await serviceClient
      .from("user_roles")
      .select("roles(code)")
      .eq("profile_id", user.id);

    const roleCodes = (callerRoles || [])
      .map((ur: any) => (Array.isArray(ur.roles) ? ur.roles[0]?.code : ur.roles?.code))
      .filter(Boolean);

    if (roleCodes.length > 0 && !roleCodes.includes("student")) {
      return { success: false, error: "Only students are authorized to join research projects via join code." };
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
      const { data: newStudent, error: studentErr } = await serviceClient
        .from("students")
        .insert({
          profile_id: user.id,
          year_level: 4,
        })
        .select("id, profile_id")
        .single();

      if (studentErr || !newStudent) {
        return { success: false, error: `Failed to initialize student profile: ${studentErr?.message || "Unknown error"}` };
      }
      existingStudent = newStudent;
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

/**
 * Retrieves all Program Section mappings (Year Level, Section, and assigned Section Adviser).
 */
export async function getProgramSectionsAction(programId?: string) {
  const serviceClient = createServiceClient();
  let query = serviceClient
    .from("program_sections")
    .select(`
      id,
      program_id,
      year_level,
      section,
      academic_year,
      adviser_id,
      created_at,
      updated_at,
      programs ( id, code, name ),
      profiles:profiles!program_sections_adviser_id_fkey ( id, first_name, last_name, email )
    `)
    .order("year_level", { ascending: true })
    .order("section", { ascending: true });

  if (programId) {
    query = query.eq("program_id", programId);
  }

  const { data, error } = await query;
  if (error) {
    console.error("Error fetching program sections:", error.message);
    return [];
  }
  return data || [];
}

/**
 * Allows Coordinators or Admins to assign or reassign a Section Adviser for a specific program, year, and section.
 */
export async function upsertProgramSectionAction(input: {
  programId: string;
  yearLevel: number;
  section: string;
  adviserId: string;
  academicYear?: string;
}): Promise<{ success: boolean; error?: string }> {
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

    const { data: userRoles } = await serviceClient
      .from("user_roles")
      .select("roles(code)")
      .eq("profile_id", user.id);

    const roles = userRoles?.map((r: any) => (Array.isArray(r.roles) ? r.roles[0]?.code : r.roles?.code)) || [];
    if (!roles.includes("coordinator") && !roles.includes("sys_admin")) {
      return { success: false, error: "Permission denied. Only Research Coordinators or Admins can assign Section Advisers." };
    }

    const cleanSection = input.section.trim().toUpperCase();
    const ay = input.academicYear || currentAcademicYear();

    const { error: upsertErr } = await serviceClient.from("program_sections").upsert(
      {
        program_id: input.programId,
        year_level: input.yearLevel,
        section: cleanSection,
        academic_year: ay,
        adviser_id: input.adviserId,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "program_id,year_level,section,academic_year" }
    );

    if (upsertErr) {
      return { success: false, error: upsertErr.message };
    }

    // Audit log
    await serviceClient.from("audit_logs").insert({
      profile_id: user.id,
      user_email: user.email || "unknown",
      user_role: "coordinator",
      action_type: "UPDATE",
      module: "curriculum",
      entity_type: "program_sections",
      entity_id: input.programId,
      description: `Assigned Section Adviser (${input.adviserId}) to Program ${input.programId} Year ${input.yearLevel} Section ${cleanSection} (${ay})`,
      ip_address: ip,
      user_agent: userAgent,
      academic_year: ay,
    });

    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to assign section adviser.";
    return { success: false, error: msg };
  }
}

/**
 * Deletes a document version uploaded by mistake, provided it has not been officially endorsed by an adviser.
 * - Enforces authorization: user must be project participant (student leader/member) or coordinator/admin.
 * - Academic record protection: prevents deletion if adviser_approval_status === 'approved' or defense stage is completed.
 * - Storage cleanup: deletes the physical PDF from 'manuscripts' storage bucket.
 * - Database cleanup: deletes from document_versions (cascades to annotations & upload history).
 * - Version promotion: if deleted version was current, promotes the highest remaining version to is_current: true.
 * - If zero versions remain, marks the document status as 'draft' or removes it.
 * - Emits audit log and evaluation event.
 */
export async function deleteDocumentVersionAction(input: {
  versionId: string;
  projectId: string;
}): Promise<{ success: boolean; error?: string; remainingCount?: number }> {
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

    if (!input.versionId || !input.projectId) {
      return { success: false, error: "Missing required parameters." };
    }

    // 1. Fetch version and document details
    const { data: version, error: verErr } = await serviceClient
      .from("document_versions")
      .select("*, documents(*)")
      .eq("id", input.versionId)
      .maybeSingle();

    if (verErr || !version) {
      return { success: false, error: "Manuscript version not found or already deleted." };
    }

    const doc = version.documents as any;
    if (!doc || doc.project_id !== input.projectId) {
      return { success: false, error: "Manuscript does not belong to this project." };
    }

    // 2. Check authorization: project participant or coordinator / admin
    const { data: member } = await serviceClient
      .from("project_members")
      .select("id, member_role")
      .eq("project_id", input.projectId)
      .eq("profile_id", user.id)
      .maybeSingle();

    const { data: userRoles } = await serviceClient
      .from("user_roles")
      .select("roles(code)")
      .eq("profile_id", user.id);

    const roles = userRoles?.map((r: any) => (Array.isArray(r.roles) ? r.roles[0]?.code : r.roles?.code)) || [];
    const isStaff = roles.includes("coordinator") || roles.includes("sys_admin");
    const isProjectParticipant = Boolean(member) || doc.created_by === user.id;

    if (!isProjectParticipant && !isStaff) {
      return {
        success: false,
        error: "Permission denied. Only project members or research coordinators can remove uploaded documents.",
      };
    }

    // 3. Academic Integrity Guard:
    // If the document has already been officially endorsed by the adviser, block deletion!
    if (doc.adviser_approval_status === "approved") {
      return {
        success: false,
        error:
          "Cannot delete an officially endorsed manuscript. It is locked as part of the formal evaluation record. If you need to make changes, please upload a new revision instead.",
      };
    }

    // Also check if defense schedule for this stage has already been completed
    const { data: completedDefense } = await serviceClient
      .from("defense_schedules")
      .select("id, status")
      .eq("project_id", input.projectId)
      .eq("stage_id", doc.stage_id)
      .eq("status", "completed")
      .maybeSingle();

    if (completedDefense) {
      return {
        success: false,
        error: "Cannot delete a manuscript for a defense stage that has already been completed.",
      };
    }

    // 4. Delete physical file from Supabase Storage bucket ('manuscripts')
    if (version.storage_path) {
      const cleanPath = version.storage_path.replace(/^manuscripts\//, "").replace(/^\/+/, "");
      const { error: storageErr } = await serviceClient.storage
        .from("manuscripts")
        .remove([cleanPath]);

      if (storageErr) {
        console.error("Warning: Storage file deletion returned error:", storageErr.message);
      }
    }

    // 5. Delete version record from database (cascades to annotations & upload history)
    const { error: deleteErr } = await serviceClient
      .from("document_versions")
      .delete()
      .eq("id", input.versionId);

    if (deleteErr) {
      return { success: false, error: `Failed to remove document version: ${deleteErr.message}` };
    }

    // 6. Query remaining versions for this document
    const { data: remainingVersions } = await serviceClient
      .from("document_versions")
      .select("*")
      .eq("document_id", doc.id)
      .order("version_number", { ascending: false });

    const remainingCount = remainingVersions?.length || 0;

    if (remainingVersions && remainingVersions.length > 0) {
      // If the deleted version was is_current, promote the highest remaining version
      if (version.is_current) {
        const highestVer = remainingVersions[0];
        await serviceClient
          .from("document_versions")
          .update({ is_current: true })
          .eq("id", highestVer.id);

        await serviceClient
          .from("documents")
          .update({
            title: highestVer.file_name.replace(/\.[^/.]+$/, ""),
            status: "under_review",
          })
          .eq("id", doc.id);
      }
    } else {
      // If no versions remain, delete the empty document entry so the stage can be re-uploaded cleanly
      await serviceClient
        .from("documents")
        .delete()
        .eq("id", doc.id);

      // Check if project has any other active documents
      const { data: otherDocs } = await serviceClient
        .from("documents")
        .select("id")
        .eq("project_id", input.projectId)
        .limit(1);

      if (!otherDocs || otherDocs.length === 0) {
        await serviceClient
          .from("projects")
          .update({ status: "draft" })
          .eq("id", input.projectId);
      }
    }

    // 7. Audit log & evaluation event
    await serviceClient.from("audit_logs").insert({
      profile_id: user.id,
      user_email: user.email || "unknown",
      user_role: isStaff ? "coordinator" : "student",
      action_type: "DELETE",
      module: "documents",
      entity_type: "document_versions",
      entity_id: input.versionId,
      description: `Deleted manuscript version v${version.version_number} (${version.file_name}) from project ${input.projectId}`,
      ip_address: ip,
      user_agent: userAgent,
    });

    await serviceClient.from("evaluation_events").insert({
      project_id: input.projectId,
      stage_id: doc.stage_id,
      event_type: "document_version_deleted",
      payload: {
        document_id: doc.id,
        deleted_version_id: input.versionId,
        version_number: version.version_number,
        file_name: version.file_name,
        remaining_versions_count: remainingCount,
      },
    });

    return { success: true, remainingCount };
  } catch (err: unknown) {
    console.error("deleteDocumentVersionAction error:", err);
    const msg = err instanceof Error ? err.message : "Failed to delete manuscript version.";
    return { success: false, error: msg };
  }
}

