import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

/**
 * AURORA Route Proxy — Next.js 16 convention.
 *
 * IMPORTANT: Next.js 16 requires `proxy.ts` (not `middleware.ts`) and
 * a DEFAULT export named `proxy`. A named export is silently ignored.
 *
 * Handles:
 * 1. Supabase SSR session refresh (keeps auth cookies fresh on every request)
 * 2. Unauthenticated redirect → /login for protected routes
 * 3. Profile status gate → sign out pending/disabled accounts
 * 4. Admin/Coordinator route guard → /admin requires coordinator or sys_admin
 */
export default async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths EXCEPT:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     * - public assets (svg, png, jpg, jpeg, gif, webp)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
