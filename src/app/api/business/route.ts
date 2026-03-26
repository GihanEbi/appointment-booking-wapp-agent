import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("business_details")
    .select("*")
    .eq("profile_id", user.id)
    .single();

  // PGRST116 = no rows — not an error, just no data yet
  if (error && error.code !== "PGRST116") {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ data: data ?? null });
}

export async function PUT(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { description, ai_tone, working_hours } = body;

  const { data, error } = await supabase
    .from("business_details")
    .upsert(
      {
        profile_id: user.id,
        description: description ?? "",
        ai_tone: ai_tone ?? "Professional & Friendly",
        working_hours: working_hours ?? "9:00 AM – 7:00 PM",
      },
      { onConflict: "profile_id" }
    )
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ data });
}
