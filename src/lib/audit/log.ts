import { createServiceClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { currentAcademicYear } from "@/lib/utils/academic-year";

export interface AuditLogInput {
  profile_id?: string | null;
  user_email?: string;
  user_role?: string;
  action_type: string;
  module: string;
  entity_type: string;
  entity_id?: string | null;
  description: string;
  old_value?: unknown;
  new_value?: unknown;
  ip_address?: string;
  user_agent?: string;
  academic_year?: string;
}

/**
 * Safely writes an entry to `audit_logs` without ever throwing an exception.
 * Uses `createServiceClient()` to bypass RLS policies where possible,
 * falling back to `fallbackClient`.
 *
 * If the database rejects the insertion (e.g. RLS 42501 when service key is absent),
 * a non-fatal warning is logged to the server console and the primary operation continues cleanly.
 */
export async function emitAuditLog(
  fallbackClient: SupabaseClient,
  input: AuditLogInput
): Promise<void> {
  try {
    const serviceClient = createServiceClient();
    const client = serviceClient || fallbackClient;

    const payload = {
      profile_id: input.profile_id || null,
      user_email: input.user_email || "unknown",
      user_role: input.user_role || "authenticated",
      action_type: input.action_type,
      module: input.module,
      entity_type: input.entity_type,
      entity_id: input.entity_id || null,
      description: input.description,
      old_value: input.old_value,
      new_value: input.new_value,
      ip_address: input.ip_address || "127.0.0.1",
      user_agent: input.user_agent || "unknown",
      academic_year: input.academic_year || currentAcademicYear(),
    };

    const { error } = await client.from("audit_logs").insert(payload);
    if (error) {
      console.warn("[emitAuditLog] Audit log insert notice (non-fatal):", error.message);
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn("[emitAuditLog] Audit log exception (non-fatal):", msg);
  }
}
