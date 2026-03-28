import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { sendWhatsAppMessage } from "@/lib/whatsapp";

export const runtime = "nodejs";
// Allow up to 5 min for large broadcasts
export const maxDuration = 300;

function getServiceDb() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  // Fetch the offer
  const { data: offer, error: offerErr } = await supabase
    .from("offers")
    .select("*")
    .eq("id", id)
    .eq("profile_id", user.id)
    .single();

  if (offerErr || !offer) {
    return Response.json({ error: "Offer not found" }, { status: 404 });
  }

  // Optional: allow caller to pass a custom message override and specific phones
  const body = await request.json().catch(() => ({}));
  const customMessage: string | undefined = body.message;
  const targetPhones: string[] | undefined = body.phones; // if provided, send only to these

  // Build the WhatsApp message
  const message = customMessage ?? buildOfferMessage(offer);

  const db = getServiceDb();

  // Resolve recipient list
  let recipients: { customer_phone: string }[];

  if (targetPhones && targetPhones.length > 0) {
    recipients = targetPhones.map((p) => ({ customer_phone: p }));
  } else {
    // Fetch all customer phones from chat_sessions (capped at 200 per broadcast)
    const { data: sessions, error: sessionsErr } = await db
      .from("chat_sessions")
      .select("customer_phone, customer_name")
      .eq("profile_id", user.id)
      .limit(200);

    if (sessionsErr) {
      return Response.json({ error: sessionsErr.message }, { status: 500 });
    }

    if (!sessions || sessions.length === 0) {
      return Response.json({
        sent: 0,
        failed: 0,
        message: "No customers found. Customers will appear here once they message you on WhatsApp.",
      });
    }
    recipients = sessions;
  }

  // Send messages (sequential to stay within Twilio rate limits)
  let sent = 0;
  let failed = 0;

  for (const r of recipients) {
    try {
      await sendWhatsAppMessage(r.customer_phone, message);
      sent++;
    } catch {
      failed++;
    }
  }

  // Increment sent_count on the offer
  await supabase
    .from("offers")
    .update({ sent_count: (offer.sent_count ?? 0) + sent })
    .eq("id", id);

  // Create a notification
  await db.from("notifications").insert({
    profile_id: user.id,
    type: "success",
    title: "Offer Broadcast Sent",
    message: `"${offer.title}" sent to ${sent} customer${sent !== 1 ? "s" : ""}${failed > 0 ? ` (${failed} failed)` : ""}.`,
  });

  return Response.json({ sent, failed });
}

function buildOfferMessage(offer: {
  title: string;
  discount: string;
  description: string;
  valid_until: string;
}): string {
  const lines = [
    `🎉 *${offer.title}*`,
    ``,
    offer.description,
    ``,
    `🏷️ *${offer.discount} OFF*`,
  ];

  if (offer.valid_until && offer.valid_until !== "Ongoing") {
    lines.push(`📅 Valid until: ${offer.valid_until}`);
  }

  lines.push(``, `Reply *BOOK* to reserve your slot! 📲`);

  return lines.join("\n");
}
