import { createClient } from "@/lib/supabase/server";
import { sendWhatsAppMessage } from "@/lib/whatsapp";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();
  const { status, cancel_reason } = body as { status: string; cancel_reason?: string };

  if (!["confirmed", "pending", "canceled", "completed"].includes(status)) {
    return Response.json({ error: "Invalid status" }, { status: 400 });
  }

  // Fetch appointment details for the WhatsApp message before updating
  const { data: appt } = await supabase
    .from("appointments")
    .select("customer_name, customer_phone, service, scheduled_at")
    .eq("id", id)
    .eq("profile_id", user.id)
    .single();

  // ── Update status + cancel_reason together (requires the column to exist) ──
  // If the column doesn't exist yet, fall back to status-only so the status
  // change always succeeds regardless of DB migration state.
  const fullPayload: Record<string, unknown> =
    status === "canceled"
      ? { status, cancel_reason: cancel_reason ?? null }
      : { status, cancel_reason: null };

  let { data, error } = await supabase
    .from("appointments")
    .update(fullPayload)
    .eq("id", id)
    .eq("profile_id", user.id)
    .select()
    .single();

  if (error) {
    // Retry with status-only (handles missing cancel_reason column)
    ({ data, error } = await supabase
      .from("appointments")
      .update({ status })
      .eq("id", id)
      .eq("profile_id", user.id)
      .select()
      .single());
  }

  if (error) return Response.json({ error: error.message }, { status: 500 });

  // Always include cancel_reason in the response so the UI can display it
  // immediately — even if the DB column doesn't exist yet.
  const responseData = {
    ...data,
    cancel_reason: status === "canceled" ? (cancel_reason ?? null) : null,
  };

  // ── Send WhatsApp notification immediately ──────────────────────────────
  if (appt) {
    const dt = new Date(appt.scheduled_at).toLocaleString("en-US", {
      weekday: "long", month: "long", day: "numeric",
      hour: "numeric", minute: "2-digit",
    });

    let message = "";
    if (status === "confirmed") {
      message =
        `Hi ${appt.customer_name}! 🎉 Your appointment for *${appt.service}* on *${dt}* has been *confirmed*. ` +
        `We look forward to seeing you! If you need to make any changes, please don't hesitate to reach out.`;
    } else if (status === "canceled") {
      const reasonLine = cancel_reason ? ` Reason: _${cancel_reason}_.` : "";
      message =
        `Hi ${appt.customer_name}, we regret to inform you that your appointment for *${appt.service}* on *${dt}* ` +
        `has been *canceled*.${reasonLine} Please contact us to reschedule at a more convenient time.`;
    }

    if (message) {
      try {
        await sendWhatsAppMessage(appt.customer_phone, message);
      } catch (err) {
        console.error("WhatsApp notification failed:", err);
      }
    }
  }

  return Response.json(responseData);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const { error } = await supabase
    .from("appointments")
    .delete()
    .eq("id", id)
    .eq("profile_id", user.id);

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return new Response(null, { status: 204 });
}
