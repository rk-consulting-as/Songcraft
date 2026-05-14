-- Stream tracking & points for listening.
--
-- Model:
--   - song_plays: append-only log of every play event. Source tells us if it was
--     an internal HTML5 audio play (we control the audio + can verify duration)
--     or an embed click (Spotify/YouTube/etc — counted as engagement, not stream).
--   - songs.internal_play_count: aggregate counter for internal full plays.
--   - songs.embed_click_count: aggregate counter for embed click-throughs.
--   - Points awarded to LISTENERS for internal full plays (with daily cap).
--   - Points NOT awarded to song owner per play (avoid wash trading / friends
--     farming each other's songs). Owner sees engagement via the counters.

-- =============================================================
-- 1. Counters on songs
-- =============================================================
ALTER TABLE songs
  ADD COLUMN IF NOT EXISTS internal_play_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS embed_click_count   integer NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS songs_internal_play_count_idx
  ON songs (internal_play_count DESC) WHERE internal_play_count > 0;

-- =============================================================
-- 2. song_plays log
-- =============================================================
-- source values:
--   'internal'       — HTML5 audio in Songcraft (Suno upload or other direct file)
--   'spotify_embed'  — user clicked play on the Spotify iframe
--   'youtube_embed'  — YouTube iframe
--   'soundcloud_embed' — SoundCloud widget
--   'apple_embed'    — Apple Music iframe
CREATE TABLE IF NOT EXISTS song_plays (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  song_id                 uuid NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
  listener_id             uuid REFERENCES profiles(id) ON DELETE SET NULL,
  source                  text NOT NULL CHECK (source IN ('internal','spotify_embed','youtube_embed','soundcloud_embed','apple_embed')),
  duration_listened_seconds integer NOT NULL DEFAULT 0,
  completed               boolean NOT NULL DEFAULT false,
  points_awarded          integer NOT NULL DEFAULT 0,
  ip_hash                 text,                   -- hashed IP (anti-abuse, not identifying)
  created_at              timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS song_plays_song_idx     ON song_plays (song_id, created_at DESC);
CREATE INDEX IF NOT EXISTS song_plays_listener_idx ON song_plays (listener_id, created_at DESC) WHERE listener_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS song_plays_created_idx  ON song_plays (created_at DESC);

ALTER TABLE song_plays ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  -- Anyone (incl anon) can insert a play. The /api/song/play endpoint runs all
  -- the validation server-side using service role, so direct inserts only need
  -- to be possible — they get rejected later anyway if abusive.
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='song_plays' AND policyname='song_plays_public_insert') THEN
    CREATE POLICY song_plays_public_insert ON song_plays
      FOR INSERT
      WITH CHECK (true);
  END IF;

  -- Listener can read own plays. Song owner can read plays on their songs. Admin reads all.
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='song_plays' AND policyname='song_plays_select') THEN
    CREATE POLICY song_plays_select ON song_plays
      FOR SELECT
      USING (
        listener_id = auth.uid()
        OR EXISTS (SELECT 1 FROM songs s WHERE s.id = song_plays.song_id AND s.user_id = auth.uid())
        OR is_admin()
      );
  END IF;
END $$;

-- =============================================================
-- 3. Trigger: bump the counter when a play is logged
-- =============================================================
CREATE OR REPLACE FUNCTION bump_song_play_counter() RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.source = 'internal' AND NEW.completed THEN
    UPDATE songs SET internal_play_count = internal_play_count + 1 WHERE id = NEW.song_id;
  ELSIF NEW.source LIKE '%_embed' THEN
    UPDATE songs SET embed_click_count = embed_click_count + 1 WHERE id = NEW.song_id;
  END IF;
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  EXECUTE 'ALTER FUNCTION public.bump_song_play_counter() OWNER TO postgres';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not transfer ownership of bump_song_play_counter: %', SQLERRM;
END $$;

DROP TRIGGER IF EXISTS song_plays_bump_counter ON song_plays;
CREATE TRIGGER song_plays_bump_counter
  AFTER INSERT ON song_plays
  FOR EACH ROW EXECUTE FUNCTION bump_song_play_counter();

-- =============================================================
-- 4. system_settings additions
-- =============================================================
-- Points awarded to listener:
--   full_play     = listened >= 80% of song or completed
--   partial_play  = listened 30-80% (smaller reward)
--   embed_click   = clicked play on an external embed (smallest, just for discovery)
-- daily_cap = max points a single listener can earn from listening per day
INSERT INTO system_settings (key, value) VALUES
  ('points.listen',          '{"full_play": 2, "partial_play": 1, "embed_click": 1}'::jsonb),
  ('points.listen_daily_cap','50'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- =============================================================
-- 5. RPC: award_listen_points
-- =============================================================
-- Called by /api/song/play after validating the play. Awards points to listener
-- if they haven't hit the daily cap. Returns how many points were actually awarded.
CREATE OR REPLACE FUNCTION award_listen_points(
  p_listener_id uuid,
  p_song_id     uuid,
  p_source      text,
  p_completed   boolean,
  p_duration    integer,
  p_song_duration integer  -- estimated total length in seconds (or 0 if unknown)
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  pts_config    jsonb;
  daily_cap_jb  jsonb;
  daily_cap     int;
  full_pts      int;
  partial_pts   int;
  embed_pts     int;
  to_award      int := 0;
  earned_today  int := 0;
BEGIN
  IF p_listener_id IS NULL THEN RETURN 0; END IF;

  -- Read configured point values
  SELECT value INTO pts_config FROM system_settings WHERE key = 'points.listen';
  SELECT value INTO daily_cap_jb FROM system_settings WHERE key = 'points.listen_daily_cap';
  daily_cap   := COALESCE(daily_cap_jb::text::int, 50);
  full_pts    := COALESCE((pts_config->>'full_play')::int, 0);
  partial_pts := COALESCE((pts_config->>'partial_play')::int, 0);
  embed_pts   := COALESCE((pts_config->>'embed_click')::int, 0);

  -- Determine reward type
  IF p_source = 'internal' THEN
    IF p_completed OR (p_song_duration > 0 AND p_duration::float / p_song_duration::float >= 0.8) THEN
      to_award := full_pts;
    ELSIF p_duration >= 30 THEN
      to_award := partial_pts;
    END IF;
  ELSE
    to_award := embed_pts;
  END IF;

  IF to_award <= 0 THEN RETURN 0; END IF;

  -- Don't reward listening to your own song
  IF EXISTS (SELECT 1 FROM songs WHERE id = p_song_id AND user_id = p_listener_id) THEN
    RETURN 0;
  END IF;

  -- Anti-farming: one award per (listener, song) per 24h
  IF EXISTS (
    SELECT 1 FROM points_ledger
    WHERE user_id = p_listener_id
      AND related_user_id IS NULL          -- listen points have null related_user (song is the subject)
      AND source LIKE 'listen_%'
      AND notes = p_song_id::text
      AND created_at > now() - interval '24 hours'
  ) THEN
    RETURN 0;
  END IF;

  -- Daily cap check
  SELECT COALESCE(SUM(points), 0) INTO earned_today
  FROM points_ledger
  WHERE user_id = p_listener_id
    AND source LIKE 'listen_%'
    AND created_at > date_trunc('day', now());

  IF earned_today + to_award > daily_cap THEN
    to_award := GREATEST(0, daily_cap - earned_today);
  END IF;

  IF to_award <= 0 THEN RETURN 0; END IF;

  -- Award it
  INSERT INTO points_ledger (user_id, points, source, related_user_id, notes)
  VALUES (
    p_listener_id,
    to_award,
    CASE
      WHEN p_source = 'internal' AND p_completed THEN 'listen_full'
      WHEN p_source = 'internal' THEN 'listen_partial'
      ELSE 'listen_embed'
    END,
    NULL,
    p_song_id::text   -- store song_id in notes for de-dup check above
  );

  RETURN to_award;
END;
$$;

GRANT EXECUTE ON FUNCTION award_listen_points(uuid, uuid, text, boolean, integer, integer) TO authenticated, anon;

DO $$
BEGIN
  EXECUTE 'ALTER FUNCTION public.award_listen_points(uuid, uuid, text, boolean, integer, integer) OWNER TO postgres';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not transfer ownership of award_listen_points: %', SQLERRM;
END $$;

NOTIFY pgrst, 'reload schema';
