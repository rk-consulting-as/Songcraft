-- Albums: a song can belong to at most one album, or none (single).
-- Run after the artist + song Spotify migrations. Safe to re-run.

CREATE TABLE IF NOT EXISTS albums (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  artist_id    uuid NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
  title        text NOT NULL,
  description  text,
  cover_url    text,
  release_date date,
  spotify_album_id text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS albums_artist_idx ON albums (artist_id);
CREATE INDEX IF NOT EXISTS albums_user_idx   ON albums (user_id);

-- Songs gets a nullable foreign key to albums. ON DELETE SET NULL means deleting
-- an album turns its songs into singles (it does NOT delete the songs themselves).
ALTER TABLE songs
  ADD COLUMN IF NOT EXISTS album_id uuid REFERENCES albums(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS songs_album_idx ON songs (album_id);

-- Ownership invariant: a song can only be in an album owned by the same user
-- and belonging to the same artist. We don't enforce with a CHECK (cross-row),
-- we rely on UI to wire this up correctly. RLS policies do the heavy lifting.

-- Row Level Security
ALTER TABLE albums ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'albums' AND policyname = 'albums_select_own') THEN
    CREATE POLICY albums_select_own ON albums FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'albums' AND policyname = 'albums_insert_own') THEN
    CREATE POLICY albums_insert_own ON albums FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'albums' AND policyname = 'albums_update_own') THEN
    CREATE POLICY albums_update_own ON albums FOR UPDATE USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'albums' AND policyname = 'albums_delete_own') THEN
    CREATE POLICY albums_delete_own ON albums FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

-- Auto-update `updated_at` on row changes.
CREATE OR REPLACE FUNCTION set_albums_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS albums_set_updated_at ON albums;
CREATE TRIGGER albums_set_updated_at
  BEFORE UPDATE ON albums
  FOR EACH ROW EXECUTE FUNCTION set_albums_updated_at();

COMMENT ON COLUMN albums.title            IS 'Album title';
COMMENT ON COLUMN albums.description      IS 'Free-text description / liner notes';
COMMENT ON COLUMN albums.cover_url        IS 'Public URL of album cover image';
COMMENT ON COLUMN albums.release_date     IS 'Release date (or planned release date)';
COMMENT ON COLUMN albums.spotify_album_id IS 'Optional Spotify album ID if this album was imported / linked';
COMMENT ON COLUMN songs.album_id          IS 'Optional album membership. NULL = single. Set to NULL automatically when album deleted.';
