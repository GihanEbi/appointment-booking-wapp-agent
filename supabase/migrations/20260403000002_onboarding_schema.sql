-- ============================================================
-- Onboarding schema additions
-- ============================================================

-- 1. Add onboarding_completed flag to profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS onboarding_completed boolean NOT NULL DEFAULT false;

-- 2. Extend business_details with category + agent settings
ALTER TABLE business_details
  ADD COLUMN IF NOT EXISTS category            text,
  ADD COLUMN IF NOT EXISTS category_other      text,
  ADD COLUMN IF NOT EXISTS auto_confirm        boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS allow_staff_pick    boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS schedule_mode       text CHECK (schedule_mode IN ('daily', 'weekly', 'custom'));

-- 3. Sub-services table
CREATE TABLE IF NOT EXISTS services (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id  uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name        text NOT NULL,
  price       text,           -- free-form e.g. "$25", "From $50", "Free"
  description text,
  sort_order  int  NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "services: own" ON services
  FOR ALL USING (profile_id = auth.uid());
