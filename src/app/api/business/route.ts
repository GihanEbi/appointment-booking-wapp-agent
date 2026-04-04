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
  const {
    description,
    ai_tone,
    working_hours,
    category,
    category_other,
    auto_confirm,
    allow_staff_pick,
    schedule_mode,
  } = body;

  const upsertPayload: Record<string, unknown> = {
    profile_id: user.id,
  };

  if (description       !== undefined) upsertPayload.description       = description;
  if (ai_tone           !== undefined) upsertPayload.ai_tone           = ai_tone;
  if (working_hours     !== undefined) upsertPayload.working_hours     = working_hours;
  if (category          !== undefined) upsertPayload.category          = category;
  if (category_other    !== undefined) upsertPayload.category_other    = category_other;
  if (auto_confirm      !== undefined) upsertPayload.auto_confirm      = auto_confirm;
  if (allow_staff_pick  !== undefined) upsertPayload.allow_staff_pick  = allow_staff_pick;
  if (schedule_mode     !== undefined) upsertPayload.schedule_mode     = schedule_mode;

  const { data, error } = await supabase
    .from("business_details")
    .upsert(upsertPayload, { onConflict: "profile_id" })
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ data });
}
