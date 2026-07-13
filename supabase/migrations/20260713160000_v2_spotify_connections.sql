-- ViaTone 2.0 Phase 6C — Spotify user connections, play dedupe, evidence consent

CREATE TABLE IF NOT EXISTS v2_spotify_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  spotify_user_id text NOT NULL,
  spotify_display_name text,
  spotify_email text,
  access_token_encrypted text NOT NULL,
  refresh_token_encrypted text NOT NULL,
  expires_at timestamptz NOT NULL,
  scopes text[] NOT NULL DEFAULT '{}',
  connection_status text NOT NULL DEFAULT 'connected'
    CHECK (connection_status IN ('connected', 'needs_reconnect', 'revoked', 'error')),
  last_sync_at timestamptz,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS v2_spotify_connections_status_idx
  ON v2_spotify_connections (connection_status, updated_at DESC);

-- Dedupe Recently Played rows — minimal retention for evidence matching
CREATE TABLE IF NOT EXISTS v2_spotify_play_dedup (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  spotify_track_id text NOT NULL,
  played_at timestamptz NOT NULL,
  track_uri text,
  isrc text,
  track_title text,
  track_artist text,
  album_name text,
  duration_ms int,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, spotify_track_id, played_at)
);

CREATE INDEX IF NOT EXISTS v2_spotify_play_dedup_user_idx
  ON v2_spotify_play_dedup (user_id, played_at DESC);

-- Pending Spotify evidence awaiting user consent before host visibility
CREATE TABLE IF NOT EXISTS v2_spotify_evidence_pending (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id uuid REFERENCES playback_sessions(id) ON DELETE CASCADE,
  queue_id uuid REFERENCES playback_queues(id) ON DELETE SET NULL,
  playlist_snapshot_id uuid REFERENCES playlist_snapshots(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending_review'
    CHECK (status IN ('pending_review', 'submitted', 'kept_private', 'dismissed')),
  matched_tracks jsonb NOT NULL DEFAULT '[]'::jsonb,
  coverage_rate numeric(5,4) NOT NULL DEFAULT 0,
  confidence text NOT NULL DEFAULT 'unknown'
    CHECK (confidence IN ('high', 'medium', 'low', 'unknown')),
  window_start timestamptz,
  window_end timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS v2_spotify_evidence_pending_user_idx
  ON v2_spotify_evidence_pending (user_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS v2_spotify_evidence_pending_session_idx
  ON v2_spotify_evidence_pending (session_id) WHERE session_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS v2_spotify_evidence_pending_session_uniq
  ON v2_spotify_evidence_pending (session_id) WHERE session_id IS NOT NULL;

-- Extend curator linked playlist sync statuses
ALTER TABLE v2_curator_linked_playlists
  DROP CONSTRAINT IF EXISTS v2_curator_linked_playlists_sync_status_check;

ALTER TABLE v2_curator_linked_playlists
  ADD CONSTRAINT v2_curator_linked_playlists_sync_status_check
  CHECK (sync_status IN (
    'connected', 'manual', 'sync_unavailable', 'needs_configuration',
    'syncing', 'synced', 'stale', 'needs_reconnect', 'forbidden', 'failed'
  ));

ALTER TABLE v2_curator_linked_playlists
  ADD COLUMN IF NOT EXISTS last_sync_error text;

ALTER TABLE v2_spotify_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE v2_spotify_play_dedup ENABLE ROW LEVEL SECURITY;
ALTER TABLE v2_spotify_evidence_pending ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'v2_spotify_connections' AND policyname = 'spotify_connections_self_read') THEN
    CREATE POLICY spotify_connections_self_read ON v2_spotify_connections FOR SELECT
      USING (user_id = auth.uid());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'v2_spotify_play_dedup' AND policyname = 'spotify_play_dedup_self') THEN
    CREATE POLICY spotify_play_dedup_self ON v2_spotify_play_dedup FOR ALL
      USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'v2_spotify_evidence_pending' AND policyname = 'spotify_evidence_pending_self') THEN
    CREATE POLICY spotify_evidence_pending_self ON v2_spotify_evidence_pending FOR ALL
      USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

COMMENT ON TABLE v2_spotify_connections IS 'Encrypted Spotify OAuth tokens — server/service role writes only';
COMMENT ON TABLE v2_spotify_evidence_pending IS 'User-consented Spotify Recently Played matches before host visibility';

NOTIFY pgrst, 'reload schema';
