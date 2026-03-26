import twilio from "twilio";

function getClient() {
  return twilio(
    process.env.TWILIO_ACCOUNT_SID!,
    process.env.TWILIO_AUTH_TOKEN!
  );
}

// Send a plain WhatsApp text message via Twilio
export async function sendWhatsAppMessage(to: string, body: string) {
  const client = getClient();
  const normalizedTo = to.startsWith("whatsapp:") ? to : `whatsapp:${to}`;
  return client.messages.create({
    from: process.env.TWILIO_WHATSAPP_NUMBER!,
    to: normalizedTo,
    body,
  });
}

// Validate that an incoming POST is genuinely from Twilio.
// Pass the full public URL of the webhook route + all POST params.
export function validateTwilioSignature(
  signature: string,
  webhookUrl: string,
  params: Record<string, string>
): boolean {
  return twilio.validateRequest(
    process.env.TWILIO_AUTH_TOKEN!,
    signature,
    webhookUrl,
    params
  );
}
