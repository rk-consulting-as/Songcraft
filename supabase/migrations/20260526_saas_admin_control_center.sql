-- Phase 27: SaaS Admin Control Center
-- Internal platform settings, user controls, audit log, and moderation flags.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS disabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS disabled_at timestamptz,
  ADD COLUMN IF NOT EXISTS disabled_reason text,
  ADD COLUMN IF NOT EXISTS feature_overrides jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS admin_notes text;

ALTER TABLE artists
  ADD COLUMN IF NOT EXISTS admin_hidden boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS admin_hidden_at timestamptz,
  ADD COLUMN IF NOT EXISTS admin_hidden_reason text;

ALTER TABLE songs
  ADD COLUMN IF NOT EXISTS public_hidden boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS public_hidden_at timestamptz,
  ADD COLUMN IF NOT EXISTS public_hidden_reason text;

CREATE TABLE IF NOT EXISTS admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  target_user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  target_type text,
  target_id text,
  action text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS admin_platform_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  description text,
  updated_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS subscription_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  stripe_event_id text,
  event_type text NOT NULL,
  status text NOT NULL DEFAULT 'received',
  error text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS admin_audit_log_created_idx ON admin_audit_log (created_at DESC);
CREATE INDEX IF NOT EXISTS admin_audit_log_actor_idx ON admin_audit_log (actor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS subscription_events_created_idx ON subscription_events (created_at DESC);
CREATE INDEX IF NOT EXISTS subscription_events_user_idx ON subscription_events (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS profiles_disabled_idx ON profiles (disabled) WHERE disabled = true;
CREATE INDEX IF NOT EXISTS artists_admin_hidden_idx ON artists (admin_hidden) WHERE admin_hidden = true;
CREATE INDEX IF NOT EXISTS songs_public_hidden_idx ON songs (public_hidden) WHERE public_hidden = true;

INSERT INTO admin_platform_settings (key, value, description)
VALUES
  ('modules', '{"fan_hub":true,"epk":true,"embed":true,"campaigns":true,"onboarding":true}'::jsonb, 'Enable or disable platform modules'),
  ('maintenance_mode', '{"enabled":false,"message":""}'::jsonb, 'Maintenance mode switch'),
  ('ai_defaults', '{"provider":"anthropic","model":"claude-opus-4-6"}'::jsonb, 'Default AI provider and model'),
  ('plan_limits', '{"free":{"artists":1,"songs":10,"ai_generations_monthly":25},"pro":{"artists":null,"songs":null,"ai_generations_monthly":1000}}'::jsonb, 'Free/Pro limit overview'),
  ('public_signup', '{"enabled":true}'::jsonb, 'Allow public user signup')
ON CONFLICT (key) DO NOTHING;

ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_platform_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_events ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='admin_audit_log' AND policyname='admin_audit_select') THEN
    CREATE POLICY admin_audit_select ON admin_audit_log FOR SELECT USING (is_admin());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='admin_audit_log' AND policyname='admin_audit_insert') THEN
    CREATE POLICY admin_audit_insert ON admin_audit_log FOR INSERT WITH CHECK (is_admin());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='admin_platform_settings' AND policyname='admin_platform_settings_select') THEN
    CREATE POLICY admin_platform_settings_select ON admin_platform_settings FOR SELECT USING (is_admin());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='admin_platform_settings' AND policyname='admin_platform_settings_update') THEN
    CREATE POLICY admin_platform_settings_update ON admin_platform_settings FOR UPDATE USING (is_admin()) WITH CHECK (is_admin());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='subscription_events' AND policyname='subscription_events_admin_select') THEN
    CREATE POLICY subscription_events_admin_select ON subscription_events FOR SELECT USING (is_admin());
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
