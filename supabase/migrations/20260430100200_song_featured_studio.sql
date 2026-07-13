-- Producers can mark individual songs to be featured under their artist on the studio page.
-- Simple boolean — default off. The studio public page reads this to build a mini playlist per artist.

ALTER TABLE songs
  ADD COLUMN IF NOT EXISTS featured_on_studio_page boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS songs_studio_featured_idx
  ON songs (artist_id)
  WHERE featured_on_studio_page = true;

COMMENT ON COLUMN songs.featured_on_studio_page IS 'When true, this song appears in the artist''s mini playlist on the studio public page (/studio/{slug}).';

-- Public read access for songs the producer explicitly featured. The flag itself is the opt-in;
-- no further RLS gating needed (the producer chose to make it public by ticking the star).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'songs' AND policyname = 'songs_studio_featured_read') THEN
    CREATE POLICY songs_studio_featured_read ON songs FOR SELECT
      USING (featured_on_studio_page = true);
  END IF;
END $$;
