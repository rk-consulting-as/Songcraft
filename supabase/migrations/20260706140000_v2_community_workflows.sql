-- ViaTone 2.0 Phase 3 — Live community workflows

-- =============================================================
-- v2_circle_songs (submissions to circles)
-- =============================================================
CREATE TABLE IF NOT EXISTS v2_circle_songs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  circle_id uuid NOT NULL REFERENCES v2_circles(id) ON DELETE CASCADE,
  song_id uuid NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
  submitted_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'removed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (circle_id, song_id)
);

CREATE INDEX IF NOT EXISTS v2_circle_songs_circle_idx ON v2_circle_songs (circle_id, created_at DESC);
CREATE INDEX IF NOT EXISTS v2_circle_songs_song_idx ON v2_circle_songs (song_id);

-- =============================================================
-- session / playlist submission workflow columns
-- =============================================================
ALTER TABLE v2_session_songs
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'approved'
    CHECK (status IN ('pending', 'approved', 'removed'));

ALTER TABLE v2_playlist_room_items
  ADD COLUMN IF NOT EXISTS submitted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE v2_song_feedback
  ADD COLUMN IF NOT EXISTS reaction text CHECK (reaction IS NULL OR reaction IN ('fire', 'love', 'idea', 'clap'));

-- =============================================================
-- moderation reports (placeholder)
-- =============================================================
CREATE TABLE IF NOT EXISTS v2_community_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_type text NOT NULL CHECK (target_type IN ('circle', 'session', 'song', 'playlist_room')),
  target_id uuid NOT NULL,
  reason text,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'reviewed', 'dismissed')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS v2_community_reports_target_idx ON v2_community_reports (target_type, target_id);

-- =============================================================
-- member / participation counters
-- =============================================================
CREATE OR REPLACE FUNCTION v2_sync_circle_member_count()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE v2_circles SET member_count = member_count + 1 WHERE id = NEW.circle_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE v2_circles SET member_count = GREATEST(0, member_count - 1) WHERE id = OLD.circle_id;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS v2_circle_members_count ON v2_circle_members;
CREATE TRIGGER v2_circle_members_count
  AFTER INSERT OR DELETE ON v2_circle_members
  FOR EACH ROW EXECUTE FUNCTION v2_sync_circle_member_count();

CREATE OR REPLACE FUNCTION v2_sync_session_joined_count()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.status = 'joined' THEN
    UPDATE v2_sessions SET joined_count = joined_count + 1 WHERE id = NEW.session_id;
  ELSIF TG_OP = 'DELETE' AND OLD.status = 'joined' THEN
    UPDATE v2_sessions SET joined_count = GREATEST(0, joined_count - 1) WHERE id = OLD.session_id;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status = 'joined' AND NEW.status <> 'joined' THEN
      UPDATE v2_sessions SET joined_count = GREATEST(0, joined_count - 1) WHERE id = NEW.session_id;
    ELSIF OLD.status <> 'joined' AND NEW.status = 'joined' THEN
      UPDATE v2_sessions SET joined_count = joined_count + 1 WHERE id = NEW.session_id;
    END IF;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS v2_session_participation_count ON v2_session_participation;
CREATE TRIGGER v2_session_participation_count
  AFTER INSERT OR UPDATE OR DELETE ON v2_session_participation
  FOR EACH ROW EXECUTE FUNCTION v2_sync_session_joined_count();

-- =============================================================
-- RLS updates
-- =============================================================
ALTER TABLE v2_circle_songs ENABLE ROW LEVEL SECURITY;
ALTER TABLE v2_community_reports ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  -- Tighten circle member insert to public circles (or circle owner)
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'v2_circle_members' AND policyname = 'v2_circle_members_self') THEN
    DROP POLICY v2_circle_members_self ON v2_circle_members;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'v2_circle_members' AND policyname = 'v2_circle_members_insert') THEN
    CREATE POLICY v2_circle_members_insert ON v2_circle_members FOR INSERT
      WITH CHECK (
        user_id = auth.uid()
        AND EXISTS (
          SELECT 1 FROM v2_circles c
          WHERE c.id = circle_id
            AND (c.visibility = 'public' OR c.owner_user_id = auth.uid())
        )
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'v2_circle_members' AND policyname = 'v2_circle_members_delete') THEN
    CREATE POLICY v2_circle_members_delete ON v2_circle_members FOR DELETE
      USING (user_id = auth.uid());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'v2_circle_members' AND policyname = 'v2_circle_members_owner_manage') THEN
    CREATE POLICY v2_circle_members_owner_manage ON v2_circle_members FOR ALL
      USING (EXISTS (SELECT 1 FROM v2_circles c WHERE c.id = circle_id AND c.owner_user_id = auth.uid()))
      WITH CHECK (EXISTS (SELECT 1 FROM v2_circles c WHERE c.id = circle_id AND c.owner_user_id = auth.uid()));
  END IF;

  -- Private circles: members can read
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'v2_circles' AND policyname = 'v2_circles_member_select') THEN
    CREATE POLICY v2_circles_member_select ON v2_circles FOR SELECT
      USING (
        EXISTS (SELECT 1 FROM v2_circle_members m WHERE m.circle_id = v2_circles.id AND m.user_id = auth.uid())
      );
  END IF;

  -- v2_circle_songs
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'v2_circle_songs' AND policyname = 'v2_circle_songs_select') THEN
    CREATE POLICY v2_circle_songs_select ON v2_circle_songs FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM v2_circles c
          WHERE c.id = circle_id AND (c.visibility = 'public' OR c.owner_user_id = auth.uid())
        )
        OR submitted_by = auth.uid()
        OR EXISTS (SELECT 1 FROM songs s WHERE s.id = song_id AND s.user_id = auth.uid())
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'v2_circle_songs' AND policyname = 'v2_circle_songs_insert') THEN
    CREATE POLICY v2_circle_songs_insert ON v2_circle_songs FOR INSERT
      WITH CHECK (
        submitted_by = auth.uid()
        AND EXISTS (SELECT 1 FROM songs s WHERE s.id = song_id AND s.user_id = auth.uid())
        AND EXISTS (
          SELECT 1 FROM v2_circles c
          WHERE c.id = circle_id AND c.visibility = 'public'
        )
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'v2_circle_songs' AND policyname = 'v2_circle_songs_host') THEN
    CREATE POLICY v2_circle_songs_host ON v2_circle_songs FOR UPDATE
      USING (EXISTS (SELECT 1 FROM v2_circles c WHERE c.id = circle_id AND c.owner_user_id = auth.uid()));
  END IF;

  -- session songs: host manage + submitter read pending
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'v2_session_songs' AND policyname = 'v2_session_songs_host_update') THEN
    CREATE POLICY v2_session_songs_host_update ON v2_session_songs FOR UPDATE
      USING (EXISTS (SELECT 1 FROM v2_sessions s WHERE s.id = session_id AND s.host_user_id = auth.uid()));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'v2_session_songs' AND policyname = 'v2_session_songs_host_delete') THEN
    CREATE POLICY v2_session_songs_host_delete ON v2_session_songs FOR DELETE
      USING (EXISTS (SELECT 1 FROM v2_sessions s WHERE s.id = session_id AND s.host_user_id = auth.uid()));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'v2_session_songs' AND policyname = 'v2_session_songs_submitter_select') THEN
    CREATE POLICY v2_session_songs_submitter_select ON v2_session_songs FOR SELECT
      USING (submitted_by = auth.uid());
  END IF;

  -- playlist room items submit
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'v2_playlist_room_items' AND policyname = 'v2_playlist_room_items_insert') THEN
    CREATE POLICY v2_playlist_room_items_insert ON v2_playlist_room_items FOR INSERT
      WITH CHECK (
        submitted_by = auth.uid()
        AND EXISTS (SELECT 1 FROM songs s WHERE s.id = song_id AND s.user_id = auth.uid())
        AND EXISTS (SELECT 1 FROM v2_playlist_rooms r WHERE r.id = room_id)
      );
  END IF;

  -- feedback: community read on public circles/sessions
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'v2_song_feedback' AND policyname = 'v2_song_feedback_community_read') THEN
    CREATE POLICY v2_song_feedback_community_read ON v2_song_feedback FOR SELECT
      USING (
        circle_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM v2_circles c WHERE c.id = circle_id AND c.visibility = 'public'
        )
        OR session_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM v2_sessions s
          JOIN v2_circles c ON c.id = s.circle_id
          WHERE s.id = session_id AND c.visibility = 'public'
        )
      );
  END IF;

  -- reports
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'v2_community_reports' AND policyname = 'v2_community_reports_self') THEN
    CREATE POLICY v2_community_reports_self ON v2_community_reports FOR ALL
      USING (reporter_id = auth.uid()) WITH CHECK (reporter_id = auth.uid());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'v2_community_reports' AND policyname = 'v2_community_reports_admin') THEN
    CREATE POLICY v2_community_reports_admin ON v2_community_reports FOR SELECT USING (is_admin());
  END IF;

  -- session participation: public sessions join
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'v2_session_participation' AND policyname = 'v2_session_participation_insert') THEN
    CREATE POLICY v2_session_participation_insert ON v2_session_participation FOR INSERT
      WITH CHECK (
        user_id = auth.uid()
        AND EXISTS (
          SELECT 1 FROM v2_sessions s
          LEFT JOIN v2_circles c ON c.id = s.circle_id
          WHERE s.id = session_id
            AND (c.visibility = 'public' OR c IS NULL OR s.host_user_id = auth.uid())
        )
      );
  END IF;
END $$;

COMMENT ON TABLE v2_circle_songs IS 'Song submissions scoped to a community circle';
COMMENT ON TABLE v2_community_reports IS 'Community moderation reports — reviewed by hosts/admins';
