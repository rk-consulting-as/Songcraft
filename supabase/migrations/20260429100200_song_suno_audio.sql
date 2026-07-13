-- Add Suno audio + URL columns directly on songs.
-- A song can also have multiple Suno generations in `media_links` JSONB; this column stores
-- the user's currently picked / primary generation for quick access (audio playback, etc.)
-- Run in Supabase SQL editor. Safe to re-run.

ALTER TABLE songs
  ADD COLUMN IF NOT EXISTS suno_url       text,
  ADD COLUMN IF NOT EXISTS suno_audio_url text,
  ADD COLUMN IF NOT EXISTS suno_track_id  text;

COMMENT ON COLUMN songs.suno_url       IS 'Public Suno song page URL';
COMMENT ON COLUMN songs.suno_audio_url IS 'Direct audio URL (mp3/m4a) from Suno CDN — used for inline playback';
COMMENT ON COLUMN songs.suno_track_id  IS 'Suno track UUID, parsed from the URL';
