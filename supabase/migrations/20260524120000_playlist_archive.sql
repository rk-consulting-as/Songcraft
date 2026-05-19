-- Phase 49A: Playlist archive support

ALTER TABLE creator_playlists
  ADD COLUMN IF NOT EXISTS archived_at timestamptz;

CREATE INDEX IF NOT EXISTS creator_playlists_active_idx
  ON creator_playlists (user_id, created_at DESC)
  WHERE archived_at IS NULL;

NOTIFY pgrst, 'reload schema';
