import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

/**
 * AURORA Route Proxy (formerly middleware.ts — renamed per Next.js 16 convention).
 *
 * Handles:
 * 1. Supabase SSR session refresh (keeps auth cookies fresh)
 * 2. Role-based route protection (/admin → coordinator/sys_admin only)
 * 3. Unauthenticated redirect to /login
 * 4. Profile status gate → sign out inactive accounts
 */
export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
