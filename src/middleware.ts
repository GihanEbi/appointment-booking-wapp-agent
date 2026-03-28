import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Routes that bypass middleware entirely (API handlers do their own auth)
const BYPASS_PREFIXES = ["/api/", "/_next", "/favicon.ico"];

// Pages that are publicly accessible (unauthenticated)
const PUBLIC_PAGES = ["/login", "/staff/login", "/offline"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (BYPASS_PREFIXES.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  const role = (user?.app_metadata?.role as string) ?? "admin";
  const isStaff = role === "staff";
  const isStaffRoute = pathname.startsWith("/staff");
  const isPublic = PUBLIC_PAGES.includes(pathname);

  // Not logged in
  if (!user) {
    if (isPublic) return supabaseResponse;
    const url = request.nextUrl.clone();
    url.pathname = isStaffRoute ? "/staff/login" : "/login";
    return NextResponse.redirect(url);
  }

  // Logged in, on a login page → redirect to appropriate dashboard
  if (isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = isStaff ? "/staff/dashboard" : "/";
    return NextResponse.redirect(url);
  }

  // Staff user trying to access admin routes → send to staff dashboard
  if (isStaff && !isStaffRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/staff/dashboard";
    return NextResponse.redirect(url);
  }

  // Admin user trying to access staff portal → send to admin dashboard
  if (!isStaff && isStaffRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
