import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("chat_sessions")
    .select("customer_phone, customer_name")
    .eq("profile_id", user.id)
    .order("last_message_at", { ascending: false });

  if (error) return Response.json({ error: error.message }, { status: 500 });

  // Deduplicate by phone
  const seen = new Set<string>();
  const unique = (data ?? []).filter((s) => {
    if (seen.has(s.customer_phone)) return false;
    seen.add(s.customer_phone);
    return true;
  });

  return Response.json(unique);
}
