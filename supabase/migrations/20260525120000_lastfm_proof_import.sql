-- Phase 49B: Last.fm scrobble proof import

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS lastfm_username text;

COMMENT ON COLUMN profiles.lastfm_username IS 'Last.fm username for scrobble import (activity evidence, not stream verification).';

ALTER TABLE campaign_activity_logs
  DROP CONSTRAINT IF EXISTS campaign_activity_logs_proof_type_check;

ALTER TABLE campaign_activity_logs
  ADD CONSTRAINT campaign_activity_logs_proof_type_check
  CHECK (proof_type IN ('image', 'csv', 'text', 'manual', 'lastfm_import'));

NOTIFY pgrst, 'reload schema';
