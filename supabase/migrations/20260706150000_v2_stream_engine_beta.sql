-- ViaTone 2.0 Phase 4A — Stream Engine beta (manual host-controlled playback)

-- =============================================================
-- v2_session_play_logs
-- =============================================================
CREATE TABLE IF NOT EXISTS v2_session_play_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES v2_sessions(id) ON DELETE CASCADE,
  session_song_id uuid REFERENCES v2_session_songs(id) ON DELETE SET NULL,
  song_id uuid REFERENCES songs(id) ON DELETE SET NULL,
  played_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  played_at timestamptz NOT NULL DEFAULT now(),
  source text NOT NULL DEFAULT 'manual_host' CHECK (source IN ('manual_host', 'auto')),
  note text
);

CREATE INDEX IF NOT EXISTS v2_session_play_logs_session_idx ON v2_session_play_logs (session_id, played_at DESC);

-- =============================================================
-- queue / participation / playlist room playback columns
-- =============================================================
ALTER TABLE v2_session_songs
  ADD COLUMN IF NOT EXISTS played_at timestamptz;

ALTER TABLE v2_session_participation
  ADD COLUMN IF NOT EXISTS listened_at timestamptz,
  ADD COLUMN IF NOT EXISTS participation_note text;

ALTER TABLE v2_playlist_room_items
  ADD COLUMN IF NOT EXISTS played_at timestamptz;

ALTER TABLE v2_playlist_rooms
  ADD COLUMN IF NOT EXISTS round_status text NOT NULL DEFAULT 'active'
    CHECK (round_status IN ('active', 'completed')),
  ADD COLUMN IF NOT EXISTS last_completed_at timestamptz;

-- =============================================================
-- RLS
-- =============================================================
ALTER TABLE v2_session_play_logs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'v2_session_play_logs' AND policyname = 'v2_session_play_logs_select') THEN
    CREATE POLICY v2_session_play_logs_select ON v2_session_play_logs FOR SELECT
      USING (EXISTS (SELECT 1 FROM v2_sessions s WHERE s.id = session_id));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'v2_session_play_logs' AND policyname = 'v2_session_play_logs_host_insert') THEN
    CREATE POLICY v2_session_play_logs_host_insert ON v2_session_play_logs FOR INSERT
      WITH CHECK (
        played_by = auth.uid()
        AND EXISTS (SELECT 1 FROM v2_sessions s WHERE s.id = session_id AND s.host_user_id = auth.uid())
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'v2_session_participation' AND policyname = 'v2_session_participation_update') THEN
    CREATE POLICY v2_session_participation_update ON v2_session_participation FOR UPDATE
      USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'v2_session_participation' AND policyname = 'v2_session_participation_host_select') THEN
    CREATE POLICY v2_session_participation_host_select ON v2_session_participation FOR SELECT
      USING (EXISTS (SELECT 1 FROM v2_sessions s WHERE s.id = session_id AND s.host_user_id = auth.uid()));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'v2_playlist_room_items' AND policyname = 'v2_playlist_room_items_host_update') THEN
    CREATE POLICY v2_playlist_room_items_host_update ON v2_playlist_room_items FOR UPDATE
      USING (EXISTS (SELECT 1 FROM v2_playlist_rooms r WHERE r.id = room_id AND r.owner_user_id = auth.uid()));
  END IF;
END $$;

COMMENT ON TABLE v2_session_play_logs IS 'ViaTone Stream Engine beta — manual host play log';
COMMENT ON COLUMN v2_sessions.stream_engine_meta IS 'Host notes, engine state — full Aigent4U automation later';
