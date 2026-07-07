-- ViaTone 2.0 Phase 4B — Community participation & supporter score

-- =============================================================
-- v2_playlist_room_participation — manual listen confirmations
-- =============================================================
CREATE TABLE IF NOT EXISTS v2_playlist_room_participation (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES v2_playlist_rooms(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  listened_at timestamptz NOT NULL DEFAULT now(),
  participation_note text,
  UNIQUE (room_id, user_id)
);

CREATE INDEX IF NOT EXISTS v2_playlist_room_participation_room_idx
  ON v2_playlist_room_participation (room_id, listened_at DESC);

CREATE INDEX IF NOT EXISTS v2_playlist_room_participation_user_idx
  ON v2_playlist_room_participation (user_id, listened_at DESC);

-- =============================================================
-- RLS
-- =============================================================
ALTER TABLE v2_playlist_room_participation ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'v2_playlist_room_participation' AND policyname = 'v2_playlist_room_participation_select'
  ) THEN
    CREATE POLICY v2_playlist_room_participation_select ON v2_playlist_room_participation FOR SELECT
      USING (
        user_id = auth.uid()
        OR EXISTS (SELECT 1 FROM v2_playlist_rooms r WHERE r.id = room_id)
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'v2_playlist_room_participation' AND policyname = 'v2_playlist_room_participation_self_upsert'
  ) THEN
    CREATE POLICY v2_playlist_room_participation_self_upsert ON v2_playlist_room_participation FOR INSERT
      WITH CHECK (user_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'v2_playlist_room_participation' AND policyname = 'v2_playlist_room_participation_self_update'
  ) THEN
    CREATE POLICY v2_playlist_room_participation_self_update ON v2_playlist_room_participation FOR UPDATE
      USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
  END IF;

  -- Session participants can see each other on public sessions (supporter visibility)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'v2_session_participation' AND policyname = 'v2_session_participation_public_select'
  ) THEN
    CREATE POLICY v2_session_participation_public_select ON v2_session_participation FOR SELECT
      USING (
        status = 'joined'
        AND EXISTS (
          SELECT 1 FROM v2_sessions s
          JOIN v2_circles c ON c.id = s.circle_id
          WHERE s.id = session_id AND c.visibility = 'public'
        )
      );
  END IF;

  -- Community feedback visible on public circles (participation signal, not private DMs)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'v2_song_feedback' AND policyname = 'v2_song_feedback_circle_select'
  ) THEN
    CREATE POLICY v2_song_feedback_circle_select ON v2_song_feedback FOR SELECT
      USING (
        circle_id IS NOT NULL
        AND EXISTS (SELECT 1 FROM v2_circles c WHERE c.id = circle_id AND c.visibility = 'public')
      );
  END IF;
END $$;

COMMENT ON TABLE v2_playlist_room_participation IS 'ViaTone community — manual playlist room listen confirmations (not verified streams)';
