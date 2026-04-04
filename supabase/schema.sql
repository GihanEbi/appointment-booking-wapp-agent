-- ============================================================
-- Concierge AI — WhatsApp Booking Agent
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================

-- Enable pgvector for RAG embeddings
create extension if not exists vector;

-- ── 1. profiles ──────────────────────────────────────────────
-- One row per dashboard user (extends Supabase auth.users)
create table if not exists profiles (
  id                   uuid primary key references auth.users(id) on delete cascade,
  business_name        text not null default '',
  whatsapp_phone       text not null default '',
  onboarding_completed boolean not null default false,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

-- ── 2. business_details ──────────────────────────────────────
create table if not exists business_details (
  id                uuid primary key default gen_random_uuid(),
  profile_id        uuid not null references profiles(id) on delete cascade,
  description       text not null default '',
  ai_tone           text not null default 'Professional & Friendly',
  working_hours     text not null default '9:00 AM – 7:00 PM',
  category          text,                          -- e.g. 'Beauty', 'Medical & Health'
  category_other    text,                          -- when category = 'Other'
  auto_confirm      boolean not null default false, -- auto-confirm appointments
  allow_staff_pick  boolean not null default true,  -- customers can pick staff via AI
  schedule_mode     text check (schedule_mode in ('daily', 'weekly', 'custom')),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique(profile_id)
);

-- ── 2b. services (sub-services with optional prices) ─────────
create table if not exists services (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid not null references profiles(id) on delete cascade,
  name        text not null,
  price       text,           -- free-form e.g. "$25", "From $50", "Free"
  description text,
  sort_order  int  not null default 0,
  created_at  timestamptz not null default now()
);

-- ── 3. availability_slots ─────────────────────────────────────
create table if not exists availability_slots (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid not null references profiles(id) on delete cascade,
  label       text not null,
  day_of_week text not null, -- 'Monday', 'Tuesday', etc.
  start_time  text not null, -- '09:00 AM'
  end_time    text not null, -- '12:00 PM'
  created_at  timestamptz not null default now()
);

-- ── 4. training_docs ──────────────────────────────────────────
-- Stores file metadata + vector embeddings for RAG
create table if not exists training_docs (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid not null references profiles(id) on delete cascade,
  file_name   text not null,
  file_path   text not null,  -- Supabase Storage path
  file_size   bigint not null default 0,
  chunk_index int not null default 0,
  content     text not null default '',
  embedding   vector(1536),   -- OpenAI text-embedding-3-small dimension
  uploaded_at timestamptz not null default now()
);

-- Index for fast vector similarity search
create index if not exists training_docs_embedding_idx
  on training_docs using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

-- ── 5. appointments ───────────────────────────────────────────
create table if not exists appointments (
  id              uuid primary key default gen_random_uuid(),
  profile_id      uuid not null references profiles(id) on delete cascade,
  customer_phone  text not null,
  customer_name   text not null default '',
  service         text not null default '',
  scheduled_at    timestamptz not null,
  status          text not null default 'pending'
                  check (status in ('pending', 'confirmed', 'canceled', 'completed')),
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ── 6. chat_sessions ──────────────────────────────────────────
create table if not exists chat_sessions (
  id              uuid primary key default gen_random_uuid(),
  profile_id      uuid not null references profiles(id) on delete cascade,
  customer_phone  text not null,
  customer_name   text not null default '',
  status          text not null default 'active'
                  check (status in ('active', 'resolved')),
  unread_count    int not null default 0,
  last_message    text,
  last_message_at timestamptz,
  created_at      timestamptz not null default now(),
  unique(profile_id, customer_phone)
);

-- ── 7. chat_messages ──────────────────────────────────────────
create table if not exists chat_messages (
  id          uuid primary key default gen_random_uuid(),
  session_id  uuid not null references chat_sessions(id) on delete cascade,
  role        text not null check (role in ('ai', 'user')),
  content     text not null,
  created_at  timestamptz not null default now()
);

-- ── 8. announcements ──────────────────────────────────────────
create table if not exists announcements (
  id            uuid primary key default gen_random_uuid(),
  profile_id    uuid not null references profiles(id) on delete cascade,
  title         text not null,
  message       text not null,
  audience      text not null default 'All Clients',
  scheduled_for timestamptz,
  status        text not null default 'scheduled'
                check (status in ('scheduled', 'sent', 'expired')),
  reach         int not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ── 9. offers ─────────────────────────────────────────────────
create table if not exists offers (
  id            uuid primary key default gen_random_uuid(),
  profile_id    uuid not null references profiles(id) on delete cascade,
  title         text not null,
  discount      text not null,
  description   text not null default '',
  valid_until   text not null default 'Ongoing',
  sent_count    int not null default 0,
  redeemed_count int not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ── 10. notifications ─────────────────────────────────────────
create table if not exists notifications (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid not null references profiles(id) on delete cascade,
  type        text not null check (type in ('success', 'info', 'warning')),
  title       text not null,
  message     text not null,
  read_at     timestamptz,
  created_at  timestamptz not null default now()
);

-- ============================================================
-- Row Level Security (RLS)
-- Every table is locked to the authenticated user's profile
-- ============================================================

alter table profiles           enable row level security;
alter table business_details   enable row level security;
alter table services           enable row level security;
alter table availability_slots enable row level security;
alter table training_docs      enable row level security;
alter table appointments       enable row level security;
alter table chat_sessions      enable row level security;
alter table chat_messages      enable row level security;
alter table announcements      enable row level security;
alter table offers             enable row level security;
alter table notifications      enable row level security;

-- profiles: user can only see/edit their own row
create policy "profiles: own row" on profiles
  for all using (auth.uid() = id);

-- business_details
create policy "business_details: own" on business_details
  for all using (profile_id = auth.uid());

-- services
create policy "services: own" on services
  for all using (profile_id = auth.uid());

-- availability_slots
create policy "availability_slots: own" on availability_slots
  for all using (profile_id = auth.uid());

-- training_docs
create policy "training_docs: own" on training_docs
  for all using (profile_id = auth.uid());

-- appointments
create policy "appointments: own" on appointments
  for all using (profile_id = auth.uid());

-- chat_sessions
create policy "chat_sessions: own" on chat_sessions
  for all using (profile_id = auth.uid());

-- chat_messages: accessible if session belongs to user
create policy "chat_messages: own session" on chat_messages
  for all using (
    session_id in (
      select id from chat_sessions where profile_id = auth.uid()
    )
  );

-- announcements
create policy "announcements: own" on announcements
  for all using (profile_id = auth.uid());

-- offers
create policy "offers: own" on offers
  for all using (profile_id = auth.uid());

-- notifications
create policy "notifications: own" on notifications
  for all using (profile_id = auth.uid());

-- ============================================================
-- Auto-create profile on user sign-up
-- ============================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, business_name, whatsapp_phone)
  values (new.id, '', '');
  return new;
end;
$$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
