-- Adds a `position` column to songs for manual reordering.
-- Songs without a position fall back to created_at ordering.
-- Run in Supabase SQL editor. Safe to re-run.

ALTER TABLE songs
  ADD COLUMN IF NOT EXISTS position integer;

-- Backfill existing songs: assign positions per artist, ordered by current created_at desc
-- (so the existing order is preserved as the initial manual order).
DO $$
DECLARE
  rec record;
  pos integer;
  current_artist uuid;
BEGIN
  current_artist := NULL;
  pos := 0;
  FOR rec IN
    SELECT id, artist_id
    FROM songs
    WHERE position IS NULL
    ORDER BY artist_id, created_at DESC
  LOOP
    IF rec.artist_id IS DISTINCT FROM current_artist THEN
      current_artist := rec.artist_id;
      pos := 0;
    END IF;
    pos := pos + 1;
    UPDATE songs SET position = pos WHERE id = rec.id;
  END LOOP;
END $$;

CREATE INDEX IF NOT EXISTS songs_artist_position_idx ON songs (artist_id, position);

COMMENT ON COLUMN songs.position IS 'Manual sort order within an artist. Lower = first. Backfilled from created_at on initial migration.';
