-- Add Spotify metadata + generic social_links to artists.
-- Run in Supabase SQL editor (or via supabase migration up). Safe to re-run.

ALTER TABLE artists
  ADD COLUMN IF NOT EXISTS spotify_url         text,
  ADD COLUMN IF NOT EXISTS spotify_image_url   text,
  ADD COLUMN IF NOT EXISTS spotify_followers   integer,
  ADD COLUMN IF NOT EXISTS spotify_popularity  integer,
  ADD COLUMN IF NOT EXISTS spotify_genres      text[],
  ADD COLUMN IF NOT EXISTS social_links        jsonb DEFAULT '{}'::jsonb;

-- Prevent the same Spotify artist from being saved twice for the same user.
CREATE UNIQUE INDEX IF NOT EXISTS artists_user_spotify_id_uniq
  ON artists (user_id, spotify_id)
  WHERE spotify_id IS NOT NULL AND spotify_id <> '';

-- Useful for future global lookups / stats.
CREATE INDEX IF NOT EXISTS artists_spotify_id_idx
  ON artists (spotify_id)
  WHERE spotify_id IS NOT NULL AND spotify_id <> '';

COMMENT ON COLUMN artists.spotify_url        IS 'Public Spotify profile URL (external_urls.spotify)';
COMMENT ON COLUMN artists.spotify_image_url  IS 'Largest available image from Spotify (separate from avatar_url so we can re-sync later)';
COMMENT ON COLUMN artists.spotify_followers  IS 'Snapshot of follower count at time of save';
COMMENT ON COLUMN artists.spotify_popularity IS 'Spotify popularity score 0-100 at time of save';
COMMENT ON COLUMN artists.spotify_genres     IS 'Raw genres returned by Spotify (before user-curated genre list)';
COMMENT ON COLUMN artists.social_links       IS 'JSON map of platform -> { url, handle, ... } for YouTube, Instagram, TikTok, website, etc.';
