-- Phase 19: Stripe Free/Pro plans
-- Soft subscription layer. Does not block testing by itself.

-- =============================================================
-- 1. Plans and feature limits
-- =============================================================
CREATE TABLE IF NOT EXISTS plans (
  id          text PRIMARY KEY,
  name        text NOT NULL,
  description text,
  stripe_price_id text,
  active      boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS feature_limits (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id     text NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  feature_key text NOT NULL,
  limit_value integer,
  enabled     boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (plan_id, feature_key)
);

INSERT INTO plans (id, name, description, active)
VALUES
  ('free', 'Free', 'Starter plan for testing Songcraft.', true),
  ('pro',  'Pro',  'Pro plan for artists building an audience.', true)
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name,
    description = EXCLUDED.description,
    active = EXCLUDED.active;

INSERT INTO feature_limits (plan_id, feature_key, limit_value, enabled)
VALUES
  ('free', 'artists', 1, true),
  ('free', 'songs', 10, true),
  ('free', 'public_pages', 1, true),
  ('free', 'ai_generations_monthly', 25, true),
  ('free', 'advanced_analytics', NULL, false),
  ('free', 'newsletter_analytics', NULL, false),
  ('free', 'qr_analytics', NULL, false),
  ('free', 'advanced_templates', NULL, false),
  ('free', 'embed_widget', NULL, false),
  ('free', 'custom_branding', NULL, false),
  ('free', 'remove_songcraft_branding', NULL, false),
  ('pro', 'artists', NULL, true),
  ('pro', 'songs', NULL, true),
  ('pro', 'public_pages', NULL, true),
  ('pro', 'ai_generations_monthly', 1000, true),
  ('pro', 'advanced_analytics', NULL, true),
  ('pro', 'newsletter_analytics', NULL, true),
  ('pro', 'qr_analytics', NULL, true),
  ('pro', 'advanced_templates', NULL, true),
  ('pro', 'embed_widget', NULL, true),
  ('pro', 'custom_branding', NULL, true),
  ('pro', 'remove_songcraft_branding', NULL, true)
ON CONFLICT (plan_id, feature_key) DO UPDATE
SET limit_value = EXCLUDED.limit_value,
    enabled = EXCLUDED.enabled;

-- =============================================================
-- 2. Subscriptions
-- =============================================================
CREATE TABLE IF NOT EXISTS subscriptions (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  plan_id                text NOT NULL REFERENCES plans(id),
  status                 text NOT NULL DEFAULT 'free',
  stripe_customer_id     text,
  stripe_subscription_id text,
  current_period_start   timestamptz,
  current_period_end     timestamptz,
  cancel_at_period_end   boolean NOT NULL DEFAULT false,
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id),
  UNIQUE (stripe_customer_id),
  UNIQUE (stripe_subscription_id)
);

CREATE INDEX IF NOT EXISTS subscriptions_user_plan_idx ON subscriptions (user_id, plan_id, status);
CREATE INDEX IF NOT EXISTS subscriptions_stripe_customer_idx ON subscriptions (stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;

CREATE OR REPLACE FUNCTION set_subscriptions_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS subscriptions_set_updated_at ON subscriptions;
CREATE TRIGGER subscriptions_set_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION set_subscriptions_updated_at();

-- =============================================================
-- 3. AI usage events
-- =============================================================
CREATE TABLE IF NOT EXISTS ai_usage_events (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  feature_key text NOT NULL DEFAULT 'ai_generation',
  provider    text,
  model       text,
  status      text NOT NULL DEFAULT 'success' CHECK (status IN ('success', 'error')),
  metadata    jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ai_usage_events_user_created_idx ON ai_usage_events (user_id, created_at DESC);

-- =============================================================
-- 4. RLS
-- =============================================================
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_usage_events ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='plans' AND policyname='plans_public_select') THEN
    CREATE POLICY plans_public_select ON plans FOR SELECT USING (active = true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='feature_limits' AND policyname='feature_limits_public_select') THEN
    CREATE POLICY feature_limits_public_select ON feature_limits FOR SELECT USING (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='subscriptions' AND policyname='subscriptions_owner_select') THEN
    CREATE POLICY subscriptions_owner_select ON subscriptions
      FOR SELECT
      USING (user_id = auth.uid());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='subscriptions' AND policyname='subscriptions_admin_select') THEN
    CREATE POLICY subscriptions_admin_select ON subscriptions
      FOR SELECT
      USING (is_admin());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='ai_usage_events' AND policyname='ai_usage_owner_select') THEN
    CREATE POLICY ai_usage_owner_select ON ai_usage_events
      FOR SELECT
      USING (user_id = auth.uid());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='ai_usage_events' AND policyname='ai_usage_owner_insert') THEN
    CREATE POLICY ai_usage_owner_insert ON ai_usage_events
      FOR INSERT
      WITH CHECK (user_id = auth.uid());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='ai_usage_events' AND policyname='ai_usage_admin_select') THEN
    CREATE POLICY ai_usage_admin_select ON ai_usage_events
      FOR SELECT
      USING (is_admin());
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
