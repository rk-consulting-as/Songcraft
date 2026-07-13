-- Follow system + activity feed for the Nordic creator community.
--
-- Model: pull-based feed (fan-out on read), which scales fine for our expected size
-- and avoids write amplification. Reading "my feed" = SELECT activity_feed rows where
-- actor_id is in my follow list.

-- =============================================================
-- 1. follows — directed edges (follower -> following)
-- =============================================================
CREATE TABLE IF NOT EXISTS follows (
  follower_id   uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  following_id  uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (follower_id, following_id),
  CHECK (follower_id <> following_id)
);

CREATE INDEX IF NOT EXISTS follows_follower_idx  ON follows (follower_id, created_at DESC);
CREATE INDEX IF NOT EXISTS follows_following_idx ON follows (following_id, created_at DESC);

ALTER TABLE follows ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  -- Anyone (incl. anon) can read follow edges — counts are public on creator profiles.
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='follows' AND policyname='follows_public_select') THEN
    CREATE POLICY follows_public_select ON follows
      FOR SELECT
      USING (true);
  END IF;

  -- Only authenticated users can follow, and only as themselves.
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='follows' AND policyname='follows_owner_insert') THEN
    CREATE POLICY follows_owner_insert ON follows
      FOR INSERT
      WITH CHECK (follower_id = auth.uid());
  END IF;

  -- Only the follower can unfollow.
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='follows' AND policyname='follows_owner_delete') THEN
    CREATE POLICY follows_owner_delete ON follows
      FOR DELETE
      USING (follower_id = auth.uid());
  END IF;
END $$;

-- =============================================================
-- 2. activity_feed — chronological public log of community events
-- =============================================================
-- kind: 'artist_published' | 'song_released' | 'badge_reached' | 'studio_published' | 'joined_songcraft'
-- subject_id / subject_type point at the thing the activity is about (artist/song/profile)
-- subject_label is denormalised (e.g. artist name) so the feed renders without N+1 fetches
CREATE TABLE IF NOT EXISTS activity_feed (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id       uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  kind           text NOT NULL,
  subject_id     uuid,
  subject_type   text,
  subject_label  text,
  metadata       jsonb,
  visible        boolean NOT NULL DEFAULT true,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS activity_actor_idx   ON activity_feed (actor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS activity_created_idx ON activity_feed (created_at DESC) WHERE visible = true;

ALTER TABLE activity_feed ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  -- Activity feed is public-by-design (creator portfolio). Anyone can read visible entries.
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='activity_feed' AND policyname='activity_public_select') THEN
    CREATE POLICY activity_public_select ON activity_feed
      FOR SELECT
      USING (visible = true OR actor_id = auth.uid() OR is_admin());
  END IF;

  -- Admins can hide entries (moderation).
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='activity_feed' AND policyname='activity_admin_update') THEN
    CREATE POLICY activity_admin_update ON activity_feed
      FOR UPDATE
      USING (is_admin())
      WITH CHECK (is_admin());
  END IF;
  -- Inserts only via SECURITY DEFINER triggers below.
END $$;

-- =============================================================
-- 3. Auto-emit triggers
-- =============================================================

-- Helper: emit an activity row from a trigger.
CREATE OR REPLACE FUNCTION emit_activity(
  p_actor_id      uuid,
  p_kind          text,
  p_subject_id    uuid,
  p_subject_type  text,
  p_subject_label text,
  p_metadata      jsonb DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF p_actor_id IS NULL THEN RETURN; END IF;
  INSERT INTO activity_feed (actor_id, kind, subject_id, subject_type, subject_label, metadata)
  VALUES (p_actor_id, p_kind, p_subject_id, p_subject_type, p_subject_label, p_metadata);
END;
$$;

DO $$
BEGIN
  EXECUTE 'ALTER FUNCTION public.emit_activity(uuid, text, uuid, text, text, jsonb) OWNER TO postgres';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not transfer ownership of emit_activity: %', SQLERRM;
END $$;

-- 3a) Artist made public (page_enabled went false -> true)
CREATE OR REPLACE FUNCTION trg_artist_published() RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.page_enabled = true AND (OLD.page_enabled IS DISTINCT FROM true) THEN
    PERFORM emit_activity(
      NEW.user_id,
      'artist_published',
      NEW.id,
      'artist',
      NEW.name,
      jsonb_build_object('page_slug', NEW.page_slug)
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS artist_published_emit ON artists;
CREATE TRIGGER artist_published_emit
  AFTER INSERT OR UPDATE ON artists
  FOR EACH ROW EXECUTE FUNCTION trg_artist_published();

-- 3b) Song status changed to 'released'
CREATE OR REPLACE FUNCTION trg_song_released() RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  artist_name text;
BEGIN
  IF NEW.status = 'released' AND (OLD.status IS DISTINCT FROM 'released') THEN
    SELECT name INTO artist_name FROM artists WHERE id = NEW.artist_id;
    PERFORM emit_activity(
      NEW.user_id,
      'song_released',
      NEW.id,
      'song',
      NEW.title,
      jsonb_build_object('artist_id', NEW.artist_id, 'artist_name', artist_name)
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS song_released_emit ON songs;
CREATE TRIGGER song_released_emit
  AFTER INSERT OR UPDATE ON songs
  FOR EACH ROW EXECUTE FUNCTION trg_song_released();

-- 3c) Studio page enabled
CREATE OR REPLACE FUNCTION trg_studio_published() RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  user_name text;
BEGIN
  IF NEW.enabled = true AND (OLD.enabled IS DISTINCT FROM true) THEN
    SELECT display_name INTO user_name FROM profiles WHERE id = NEW.user_id;
    PERFORM emit_activity(
      NEW.user_id,
      'studio_published',
      NEW.id,
      'studio_page',
      COALESCE(NEW.name, user_name, 'Studio'),
      jsonb_build_object('slug', NEW.slug)
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS studio_published_emit ON studio_pages;
CREATE TRIGGER studio_published_emit
  AFTER INSERT OR UPDATE ON studio_pages
  FOR EACH ROW EXECUTE FUNCTION trg_studio_published();

-- 3d) Badge tier reached — emit when total_points crosses a configured threshold.
CREATE OR REPLACE FUNCTION trg_badge_reached() RETURNS trigger
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

  -- Highest tier crossed by this update
  IF platinum > 0 AND OLD.total_points < platinum AND NEW.total_points >= platinum THEN reached := 'platinum';
  ELSIF gold     > 0 AND OLD.total_points < gold     AND NEW.total_points >= gold     THEN reached := 'gold';
  ELSIF silver   > 0 AND OLD.total_points < silver   AND NEW.total_points >= silver   THEN reached := 'silver';
  ELSIF bronze   > 0 AND OLD.total_points < bronze   AND NEW.total_points >= bronze   THEN reached := 'bronze';
  END IF;

  IF reached IS NOT NULL THEN
    PERFORM emit_activity(
      NEW.id,
      'badge_reached',
      NEW.id,
      'profile',
      COALESCE(NEW.display_name, 'Anonym'),
      jsonb_build_object('tier', reached, 'total_points', NEW.total_points)
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS badge_reached_emit ON profiles;
CREATE TRIGGER badge_reached_emit
  AFTER UPDATE OF total_points ON profiles
  FOR EACH ROW EXECUTE FUNCTION trg_badge_reached();

-- =============================================================
-- 4. Ownership cleanup
-- =============================================================
DO $$
BEGIN
  EXECUTE 'ALTER FUNCTION public.trg_artist_published()  OWNER TO postgres';
  EXECUTE 'ALTER FUNCTION public.trg_song_released()     OWNER TO postgres';
  EXECUTE 'ALTER FUNCTION public.trg_studio_published()  OWNER TO postgres';
  EXECUTE 'ALTER FUNCTION public.trg_badge_reached()     OWNER TO postgres';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not transfer trigger function ownership: %', SQLERRM;
END $$;

NOTIFY pgrst, 'reload schema';
