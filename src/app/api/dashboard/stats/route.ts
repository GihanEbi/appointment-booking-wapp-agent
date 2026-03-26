import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const [totalRes, confirmedRes, canceledRes, sessionsRes, upcomingRes] =
    await Promise.all([
      supabase
        .from("appointments")
        .select("id", { count: "exact", head: true })
        .eq("profile_id", user.id),
      supabase
        .from("appointments")
        .select("id", { count: "exact", head: true })
        .eq("profile_id", user.id)
        .eq("status", "confirmed"),
      supabase
        .from("appointments")
        .select("id", { count: "exact", head: true })
        .eq("profile_id", user.id)
        .eq("status", "canceled"),
      supabase
        .from("chat_sessions")
        .select("id", { count: "exact", head: true })
        .eq("profile_id", user.id),
      supabase
        .from("appointments")
        .select("id, customer_name, customer_phone, service, scheduled_at, status")
        .eq("profile_id", user.id)
        .neq("status", "canceled")
        .gte("scheduled_at", new Date().toISOString())
        .order("scheduled_at", { ascending: true })
        .limit(4),
    ]);

  return Response.json({
    total: totalRes.count ?? 0,
    confirmed: confirmedRes.count ?? 0,
    canceled: canceledRes.count ?? 0,
    sessions: sessionsRes.count ?? 0,
    upcoming: upcomingRes.data ?? [],
  });
}
