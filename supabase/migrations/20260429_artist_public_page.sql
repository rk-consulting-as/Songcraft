-- Public artist page: opt-in, slug-based URL at /p/{slug}.
-- Designed so we can flip on monetization gates later (e.g. require subscription for custom slug,
-- ad-free page, custom domain, etc.) without a schema change — just check a flag in page_settings.

ALTER TABLE artists
  ADD COLUMN IF NOT EXISTS page_enabled  boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS page_slug     text,
  ADD COLUMN IF NOT EXISTS page_settings jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Slug must be unique across all users when set.
CREATE UNIQUE INDEX IF NOT EXISTS artists_page_slug_uniq
  ON artists (page_slug)
  WHERE page_slug IS NOT NULL;

CREATE INDEX IF NOT EXISTS artists_page_enabled_idx
  ON artists (page_enabled)
  WHERE page_enabled = true;

-- Public SELECT for enabled artist pages — readable by anyone, no auth needed.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'artists' AND policyname = 'artists_public_page_read') THEN
    CREATE POLICY artists_public_page_read ON artists FOR SELECT
      USING (page_enabled = true);
  END IF;
END $$;

-- Public SELECT for songs that belong to an enabled artist.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'songs' AND policyname = 'songs_public_page_read') THEN
    CREATE POLICY songs_public_page_read ON songs FOR SELECT
      USING (EXISTS (SELECT 1 FROM artists a WHERE a.id = songs.artist_id AND a.page_enabled = true));
  END IF;
END $$;

-- Public SELECT for albums of enabled artists.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'albums' AND policyname = 'albums_public_page_read') THEN
    CREATE POLICY albums_public_page_read ON albums FOR SELECT
      USING (EXISTS (SELECT 1 FROM artists a WHERE a.id = albums.artist_id AND a.page_enabled = true));
  END IF;
END $$;

COMMENT ON COLUMN artists.page_enabled  IS 'When true, the artist has a public page at /p/<page_slug>. Opt-in.';
COMMENT ON COLUMN artists.page_slug     IS 'URL slug for the public page. Unique. Lowercase, hyphenated.';
COMMENT ON COLUMN artists.page_settings IS 'JSONB with section visibility toggles, featured YouTube videos, accent color, etc.';
