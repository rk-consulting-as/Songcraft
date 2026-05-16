-- Song backstory + universal outbound-link click tracker.

-- =============================================================
-- 1. Backstory on songs
-- =============================================================
ALTER TABLE songs
  ADD COLUMN IF NOT EXISTS backstory text;

-- =============================================================
-- 2. link_clicks — track outbound clicks on song / artist links
-- =============================================================
CREATE TABLE IF NOT EXISTS link_clicks (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  song_id      uuid REFERENCES songs(id) ON DELETE CASCADE,
  artist_id    uuid REFERENCES artists(id) ON DELETE CASCADE,
  target_url   text NOT NULL,
  target_type  text NOT NULL CHECK (target_type IN ('spotify','youtube','apple_music','soundcloud','suno','tiktok','instagram','facebook','twitter','website','other')),
  source_page  text,                                    -- '/s/<id>' or '/p/<slug>' etc
  clicker_id   uuid REFERENCES profiles(id) ON DELETE SET NULL,
  ip_hash      text,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS link_clicks_song_idx    ON link_clicks (song_id, created_at DESC)    WHERE song_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS link_clicks_artist_idx  ON link_clicks (artist_id, created_at DESC)  WHERE artist_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS link_clicks_target_idx  ON link_clicks (target_type, created_at DESC);
CREATE INDEX IF NOT EXISTS link_clicks_created_idx ON link_clicks (created_at DESC);

ALTER TABLE link_clicks ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  -- Public can insert (so anon clicks count too)
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='link_clicks' AND policyname='link_clicks_public_insert') THEN
    CREATE POLICY link_clicks_public_insert ON link_clicks
      FOR INSERT
      WITH CHECK (true);
  END IF;

  -- Song / artist owner sees own data
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='link_clicks' AND policyname='link_clicks_owner_select') THEN
    CREATE POLICY link_clicks_owner_select ON link_clicks
      FOR SELECT
      USING (
        EXISTS (SELECT 1 FROM songs s   WHERE s.id = link_clicks.song_id   AND s.user_id   = auth.uid())
        OR EXISTS (SELECT 1 FROM artists a WHERE a.id = link_clicks.artist_id AND a.user_id = auth.uid())
        OR clicker_id = auth.uid()
      );
  END IF;

  -- Admin reads all
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='link_clicks' AND policyname='link_clicks_admin_select') THEN
    CREATE POLICY link_clicks_admin_select ON link_clicks
      FOR SELECT
      USING (is_admin());
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
