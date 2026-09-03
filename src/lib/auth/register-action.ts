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

    if (!input.number?.trim()) {
      return { success: false, error: "Student ID number is required." };
    }

    const supabase = await createServiceClient();

    const metaData: Record<string, unknown> = {
      first_name: input.firstName.trim(),
      last_name: input.lastName.trim(),
      role: "student", // Forced to student
      student_number: input.number.trim(),
      campus_id: input.campusId || null,
      college_id: input.collegeId || null,
      department_id: input.departmentId || null,
      program_id: input.programId || null,
      major_id: input.majorId || null,
    };

    // Use admin.createUser with email_confirm: true to avoid client-side SMTP email rate limits
    const { data, error } = await supabase.auth.admin.createUser({
      email: input.email.trim(),
      password: input.password,
      email_confirm: true,
      user_metadata: metaData,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, userId: data.user?.id };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Registration failed";
    return { success: false, error: message };
  }
}
