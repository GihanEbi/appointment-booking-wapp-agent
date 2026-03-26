import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Use in Server Components, Route Handlers, and Middleware.
// Reads and writes auth cookies so the session persists correctly.
// Once you run `supabase gen types typescript`, replace the generic with your Database type.
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // setAll is called from a Server Component where cookies
            // cannot be modified. The middleware will handle refreshing
            // the session, so this error is safe to ignore.
          }
        },
      },
    }
  );
}

// Service-role client — bypasses RLS. ONLY use server-side (Route Handlers).
// Never import this in any "use client" file.
export function createServiceClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll: () => [],
        setAll: () => {},
      },
    }
  );
}
