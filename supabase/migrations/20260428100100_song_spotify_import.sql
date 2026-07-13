-- Allow importing released tracks from Spotify into the songs table.
-- Run after the artist Spotify migration. Safe to re-run.

ALTER TABLE songs
  ADD COLUMN IF NOT EXISTS spotify_track_id     text,
  ADD COLUMN IF NOT EXISTS spotify_url          text,
  ADD COLUMN IF NOT EXISTS spotify_popularity   integer,
  ADD COLUMN IF NOT EXISTS spotify_release_date date,
  ADD COLUMN IF NOT EXISTS spotify_album        text,
  ADD COLUMN IF NOT EXISTS spotify_cover_url    text;

-- Prevent the same Spotify track from being imported twice for the same artist.
CREATE UNIQUE INDEX IF NOT EXISTS songs_artist_spotify_track_uniq
  ON songs (artist_id, spotify_track_id)
  WHERE spotify_track_id IS NOT NULL AND spotify_track_id <> '';

-- If a CHECK constraint exists on songs.status that limits values, drop and recreate
-- it to allow 'released'. We only do this if the constraint exists.
DO $$
DECLARE
  cname text;
BEGIN
  SELECT conname INTO cname
  FROM pg_constraint
  WHERE conrelid = 'songs'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) ILIKE '%status%';
  IF cname IS NOT NULL THEN
    EXECUTE format('ALTER TABLE songs DROP CONSTRAINT %I', cname);
    ALTER TABLE songs
      ADD CONSTRAINT songs_status_check
      CHECK (status IN ('draft', 'in_progress', 'complete', 'released'));
  END IF;
END $$;

COMMENT ON COLUMN songs.spotify_track_id     IS 'Spotify track ID — set when song was imported from Spotify';
COMMENT ON COLUMN songs.spotify_url          IS 'Public Spotify track URL (external_urls.spotify)';
COMMENT ON COLUMN songs.spotify_popularity   IS 'Track popularity 0-100 at time of import (proxy for streams — Spotify does not expose actual play counts)';
COMMENT ON COLUMN songs.spotify_release_date IS 'Release date from Spotify (album.release_date, normalized to a date)';
COMMENT ON COLUMN songs.spotify_album        IS 'Album name from Spotify';
COMMENT ON COLUMN songs.spotify_cover_url    IS 'Album cover image URL';
