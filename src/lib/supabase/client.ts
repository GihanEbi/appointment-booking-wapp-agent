import { createBrowserClient } from "@supabase/ssr";

// Use in Client Components ("use client").
// Reads/writes cookies automatically via the browser.
// Once you run `supabase gen types typescript`, replace the generic with your Database type.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
