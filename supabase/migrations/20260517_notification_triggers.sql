-- Notification triggers: fire email-dispatch HTTP calls when key events happen in the DB.
--
-- Uses the pg_net extension (preinstalled on Supabase) to POST to our /api/notify/dispatch
-- endpoint. Set these GUC settings via Supabase Dashboard -> Project Settings -> SQL:
--   app.notify_url     = 'https://<your-vercel-url>/api/notify/dispatch'
--   app.notify_secret  = <same value as INTERNAL_NOTIFY_SECRET on Vercel>
--
-- If pg_net is not enabled or settings are missing, the triggers no-op silently.

CREATE EXTENSION IF NOT EXISTS pg_net;

-- Helper: enqueue an HTTP POST to /api/notify/dispatch
CREATE OR REPLACE FUNCTION send_notification_http(
  recipient_id uuid,
  kind text,
  payload jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp, extensions
AS $$
DECLARE
  notify_url text;
  notify_secret text;
BEGIN
  -- Read the configured endpoint + secret from custom GUC settings.
  -- These are set per-project in Supabase Dashboard -> Database -> Custom postgres settings.
  BEGIN
    notify_url    := current_setting('app.notify_url', true);
    notify_secret := current_setting('app.notify_secret', true);
  EXCEPTION WHEN OTHERS THEN
    RETURN;
  END;

  IF notify_url IS NULL OR notify_url = '' THEN RETURN; END IF;

  PERFORM net.http_post(
    url     := notify_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-internal-secret', COALESCE(notify_secret, '')
    ),
    body    := jsonb_build_object(
      'kind',         kind,
      'recipient_id', recipient_id::text,
      'payload',      payload
    )
  );
EXCEPTION WHEN OTHERS THEN
  -- Never let notification problems break the underlying operation.
  RAISE WARNING 'send_notification_http failed (kind=%): %', kind, SQLERRM;
END;
$$;

DO $$
BEGIN
  EXECUTE 'ALTER FUNCTION public.send_notification_http(uuid, text, jsonb) OWNER TO postgres';
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- =============================================================
-- Trigger: signup / paid referral notifications via points_ledger
-- =============================================================
CREATE OR REPLACE FUNCTION trg_notify_points_event() RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  referred_name text;
  level int;
  kind_to_send text;
BEGIN
  -- Skip negative adjustments + non-referral sources
  IF NEW.points <= 0 THEN RETURN NEW; END IF;

  IF NEW.source LIKE 'signup_l%' THEN
    kind_to_send := 'signup_referral';
    level := substring(NEW.source from 'signup_l(\d+)')::int;
  ELSIF NEW.source LIKE 'paid_l%' THEN
    kind_to_send := 'paid_referral';
    level := substring(NEW.source from 'paid_l(\d+)')::int;
  ELSE
    RETURN NEW;
  END IF;

  IF NEW.related_user_id IS NOT NULL THEN
    SELECT display_name INTO referred_name FROM profiles WHERE id = NEW.related_user_id;
  END IF;

  PERFORM send_notification_http(
    NEW.user_id,
    kind_to_send,
    jsonb_build_object(
      'referred_name', COALESCE(referred_name, 'Someone'),
      'points', NEW.points,
      'level', level,
      'related_id', NEW.related_user_id::text
    )
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS points_ledger_notify ON points_ledger;
CREATE TRIGGER points_ledger_notify
  AFTER INSERT ON points_ledger
  FOR EACH ROW EXECUTE FUNCTION trg_notify_points_event();

-- =============================================================
-- Trigger: badge-reached notification
-- (only when a tier is freshly crossed — uses the existing badge logic)
-- =============================================================
CREATE OR REPLACE FUNCTION trg_notify_badge_reached() RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  thresholds jsonb;
  bronze int; silver int; gold int; platinum int;
  reached text := NULL;
BEGIN
  IF NEW.total_points IS NULL OR OLD.total_points IS NULL THEN RETURN NEW; END IF;
  IF NEW.total_points <= OLD.total_points THEN RETURN NEW; END IF;

  SELECT value INTO thresholds FROM system_settings WHERE key = 'badges.thresholds';
  IF thresholds IS NULL THEN RETURN NEW; END IF;
  bronze   := COALESCE((thresholds->>'bronze')::int,   0);
  silver   := COALESCE((thresholds->>'silver')::int,   0);
  gold     := COALESCE((thresholds->>'gold')::int,     0);
  platinum := COALESCE((thresholds->>'platinum')::int, 0);

  IF platinum > 0 AND OLD.total_points < platinum AND NEW.total_points >= platinum THEN reached := 'platinum';
  ELSIF gold     > 0 AND OLD.total_points < gold     AND NEW.total_points >= gold     THEN reached := 'gold';
  ELSIF silver   > 0 AND OLD.total_points < silver   AND NEW.total_points >= silver   THEN reached := 'silver';
  ELSIF bronze   > 0 AND OLD.total_points < bronze   AND NEW.total_points >= bronze   THEN reached := 'bronze';
  END IF;

  IF reached IS NULL THEN RETURN NEW; END IF;

  PERFORM send_notification_http(
    NEW.id,
    'badge_reached',
    jsonb_build_object('tier', reached, 'total_points', NEW.total_points)
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_notify_badge ON profiles;
CREATE TRIGGER profiles_notify_badge
  AFTER UPDATE OF total_points ON profiles
  FOR EACH ROW EXECUTE FUNCTION trg_notify_badge_reached();

DO $$
BEGIN
  EXECUTE 'ALTER FUNCTION public.trg_notify_points_event() OWNER TO postgres';
  EXECUTE 'ALTER FUNCTION public.trg_notify_badge_reached() OWNER TO postgres';
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
