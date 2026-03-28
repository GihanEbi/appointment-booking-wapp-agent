import { createClient, createServiceClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (user.app_metadata?.role !== "staff") {
    return Response.json({ error: "Not a staff account" }, { status: 403 });
  }

  // Use service client to bypass RLS — appointments table only allows profile_id = auth.uid()
  // but staff users have a different auth.uid() than the profile owner.
  const service = createServiceClient();
  const { data, error } = await service
    .from("appointments")
    .select("id, customer_name, customer_phone, service, scheduled_at, status, notes, cancel_reason, created_at, updated_at")
    .eq("assigned_user_id", user.id)
    .order("scheduled_at", { ascending: false });

  if (error) return Response.json([]);
  return Response.json(data ?? []);
}
