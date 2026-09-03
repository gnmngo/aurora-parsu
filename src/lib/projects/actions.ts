"use server";

import { createClient, createServiceClient } from "@/lib/supabase/server";
import { headers } from "next/headers";
import { currentAcademicYear } from "@/lib/utils/academic-year";
import { emitNotification } from "@/lib/notifications/emit";

export interface CreateProjectActionInput {
  title: string;
  abstract?: string;
  adviserProfileId?: string;
  stageId?: string;
}

export interface CreateProjectActionResult {
  success: boolean;
  project?: {
    id: string;
    title: string;
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
      .select("id, title, join_code, current_stage_id")
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
          is_primary: true,
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
        is_primary: true,
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
      .select("title")
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
      .select("profile_id, profiles(first_name, last_name, email, status)")
      .order("created_at", { ascending: true });

    if (error || !data) return [];

    const list: FacultyOptionItem[] = [];
    for (const item of data) {
      const prof = Array.isArray(item.profiles) ? item.profiles[0] : item.profiles;
      if (prof && prof.status === "approved") {
        list.push({
          profile_id: item.profile_id,
          name: `${prof.first_name} ${prof.last_name}`,
          email: prof.email,
        });
      }
    }
    return list;
  } catch (err) {
    console.error("Failed to load approved faculty list:", err);
    return [];
  }
}


