-- Spotify Canvas: short looping video clip per song.
-- Generated via AI (e.g. Seedance Pro on fal.ai) or uploaded manually.

ALTER TABLE songs
  ADD COLUMN IF NOT EXISTS canvas_video_url text,
  ADD COLUMN IF NOT EXISTS canvas_prompt    text,
  ADD COLUMN IF NOT EXISTS canvas_provider  text,
  ADD COLUMN IF NOT EXISTS canvas_meta      jsonb DEFAULT '{}'::jsonb;

COMMENT ON COLUMN songs.canvas_video_url IS 'Public URL of the Canvas video (Supabase Storage or external).';
COMMENT ON COLUMN songs.canvas_prompt    IS 'Prompt used to generate the video — kept as a record even if generated externally.';
COMMENT ON COLUMN songs.canvas_provider  IS 'Where the video came from: fal-seedance, manual-upload, manual-url, artlist, etc.';
COMMENT ON COLUMN songs.canvas_meta      IS 'JSON: { aspect_ratio, duration_seconds, model, request_id, ... }.';
