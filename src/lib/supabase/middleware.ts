import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const pathname = request.nextUrl.pathname;
  const isDemoMode =
    process.env.NEXT_PUBLIC_DEMO_MODE === "true" ||
    !process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (isDemoMode) {
    return supabaseResponse;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  console.log("MIDDLEWARE - Pathname:", pathname);
  console.log("MIDDLEWARE SESSION - User ID:", user?.id || "None");

  const isAuthRoute =
    pathname.startsWith("/login") ||
    pathname.startsWith("/forgot-password") ||
    pathname.startsWith("/auth");
    
  const isProtectedRoute =
    (pathname.startsWith("/dashboard") ||
    pathname.startsWith("/workspace") ||
    pathname.startsWith("/admin")) &&
    pathname !== "/workspace/demo";

  // 1. Session check
  if (!user && isProtectedRoute) {
    console.log("MIDDLEWARE - No user on protected route. Redirecting to /login");
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  if (user && isAuthRoute) {
    console.log("MIDDLEWARE - Authenticated user on auth route. Redirecting to /dashboard");
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  // 2. Profile Status Check & Route Guard
  if (user && isProtectedRoute) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("status")
      .eq("id", user.id)
      .single();

    console.log("MIDDLEWARE PROFILE - fetched profile:", profile);
    console.log("MIDDLEWARE STATUS - profile?.status:", profile?.status);

    if (profile && profile.status !== "approved") {
      console.log("MIDDLEWARE - User status is not approved. Signing out and redirecting to /login");
      // Sign out on unauthorized access and redirect to login with error parameter
      await supabase.auth.signOut();
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("error", profile.status);
      return NextResponse.redirect(url);
    }

    // 3. Admin / Coordinator Route Guard
    if (pathname.startsWith("/admin")) {
      const { data: userRoles } = await supabase
        .from("user_roles")
        .select("roles(code)")
        .eq("profile_id", user.id);

      console.log("MIDDLEWARE ROLE - user_roles result:", JSON.stringify(userRoles));

      const roles = userRoles?.map((ur: { roles: { code: string } | { code: string }[] | null }) => {
        const role = Array.isArray(ur.roles) ? ur.roles[0] : ur.roles;
        return role?.code;
      }).filter(Boolean) || [];

      console.log("MIDDLEWARE ROLE - Extracted codes:", roles);
      const hasAdminAccess = roles.some((r) =>
        r && ["sys_admin", "coordinator"].includes(r)
      );

      if (!hasAdminAccess) {
        console.log("MIDDLEWARE - No admin access for roles. Redirecting to /dashboard");
        const url = request.nextUrl.clone();
        url.pathname = "/dashboard";
        return NextResponse.redirect(url);
      }
    }
  }

  return supabaseResponse;
}
