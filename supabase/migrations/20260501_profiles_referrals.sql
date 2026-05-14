-- User profiles, roles, multi-level referral tracking, point ledger and system settings.
-- Builds the foundation for: admin area, referral links, MLM-style downline (5 levels), points.
--
-- Phase 1: schema + RLS + auto-profile-creation. Point awards happen via /api/profile/complete-signup.

-- =============================================================
-- 1. profiles — one row per auth.users
-- =============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id              uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name    text,
  role            text NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'moderator', 'admin', 'super_admin')),
  referral_code   text UNIQUE NOT NULL,
  referred_by     uuid REFERENCES profiles(id) ON DELETE SET NULL,
  paid_status     boolean NOT NULL DEFAULT false,
  paid_at         timestamptz,
  total_points    integer NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS profiles_referred_by_idx ON profiles (referred_by);
CREATE INDEX IF NOT EXISTS profiles_role_idx ON profiles (role) WHERE role <> 'user';

-- Generate a random 8-char base32 referral code (uppercase, no ambiguous chars).
CREATE OR REPLACE FUNCTION gen_referral_code() RETURNS text AS $$
DECLARE
  alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';  -- skip I, O, 0, 1 to avoid confusion
  code text := '';
  i int;
BEGIN
  FOR i IN 1..8 LOOP
    code := code || substr(alphabet, (1 + floor(random() * length(alphabet)))::int, 1);
  END LOOP;
  RETURN code;
END;
$$ LANGUAGE plpgsql VOLATILE;

-- Auto-create profile when a user signs up via Supabase auth.
CREATE OR REPLACE FUNCTION create_profile_for_new_user() RETURNS trigger AS $$
DECLARE
  new_code text;
  retries int := 0;
BEGIN
  -- Generate a unique referral code. Retry on rare collisions.
  LOOP
    new_code := gen_referral_code();
    EXIT WHEN NOT EXISTS (SELECT 1 FROM profiles WHERE referral_code = new_code);
    retries := retries + 1;
    IF retries > 5 THEN RAISE EXCEPTION 'Could not generate unique referral_code after 5 tries'; END IF;
  END LOOP;

  INSERT INTO profiles (id, display_name, referral_code, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'display_name', split_part(NEW.email, '@', 1)),
    new_code,
    'user'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS create_profile_on_signup ON auth.users;
CREATE TRIGGER create_profile_on_signup
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION create_profile_for_new_user();

-- updated_at trigger
CREATE OR REPLACE FUNCTION set_profiles_updated_at() RETURNS trigger AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS profiles_set_updated_at ON profiles;
CREATE TRIGGER profiles_set_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION set_profiles_updated_at();

-- =============================================================
-- 2. referral_relationships — one row PER LEVEL per referred user
-- =============================================================
-- Denormalised: if user A refers B who refers C, we store:
--   (referrer=A, referred=C, level=2)  -- so A's downline query is fast
--   (referrer=B, referred=C, level=1)
CREATE TABLE IF NOT EXISTS referral_relationships (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id  uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  referred_id  uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  level        integer NOT NULL CHECK (level BETWEEN 1 AND 5),
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (referrer_id, referred_id)
);
CREATE INDEX IF NOT EXISTS rr_referrer_level_idx ON referral_relationships (referrer_id, level);
CREATE INDEX IF NOT EXISTS rr_referred_idx       ON referral_relationships (referred_id);

-- =============================================================
-- 3. points_ledger — append-only log of point changes
-- =============================================================
CREATE TABLE IF NOT EXISTS points_ledger (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  points          integer NOT NULL,           -- can be negative for redemptions / adjustments
  source          text NOT NULL,              -- 'signup_l1', 'signup_l2', ..., 'paid_l1', ..., 'redemption', 'manual'
  related_user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,  -- the user that triggered the award (referee, or null)
  notes           text,
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS points_ledger_user_idx ON points_ledger (user_id, created_at DESC);

-- Keep profiles.total_points in sync via trigger
CREATE OR REPLACE FUNCTION update_profile_total_points() RETURNS trigger AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    UPDATE profiles SET total_points = total_points + NEW.points WHERE id = NEW.user_id;
  ELSIF (TG_OP = 'DELETE') THEN
    UPDATE profiles SET total_points = total_points - OLD.points WHERE id = OLD.user_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS points_ledger_sync_total ON points_ledger;
CREATE TRIGGER points_ledger_sync_total
  AFTER INSERT OR DELETE ON points_ledger
  FOR EACH ROW EXECUTE FUNCTION update_profile_total_points();

-- =============================================================
-- 4. system_settings — configurable values (point amounts etc.)
-- =============================================================
CREATE TABLE IF NOT EXISTS system_settings (
  key         text PRIMARY KEY,
  value       jsonb NOT NULL,
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- Seed default point amounts. Admin can edit these later.
INSERT INTO system_settings (key, value) VALUES
  ('points.signup', '{"l1": 0, "l2": 0, "l3": 0, "l4": 0, "l5": 0}'::jsonb),
  ('points.paid',   '{"l1": 0, "l2": 0, "l3": 0, "l4": 0, "l5": 0}'::jsonb),
  ('badges.thresholds', '{"bronze": 100, "silver": 500, "gold": 2000, "platinum": 10000}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- =============================================================
-- 5. Helper: is_admin / is_super_admin
-- =============================================================
CREATE OR REPLACE FUNCTION is_admin(user_id uuid DEFAULT auth.uid()) RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = user_id AND role IN ('admin', 'super_admin')
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_super_admin(user_id uuid DEFAULT auth.uid()) RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = user_id AND role = 'super_admin'
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- =============================================================
-- 6. RLS — all tables
-- =============================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE points_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- profiles policies
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='profiles' AND policyname='profiles_select_own_or_admin') THEN
    CREATE POLICY profiles_select_own_or_admin ON profiles FOR SELECT
      USING (auth.uid() = id OR is_admin());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='profiles' AND policyname='profiles_select_basic_for_authenticated') THEN
    -- All authenticated users can read basic public-ish fields of anyone (for downline display etc.)
    -- This is needed so the referrals page can show display_name of upline/downline.
    CREATE POLICY profiles_select_basic_for_authenticated ON profiles FOR SELECT
      TO authenticated
      USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='profiles' AND policyname='profiles_update_own') THEN
    CREATE POLICY profiles_update_own ON profiles FOR UPDATE
      USING (auth.uid() = id)
      WITH CHECK (auth.uid() = id AND role = (SELECT role FROM profiles WHERE id = auth.uid()));
      -- ^ users can update own profile but cannot change their own role
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='profiles' AND policyname='profiles_admin_update_all') THEN
    CREATE POLICY profiles_admin_update_all ON profiles FOR UPDATE
      USING (is_admin())
      WITH CHECK (is_admin());
  END IF;
END $$;

-- referral_relationships policies
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='referral_relationships' AND policyname='rr_select_own_or_admin') THEN
    CREATE POLICY rr_select_own_or_admin ON referral_relationships FOR SELECT
      USING (referrer_id = auth.uid() OR referred_id = auth.uid() OR is_admin());
  END IF;
  -- Inserts only via server (service-role / SECURITY DEFINER function). No client-side insert policy.
END $$;

-- points_ledger policies
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='points_ledger' AND policyname='ledger_select_own_or_admin') THEN
    CREATE POLICY ledger_select_own_or_admin ON points_ledger FOR SELECT
      USING (user_id = auth.uid() OR is_admin());
  END IF;
  -- Inserts only via server. No client policy.
END $$;

-- system_settings policies
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='system_settings' AND policyname='settings_read_all_authenticated') THEN
    CREATE POLICY settings_read_all_authenticated ON system_settings FOR SELECT
      TO authenticated
      USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='system_settings' AND policyname='settings_update_super_admin') THEN
    CREATE POLICY settings_update_super_admin ON system_settings FOR UPDATE
      USING (is_super_admin())
      WITH CHECK (is_super_admin());
  END IF;
END $$;

COMMENT ON COLUMN profiles.role IS 'user / moderator / admin / super_admin. Only admins can change others. super_admin set manually after first signup.';
COMMENT ON TABLE  referral_relationships IS 'Denormalised upline tree, one row per (ancestor, descendant, level). Max 5 levels.';
COMMENT ON TABLE  points_ledger IS 'Append-only log of point changes. profiles.total_points stays in sync via trigger.';

-- =============================================================
-- 7. RPC: attribute_referral — called from client after signup
-- =============================================================
-- Looks up the referrer by code, walks up 5 levels, creates referral_relationships rows,
-- awards signup points per system_settings.points.signup config.
-- SECURITY DEFINER bypasses RLS so it can write to relationship/ledger tables.
CREATE OR REPLACE FUNCTION attribute_referral(ref_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_id    uuid := auth.uid();
  referrer_id  uuid;
  upline_id    uuid;
  signup_pts   jsonb;
  level        int := 1;
  level_pts    int;
  levels_done  int := 0;
BEGIN
  IF caller_id IS NULL THEN
    RETURN jsonb_build_object('error', 'not authenticated');
  END IF;

  -- Skip if user already has a referrer (idempotent)
  IF (SELECT referred_by FROM profiles WHERE id = caller_id) IS NOT NULL THEN
    RETURN jsonb_build_object('error', 'already attributed');
  END IF;

  -- Find direct referrer by code (case-insensitive)
  SELECT id INTO referrer_id FROM profiles WHERE upper(referral_code) = upper(ref_code);
  IF referrer_id IS NULL THEN
    RETURN jsonb_build_object('error', 'invalid referral code');
  END IF;
  IF referrer_id = caller_id THEN
    RETURN jsonb_build_object('error', 'cannot refer yourself');
  END IF;

  -- Set the direct referrer
  UPDATE profiles SET referred_by = referrer_id WHERE id = caller_id;

  -- Get configured signup point amounts
  SELECT value INTO signup_pts FROM system_settings WHERE key = 'points.signup';

  -- Walk up the chain, up to 5 levels
  upline_id := referrer_id;
  WHILE upline_id IS NOT NULL AND level <= 5 LOOP
    INSERT INTO referral_relationships (referrer_id, referred_id, level)
    VALUES (upline_id, caller_id, level)
    ON CONFLICT (referrer_id, referred_id) DO NOTHING;

    level_pts := COALESCE((signup_pts -> ('l' || level::text))::int, 0);
    IF level_pts > 0 THEN
      INSERT INTO points_ledger (user_id, points, source, related_user_id)
      VALUES (upline_id, level_pts, 'signup_l' || level::text, caller_id);
    END IF;

    SELECT referred_by INTO upline_id FROM profiles WHERE id = upline_id;
    level := level + 1;
    levels_done := levels_done + 1;
  END LOOP;

  RETURN jsonb_build_object('success', true, 'levels_attributed', levels_done);
END;
$$;

-- =============================================================
-- 8. RPC: mark_user_paid — called when a user becomes paying customer
-- =============================================================
-- Awards paid-conversion points up the upline chain. Idempotent on paid_status.
CREATE OR REPLACE FUNCTION mark_user_paid(target_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_role text;
  current_paid boolean;
  paid_pts   jsonb;
  rel        record;
  level_pts  int;
  awarded    int := 0;
BEGIN
  -- Only admin/super_admin can call this directly. (Production: also call from Stripe webhook with service role.)
  SELECT role INTO caller_role FROM profiles WHERE id = auth.uid();
  IF caller_role NOT IN ('admin', 'super_admin') THEN
    RETURN jsonb_build_object('error', 'not authorised');
  END IF;

  SELECT paid_status INTO current_paid FROM profiles WHERE id = target_user_id;
  IF current_paid THEN
    RETURN jsonb_build_object('error', 'already paid');
  END IF;

  UPDATE profiles SET paid_status = true, paid_at = now() WHERE id = target_user_id;

  SELECT value INTO paid_pts FROM system_settings WHERE key = 'points.paid';

  FOR rel IN
    SELECT referrer_id, level FROM referral_relationships
    WHERE referred_id = target_user_id ORDER BY level
  LOOP
    level_pts := COALESCE((paid_pts -> ('l' || rel.level::text))::int, 0);
    IF level_pts > 0 THEN
      INSERT INTO points_ledger (user_id, points, source, related_user_id, notes)
      VALUES (rel.referrer_id, level_pts, 'paid_l' || rel.level::text, target_user_id, 'paid conversion');
      awarded := awarded + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object('success', true, 'awards', awarded);
END;
$$;

GRANT EXECUTE ON FUNCTION attribute_referral(text) TO authenticated;
GRANT EXECUTE ON FUNCTION mark_user_paid(uuid)    TO authenticated;
