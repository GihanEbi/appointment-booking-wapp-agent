// WhatsApp webhook — receives incoming messages from Twilio and runs the AI agent.
//
// SETUP CHECKLIST:
// 1. Fill TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_NUMBER in .env.local
// 2. Fill OPENAI_API_KEY in .env.local
// 3. Expose this route publicly (ngrok in dev): ngrok http 3000
// 4. Set WEBHOOK_BASE_URL to your ngrok URL in .env.local
// 5. In Twilio Console → Sandbox Settings → set webhook URL to:
//    https://<your-ngrok-url>/api/webhooks/whatsapp

import { type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { validateTwilioSignature, sendWhatsAppMessage } from "@/lib/whatsapp";
import { runAgentTurn } from "@/lib/ai-agent";

export const runtime = "nodejs";
export const maxDuration = 60; // seconds — Vercel Pro allows up to 300

// Supabase service client — no user session needed for webhook
function getDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

// ── Find which provider profile owns this Twilio number ───────────
async function resolveProfileId(twilioTo: string): Promise<string | null> {
  const db = getDb();
  const normalizedPhone = twilioTo.replace("whatsapp:", "");

  // Try to find profile by registered WhatsApp phone number
  const { data } = await db
    .from("profiles")
    .select("id")
    .eq("whatsapp_phone", normalizedPhone)
    .limit(1)
    .single();

  if (data?.id) return data.id;

  // Fallback: return the first/only profile (single-tenant mode)
  const { data: first } = await db
    .from("profiles")
    .select("id")
    .order("created_at", { ascending: true })
    .limit(1)
    .single();

  return first?.id ?? null;
}

// ── Upsert a chat session for this customer ───────────────────────
async function upsertSession(
  profileId: string,
  customerPhone: string,
  customerName: string
): Promise<string> {
  const db = getDb();

  const { data, error } = await db
    .from("chat_sessions")
    .upsert(
      {
        profile_id: profileId,
        customer_phone: customerPhone,
        customer_name: customerName || customerPhone,
        status: "active",
      },
      { onConflict: "profile_id,customer_phone" }
    )
    .select("id")
    .single();

  if (error || !data) throw new Error(`Session upsert failed: ${error?.message}`);
  return data.id;
}

// ── POST: receive incoming WhatsApp message from Twilio ───────────
export async function POST(request: NextRequest) {
  // 1. Parse Twilio's form-encoded body
  const formData = await request.formData();
  const params: Record<string, string> = {};
  formData.forEach((value, key) => {
    params[key] = value.toString();
  });

  const from    = params["From"]    ?? "";   // "whatsapp:+1234567890"
  const to      = params["To"]      ?? "";   // "whatsapp:+14155238886"
  const body    = params["Body"]    ?? "";   // Customer's message text
  const profile = params["ProfileName"] ?? ""; // WhatsApp profile display name

  // 2. Validate Twilio signature (skip in dev if AUTH_TOKEN not set)
  const authToken = process.env.TWILIO_AUTH_TOKEN ?? "";
  const isDevMode = authToken === "your_twilio_auth_token" || !authToken;

  if (!isDevMode) {
    const signature  = request.headers.get("x-twilio-signature") ?? "";
    const webhookUrl = `${process.env.WEBHOOK_BASE_URL}/api/webhooks/whatsapp`;

    if (!validateTwilioSignature(signature, webhookUrl, params)) {
      console.warn("[webhook] Invalid Twilio signature — request rejected");
      return new Response("Forbidden", { status: 403 });
    }
  }

  // 3. Ignore empty messages
  if (!body.trim() || !from) {
    return new Response("", { status: 200 });
  }

  const customerPhone = from.replace("whatsapp:", "");
  const customerName  = profile || customerPhone;

  try {
    // 4. Identify which provider profile this number belongs to
    const profileId = await resolveProfileId(to);
    if (!profileId) {
      console.error("[webhook] No provider profile found for number:", to);
      return new Response("", { status: 200 });
    }

    // 5. Upsert chat session
    const sessionId = await upsertSession(profileId, customerPhone, customerName);

    // 6. Run AI agent turn
    const replyText = await runAgentTurn({
      profileId,
      sessionId,
      customerPhone,
      customerName,
      incomingMessage: body,
    });

    // 7. Send the reply back to the customer via Twilio
    await sendWhatsAppMessage(from, replyText);

    // 8. Return 200 — Twilio requires this to confirm delivery
    return new Response("", { status: 200 });

  } catch (err) {
    console.error("[webhook] Unhandled error:", err);

    // Always send a graceful fallback so the customer isn't left hanging
    try {
      await sendWhatsAppMessage(
        from,
        "Sorry, something went wrong on our end. Please try again in a moment! 🙏"
      );
    } catch {
      // Ignore send error
    }

    return new Response("", { status: 200 }); // Always 200 to Twilio
  }
}

// ── GET: Twilio sandbox verification (not needed but harmless) ────
export async function GET() {
  return new Response("WhatsApp webhook is active.", { status: 200 });
}
