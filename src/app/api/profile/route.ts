import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("profiles")
    .select("id, business_name, whatsapp_phone, onboarding_completed, created_at")
    .eq("id", user.id)
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ data });
}

export async function PUT(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { business_name, whatsapp_phone, onboarding_completed } = body;

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (business_name        !== undefined) update.business_name        = business_name;
  if (whatsapp_phone       !== undefined) update.whatsapp_phone       = whatsapp_phone;
  if (onboarding_completed !== undefined) update.onboarding_completed = onboarding_completed;

  const { data, error } = await supabase
    .from("profiles")
    .update(update)
    .eq("id", user.id)
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ data });
}
