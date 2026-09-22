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

    if (!input.password || input.password.length < 8) {
      return { success: false, error: "Password must be at least 8 characters long." };
    }

    const supabase = await createServiceClient();

    // 2. Pre-check: Duplicate institutional email
    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("id")
      .ilike("email", cleanEmail)
      .maybeSingle();

    if (existingProfile) {
      return {
        success: false,
        error: `An account with email "${cleanEmail}" is already registered. Please sign in or use the forgot password option.`,
      };
    }

    // 3. Pre-check: Duplicate student ID number
    const { data: existingStudent } = await supabase
      .from("students")
      .select("id")
      .eq("student_number", cleanStudentNumber)
      .maybeSingle();

    if (existingStudent) {
      return {
        success: false,
        error: `Student ID number "${cleanStudentNumber}" is already registered in AURORA. If this is your student ID, please sign in.`,
      };
    }

    // 4. Sanitize and validate Academic Hierarchy UUIDs
    const campusId = sanitizeUUID(input.campusId);
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

    const metaData: Record<string, unknown> = {
      first_name: input.firstName.trim(),
      last_name: input.lastName.trim(),
      role: "student", // Forced to student
      student_number: cleanStudentNumber,
      campus_id: campusId,
      college_id: collegeId,
      department_id: departmentId,
      program_id: programId,
      major_id: majorId,
      year_level: input.yearLevel ? Number(input.yearLevel) : 4,
      section: input.section?.trim().toUpperCase() || "A",
    };

    // 5. Use admin.createUser with email_confirm: true to avoid client-side SMTP email rate limits
    const { data, error } = await supabase.auth.admin.createUser({
      email: cleanEmail,
      password: input.password,
      email_confirm: true,
      user_metadata: metaData,
    });

    if (error) {
      const errMsg = error.message || "";
      if (errMsg.includes("Database error creating new user") || (error as { code?: string }).code === "unexpected_failure") {
        return {
          success: false,
          error: `Registration could not be completed because this Student ID or email is already registered in the system. Please sign in or verify your ID.`,
        };
      }
      if (errMsg.includes("already been registered") || (error as { code?: string }).code === "email_exists") {
        return {
          success: false,
          error: `An account with email "${cleanEmail}" is already registered. Please sign in.`,
        };
      }
      return { success: false, error: errMsg };
    }

    return { success: true, userId: data.user?.id };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Registration failed";
    return { success: false, error: message };
  }
}
