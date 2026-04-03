import { createClient, createServiceClient } from "@/lib/supabase/server";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (user.app_metadata?.role !== "staff") {
    return Response.json({ error: "Not a staff account" }, { status: 403 });
  }

  const { id } = await params;
  const { status } = await request.json();

  if (status !== "completed") {
    return Response.json({ error: "Staff can only mark appointments as completed" }, { status: 400 });
  }

  const service = createServiceClient();

  // Verify appointment is assigned to this staff member and is confirmed
  const { data: appt } = await service
    .from("appointments")
    .select("id, status")
    .eq("id", id)
    .eq("assigned_user_id", user.id)
    .single();

  if (!appt) return Response.json({ error: "Appointment not found" }, { status: 404 });
  if (appt.status !== "confirmed") {
    return Response.json({ error: "Only confirmed appointments can be marked as completed" }, { status: 400 });
  }

  const { data, error } = await service
    .from("appointments")
    .update({ status: "completed", updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("assigned_user_id", user.id)
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data);
}
