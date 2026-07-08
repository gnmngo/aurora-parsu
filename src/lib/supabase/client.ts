import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

let supabaseInstance: SupabaseClient | null = null;

/**
 * Singleton browser Supabase client.
 * All client-side database access MUST use this function.
 */
export function createClient(): SupabaseClient {
  if (supabaseInstance) {
    return supabaseInstance;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY"
    );
  }

  supabaseInstance = createBrowserClient(url, anonKey);

  return supabaseInstance;
}

/** Same singleton instance — convenience alias for debug tooling */
export const supabase = createClient();
