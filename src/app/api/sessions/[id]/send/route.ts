import { createClient } from "@/lib/supabase/server";
import { sendWhatsAppMessage } from "@/lib/whatsapp";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();
  const message: string = body.message?.trim();

  if (!message) {
    return Response.json({ error: "Message is required" }, { status: 400 });
  }

  // Verify session belongs to this profile
  const { data: session } = await supabase
    .from("chat_sessions")
    .select("id, customer_phone")
    .eq("id", id)
    .eq("profile_id", user.id)
    .single();

  if (!session) {
    return Response.json({ error: "Session not found" }, { status: 404 });
  }

  // Try to send via Twilio
  let twilioError: string | null = null;
  try {
    await sendWhatsAppMessage(session.customer_phone, message);
  } catch (err) {
    twilioError = err instanceof Error ? err.message : "Failed to send WhatsApp message";
  }

  // Always store in DB regardless of Twilio result
  await supabase.from("chat_messages").insert({
    session_id: id,
    role: "ai",
    content: message,
  });

  // Update session last_message
  await supabase
    .from("chat_sessions")
    .update({
      last_message: message.slice(0, 200),
      last_message_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (twilioError) {
    return Response.json({ ok: false, error: twilioError }, { status: 207 });
  }

  return Response.json({ ok: true });
}
