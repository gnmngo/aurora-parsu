import type { PostgrestError } from "@supabase/supabase-js";

/** Serialize Supabase/PostgREST errors for logging (avoids empty `{}` in console) */
export function formatSupabaseError(err: unknown): string {
  if (!err) {
    return "Unknown error (null/undefined)";
  }

  if (typeof err === "string") {
    return err;
  }

  if (err instanceof Error) {
    const pg = err as PostgrestError;
    return JSON.stringify(
      {
        name: err.name,
        message: err.message,
        code: pg.code ?? null,
        details: pg.details ?? null,
        hint: pg.hint ?? null,
      },
      null,
      2
    );
  }

  if (typeof err === "object") {
    const e = err as Record<string, unknown>;
    return JSON.stringify(
      {
        message: e.message ?? null,
        code: e.code ?? null,
        details: e.details ?? null,
        hint: e.hint ?? null,
      },
      null,
      2
    );
  }

  return String(err);
}

export function logSupabaseError(context: string, err: unknown): void {
  console.error(`[${context}]`, formatSupabaseError(err));
}
