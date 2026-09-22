"use server";

interface DemoCredentials {
  email: string;
  password: string;
}

const DEMO_ACCOUNTS: Record<string, DemoCredentials> = {
  student: {
    email: process.env.DEMO_STUDENT_EMAIL || "student1@aurora.test",
    password: process.env.DEMO_STUDENT_PASSWORD || "Panel123!",
  },
  adviser: {
    email: process.env.DEMO_ADVISER_EMAIL || "adviser1@aurora.test",
    password: process.env.DEMO_ADVISER_PASSWORD || "Panel123!",
  },
  panelist: {
    email: process.env.DEMO_PANELIST_EMAIL || "panelist1@aurora.test",
    password: process.env.DEMO_PANELIST_PASSWORD || "Panel123!",
  },
  coordinator: {
    email: process.env.DEMO_COORDINATOR_EMAIL || "coord@aurora.test",
    password: process.env.DEMO_COORDINATOR_PASSWORD || "Panel123!",
  },
  dean: {
    email: process.env.DEMO_DEAN_EMAIL || "erpadayao@parsu.edu.ph",
    password: process.env.DEMO_DEAN_PASSWORD || "Password123!",
  },
  admin: {
    email: process.env.DEMO_ADMIN_EMAIL || "admin@aurora.test",
    password: process.env.DEMO_ADMIN_PASSWORD || "Panel123!",
  },
};

export async function getDemoCredentialsAction(
  role: string
): Promise<{ success: boolean; email?: string; password?: string; error?: string }> {
  // Allow demo credentials unless explicitly disabled
  const isDemoDisabled = process.env.NEXT_PUBLIC_DISABLE_DEMO_LOGIN === "true";

  if (isDemoDisabled) {
    return { success: false, error: "Demo mode is disabled in this environment." };
  }

  const account = DEMO_ACCOUNTS[role];
  if (!account || !account.email || !account.password) {
    return { success: false, error: `Demo credentials for role "${role}" are not configured.` };
  }

  return {
    success: true,
    email: account.email,
    password: account.password,
  };
}
