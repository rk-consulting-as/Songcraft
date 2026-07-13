-- Per-user email notification preferences.
-- Defaults: all event types are ON, paused = false, frequency = 'immediate'.

CREATE TABLE IF NOT EXISTS notification_preferences (
  user_id                uuid PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  email_new_message      boolean NOT NULL DEFAULT true,
  email_new_follower     boolean NOT NULL DEFAULT true,
  email_signup_referral  boolean NOT NULL DEFAULT true,
  email_paid_referral    boolean NOT NULL DEFAULT true,
  email_badge_reached    boolean NOT NULL DEFAULT true,
  email_ticket_update    boolean NOT NULL DEFAULT true,
  email_paused           boolean NOT NULL DEFAULT false,
  frequency              text    NOT NULL DEFAULT 'immediate' CHECK (frequency IN ('immediate','daily','off')),
  updated_at             timestamptz NOT NULL DEFAULT now()
);

-- Track when we last emailed each user about a particular thing, used for rate limiting
CREATE TABLE IF NOT EXISTS notification_log (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  kind         text NOT NULL,
  related_id   text,
  email_sent   boolean NOT NULL DEFAULT false,
  error        text,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS notification_log_user_idx ON notification_log (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS notification_log_kind_idx ON notification_log (kind, created_at DESC);

ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_log         ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  -- Own row select/update on preferences
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='notification_preferences' AND policyname='prefs_own_all') THEN
    CREATE POLICY prefs_own_all ON notification_preferences
      FOR ALL TO authenticated
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
  END IF;

  -- Admin can read all (for debugging)
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='notification_preferences' AND policyname='prefs_admin_select') THEN
    CREATE POLICY prefs_admin_select ON notification_preferences
      FOR SELECT
      USING (is_admin());
  END IF;

  -- Notification log: own read, admin read all. Inserts only via server.
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='notification_log' AND policyname='log_own_select') THEN
    CREATE POLICY log_own_select ON notification_log
      FOR SELECT
      USING (user_id = auth.uid() OR is_admin());
  END IF;
END $$;

-- Backfill defaults for all existing users
INSERT INTO notification_preferences (user_id)
SELECT id FROM profiles
ON CONFLICT (user_id) DO NOTHING;

-- Trigger: when a new profile is created, also create default notification prefs
CREATE OR REPLACE FUNCTION create_default_notification_prefs() RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO notification_preferences (user_id) VALUES (NEW.id) ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS profiles_default_notif_prefs ON profiles;
CREATE TRIGGER profiles_default_notif_prefs
  AFTER INSERT ON profiles
  FOR EACH ROW EXECUTE FUNCTION create_default_notification_prefs();

DO $$
BEGIN
  EXECUTE 'ALTER FUNCTION public.create_default_notification_prefs() OWNER TO postgres';
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

NOTIFY pgrst, 'reload schema';
