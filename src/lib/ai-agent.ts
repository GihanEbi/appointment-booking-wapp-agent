import { generateText, tool, stepCountIs } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";

// ── Supabase service client (bypasses RLS — server only) ──────────
function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

// ── Types ─────────────────────────────────────────────────────────
interface AgentParams {
  profileId: string;
  sessionId: string;
  customerPhone: string;
  customerName: string;
  incomingMessage: string;
}

interface StaffMember {
  id: string;
  name: string;
  bio: string;
}

// ── RAG: embed query → find relevant doc chunks ───────────────────
async function fetchRelevantDocs(
  profileId: string,
  query: string
): Promise<string> {
  if (!process.env.OPENAI_API_KEY) return "";

  try {
    const { OpenAI } = await import("openai");
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const embeddingRes = await client.embeddings.create({
      model: "text-embedding-3-small",
      input: query.slice(0, 8000),
    });
    const embedding = embeddingRes.data[0].embedding;

    const db = getServiceClient();
    const { data } = await db.rpc("match_training_docs", {
      query_embedding: embedding,
      match_profile_id: profileId,
      match_count: 4,
    });

    if (!data || data.length === 0) return "";

    return (data as { content: string; similarity: number }[])
      .filter((d) => d.similarity > 0.5)
      .map((d) => d.content)
      .join("\n\n---\n\n");
  } catch {
    return "";
  }
}

// ── Load agent context from DB ────────────────────────────────────
async function loadContext(profileId: string) {
  const db = getServiceClient();

  const now = new Date().toISOString();

  const [bizRes, slotsRes, announcementsRes, staffRes] = await Promise.all([
    db.from("business_details").select("*").eq("profile_id", profileId).single(),
    db.from("availability_slots").select("*").eq("profile_id", profileId),
    db
      .from("announcements")
      .select("title, message, scheduled_for")
      .eq("profile_id", profileId)
      .eq("status", "scheduled")
      .gt("scheduled_for", now)
      .order("scheduled_for", { ascending: true })
      .limit(10),
    db.auth.admin.listUsers({ perPage: 200 }),
  ]);

  // Filter staff members managed by this admin profile
  const staffMembers: StaffMember[] = (staffRes.data?.users ?? [])
    .filter(
      (u) =>
        u.app_metadata?.role === "staff" &&
        u.app_metadata?.managed_by === profileId &&
        (u.app_metadata?.is_active ?? true)
    )
    .map((u) => ({
      id: u.id,
      name: (u.user_metadata?.full_name as string) ?? u.email ?? "",
      bio: (u.user_metadata?.bio as string) ?? "",
    }));

  return {
    business: bizRes.data,
    slots: slotsRes.data ?? [],
    announcements: announcementsRes.data ?? [],
    staffMembers,
  };
}

// ── Load last N conversation messages for this session ────────────
async function loadHistory(sessionId: string, limit = 10) {
  const db = getServiceClient();
  const { data } = await db
    .from("chat_messages")
    .select("role, content")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: false })
    .limit(limit);

  return (data ?? [])
    .reverse()
    .map((m: { role: string; content: string }) => ({
      role: m.role === "ai" ? ("assistant" as const) : ("user" as const),
      content: m.content,
    }));
}

// ── Persist a message pair in the DB ─────────────────────────────
async function saveMessages(
  sessionId: string,
  userText: string,
  aiText: string
) {
  const db = getServiceClient();
  await db.from("chat_messages").insert([
    { session_id: sessionId, role: "user", content: userText },
    { session_id: sessionId, role: "ai", content: aiText },
  ]);

  await db
    .from("chat_sessions")
    .update({
      last_message: aiText.slice(0, 200),
      last_message_at: new Date().toISOString(),
      status: "active",
    })
    .eq("id", sessionId);
}

// ── Parse "09:00 AM" / "9:00 AM" slot times into { hour, minute } ─
function parseSlotTime(timeStr: string): { hour: number; minute: number } {
  const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!match) return { hour: 0, minute: 0 };
  let hour = parseInt(match[1], 10);
  const minute = parseInt(match[2], 10);
  const period = match[3].toUpperCase();
  if (period === "PM" && hour !== 12) hour += 12;
  if (period === "AM" && hour === 12) hour = 0;
  return { hour, minute };
}

// ── Get UTC offset string for a timezone e.g. "+05:30" ────────────
function getUTCOffset(timezone: string): string {
  try {
    const now = new Date();
    const local = new Date(now.toLocaleString("en-US", { timeZone: timezone }));
    const utc   = new Date(now.toLocaleString("en-US", { timeZone: "UTC" }));
    const diffMins = Math.round((local.getTime() - utc.getTime()) / 60000);
    const sign  = diffMins >= 0 ? "+" : "-";
    const abs   = Math.abs(diffMins);
    const hh    = String(Math.floor(abs / 60)).padStart(2, "0");
    const mm    = String(abs % 60).padStart(2, "0");
    return `${sign}${hh}:${mm}`;
  } catch {
    return "+00:00";
  }
}

// ── Get { hour, minute } of a UTC timestamp in a given timezone ───
function localHourMinute(
  isoStr: string,
  timezone: string
): { hour: number; minute: number } {
  const d = new Date(isoStr);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(d);
  const h = parts.find((p) => p.type === "hour")?.value ?? "0";
  const m = parts.find((p) => p.type === "minute")?.value ?? "0";
  return { hour: parseInt(h, 10), minute: parseInt(m, 10) };
}

// ── Get local date string "YYYY-MM-DD" of a UTC timestamp ─────────
function localDateStr(isoStr: string, timezone: string): string {
  return new Date(isoStr).toLocaleDateString("en-CA", { timeZone: timezone });
}

// ── Build system prompt ────────────────────────────────────────────
function buildSystemPrompt(
  context: Awaited<ReturnType<typeof loadContext>>,
  ragChunks: string,
  customerName: string,
  timezone: string,
  utcOffset: string
): string {
  const { business, slots, announcements, staffMembers } = context;

  const formattedSlots =
    slots.length > 0
      ? slots
          .map(
            (s: { day_of_week: string; start_time: string; end_time: string; label: string }) =>
              `• ${s.day_of_week}: ${s.start_time} – ${s.end_time} (${s.label})`
          )
          .join("\n")
      : "No availability configured yet.";

  const formattedAnnouncements =
    announcements.length > 0
      ? announcements
          .map((a: { title: string; message: string; scheduled_for: string }) => {
            const expires = new Date(a.scheduled_for).toLocaleDateString("en-US", {
              timeZone: timezone,
              weekday: "long", month: "short", day: "numeric",
            });
            return `• [Active until ${expires}] ${a.title}: ${a.message}`;
          })
          .join("\n")
      : "";

  const formattedStaff =
    staffMembers.length > 0
      ? staffMembers
          .map((s) => `• ${s.name} (ID: ${s.id})${s.bio ? ` — ${s.bio}` : ""}`)
          .join("\n")
      : "";

  const today = new Date().toLocaleDateString("en-US", {
    timeZone: timezone,
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return `You are a professional AI booking assistant for ${business?.description ? "this business" : "a business"}.
Your job is to help customers on WhatsApp with bookings, inquiries, and information.

## Business Description
${business?.description || "A professional service business."}

## Working Hours
${business?.working_hours || "Standard business hours."}

## Today's Date
${today}

## Business Timezone
${timezone} (UTC${utcOffset})
IMPORTANT: All appointment times are in this timezone. When generating ISO 8601 datetimes always append the offset: e.g. "2026-04-01T09:00:00${utcOffset}"

## Available Time Slots
${formattedSlots}

${
  formattedStaff
    ? `## Our Team
${formattedStaff}

Use this information to answer questions about staff members and their specialties. If a customer asks about a specific team member, refer to their bio above. When a customer wants to book with a specific staff member, use their ID in the staffMemberId field of bookAppointment.
`
    : ""
}${
  formattedAnnouncements
    ? `## Active Schedule Announcements (CRITICAL — read before checking availability)\n${formattedAnnouncements}\n\nIMPORTANT: These announcements represent real schedule changes. If an announcement says the business is closed, not working, or unavailable on a specific day or date, you MUST NOT offer any time slots for that day/date — even if slots exist in the availability configuration. Treat these as hard overrides.\n`
    : ""
}${
  ragChunks
    ? `## Knowledge Base (use this to answer service/pricing questions)\n${ragChunks}\n`
    : ""
}
## Customer
You are speaking with: ${customerName || "a customer"} (via WhatsApp)

## Booking Flow (IMPORTANT — follow exactly)
1. Customer asks to book → call checkExistingBooking first.
2. If no existing booking → ask for preferred date (and staff member if relevant), then call checkAvailability.
3. Before showing slots — check Active Schedule Announcements. If any announcement blocks the requested date/day, inform the customer and suggest alternative dates instead.
4. Customer picks an unblocked slot → call bookAppointment to record it.
4. After bookAppointment succeeds → tell the customer:
   "Your appointment request has been recorded! ✅ Our team will review and confirm it shortly. You'll receive a WhatsApp message once it's confirmed or if any changes are needed."
   NEVER say the appointment is "confirmed" — it is PENDING until the business owner reviews it.
5. Customer-initiated cancellations → use cancelAppointment after verifying the ID from checkExistingBooking.

## Instructions
- Be warm, professional, and concise. Use WhatsApp-friendly formatting (short paragraphs, emojis OK).
- ALWAYS call checkExistingBooking first whenever a customer mentions booking, appointments, or scheduling.
- If the customer already has an active upcoming appointment, show them their booking details and do NOT offer new slots. Only proceed if they explicitly ask to cancel first.
- Each customer may only hold one active appointment at a time.
- When a customer wants to book: ask for their preferred date (get a specific date, not just a day name), then call checkAvailability with that date in YYYY-MM-DD format.
- checkAvailability already filters out booked slots — only show what it returns.
- Use bookAppointment to record a booking — do NOT just say "I've booked you in" without calling the tool.
- Use cancelAppointment if a customer asks to cancel — confirm the appointment ID from checkExistingBooking first.
- If a question is outside your scope, politely say you'll pass it to the team.
- Keep responses under 300 characters where possible for WhatsApp readability.`;
}

// ── Main: run one agent turn ───────────────────────────────────────
export async function runAgentTurn(params: AgentParams): Promise<string> {
  const { profileId, sessionId, customerPhone, customerName, incomingMessage } = params;

  if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === "your_openai_api_key") {
    return "Hi! Our AI assistant is being configured. Please check back shortly! 😊";
  }

  const db = getServiceClient();
  const timezone  = process.env.BUSINESS_TIMEZONE ?? "UTC";
  const utcOffset = getUTCOffset(timezone);

  const [context, ragChunks, history] = await Promise.all([
    loadContext(profileId),
    fetchRelevantDocs(profileId, incomingMessage),
    loadHistory(sessionId),
  ]);

  const systemPrompt = buildSystemPrompt(context, ragChunks, customerName, timezone, utcOffset);

  // ── Tool definitions ──────────────────────────────────────────
  const tools = {
    checkExistingBooking: tool({
      description:
        "Check if this customer already has an upcoming appointment. ALWAYS call this first when a customer wants to book or asks about their appointment.",
      inputSchema: z.object({}),
      execute: async () => {
        const { data } = await db
          .from("appointments")
          .select("id, service, scheduled_at, status")
          .eq("profile_id", profileId)
          .eq("customer_phone", customerPhone)
          .in("status", ["confirmed", "pending"])
          .gte("scheduled_at", new Date().toISOString())
          .order("scheduled_at", { ascending: true })
          .limit(1)
          .single();

        if (!data) return "no_existing_booking";

        return `Customer already has an active booking — Service: ${data.service}, Date/Time: ${new Date(data.scheduled_at).toLocaleString()}, Status: ${data.status}, ID: ${data.id}. Do NOT book another slot. Remind them of this booking. They must cancel it first if they want to reschedule.`;
      },
    }),

    checkAvailability: tool({
      description:
        "Check which time slots are free on a specific date. Automatically excludes already-booked slots. Call this before booking after confirming the customer has no existing appointment.",
      inputSchema: z.object({
        date: z
          .string()
          .describe("Specific date in YYYY-MM-DD format e.g. '2026-04-01'"),
      }),
      execute: async (input) => {
        const { date } = input;

        const dayOfWeek = new Date(`${date}T12:00:00`).toLocaleDateString(
          "en-US",
          { weekday: "long" }
        );

        const { data: slots } = await db
          .from("availability_slots")
          .select("label, start_time, end_time")
          .eq("profile_id", profileId)
          .ilike("day_of_week", dayOfWeek);

        if (!slots || slots.length === 0) {
          const availableDays = context.slots
            .map((s: { day_of_week: string }) => s.day_of_week)
            .filter((v: string, i: number, a: string[]) => a.indexOf(v) === i)
            .join(", ");
          return `No availability configured for ${dayOfWeek} (${date}). Available days: ${availableDays || "none configured"}.`;
        }

        const prevDay = new Date(`${date}T12:00:00Z`);
        prevDay.setUTCDate(prevDay.getUTCDate() - 1);
        const nextDay = new Date(`${date}T12:00:00Z`);
        nextDay.setUTCDate(nextDay.getUTCDate() + 1);

        const { data: bookedAppts } = await db
          .from("appointments")
          .select("scheduled_at")
          .eq("profile_id", profileId)
          .in("status", ["confirmed", "pending"])
          .gte("scheduled_at", prevDay.toISOString().slice(0, 10) + "T00:00:00Z")
          .lte("scheduled_at", nextDay.toISOString().slice(0, 10) + "T23:59:59Z");

        const bookedTimes = (bookedAppts ?? [])
          .filter(
            (a: { scheduled_at: string }) =>
              localDateStr(a.scheduled_at, timezone) === date
          )
          .map((a: { scheduled_at: string }) =>
            localHourMinute(a.scheduled_at, timezone)
          );

        const freeSlots = slots.filter(
          (slot: { start_time: string; end_time: string; label: string }) => {
            const { hour, minute } = parseSlotTime(slot.start_time);
            return !bookedTimes.some(
              (bt: { hour: number; minute: number }) =>
                bt.hour === hour && bt.minute === minute
            );
          }
        );

        if (freeSlots.length === 0) {
          return `All slots on ${dayOfWeek} ${date} are fully booked. Please suggest a different date.`;
        }

        return `Available slots on ${dayOfWeek} ${date}:\n` +
          freeSlots
            .map(
              (s: { label: string; start_time: string; end_time: string }) =>
                `• ${s.label}: ${s.start_time} – ${s.end_time}`
            )
            .join("\n");
      },
    }),

    bookAppointment: tool({
      description:
        "Record an appointment request for the customer with PENDING status. Only call after confirming availability. The business owner will confirm or cancel it — do NOT tell the customer it is confirmed.",
      inputSchema: z.object({
        customerName: z.string().describe("Full name of the customer"),
        service: z.string().describe("Service they want e.g. 'Hair Styling'"),
        scheduledAt: z
          .string()
          .describe("ISO 8601 datetime e.g. '2026-03-28T10:00:00'"),
        staffMemberId: z
          .string()
          .optional()
          .describe("ID of the staff member to assign this appointment to. Only set if the customer specifically requested a team member by name."),
      }),
      execute: async (input) => {
        const { customerName: name, service, scheduledAt, staffMemberId } = input;

        // Resolve the staff member name for the notification message
        const assignedStaff = staffMemberId
          ? context.staffMembers.find((s) => s.id === staffMemberId)
          : null;

        const { data, error } = await db
          .from("appointments")
          .insert({
            profile_id: profileId,
            customer_phone: customerPhone,
            customer_name: name,
            service,
            scheduled_at: scheduledAt,
            status: "pending",
            assigned_user_id: staffMemberId ?? null,
          })
          .select("id")
          .single();

        if (error) return `Booking failed: ${error.message}`;

        const displayTime = new Date(scheduledAt).toLocaleString("en-US", {
          timeZone: timezone,
          weekday: "short",
          month: "short",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
        });

        const staffNote = assignedStaff ? ` with ${assignedStaff.name}` : "";

        // Notify the admin dashboard
        await db.from("notifications").insert({
          profile_id: profileId,
          type: "info",
          title: "New Appointment Request",
          message: `${name} requested ${service}${staffNote} for ${displayTime}. Awaiting your confirmation.`,
        });

        return `PENDING appointment recorded. ID: ${data.id}. ${name} has requested ${service}${staffNote} on ${displayTime}. The business owner must confirm it. Tell the customer their request is recorded and they will receive a WhatsApp message once the team confirms or updates them.`;
      },
    }),

    cancelAppointment: tool({
      description: "Cancel an existing appointment by appointment ID (customer-initiated cancellation).",
      inputSchema: z.object({
        appointmentId: z.string().describe("The UUID of the appointment to cancel"),
        reason: z.string().optional().describe("Reason the customer is canceling, if provided"),
      }),
      execute: async (input) => {
        const { appointmentId, reason } = input;
        const updatePayload: Record<string, unknown> = {
          status: "canceled",
          cancel_reason: reason ?? "Canceled by customer",
        };

        const { data, error } = await db
          .from("appointments")
          .update(updatePayload)
          .eq("id", appointmentId)
          .eq("profile_id", profileId)
          .select("customer_name, service, scheduled_at")
          .single();

        if (error || !data) {
          const { data: d2, error: e2 } = await db
            .from("appointments")
            .update({ status: "canceled" })
            .eq("id", appointmentId)
            .eq("profile_id", profileId)
            .select("customer_name, service, scheduled_at")
            .single();
          if (e2 || !d2) return "Could not find that appointment. Please check the ID.";
          Object.assign(data ?? {}, d2);
        }

        await db.from("notifications").insert({
          profile_id: profileId,
          type: "warning",
          title: "Appointment Canceled by Customer",
          message: `${data?.customer_name}'s ${data?.service} appointment was canceled by the customer.`,
        });

        return `Appointment for ${data?.customer_name} (${data?.service}) has been canceled as requested.`;
      },
    }),
  };

  // ── Call the AI ───────────────────────────────────────────────
  try {
    const { text } = await generateText({
      model: openai("gpt-4o-mini"),
      system: systemPrompt,
      messages: [
        ...history,
        { role: "user", content: incomingMessage },
      ],
      tools,
      stopWhen: stepCountIs(5),
    });

    const replyText = text.trim() || "I'm sorry, I didn't catch that. Could you rephrase?";

    await saveMessages(sessionId, incomingMessage, replyText);

    return replyText;
  } catch (err) {
    console.error("[ai-agent] generateText error:", err);
    return "I'm having trouble right now. Please try again in a moment! 🙏";
  }
}
