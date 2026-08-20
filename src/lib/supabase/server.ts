import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

/**
 * Defensively extracts a single clean JWT token if the environment variable
 * contains duplicates, leading/trailing quotes, or whitespace.
 */
function sanitizeJwtKey(rawKey?: string): string {
  if (!rawKey) return "";
  const trimmed = rawKey.trim().replace(/^["']|["']$/g, "");
  const parts = trimmed.split(/[\s,\n\r"']+/).filter(Boolean);
  const jwt = parts.find((p) => p.startsWith("eyJ") && p.split(".").length === 3);
  return jwt || parts[0] || trimmed;
}

export async function createClient() {
  const cookieStore = await cookies();
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim();
  const anonKey = sanitizeJwtKey(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // setAll can be called from Server Components where cookies are read-only
        }
      },
    },
  });
}

export function createServiceClient() {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim();
  const serviceKey = sanitizeJwtKey(process.env.SUPABASE_SERVICE_ROLE_KEY);

  return createSupabaseClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
