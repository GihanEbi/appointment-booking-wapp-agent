import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("availability_slots")
    .select("*")
    .eq("profile_id", user.id)
    .order("created_at", { ascending: true });

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ data });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { label, day_of_week, start_time, end_time } = body;

  if (!label || !day_of_week || !start_time || !end_time) {
    return Response.json({ error: "label, day_of_week, start_time, and end_time are required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("availability_slots")
    .insert({ profile_id: user.id, label, day_of_week, start_time, end_time })
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ data }, { status: 201 });
}
