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

  const [profileRes, bizRes, slotsRes, servicesRes, announcementsRes, staffRes] = await Promise.all([
    db.from("profiles").select("business_name").eq("id", profileId).single(),
    db.from("business_details").select("*").eq("profile_id", profileId).single(),
    db.from("availability_slots").select("*").eq("profile_id", profileId).order("day_of_week").order("start_time"),
    db.from("services").select("name, price, description").eq("profile_id", profileId).order("sort_order").order("created_at"),
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
    businessName: (profileRes.data?.business_name as string | null) ?? null,
    business: bizRes.data,
    slots: slotsRes.data ?? [],
    services: (servicesRes.data ?? []) as { name: string; price: string | null; description: string | null }[],
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

// ── Parse slot times — handles both "13:00" (24h) and "1:00 PM" (12h) ─
function parseSlotTime(timeStr: string): { hour: number; minute: number } {
  if (!timeStr) return { hour: 0, minute: 0 };
  // 12-hour format: "9:00 AM" / "1:00 PM"
  const ampm = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (ampm) {
    let hour = parseInt(ampm[1], 10);
    const minute = parseInt(ampm[2], 10);
    const period = ampm[3].toUpperCase();
    if (period === "PM" && hour !== 12) hour += 12;
    if (period === "AM" && hour === 12) hour = 0;
    return { hour, minute };
  }
  // 24-hour format: "13:00" or "13:00:00"
  const parts = timeStr.split(":").map(Number);
  return { hour: parts[0] ?? 0, minute: parts[1] ?? 0 };
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
  const { businessName, business, slots, services, announcements, staffMembers } = context;

  const name = businessName || business?.description?.split(".")[0] || "this business";

  const formattedSlots =
    slots.length > 0
      ? slots
          .map(
            (s: { day_of_week: string; start_time: string; end_time: string; label: string }) =>
              `• ${s.day_of_week}: ${s.start_time} – ${s.end_time} (${s.label})`
          )
          .join("\n")
      : "No availability configured yet.";

  const formattedServices =
    services.length > 0
      ? services
          .map((s) => {
            let line = `• ${s.name}`;
            if (s.price) line += ` — ${s.price}`;
            if (s.description) line += `\n  ${s.description}`;
            return line;
          })
          .join("\n")
      : "";

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
          .map((s, i) => `${i + 1}. ${s.name}${s.bio ? ` — ${s.bio}` : ""} (ID: ${s.id})`)
          .join("\n")
      : "";

  const today = new Date().toLocaleDateString("en-US", {
    timeZone: timezone,
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const confirmationPolicy = business?.auto_confirm
    ? "Appointments are AUTO-CONFIRMED immediately upon booking — tell the customer their appointment is confirmed."
    : "Appointments are PENDING until the business owner reviews them. After booking, tell the customer their request is recorded and the team will confirm via WhatsApp shortly.";

  return `You are a professional AI booking assistant for ${name}.
Your job is to help customers on WhatsApp with bookings, inquiries, and information about ${name}.

IMPORTANT: Always refer to the business by its exact name: "${name}". Never say "[insert salon name]" or leave the name blank.

## Business Name
${name}

## Business Category
${business?.category ? `${business.category}${business.category === "Other" && business.category_other ? ` (${business.category_other})` : ""}` : "General business"}

## About This Business
${business?.description || "A professional service business."}

${formattedServices ? `## Services Offered\n${formattedServices}\n` : ""}

## Availability (Weekly Schedule)
${formattedSlots}

## Today's Date
${today}

## Timezone
${timezone} (UTC${utcOffset})
All appointment times are in this timezone. When generating ISO 8601 datetimes always append the offset: e.g. "2026-04-01T09:00:00${utcOffset}"

## Confirmation Policy
${confirmationPolicy}

${business?.allow_staff_pick && formattedStaff ? `## Our Team\n${formattedStaff}\n\nCustomers may choose a preferred team member. Use their ID in bookAppointment.\n` : ""}
${formattedAnnouncements ? `## Schedule Announcements (CRITICAL — overrides availability)\n${formattedAnnouncements}\n\nIf an announcement marks a day as closed or unavailable, do NOT offer slots for that day even if the schedule shows availability.\n` : ""}
${ragChunks ? `## Knowledge Base (from uploaded documents — use for pricing, policies, FAQs)\n${ragChunks}\n` : ""}
## Customer
You are speaking with: ${customerName || "a customer"}

## Booking Flow
When a customer wants to book an appointment, follow these steps IN ORDER — do NOT skip or reorder:

**Step 1 — Service**
- Ask: "Which service would you like to book?" and list the available services from the Services Offered section.
- Wait for the customer to choose before moving on.

**Step 2 — Staff selection** *(only if allow_staff_pick is enabled AND staff members are listed)*
- Present the numbered team list and ask the customer if they have a preference.
- If the customer says "no preference" or "anyone", proceed without a staff member.
- If there are NO staff members listed, skip this step entirely.

**Step 3 — Date**
- Ask: "What date would you prefer?" (accept natural language like "tomorrow" or "next Friday").
- Call checkAvailability with the date in YYYY-MM-DD format.
- Show the available time windows on that date.

**Step 4 — Time**
- Ask what time within the available window they prefer.
- Call validateRequestedTime with the requested date + time to verify it falls within a window and has ≥1 hour before slot end.
- If valid: proceed to Step 5.
- If invalid: explain why and suggest the next valid option.

**Step 5 — Confirm & Book**
- Summarise: service, staff (if chosen), date/time. Ask the customer to confirm.
- Once confirmed, call bookAppointment.
- Follow the Confirmation Policy after booking.

**Cancellation flow**
- Call checkExistingBooking to get appointment details.
- Show the appointment and ask: "Could you please share the reason for the cancellation?"
- Once they give a reason, call cancelAppointment.
- NEVER cancel without a reason.

## Tone & Style
${business?.ai_tone ? `Your communication style is: **${business.ai_tone}**. Maintain this tone in every message.` : "Be warm, professional, and concise."}
- WhatsApp-friendly format: short paragraphs, emojis where appropriate.
- Keep responses under 300 words.

## Response Rules
- Always use the business name "${name}" when referring to the business.
- When asked about services, list them from the Services Offered section above — do not invent services.
- ALWAYS call checkExistingBooking before offering new slots.
- Do NOT book without calling bookAppointment.
- Do NOT ask about preferred time until you have shown the customer the available windows from checkAvailability.
- When the customer gives a specific time within a window, call validateRequestedTime before proceeding.
${!business?.allow_staff_pick ? "- Do NOT ask the customer about staff preferences. Staff assignment is handled internally — never mention team members." : ""}`.trim();
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
        "Check if this customer already has an active appointment (confirmed or pending). ALWAYS call this first when a customer wants to book, reschedule, or cancel their appointment.",
      inputSchema: z.object({}),
      execute: async () => {
        const { data } = await db
          .from("appointments")
          .select("id, service, scheduled_at, status")
          .eq("profile_id", profileId)
          .eq("customer_phone", customerPhone)
          .in("status", ["confirmed", "pending"])
          .order("scheduled_at", { ascending: true })
          .limit(1)
          .single();

        if (!data) return "no_existing_booking";

        const dt = new Date(data.scheduled_at).toLocaleString("en-US", {
          timeZone: timezone,
          weekday: "long", month: "long", day: "numeric",
          hour: "numeric", minute: "2-digit",
        });

        return `Customer has an active booking — Service: ${data.service}, Date/Time: ${dt}, Status: ${data.status}, ID: ${data.id}. If the customer wants to cancel, ask for their cancellation reason first, then call cancelAppointment. If they want to book a new slot, remind them they must cancel this one first.`;
      },
    }),

    checkAvailability: tool({
      description:
        "Check which time windows are free on a specific date. Returns available slot WINDOWS (start–end range), not fixed times — customers can request any time within a window. Call this after the customer selects a service and (optionally) a staff member, and picks a date.",
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

        return `Available time windows on ${dayOfWeek} ${date}:\n` +
          freeSlots
            .map(
              (s: { label: string; start_time: string; end_time: string }) =>
                `• ${s.label}: ${s.start_time} – ${s.end_time} (customer can request any start time within this window)`
            )
            .join("\n") +
          `\n\nIMPORTANT: These are time WINDOWS, not fixed slots. The customer may choose any start time within a window. ` +
          `However, the chosen start time must leave at least 1 hour before the window ends. ` +
          `After the customer picks a time, call validateRequestedTime to verify it.`;
      },
    }),

    validateRequestedTime: tool({
      description:
        "Validate that a customer's requested appointment time falls within an available slot window AND leaves at least 1 hour before the window ends. Call this when the customer specifies a time after you've shown them available windows via checkAvailability.",
      inputSchema: z.object({
        date: z.string().describe("Date in YYYY-MM-DD format"),
        requestedTime: z.string().describe("The customer's requested time in HH:MM (24h) format, e.g. '09:30'"),
      }),
      execute: async (input) => {
        const { date, requestedTime } = input;

        const dayOfWeek = new Date(`${date}T12:00:00`).toLocaleDateString("en-US", { weekday: "long" });

        const { data: slots } = await db
          .from("availability_slots")
          .select("label, start_time, end_time")
          .eq("profile_id", profileId)
          .ilike("day_of_week", dayOfWeek);

        if (!slots || slots.length === 0) {
          return `INVALID: No availability configured for ${dayOfWeek} (${date}).`;
        }

        const req = parseSlotTime(requestedTime);
        const reqTotalMins = req.hour * 60 + req.minute;

        // Find a window that contains this time with ≥60 mins remaining
        const matchingWindow = slots.find((slot: { start_time: string; end_time: string; label: string }) => {
          const start = parseSlotTime(slot.start_time);
          const end   = parseSlotTime(slot.end_time);
          const startMins = start.hour * 60 + start.minute;
          const endMins   = end.hour * 60 + end.minute;
          const withinWindow = reqTotalMins >= startMins && reqTotalMins < endMins;
          const enoughTime   = (endMins - reqTotalMins) >= 60; // at least 1 hour before slot ends
          return withinWindow && enoughTime;
        });

        if (matchingWindow) {
          const fmt = (hhmm: string) => {
            const { hour, minute } = parseSlotTime(hhmm);
            const ampm = hour < 12 ? "AM" : "PM";
            const h12  = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
            return `${h12}:${String(minute).padStart(2, "0")} ${ampm}`;
          };
          return `VALID: ${requestedTime} falls within the "${matchingWindow.label}" window (${fmt(matchingWindow.start_time)} – ${fmt(matchingWindow.end_time)}). There is sufficient time (≥1 hr) before this window ends. Proceed to confirm with the customer and then call bookAppointment.`;
        }

        // Not valid — find the best suggestion
        const formatSlot = (s: { label: string; start_time: string; end_time: string }) => {
          const fmt = (hhmm: string) => {
            const { hour, minute } = parseSlotTime(hhmm);
            const ampm = hour < 12 ? "AM" : "PM";
            const h12  = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
            return `${h12}:${String(minute).padStart(2, "0")} ${ampm}`;
          };
          // Latest valid start = slot end - 60 mins
          const end = parseSlotTime(s.end_time);
          const latestStartMins = (end.hour * 60 + end.minute) - 60;
          const latestH = Math.floor(latestStartMins / 60);
          const latestM = latestStartMins % 60;
          const latestAmpm = latestH < 12 ? "AM" : "PM";
          const latestH12  = latestH === 0 ? 12 : latestH > 12 ? latestH - 12 : latestH;
          return `"${s.label}": ${fmt(s.start_time)}–${fmt(s.end_time)} (latest start: ${latestH12}:${String(latestM).padStart(2, "0")} ${latestAmpm})`;
        };

        const suggestions = slots.map(formatSlot).join("; ");
        return `INVALID: ${requestedTime} does not fall within an available time window, OR there is less than 1 hour remaining before the window ends. Available windows on ${dayOfWeek} ${date}: ${suggestions}. Please ask the customer to choose a time within one of these windows, keeping at least 1 hour before it ends.`;
      },
    }),

    bookAppointment: tool({
      description: context.business?.auto_confirm
        ? "Book a CONFIRMED appointment immediately. Only call after confirming availability. Tell the customer their appointment is confirmed."
        : "Record an appointment request for the customer with PENDING status. Only call after confirming availability. The business owner will confirm or cancel it — do NOT tell the customer it is confirmed.",
      inputSchema: z.object({
        customerName: z.string().describe("Full name of the customer"),
        service: z.string().describe("Service they want e.g. 'Hair Styling'"),
        scheduledAt: z
          .string()
          .describe("ISO 8601 datetime e.g. '2026-03-28T10:00:00'"),
        ...(context.business?.allow_staff_pick
          ? {
              staffMemberId: z
                .string()
                .optional()
                .describe("ID of the staff member to assign. Only set if the customer specifically requested a team member by name."),
            }
          : {}),
      }),
      execute: async (input) => {
        const { customerName: name, service, scheduledAt } = input;
        const staffMemberId = context.business?.allow_staff_pick
          ? (input as { staffMemberId?: string }).staffMemberId
          : undefined;

        const autoConfirm = context.business?.auto_confirm ?? false;

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
            status: autoConfirm ? "confirmed" : "pending",
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

        if (autoConfirm) {
          await db.from("notifications").insert({
            profile_id: profileId,
            type: "success",
            title: "New Appointment Confirmed",
            message: `${name} booked ${service}${staffNote} for ${displayTime}. Auto-confirmed.`,
          });
          return `CONFIRMED appointment booked. ID: ${data.id}. ${name}'s ${service}${staffNote} on ${displayTime} is confirmed. Tell the customer their appointment is confirmed and share the date/time.`;
        }

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
      description: "Cancel an existing appointment by appointment ID (customer-initiated cancellation). ONLY call this after the customer has provided a cancellation reason. The reason is REQUIRED.",
      inputSchema: z.object({
        appointmentId: z.string().describe("The UUID of the appointment to cancel"),
        reason: z.string().describe("The reason the customer gave for canceling. This is REQUIRED — do not call this tool without a reason."),
      }),
      execute: async (input) => {
        const { appointmentId, reason } = input;

        // Security: verify this appointment belongs to this customer's phone number
        const { data: existing } = await db
          .from("appointments")
          .select("id, customer_name, customer_phone, service, scheduled_at, status")
          .eq("id", appointmentId)
          .eq("profile_id", profileId)
          .eq("customer_phone", customerPhone)
          .in("status", ["confirmed", "pending"])
          .single();

        if (!existing) {
          return "Could not find an active appointment for your number with that ID. Please verify your booking details.";
        }

        const cancelReason = reason.trim() || "Canceled by customer";

        const { data, error } = await db
          .from("appointments")
          .update({ status: "canceled", cancel_reason: cancelReason })
          .eq("id", appointmentId)
          .eq("profile_id", profileId)
          .select("customer_name, service, scheduled_at")
          .single();

        if (error || !data) {
          // Fallback: update without cancel_reason column (handles missing migration)
          const { data: d2, error: e2 } = await db
            .from("appointments")
            .update({ status: "canceled" })
            .eq("id", appointmentId)
            .eq("profile_id", profileId)
            .select("customer_name, service, scheduled_at")
            .single();
          if (e2 || !d2) return "Something went wrong while canceling your appointment. Please contact us directly.";
        }

        const apptData = data ?? existing;
        const displayTime = new Date(apptData.scheduled_at).toLocaleString("en-US", {
          timeZone: timezone,
          weekday: "long", month: "long", day: "numeric",
          hour: "numeric", minute: "2-digit",
        });

        // Notify admin
        await db.from("notifications").insert({
          profile_id: profileId,
          type: "warning",
          title: "Appointment Canceled by Customer",
          message: `${apptData.customer_name}'s ${apptData.service} on ${displayTime} was canceled by the customer. Reason: ${cancelReason}`,
        });

        return `SUCCESS: Appointment for ${apptData.customer_name} (${apptData.service} on ${displayTime}) has been canceled. Reason recorded: "${cancelReason}". Confirm to the customer their appointment is now canceled, share the date/time of the appointment that was canceled, and let them know they can book a new appointment anytime.`;
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

// ── Test mode: no session / no DB writes ──────────────────────────
export async function runTestAgentTurn(
  profileId: string,
  message: string,
  history: { role: "user" | "assistant"; content: string }[]
): Promise<string> {
  if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === "your_openai_api_key") {
    return "AI assistant is not configured yet (missing OPENAI_API_KEY). Add it to your .env.local to test.";
  }

  const timezone  = process.env.BUSINESS_TIMEZONE ?? "UTC";
  const utcOffset = getUTCOffset(timezone);

  const [context, ragChunks] = await Promise.all([
    loadContext(profileId),
    fetchRelevantDocs(profileId, message),
  ]);

  const systemPrompt =
    buildSystemPrompt(context, ragChunks, "Admin (Test Mode)", timezone, utcOffset) +
    "\n\n## TEST MODE\nYou are being tested by the business owner. Booking/cancellation tools are disabled in test mode. Focus on answering questions about services, availability, and business info accurately.";

  try {
    const { text } = await generateText({
      model: openai("gpt-4o-mini"),
      system: systemPrompt,
      messages: [...history, { role: "user", content: message }],
      stopWhen: stepCountIs(3),
    });
    return text.trim() || "I'm not sure how to answer that. Try rephrasing!";
  } catch (err) {
    console.error("[test-agent] error:", err);
    return "Something went wrong. Please try again.";
  }
}
