import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === "your_openai_api_key") {
    return Response.json({ error: "OpenAI API key not configured" }, { status: 503 });
  }

  const body = await request.json().catch(() => ({}));
  const { description } = body as { description?: string };

  if (!description?.trim()) {
    return Response.json({ error: "Description is required" }, { status: 400 });
  }

  try {
    const { OpenAI } = await import("openai");
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const chat = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `You are a service extraction assistant. Extract individual services/menu items and their prices from a business description.
Return ONLY a JSON object with a single key "services" containing an array of objects, each with:
- "name": string (service/item name, concise, title-case)
- "price": string (price as written, e.g. "$25", "From $50", "£30/hr", "Free", or "" if not mentioned)
- "description": string (a very short one-line description of this service, or "" if not clear)

Rules:
- Extract ONLY clearly mentioned services, treatments, products, or menu items.
- If no services are found, return { "services": [] }
- Do NOT invent services not mentioned in the text.
- Limit to a maximum of 15 services.
- Keep names short (2-5 words max).`,
        },
        {
          role: "user",
          content: `Extract services from this business description:\n\n${description.trim().slice(0, 3000)}`,
        },
      ],
    });

    const raw = chat.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(raw);
    const services = Array.isArray(parsed.services) ? parsed.services : [];

    return Response.json({ services });
  } catch (err) {
    console.error("[extract-services]", err);
    return Response.json({ error: "Failed to extract services. Please try again." }, { status: 500 });
  }
}
