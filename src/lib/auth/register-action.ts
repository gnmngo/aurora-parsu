"use server";

import { createServiceClient } from "@/lib/supabase/server";

export interface RegisterUserInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: "student" | "adviser" | "panelist";
  number: string;
  campusId?: string | null;
  collegeId?: string | null;
  departmentId?: string | null;
  programId?: string | null;
  majorId?: string | null;
  specialization?: string;
}

export async function registerUserAction(input: RegisterUserInput) {
  try {
    const supabase = await createServiceClient();

    const metaData: Record<string, unknown> = {
      first_name: input.firstName,
      last_name: input.lastName,
      role: input.role,
    };

    if (input.role === "student") {
      metaData.student_number = input.number;
      metaData.campus_id = input.campusId || null;
      metaData.college_id = input.collegeId || null;
      metaData.department_id = input.departmentId || null;
      metaData.program_id = input.programId || null;
      metaData.major_id = input.majorId || null;
    } else {
      metaData.employee_number = input.number;
      metaData.specialization = input.specialization;
    }

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
