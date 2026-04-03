# Concierge AI — WhatsApp Booking Agent

> **A full-stack, AI-powered appointment booking system delivered through WhatsApp, with a premium web dashboard for business owners.**

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Market Research & Value Proposition](#2-market-research--value-proposition)
3. [System Architecture](#3-system-architecture)
4. [Technology Stack](#4-technology-stack)
5. [Database Schema](#5-database-schema)
6. [AI Agent Design](#6-ai-agent-design)
7. [API Reference](#7-api-reference)
8. [Dashboard Pages & Features](#8-dashboard-pages--features)
9. [WhatsApp Integration (Twilio)](#9-whatsapp-integration-twilio)
10. [Progressive Web App (PWA)](#10-progressive-web-app-pwa)
11. [Authentication & Security](#11-authentication--security)
12. [Environment Variables](#12-environment-variables)
13. [Local Development Setup](#13-local-development-setup)
14. [Deployment Guide](#14-deployment-guide)
15. [Key Design Decisions](#15-key-design-decisions)
16. [Roadmap & Future Work](#16-roadmap--future-work)
17. [File Structure](#appendix-file-structure)

---

## 1. Project Overview

**Concierge AI** is a SaaS-ready, white-label platform that lets small and medium businesses automate their appointment booking entirely through WhatsApp — the world's most popular messaging app. It consists of two tightly integrated systems:

| System | What it does |
|---|---|
| **AI WhatsApp Agent** | Receives customer messages via Twilio, runs an LLM-powered tool-calling agent, and replies in real time on WhatsApp |
| **Business Dashboard** | A Next.js 16 web app where business owners manage availability, view appointments, monitor AI chats, broadcast announcements, and configure the AI agent |

### Core User Journey

```
Customer (WhatsApp) → Twilio → /api/webhooks/whatsapp → AI Agent → Supabase → Reply via Twilio
                                                                      ↓
                                                       Business Dashboard (real-time)
```

### Who is this for?

- Hair salons, barbershops, nail studios
- Medical clinics, physiotherapy, dental offices
- Tutoring centres, coaching practices
- Any service business that currently takes bookings over WhatsApp or phone

---

## 2. Market Research & Value Proposition

### 2.1 Market Opportunity

- **WhatsApp has 2.7 billion monthly active users** (Statista, 2025), making it the dominant communication channel for small businesses in South Asia, Latin America, the Middle East, and Africa.
- **67% of small businesses** in emerging markets already use WhatsApp as their primary customer communication tool (Meta Business Insights, 2024).
- The global **appointment scheduling software market** was valued at **$546 million in 2023** and is projected to reach **$1.1 billion by 2029** at a CAGR of 12.4% (MarketsandMarkets).
- **AI chatbot market** is growing at 23.3% CAGR globally (Grand View Research, 2024).

### 2.2 Problem Statement

| Pain Point | Current Workaround | Concierge AI Solution |
|---|---|---|
| Business owners manually answer "What time are you free?" all day | WhatsApp replies at all hours | 24/7 automated AI handles it |
| Customers forget appointments (no-shows) | Manual reminder texts | Automated notifications (roadmap) |
| Booking via DM is informal, easy to lose | Excel sheets or paper | Structured database with full history |
| AI bots give wrong info | Generic chatbot | RAG over business-specific documents |
| Expensive booking software has steep UX curve | Calendly, Acuity | Customers need no new app — just WhatsApp |

### 2.3 Competitive Analysis

| Product | WhatsApp Native | AI-Powered | RAG Knowledge Base | Staff Management | Price |
|---|---|---|---|---|---|
| **Concierge AI** | ✅ | ✅ | ✅ | ✅ | SaaS |
| Calendly | ❌ | ❌ | ❌ | ✅ | $10–16/mo |
| Acuity Scheduling | ❌ | ❌ | ❌ | ✅ | $16–61/mo |
| WhatsApp Business API (manual) | ✅ | ❌ | ❌ | ❌ | Free |
| Tidio / Landbot | Partial | ✅ | ❌ | ❌ | $19+/mo |

### 2.4 Unique Differentiators

1. **Zero friction for customers** — they don't install anything new; they just message on WhatsApp.
2. **RAG-enriched responses** — the AI can answer questions about services, pricing, and policies by searching uploaded PDF/text documents (vector similarity search).
3. **Announcement-as-schedule-override** — business owners post announcements (e.g., "closed on Friday for a holiday") and the AI automatically refuses to offer slots on that date.
4. **Staff-aware booking** — customers can request a specific team member by name.
5. **Progressive Web App** — the dashboard installs on mobile like a native app.
6. **Multi-tenant ready** — profile isolation via Supabase RLS means a single deployment serves many businesses.

---

## 3. System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        CUSTOMER SIDE                        │
│                    WhatsApp (any device)                    │
└───────────────────────────┬─────────────────────────────────┘
                            │ HTTPS POST (form-encoded)
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                          TWILIO                             │
│              WhatsApp Business API proxy                    │
│   • Routes inbound messages as webhooks                     │
│   • Delivers outbound replies                               │
│   • Signs all requests (HMAC-SHA1)                         │
└───────────────────────────┬─────────────────────────────────┘
                            │ Webhook POST
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              NEXT.JS 16 APPLICATION (Vercel / Node)         │
│                                                             │
│  /api/webhooks/whatsapp (route.ts)                         │
│  1. Validate Twilio signature                               │
│  2. Resolve profile from phone number                       │
│  3. Upsert chat session                                     │
│  4. Call runAgentTurn()                                     │
│  5. Send reply via Twilio                                   │
│                                                             │
│  AI Agent  (lib/ai-agent.ts)                               │
│  ┌────────────┐  ┌──────────────┐  ┌────────────┐          │
│  │loadContext │  │fetchRelevant │  │loadHistory │          │
│  │(DB lookup) │  │Docs (RAG)    │  │(last N msg)│          │
│  └─────┬──────┘  └──────┬───────┘  └─────┬──────┘          │
│        └────────────────┼────────────────┘                 │
│                         ▼                                   │
│              buildSystemPrompt()                            │
│                         ▼                                   │
│              generateText() via Vercel AI SDK               │
│              Model: gpt-4o-mini  |  Max steps: 5            │
│                                                             │
│  Tools (function calling):                                  │
│  • checkExistingBooking                                     │
│  • checkAvailability                                        │
│  • bookAppointment                                          │
│  • cancelAppointment                                        │
│                                                             │
│  DASHBOARD (React / Next.js App Router)                     │
│  / → /appointments → /ai-chats → /my-details → /staff      │
│  /announcements → /offers → /notifications → /settings      │
└─────────────────────────┬───────────────────────────────────┘
                          │ Supabase JS Client (Server-side)
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                       SUPABASE                              │
│  PostgreSQL (10 tables + pgvector)                         │
│  ├── profiles           ← Business accounts                │
│  ├── business_details   ← AI description, working hours    │
│  ├── availability_slots ← Weekly schedule                  │
│  ├── training_docs      ← RAG document chunks + embeddings │
│  ├── appointments       ← Booking records                  │
│  ├── chat_sessions      ← Customer conversation sessions   │
│  ├── chat_messages      ← Individual messages              │
│  ├── announcements      ← Broadcast messages               │
│  ├── offers             ← Promotions                       │
│  └── notifications      ← Admin notifications              │
│                                                             │
│  Auth · Storage · Row Level Security · pgvector             │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                       OPENAI                                │
│  gpt-4o-mini                 → AI agent inference          │
│  text-embedding-3-small (1536d) → RAG document embeddings  │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. Technology Stack

### Frontend & Full-Stack Framework

| Technology | Version | Purpose |
|---|---|---|
| **Next.js** | 16.2.1 | Full-stack framework (App Router) |
| **React** | 19.2.4 | UI library |
| **TypeScript** | 5.x | Type safety |
| **Tailwind CSS** | 4.x | Utility-first CSS |
| **Manrope** | Google Fonts | Typography |
| **Lucide React** | 0.577.0 | Icon library |
| **next-themes** | 0.4.6 | Light/dark mode |
| **SWR** | 2.4.1 | Data fetching + real-time polling |
| **clsx** | 2.1.1 | Conditional class merging |

### AI & Machine Learning

| Technology | Version | Purpose |
|---|---|---|
| **Vercel AI SDK** (`ai`) | 6.0.138 | LLM orchestration, tool calling, streaming |
| **@ai-sdk/openai** | 3.0.48 | OpenAI provider adapter |
| **openai** | 6.32.0 | Direct OpenAI client (embeddings) |
| **Zod** | 4.3.6 | Tool input schema validation |
| **pdf-parse** | 2.4.5 | PDF text extraction for training docs |

### Backend & Database

| Technology | Version | Purpose |
|---|---|---|
| **Supabase** | — | PostgreSQL + Auth + Storage + Realtime |
| **@supabase/supabase-js** | 2.100.0 | Supabase JS client |
| **@supabase/ssr** | 0.9.0 | Server-side Supabase for Next.js |
| **pgvector** | — | Vector embeddings for RAG |

### Messaging

| Technology | Version | Purpose |
|---|---|---|
| **Twilio** | 5.13.1 | WhatsApp Business API proxy |

---

## 5. Database Schema

All tables use UUID primary keys and are isolated by `profile_id` with Row Level Security (RLS) policies.

### 5.1 Entity Relationship Overview

```
auth.users (Supabase)
    │
    └─► profiles
            │
            ├─► business_details        (1:1)
            ├─► availability_slots      (1:N)
            ├─► training_docs           (1:N, with vector embeddings)
            ├─► appointments            (1:N)
            ├─► chat_sessions           (1:N)
            │       └─► chat_messages   (1:N)
            ├─► announcements           (1:N)
            ├─► offers                  (1:N)
            └─► notifications           (1:N)
```

### 5.2 Table Definitions

#### `profiles`
Core account table, one row per Supabase Auth user.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | PK, references `auth.users` |
| `business_name` | `text` | Display name |
| `whatsapp_phone` | `text` | Routes incoming WhatsApp messages to this profile |

Auto-created via trigger — `handle_new_user()` fires after every `auth.users` insert.

#### `business_details`
AI persona and working hours configuration.

| Column | Type | Notes |
|---|---|---|
| `profile_id` | `uuid` | FK → profiles (unique) |
| `description` | `text` | AI system prompt description |
| `ai_tone` | `text` | e.g., "Professional & Friendly" |
| `working_hours` | `text` | Displayed to customers |

#### `availability_slots`
Weekly recurring schedule — one row per time block per day.

| Column | Type | Notes |
|---|---|---|
| `label` | `text` | e.g., "Morning Slot" |
| `day_of_week` | `text` | e.g., "Monday" |
| `start_time` | `text` | e.g., "09:00 AM" |
| `end_time` | `text` | e.g., "12:00 PM" |

#### `training_docs`
RAG knowledge base — each row is a text chunk from an uploaded file.

| Column | Type | Notes |
|---|---|---|
| `file_name` | `text` | Original filename |
| `file_path` | `text` | Supabase Storage path |
| `chunk_index` | `int` | Order within file |
| `content` | `text` | Chunk text |
| `embedding` | `vector(1536)` | OpenAI `text-embedding-3-small` output |

**Vector index:** `ivfflat` with cosine ops for fast ANN search.

**Match function:** `match_training_docs(query_embedding, match_profile_id, match_count)` — returns top-K chunks by cosine similarity (threshold 0.5).

#### `appointments`

| Column | Type | Notes |
|---|---|---|
| `customer_phone` | `text` | E.164 format |
| `customer_name` | `text` | |
| `service` | `text` | Service requested |
| `scheduled_at` | `timestamptz` | UTC datetime |
| `status` | `text` | `pending` / `confirmed` / `canceled` |
| `notes` | `text` | Optional |
| `assigned_user_id` | `uuid` | Staff member (from auth.users) |
| `cancel_reason` | `text` | Populated on cancellation |

#### `chat_sessions`

| Column | Type | Notes |
|---|---|---|
| `customer_phone` | `text` | Unique per profile |
| `customer_name` | `text` | |
| `status` | `text` | `active` / `resolved` |
| `unread_count` | `int` | |
| `last_message` | `text` | Truncated to 200 chars |
| `last_message_at` | `timestamptz` | |

Unique constraint on `(profile_id, customer_phone)` — one session per customer per business.

#### `chat_messages`

| Column | Type | Notes |
|---|---|---|
| `session_id` | `uuid` | FK → chat_sessions |
| `role` | `text` | `ai` / `user` |
| `content` | `text` | Full message text |

#### `announcements`

| Column | Type | Notes |
|---|---|---|
| `title` | `text` | |
| `message` | `text` | |
| `audience` | `text` | e.g., "All Clients" |
| `scheduled_for` | `timestamptz` | Active until this datetime |
| `status` | `text` | `scheduled` / `sent` / `expired` |
| `reach` | `int` | Number of customers reached |

**Critical:** Active announcements are injected into the AI system prompt as **hard schedule overrides**. If an announcement says "closed on Friday", the AI will not offer Friday slots.

#### `offers`

| Column | Type | Notes |
|---|---|---|
| `title` | `text` | |
| `discount` | `text` | e.g., "20% off" |
| `description` | `text` | |
| `valid_until` | `text` | |
| `sent_count` | `int` | |
| `redeemed_count` | `int` | |

#### `notifications`

| Column | Type | Notes |
|---|---|---|
| `type` | `text` | `success` / `info` / `warning` |
| `title` | `text` | |
| `message` | `text` | |
| `read_at` | `timestamptz` | `null` = unread |

---

## 6. AI Agent Design

### 6.1 Architecture: Agentic Tool-Calling Loop

The agent runs via **Vercel AI SDK's `generateText`** with `stopWhen: stepCountIs(5)`. This allows the model to:

1. Call a tool (e.g., `checkExistingBooking`)
2. Receive the tool result
3. Call another tool if needed (e.g., `checkAvailability`)
4. Call another tool (e.g., `bookAppointment`)
5. Generate the final natural-language reply for the customer

Maximum 5 steps prevents runaway loops.

### 6.2 Context Loading (Parallel)

Every agent turn loads three data sources **in parallel**:

```typescript
const [context, ragChunks, history] = await Promise.all([
  loadContext(profileId),                              // Business info, slots, announcements, staff
  fetchRelevantDocs(profileId, incomingMessage),       // RAG vector search
  loadHistory(sessionId),                              // Last 10 messages
]);
```

### 6.3 RAG Pipeline

```
Customer message
      │
      ▼
OpenAI text-embedding-3-small (1536 dimensions)
      │
      ▼
Supabase match_training_docs() — cosine similarity search
      │
      ▼
Filter: similarity > 0.5
      │
      ▼
Top 4 chunks injected into system prompt
```

Documents are chunked at upload time and stored as `(content, embedding)` pairs in `training_docs`. The `ivfflat` index makes similarity search fast at scale.

### 6.4 System Prompt Construction

The system prompt dynamically includes:

| Section | Source |
|---|---|
| Business description | `business_details.description` |
| Working hours | `business_details.working_hours` |
| Today's date (with weekday) | Server-side, localized to `BUSINESS_TIMEZONE` |
| Business timezone + UTC offset | Computed at runtime |
| Available time slots | `availability_slots` table |
| Staff members | Supabase Auth users with `role=staff`, `managed_by=profileId` |
| Active announcements | `announcements` where `status='scheduled'` and `scheduled_for > now()` |
| RAG knowledge base chunks | Vector similarity results |
| Customer identity | From Twilio `ProfileName` field |

### 6.5 Tools (Function Calling)

#### `checkExistingBooking`
- **Input:** none
- **Logic:** Queries `appointments` for `pending`/`confirmed` appointments for this customer phone in the future.
- **Output:** Existing booking details or `"no_existing_booking"`
- **Rule:** The model is instructed to call this **first** when a customer mentions booking.

#### `checkAvailability`
- **Input:** `date` (YYYY-MM-DD)
- **Logic:**
  1. Determines `day_of_week` from date
  2. Fetches matching `availability_slots`
  3. Fetches booked appointments in a ±1 day window
  4. Filters to confirmed/pending on the exact local date (timezone-aware)
  5. Returns only free slots
- **Timezone handling:** Uses `BUSINESS_TIMEZONE` env var; compares slots defined in local time against UTC timestamps in the DB.

#### `bookAppointment`
- **Input:** `customerName`, `service`, `scheduledAt` (ISO 8601 with offset), `staffMemberId?`
- **Logic:** Inserts appointment with `status='pending'`, creates admin notification
- **Important:** Status is always `pending`. The AI is instructed **never** to tell the customer their booking is "confirmed".

#### `cancelAppointment`
- **Input:** `appointmentId`, `reason?`
- **Logic:** Updates status to `canceled`, creates admin warning notification
- **Safety:** Validates the appointment belongs to the profile before canceling

### 6.6 Booking Flow Logic

```
Customer says anything about booking
    │
    ▼
checkExistingBooking()
    │
    ├── Has active booking? → "You already have a booking for X. Cancel it first."
    │
    └── No booking → "What date would you prefer?"
                          │
                          ▼
                   Customer provides date
                          │
                          ▼
                   checkAvailability(date)
                          │
                          ├── Announcement blocks date? → Refuse + suggest alternatives
                          │
                          └── Show available slots
                                    │
                                    ▼
                           Customer picks slot
                                    │
                                    ▼
                           bookAppointment()
                                    │
                                    ▼
                    "Your request has been recorded! ✅
                     Our team will confirm shortly."
```

### 6.7 Timezone Handling

All slot times in the DB are stored as plain strings (`"09:00 AM"`). All appointment `scheduled_at` values are UTC ISO 8601 timestamps. The agent:

1. Reads `BUSINESS_TIMEZONE` (e.g., `"Asia/Colombo"`)
2. Computes UTC offset with `getUTCOffset()`
3. Instructs the model to append the offset to all generated datetimes
4. Uses `localHourMinute()` and `localDateStr()` to compare bookings against slot times in the correct local timezone

---

## 7. API Reference

All API routes live under `src/app/api/`.

### 7.1 Webhook

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/webhooks/whatsapp` | Receives Twilio webhooks, runs AI agent, sends reply |
| `GET` | `/api/webhooks/whatsapp` | Health-check endpoint |

**POST flow:**
1. Parse form-encoded Twilio payload (`From`, `To`, `Body`, `ProfileName`)
2. Validate Twilio HMAC-SHA1 signature (skipped in dev mode)
3. Reject empty messages with `200`
4. `resolveProfileId()` — find which profile owns the `To` number
5. `upsertSession()` — create or refresh chat session
6. `runAgentTurn()` — AI agent turn
7. `sendWhatsAppMessage()` — send reply via Twilio
8. Return `200` (always — Twilio re-sends on non-200)

**Multi-tenancy:** Each incoming WhatsApp number maps to a business profile via `profiles.whatsapp_phone`. Falls back to the oldest profile in single-tenant mode.

### 7.2 Dashboard APIs

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/dashboard/stats` | Returns total/confirmed/canceled + upcoming list |
| `GET/POST` | `/api/appointments` | List + create appointments |
| `PATCH/DELETE` | `/api/appointments/[id]` | Update status / delete |
| `GET` | `/api/customers` | List unique customers |
| `GET/POST` | `/api/announcements` | List + create announcements |
| `GET/POST` | `/api/offers` | List + create offers |
| `GET` | `/api/notifications` | List notifications (paginated) |
| `PATCH` | `/api/notifications/[id]` | Mark as read |
| `GET` | `/api/sessions` | List AI chat sessions |
| `GET` | `/api/business` | Get business details |
| `PATCH` | `/api/business` | Update business details |
| `GET/POST` | `/api/slots` | List + create availability slots |
| `DELETE` | `/api/slots/[id]` | Delete a slot |
| `GET/POST` | `/api/training-docs` | List + upload training documents |
| `DELETE` | `/api/training-docs/[id]` | Delete a training document |
| `GET/POST` | `/api/staff` | Staff portal — appointments + auth |
| `GET/POST` | `/api/staff-users` | Manage staff user accounts |
| `GET/POST` | `/api/sub-users` | Manage sub-user accounts |

---

## 8. Dashboard Pages & Features

### 8.1 Overview (`/`)

Real-time dashboard polling every 30 seconds via SWR:
- **4 stat cards:** Total appointments, New leads (chat sessions), Successful bookings, Cancellations
- **Upcoming appointments list** — next N confirmed/pending appointments
- **Recent activity** — last 5 notifications (new bookings, cancellations)
- **Appointment trend chart** — 30-day bar chart visualization
- **AI Active indicator** — animated pulse badge

### 8.2 Appointments (`/appointments`)

Full appointment management:
- Filterable/searchable list of all appointments
- Status chips: Pending (amber), Confirmed (green), Canceled (red)
- One-click confirm/cancel with optimistic UI
- Customer phone number display
- Staff assignment visibility

### 8.3 AI Chats (`/ai-chats`)

Conversation history viewer:
- List of all customer chat sessions
- Click to view full message thread
- Message bubbles (AI vs. Customer)
- Session status (active/resolved)

### 8.4 My Details (`/my-details`)

Business profile and AI configuration:
- **Business description** — injected directly into the AI system prompt
- **Working hours** — displayed to customers
- **AI tone selector**
- **Availability slot manager** — add/remove weekly time slots by day
- **Training document upload** — upload PDFs; system auto-chunks and embeds for RAG
- **WhatsApp number** — the number tied to the Twilio sandbox

### 8.5 Staff (`/staff`)

Staff portal and management:
- View and manage staff user accounts
- Each staff member has `role=staff` + `managed_by=profileId` in Supabase Auth `app_metadata`
- Staff members are listed in the AI system prompt with their bio
- Staff sub-portal for viewing assigned appointments

### 8.6 Sub-users (`/sub-users`)

Additional admin accounts that share dashboard access with restricted permissions.

### 8.7 Announcements (`/announcements`)

Broadcast scheduling tool:
- Create announcements with title, message, audience, schedule date
- **Critical AI integration:** Active announcements are hard date overrides in the AI system prompt
- Announcements expire automatically after `scheduled_for` datetime

### 8.8 Offers (`/offers`)

Promotional offers management:
- Create offers with discount details and validity
- Track `sent_count` and `redeemed_count`

### 8.9 Notifications (`/notifications`)

System activity feed:
- Paginated list (10 per page) with "Show More" button
- Types: Success (green), Info (blue), Warning (amber)
- Mark as read functionality
- Sources: New booking requests, customer cancellations

### 8.10 Settings (`/settings`)

Account and integration configuration.

---

## 9. WhatsApp Integration (Twilio)

### 9.1 How It Works

```
Customer sends WhatsApp message
    → Twilio receives it
    → Twilio HTTP POST to your webhook URL (form-encoded)
    → Your app processes it, runs AI
    → Your app calls Twilio REST API to send reply
    → Twilio delivers reply to customer
```

### 9.2 Twilio Payload Fields

| Field | Description |
|---|---|
| `From` | Customer phone: `whatsapp:+1234567890` |
| `To` | Your Twilio number: `whatsapp:+14155238886` |
| `Body` | Message text |
| `ProfileName` | Customer's WhatsApp display name |

### 9.3 Signature Validation

Every Twilio webhook includes an `X-Twilio-Signature` header. The app validates this with:

```typescript
twilio.validateRequest(TWILIO_AUTH_TOKEN, signature, webhookUrl, params)
```

**Dev mode bypass:** If `TWILIO_AUTH_TOKEN` is the placeholder string or unset, validation is skipped for local development.

### 9.4 Response Requirements

Twilio requires a `200 OK` within **15 seconds**. Non-200 triggers retries (duplicate messages). The app:
- Always returns `200` to Twilio (even on internal errors)
- Sends a graceful fallback message on exceptions
- Sets `maxDuration = 60` (Vercel Pro allows up to 300s)

### 9.5 Local Development with ngrok

```bash
# Terminal 1 — start app
npm run dev

# Terminal 2 — expose to internet
ngrok http 3000

# Set in .env.local:
# WEBHOOK_BASE_URL=https://abc123.ngrok.io

# In Twilio Console → Sandbox → Webhook URL:
# https://abc123.ngrok.io/api/webhooks/whatsapp
```

---

## 10. Progressive Web App (PWA)

### Features

| Feature | Implementation |
|---|---|
| **Install prompt** | `manifest.ts` with all icon sizes (72–512px) |
| **Offline page** | `public/offline.html` served by service worker |
| **Service worker** | Registered via `ServiceWorkerRegistration.tsx` |
| **Theme color** | `#6366f1` (indigo) |
| **Standalone mode** | `display: "standalone"` — no browser chrome |
| **Portrait lock** | `orientation: "portrait-primary"` |
| **Apple home screen** | `appleWebApp: { capable: true }` |
| **Light/dark theme** | Adaptive `theme_color` meta |

---

## 11. Authentication & Security

### 11.1 Supabase Auth

- **Primary auth:** Supabase Auth (email + password or magic link)
- **Server-side session:** `@supabase/ssr` with cookie-based sessions in Next.js App Router
- **Profile auto-creation:** Database trigger `on_auth_user_created` inserts a row into `profiles` for every new user

### 11.2 Row Level Security

Every table has RLS enabled, restricting all operations to `profile_id = auth.uid()`. Cross-tenant data leakage is impossible at the database level.

### 11.3 Service Role Client

The AI agent webhook and server-side API routes use the **Supabase service role key** (bypasses RLS) because they run in trusted server contexts. This key is **never exposed to the browser**.

### 11.4 Staff Authentication

Staff members are Supabase Auth users with:

```json
{
  "app_metadata": {
    "role": "staff",
    "managed_by": "<admin_profile_id>",
    "is_active": true
  },
  "user_metadata": {
    "full_name": "Jane Smith",
    "bio": "Specialist in hair coloring"
  }
}
```

### 11.5 Twilio Webhook Security

- HMAC-SHA1 signature validation on every inbound webhook
- Dev mode bypass (only active when `auth_token` = placeholder)
- Service role DB client in webhook handler (no user session required)

---

## 12. Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# OpenAI
OPENAI_API_KEY=sk-...

# Twilio
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886

# App
WEBHOOK_BASE_URL=https://your-domain.com
BUSINESS_TIMEZONE=Asia/Colombo
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Public anon key (browser-safe) |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Service role key (server-only, bypasses RLS) |
| `OPENAI_API_KEY` | ✅ | OpenAI API key |
| `TWILIO_ACCOUNT_SID` | ✅ | Twilio account identifier |
| `TWILIO_AUTH_TOKEN` | ✅ | Twilio auth token (webhook validation) |
| `TWILIO_WHATSAPP_NUMBER` | ✅ | Twilio WhatsApp number |
| `WEBHOOK_BASE_URL` | ✅ | Public domain where webhooks arrive |
| `BUSINESS_TIMEZONE` | ✅ | IANA timezone string |
| `NEXT_PUBLIC_APP_URL` | ✅ | Public app URL |

---

## 13. Local Development Setup

### Prerequisites

- Node.js 20+, npm 10+
- Supabase project ([supabase.com](https://supabase.com))
- Twilio account with WhatsApp sandbox enabled
- OpenAI API key
- ngrok (for webhook testing)

### Step-by-step

```bash
# 1. Clone and install
git clone <repo-url>
cd appointment-booking-wapp-agent
npm install

# 2. Configure environment
cp .env.local.example .env.local   # then fill in credentials

# 3. Set up Supabase database
# Go to Supabase Dashboard → SQL Editor, run in order:
#   (a) supabase/schema.sql      — creates all tables + RLS
#   (b) supabase/functions.sql   — creates match_training_docs() function

# 4. Start the development server
npm run dev

# 5. Expose for webhook testing (separate terminal)
ngrok http 3000

# 6. Configure Twilio
# Twilio Console → Messaging → Sandbox Settings
# Webhook URL: https://YOUR_NGROK_URL/api/webhooks/whatsapp (HTTP POST)

# 7. Open dashboard
open http://localhost:3000
```

### First Login

1. Go to `http://localhost:3000/login` → Sign up
2. Complete business profile at `/my-details`
3. Add availability slots
4. (Optional) Upload training documents
5. Test by texting your Twilio WhatsApp sandbox number

---

## 14. Deployment Guide

### Vercel (Recommended)

```bash
npm i -g vercel
vercel --prod
```

Set all environment variables in the Vercel project dashboard.

**Important:** Upgrade to **Vercel Pro** for `maxDuration = 60`. Free tier limits serverless functions to 10 seconds, which may time out for complex AI agent turns.

### Production Twilio

1. Apply for WhatsApp Business Account via Twilio
2. Get a dedicated WhatsApp number (not sandbox)
3. Update `TWILIO_WHATSAPP_NUMBER`
4. Update webhook URL in Twilio Console to production domain

### Database Migrations

Run SQL migrations in the Supabase SQL Editor. Versioned migration files are in `supabase/migrations/`.

---

## 15. Key Design Decisions

### Why Vercel AI SDK instead of raw OpenAI client?

The AI SDK's `generateText` with `tools` and `stopWhen: stepCountIs(5)` provides a clean agentic loop. It abstracts provider differences, making it easy to switch models in the future.

### Why `gpt-4o-mini` and not `gpt-4o`?

- WhatsApp replies must return within ~10 seconds for good UX
- `gpt-4o-mini` is 6× faster at comparable quality for structured tool-calling tasks
- Cost-effective at scale for a SaaS model

### Why store availability as plain-text time strings?

Slot times like `"09:00 AM"` are human-readable and easy to format in LLM prompts. The `parseSlotTime()` utility converts them to `{hour, minute}` for comparison. This keeps timezone complexity entirely in application code.

### Why pgvector instead of Pinecone?

- Keeps all data in one place (fewer services, simpler ops)
- Supabase's `ivfflat` index is fast enough for typical business-scale document libraries
- No additional cost for a separate vector DB at this scale

### Why Twilio instead of direct WhatsApp Cloud API?

- Sandbox makes local development trivial (no business verification needed)
- Twilio handles number provisioning, compliance, delivery retries
- Built-in HMAC signature validation via `twilio.validateRequest()`

### Why always return `200` to Twilio?

Twilio's retry policy re-sends webhooks on non-2xx responses, causing duplicate AI messages. Always returning `200` and handling errors internally avoids this.

### Why service role key in the webhook?

The webhook is a trusted server context with no user session. Service role access allows querying any profile's data by `profile_id` without the overhead of per-request auth token refresh.

---

## 16. Roadmap & Future Work

### Near-term

- [ ] **Appointment reminders** — scheduled WhatsApp reminders 24h before appointments
- [ ] **Reschedule flow** — let customers reschedule without canceling first
- [ ] **Real-time dashboard** — Supabase Realtime subscriptions instead of SWR polling
- [ ] **Real trend chart** — connect the 30-day chart to actual appointment data grouped by date
- [ ] **CSV/PDF export** — download appointment lists

### Medium-term

- [ ] **Stripe billing** — subscription management for SaaS monetization
- [ ] **Google Calendar sync** — two-way sync with Google/Outlook calendars
- [ ] **Appointment confirmation via WhatsApp** — admin confirms directly from WhatsApp reply
- [ ] **Customer CRM** — customer profiles with booking history, lifetime value
- [ ] **Multi-language support** — auto-detect customer language

### Long-term

- [ ] **Voice support** — Twilio Voice + AI for phone booking
- [ ] **Instagram DM support** — extend agent to Instagram
- [ ] **White-label mode** — reseller program with custom branding per tenant
- [ ] **Automated follow-ups** — post-appointment feedback requests via WhatsApp

---

## Appendix: File Structure

```
appointment-booking-wapp-agent/
├── src/
│   ├── app/
│   │   ├── page.tsx                        # Dashboard home
│   │   ├── layout.tsx                      # Root layout (Manrope, ThemeProvider)
│   │   ├── manifest.ts                     # PWA manifest
│   │   ├── globals.css                     # Global styles + CSS variables
│   │   ├── appointments/page.tsx           # Appointment management
│   │   ├── ai-chats/page.tsx               # AI conversation history
│   │   ├── my-details/page.tsx             # Business profile + AI config
│   │   ├── staff/                          # Staff portal
│   │   ├── sub-users/page.tsx              # Sub-user management
│   │   ├── announcements/page.tsx          # Broadcast announcements
│   │   ├── offers/page.tsx                 # Promotional offers
│   │   ├── notifications/page.tsx          # System notifications (paginated)
│   │   ├── settings/page.tsx               # Account settings
│   │   ├── login/page.tsx                  # Authentication
│   │   ├── offline/page.tsx                # PWA offline fallback
│   │   └── api/
│   │       ├── webhooks/whatsapp/route.ts  # Twilio webhook receiver (CORE)
│   │       ├── dashboard/stats/route.ts
│   │       ├── appointments/route.ts
│   │       ├── announcements/route.ts
│   │       ├── notifications/route.ts
│   │       ├── sessions/route.ts
│   │       ├── business/route.ts
│   │       ├── slots/route.ts
│   │       ├── training-docs/route.ts
│   │       ├── staff/route.ts
│   │       ├── staff-users/route.ts
│   │       ├── sub-users/route.ts
│   │       ├── customers/route.ts
│   │       └── auth/
│   ├── components/
│   │   ├── layout/
│   │   │   ├── AppShell.tsx               # Main layout wrapper
│   │   │   ├── Sidebar.tsx                # Desktop sidebar nav
│   │   │   ├── Topbar.tsx                 # Top navigation bar
│   │   │   ├── MobileNav.tsx              # Bottom mobile navigation
│   │   │   └── StaffShell.tsx             # Staff portal layout
│   │   ├── dashboard/
│   │   │   ├── StatCard.tsx               # KPI stat card
│   │   │   └── AppointmentRow.tsx         # Appointment list row
│   │   ├── providers/
│   │   │   └── ThemeProvider.tsx          # next-themes wrapper
│   │   └── ServiceWorkerRegistration.tsx
│   ├── lib/
│   │   ├── ai-agent.ts                    # Core AI agent logic (CORE)
│   │   ├── whatsapp.ts                    # Twilio send + validate
│   │   ├── staff-password.ts              # Staff auth utilities
│   │   ├── staff-session.ts               # Staff session utilities
│   │   └── supabase/                      # Supabase client factories
│   └── types/                             # TypeScript type definitions
├── supabase/
│   ├── schema.sql                         # Full database schema + RLS (CORE)
│   ├── functions.sql                      # match_training_docs() (CORE)
│   └── migrations/                        # Versioned migration files
├── public/
│   ├── offline.html                       # PWA offline fallback
│   └── icons/                             # PWA icons (72–512px)
├── .env.local                             # Environment variables (gitignored)
├── next.config.ts
├── package.json
└── tsconfig.json
```

---

*Last updated: April 2026 | Built by Techneura*
