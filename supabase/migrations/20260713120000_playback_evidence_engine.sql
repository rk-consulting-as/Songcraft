-- ViaTone 2.0 Phase 6A — Playback Evidence Engine (foundation)
-- Platform-independent listening evidence. Snapshots are immutable.

-- =============================================================
-- playlist_snapshots (immutable)
-- =============================================================
CREATE TABLE IF NOT EXISTS playlist_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  platform text NOT NULL CHECK (platform IN (
    'spotify', 'youtube', 'apple', 'tidal', 'deezer', 'soundcloud', 'amazon', 'viatone', 'mixed'
  )),
  external_playlist_id text,
  name text NOT NULL,
  description text,
  cover_image_url text,
  owner_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  owner_display_name text,
  track_count int NOT NULL DEFAULT 0,
  total_duration_seconds int NOT NULL DEFAULT 0,
  tracks jsonb NOT NULL DEFAULT '[]'::jsonb,
  linked_context_type text CHECK (linked_context_type IN (
    'v2_playlist_room', 'v2_session', 'creator_playlist', 'standalone'
  )),
  linked_context_id uuid,
  snapshot_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS playlist_snapshots_context_idx
  ON playlist_snapshots (linked_context_type, linked_context_id);
CREATE INDEX IF NOT EXISTS playlist_snapshots_platform_idx
  ON playlist_snapshots (platform, snapshot_at DESC);

-- =============================================================
-- playback_queues
-- =============================================================
CREATE TABLE IF NOT EXISTS playback_queues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT 'Listening Queue',
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'completed', 'cancelled')),
  estimated_duration_seconds int NOT NULL DEFAULT 0,
  estimated_track_count int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  started_at timestamptz,
  completed_at timestamptz
);

CREATE INDEX IF NOT EXISTS playback_queues_user_idx ON playback_queues (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS playback_queue_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  queue_id uuid NOT NULL REFERENCES playback_queues(id) ON DELETE CASCADE,
  playlist_snapshot_id uuid NOT NULL REFERENCES playlist_snapshots(id) ON DELETE RESTRICT,
  position int NOT NULL,
  UNIQUE (queue_id, position)
);

-- =============================================================
-- playback_sessions
-- =============================================================
CREATE TABLE IF NOT EXISTS playback_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  playlist_snapshot_id uuid REFERENCES playlist_snapshots(id) ON DELETE SET NULL,
  queue_id uuid REFERENCES playback_queues(id) ON DELETE SET NULL,
  context_type text CHECK (context_type IN (
    'v2_session', 'v2_playlist_room', 'queue', 'song_page', 'standalone'
  )),
  context_id uuid,
  platform text NOT NULL,
  status text NOT NULL DEFAULT 'started' CHECK (status IN ('started', 'collecting', 'completed', 'cancelled')),
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  expected_track_count int NOT NULL DEFAULT 0,
  matched_track_count int NOT NULL DEFAULT 0,
  completion_rate numeric(5,4) NOT NULL DEFAULT 0,
  confidence text NOT NULL DEFAULT 'unknown' CHECK (confidence IN ('high', 'medium', 'low', 'unknown')),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS playback_sessions_user_idx ON playback_sessions (user_id, started_at DESC);
CREATE INDEX IF NOT EXISTS playback_sessions_context_idx ON playback_sessions (context_type, context_id);
CREATE INDEX IF NOT EXISTS playback_sessions_queue_idx ON playback_sessions (queue_id) WHERE queue_id IS NOT NULL;

-- =============================================================
-- playback_evidence
-- =============================================================
CREATE TABLE IF NOT EXISTS playback_evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES playback_sessions(id) ON DELETE CASCADE,
  track_position int,
  track_external_id text,
  track_title text,
  track_artist text,
  provider text NOT NULL CHECK (provider IN (
    'spotify', 'youtube', 'lastfm', 'viatone', 'manual',
    'apple', 'tidal', 'deezer', 'soundcloud', 'amazon'
  )),
  evidence_type text NOT NULL,
  confidence text NOT NULL DEFAULT 'unknown' CHECK (confidence IN ('high', 'medium', 'low', 'unknown')),
  confidence_score numeric(4,3) NOT NULL DEFAULT 0,
  observed_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS playback_evidence_session_idx ON playback_evidence (session_id, observed_at DESC);
CREATE INDEX IF NOT EXISTS playback_evidence_provider_idx ON playback_evidence (provider, confidence);

-- =============================================================
-- playback_reports
-- =============================================================
CREATE TABLE IF NOT EXISTS playback_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES playback_sessions(id) ON DELETE SET NULL,
  queue_id uuid REFERENCES playback_queues(id) ON DELETE SET NULL,
  playlist_snapshot_id uuid REFERENCES playlist_snapshots(id) ON DELETE SET NULL,
  context_type text,
  context_id uuid,
  title text NOT NULL,
  participant_count int NOT NULL DEFAULT 0,
  playback_session_count int NOT NULL DEFAULT 0,
  high_confidence_count int NOT NULL DEFAULT 0,
  medium_confidence_count int NOT NULL DEFAULT 0,
  low_confidence_count int NOT NULL DEFAULT 0,
  songs_completed int NOT NULL DEFAULT 0,
  average_completion_rate numeric(5,4) NOT NULL DEFAULT 0,
  feedback_count int NOT NULL DEFAULT 0,
  comment_count int NOT NULL DEFAULT 0,
  top_supporter_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  top_supporter_name text,
  top_song_title text,
  top_song_artist text,
  top_artist_name text,
  summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  generated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS playback_reports_context_idx ON playback_reports (context_type, context_id, generated_at DESC);

-- =============================================================
-- RLS
-- =============================================================
ALTER TABLE playlist_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE playback_queues ENABLE ROW LEVEL SECURITY;
ALTER TABLE playback_queue_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE playback_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE playback_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE playback_reports ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  -- Snapshots: readable when linked to public context or owned; insert by authenticated
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'playlist_snapshots' AND policyname = 'playlist_snapshots_select') THEN
    CREATE POLICY playlist_snapshots_select ON playlist_snapshots FOR SELECT
      USING (
        owner_user_id = auth.uid()
        OR linked_context_type IS NULL
        OR EXISTS (
          SELECT 1 FROM v2_playlist_rooms r
          JOIN v2_circles c ON c.id = r.circle_id
          WHERE r.id = linked_context_id AND linked_context_type = 'v2_playlist_room' AND c.visibility = 'public'
        )
        OR EXISTS (
          SELECT 1 FROM v2_sessions s
          JOIN v2_circles c ON c.id = s.circle_id
          WHERE s.id = linked_context_id AND linked_context_type = 'v2_session' AND c.visibility = 'public'
        )
      );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'playlist_snapshots' AND policyname = 'playlist_snapshots_insert') THEN
    CREATE POLICY playlist_snapshots_insert ON playlist_snapshots FOR INSERT
      WITH CHECK (owner_user_id = auth.uid() OR owner_user_id IS NULL);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'playback_queues' AND policyname = 'playback_queues_self') THEN
    CREATE POLICY playback_queues_self ON playback_queues FOR ALL
      USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'playback_queue_items' AND policyname = 'playback_queue_items_self') THEN
    CREATE POLICY playback_queue_items_self ON playback_queue_items FOR ALL
      USING (EXISTS (SELECT 1 FROM playback_queues q WHERE q.id = queue_id AND q.user_id = auth.uid()))
      WITH CHECK (EXISTS (SELECT 1 FROM playback_queues q WHERE q.id = queue_id AND q.user_id = auth.uid()));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'playback_sessions' AND policyname = 'playback_sessions_self') THEN
    CREATE POLICY playback_sessions_self ON playback_sessions FOR ALL
      USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'playback_sessions' AND policyname = 'playback_sessions_host_read') THEN
    CREATE POLICY playback_sessions_host_read ON playback_sessions FOR SELECT
      USING (
        EXISTS (SELECT 1 FROM v2_sessions s WHERE s.id = context_id AND context_type = 'v2_session' AND s.host_user_id = auth.uid())
        OR EXISTS (SELECT 1 FROM v2_playlist_rooms r WHERE r.id = context_id AND context_type = 'v2_playlist_room' AND r.owner_user_id = auth.uid())
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'playback_evidence' AND policyname = 'playback_evidence_session_read') THEN
    CREATE POLICY playback_evidence_session_read ON playback_evidence FOR SELECT
      USING (
        EXISTS (SELECT 1 FROM playback_sessions ps WHERE ps.id = session_id AND ps.user_id = auth.uid())
        OR EXISTS (
          SELECT 1 FROM playback_sessions ps
          JOIN v2_sessions s ON s.id = ps.context_id AND ps.context_type = 'v2_session'
          WHERE ps.id = session_id AND s.host_user_id = auth.uid()
        )
      );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'playback_evidence' AND policyname = 'playback_evidence_insert') THEN
    CREATE POLICY playback_evidence_insert ON playback_evidence FOR INSERT
      WITH CHECK (EXISTS (SELECT 1 FROM playback_sessions ps WHERE ps.id = session_id AND ps.user_id = auth.uid()));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'playback_reports' AND policyname = 'playback_reports_read') THEN
    CREATE POLICY playback_reports_read ON playback_reports FOR SELECT
      USING (
        EXISTS (SELECT 1 FROM playback_sessions ps WHERE ps.id = session_id AND ps.user_id = auth.uid())
        OR EXISTS (
          SELECT 1 FROM v2_sessions s WHERE s.id = context_id AND context_type = 'v2_session' AND s.host_user_id = auth.uid()
        )
        OR EXISTS (
          SELECT 1 FROM v2_playlist_rooms r
          JOIN v2_circles c ON c.id = r.circle_id
          WHERE r.id = context_id AND context_type = 'v2_playlist_room' AND c.visibility = 'public'
        )
      );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'playback_reports' AND policyname = 'playback_reports_insert') THEN
    CREATE POLICY playback_reports_insert ON playback_reports FOR INSERT
      WITH CHECK (
        session_id IS NULL
        OR EXISTS (SELECT 1 FROM playback_sessions ps WHERE ps.id = session_id AND ps.user_id = auth.uid())
      );
  END IF;
END $$;

COMMENT ON TABLE playlist_snapshots IS 'Immutable playlist capture for playback evidence — never updated after creation';
COMMENT ON TABLE playback_sessions IS 'One user listening session — Start/Finish Listening lifecycle';
COMMENT ON TABLE playback_evidence IS 'Per-source listening evidence with confidence scoring';
COMMENT ON TABLE playback_reports IS 'Aggregated playback evidence report for community analytics';

NOTIFY pgrst, 'reload schema';
