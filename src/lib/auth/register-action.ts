"use server";

import { createServiceClient } from "@/lib/supabase/server";

export interface RegisterUserInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role?: "student";
  number: string;
  campusId?: string | null;
  collegeId?: string | null;
  departmentId?: string | null;
  programId?: string | null;
  majorId?: string | null;
  yearLevel?: number | null;
  section?: string | null;
}

function sanitizeUUID(val?: string | null): string | null {
  if (!val || typeof val !== "string") return null;
  const trimmed = val.trim();
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(trimmed) ? trimmed : null;
}

async function cleanupStudentProjects(supabase: ReturnType<typeof createServiceClient>, userId: string) {
  const { data: pm } = await supabase
    .from("project_members")
    .select("project_id")
    .eq("profile_id", userId);
  const { data: stu } = await supabase
    .from("students")
    .select("id")
    .eq("profile_id", userId);
  const stuIds = (stu || []).map((s) => s.id);
  const { data: stuProjs } = stuIds.length
    ? await supabase.from("projects").select("id").in("student_id", stuIds)
    : { data: [] };

  const projIds = [
    ...new Set([
      ...(pm || []).map((x) => x.project_id),
      ...(stuProjs || []).map((x) => x.id),
    ].filter(Boolean)),
  ];

  for (const pid of projIds) {
    const { data: docs } = await supabase
      .from("documents")
      .select("id")
      .eq("project_id", pid);
    for (const d of docs || []) {
      await supabase.from("documents").update({ current_version_id: null }).eq("id", d.id);
      await supabase.from("annotations").delete().eq("document_id", d.id);
      await supabase.from("document_versions").delete().eq("document_id", d.id);
      await supabase.from("documents").delete().eq("id", d.id);
    }
    await supabase.from("project_members").delete().eq("project_id", pid);
    await supabase.from("defense_schedules").delete().eq("project_id", pid);
    await supabase.from("projects").delete().eq("id", pid);
  }
}

export async function registerUserAction(input: RegisterUserInput) {
  try {
    // 1. Strict Security Guard: Public registration is strictly student-only
    if (input.role && input.role !== "student") {
      return {
        success: false,
        error:
          "Security Policy Violation: Public self-registration is strictly reserved for students. Faculty, adviser, and coordinator accounts must be officially provisioned by the Research Coordinator.",
      };
    }

    const cleanEmail = input.email?.trim().toLowerCase();
    if (!cleanEmail) {
      return { success: false, error: "Institutional email address is required." };
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      return { success: false, error: "Please enter a valid institutional email address." };
    }

    const cleanStudentNumber = input.number?.trim();
    if (!cleanStudentNumber) {
      return { success: false, error: "Student ID number is required (e.g. 2022-xxxxx)." };
    }

    if (!input.firstName?.trim() || !input.lastName?.trim()) {
      return { success: false, error: "First and last name are required." };
    }

    const cleanPassword = input.password?.trim() || "";
    if (cleanPassword.length < 8) {
      return { success: false, error: "Password must be at least 8 characters long." };
    }

    const supabase = createServiceClient();

    // 2. Sanitize and validate Academic Hierarchy UUIDs
    const campusId = sanitizeUUID(input.campusId) || "00000000-0000-0000-0000-000000000001";
    const collegeId = sanitizeUUID(input.collegeId);
    const departmentId = sanitizeUUID(input.departmentId);
    const programId = sanitizeUUID(input.programId);
    const majorId = sanitizeUUID(input.majorId);

    if (!programId) {
      return {
        success: false,
        error: "Please select a valid Academic Program.",
      };
    }

    const firstName = input.firstName.trim();
    const lastName = input.lastName.trim();
    const yearLevel = input.yearLevel ? Number(input.yearLevel) : 4;
    const section = input.section?.trim().toUpperCase() || "A";

    const metaData: Record<string, unknown> = {
      first_name: firstName,
      last_name: lastName,
      role: "student",
      student_number: cleanStudentNumber,
      campus_id: campusId,
      college_id: collegeId,
      department_id: departmentId,
      program_id: programId,
      major_id: majorId,
      year_level: yearLevel,
      section,
    };

    // 3. Check if an account already exists with this email or student number
    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("id, email")
      .ilike("email", cleanEmail)
      .maybeSingle();

    const { data: existingStudent } = await supabase
      .from("students")
      .select("id, profile_id")
      .eq("student_number", cleanStudentNumber)
      .maybeSingle();

    // Check if the existing student number belongs to a different account
    if (existingStudent && existingProfile && existingStudent.profile_id !== existingProfile.id) {
      // Update the older student number so there is no unique constraint conflict
      await supabase
        .from("students")
        .update({ student_number: `${cleanStudentNumber}-OLD-${existingStudent.id.slice(0, 4)}` })
        .eq("id", existingStudent.id);
    } else if (existingStudent && !existingProfile) {
      await supabase
        .from("students")
        .update({ student_number: `${cleanStudentNumber}-OLD-${existingStudent.id.slice(0, 4)}` })
        .eq("id", existingStudent.id);
    }

    let userId: string | undefined = existingProfile?.id;

    if (userId) {
      // If gvmanago003.pbox@parsu.edu.ph is re-registering for the live demo, clean up any rehearsal projects so it starts fresh
      if (cleanEmail === "gvmanago003.pbox@parsu.edu.ph") {
        await cleanupStudentProjects(supabase, userId);
      }

      const { error: updErr } = await supabase.auth.admin.updateUserById(userId, {
        email: cleanEmail,
        password: cleanPassword,
        email_confirm: true,
        user_metadata: metaData,
      });

      if (updErr) {
        return { success: false, error: updErr.message };
      }
    } else {
      // Create new user via admin API with email_confirm: true
      const { data, error } = await supabase.auth.admin.createUser({
        email: cleanEmail,
        password: cleanPassword,
        email_confirm: true,
        user_metadata: metaData,
      });

      if (error) {
        // Fallback: check if user exists in auth.users without a public.profiles row
        const { data: authList } = await supabase.auth.admin.listUsers({ perPage: 1000 });
        const orphan = (authList?.users || []).find(
          (u) => (u.email || "").toLowerCase() === cleanEmail
        );
        if (orphan) {
          userId = orphan.id;
          await supabase.auth.admin.updateUserById(userId, {
            password: cleanPassword,
            email_confirm: true,
            user_metadata: metaData,
          });
        } else {
          return { success: false, error: error.message || "Registration failed." };
        }
      } else {
        userId = data.user?.id;
      }
    }

    if (!userId) {
      return { success: false, error: "Could not provision user ID." };
    }

    // 4. Explicitly upsert public.profiles, public.user_roles, and public.students
    // to guarantee 100% consistency even if DB triggers are bypassed
    await supabase.from("profiles").upsert({
      id: userId,
      email: cleanEmail,
      first_name: firstName,
      last_name: lastName,
      campus_id: campusId,
      college_id: collegeId,
      department_id: departmentId,
      status: "approved",
      updated_at: new Date().toISOString(),
    });

    const { data: studentRole } = await supabase
      .from("roles")
      .select("id")
      .eq("code", "student")
      .maybeSingle();

    if (studentRole?.id) {
      const { data: existingRoleLink } = await supabase
        .from("user_roles")
        .select("id")
        .eq("profile_id", userId)
        .eq("role_id", studentRole.id)
        .maybeSingle();

      if (!existingRoleLink) {
        await supabase.from("user_roles").insert({
          profile_id: userId,
          role_id: studentRole.id,
          assigned_by: userId,
        });
      }
    }

    const { data: existingStuForUser } = await supabase
      .from("students")
      .select("id")
      .eq("profile_id", userId)
      .maybeSingle();

    if (existingStuForUser) {
      await supabase
        .from("students")
        .update({
          student_number: cleanStudentNumber,
          campus_id: campusId,
          college_id: collegeId,
          department_id: departmentId,
          program_id: programId,
          major_id: majorId,
          year_level: yearLevel,
          section,
        })
        .eq("id", existingStuForUser.id);
    } else {
      await supabase.from("students").insert({
        profile_id: userId,
        student_number: cleanStudentNumber,
        campus_id: campusId,
        college_id: collegeId,
        department_id: departmentId,
        program_id: programId,
        major_id: majorId,
        year_level: yearLevel,
        section,
      });
    }

    return { success: true, userId };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Registration failed";
    return { success: false, error: message };
  }
}
