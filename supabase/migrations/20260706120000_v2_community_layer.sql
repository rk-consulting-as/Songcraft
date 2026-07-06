-- ViaTone 2.0 Community Layer (Phase 2)
-- Circles, sessions, playlist rooms, participation, feedback

-- =============================================================
-- v2_circles
-- =============================================================
CREATE TABLE IF NOT EXISTS v2_circles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  slug text NOT NULL,
  name text NOT NULL,
  description text,
  cover_image_url text,
  tags text[] NOT NULL DEFAULT '{}',
  creation_types text[] NOT NULL DEFAULT '{}',
  platforms text[] NOT NULL DEFAULT '{}',
  visibility text NOT NULL DEFAULT 'public' CHECK (visibility IN ('public', 'private', 'invite')),
  featured boolean NOT NULL DEFAULT false,
  member_count int NOT NULL DEFAULT 0,
  session_count int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT v2_circles_slug_not_blank CHECK (length(trim(slug)) > 0),
  CONSTRAINT v2_circles_name_not_blank CHECK (length(trim(name)) > 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS v2_circles_slug_uniq ON v2_circles (slug);
CREATE INDEX IF NOT EXISTS v2_circles_owner_idx ON v2_circles (owner_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS v2_circles_public_idx ON v2_circles (visibility, featured, created_at DESC)
  WHERE visibility = 'public';

-- =============================================================
-- v2_circle_members
-- =============================================================
CREATE TABLE IF NOT EXISTS v2_circle_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  circle_id uuid NOT NULL REFERENCES v2_circles(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'host', 'moderator')),
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (circle_id, user_id)
);

CREATE INDEX IF NOT EXISTS v2_circle_members_circle_idx ON v2_circle_members (circle_id, role);
CREATE INDEX IF NOT EXISTS v2_circle_members_user_idx ON v2_circle_members (user_id, joined_at DESC);

-- =============================================================
-- v2_sessions
-- =============================================================
CREATE TABLE IF NOT EXISTS v2_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  circle_id uuid REFERENCES v2_circles(id) ON DELETE SET NULL,
  host_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  slug text NOT NULL,
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'upcoming' CHECK (status IN ('live', 'upcoming', 'ended')),
  platform text NOT NULL DEFAULT 'spotify',
  cover_image_url text,
  starts_at timestamptz NOT NULL DEFAULT now(),
  track_count int NOT NULL DEFAULT 0,
  artist_count int NOT NULL DEFAULT 0,
  joined_count int NOT NULL DEFAULT 0,
  feedback_pending int NOT NULL DEFAULT 0,
  seats_open int,
  features text[] NOT NULL DEFAULT '{}',
  creation_types text[] NOT NULL DEFAULT '{}',
  stream_engine_meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT v2_sessions_slug_not_blank CHECK (length(trim(slug)) > 0),
  CONSTRAINT v2_sessions_title_not_blank CHECK (length(trim(title)) > 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS v2_sessions_slug_uniq ON v2_sessions (slug);
CREATE INDEX IF NOT EXISTS v2_sessions_circle_idx ON v2_sessions (circle_id, starts_at DESC);
CREATE INDEX IF NOT EXISTS v2_sessions_host_idx ON v2_sessions (host_user_id, starts_at DESC);
CREATE INDEX IF NOT EXISTS v2_sessions_status_idx ON v2_sessions (status, starts_at DESC);

-- =============================================================
-- v2_session_songs (queue / submissions)
-- =============================================================
CREATE TABLE IF NOT EXISTS v2_session_songs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES v2_sessions(id) ON DELETE CASCADE,
  song_id uuid REFERENCES songs(id) ON DELETE SET NULL,
  artist_id uuid REFERENCES artists(id) ON DELETE SET NULL,
  submitted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  position int NOT NULL DEFAULT 0,
  title text NOT NULL,
  artist_name text,
  duration_label text,
  is_now_playing boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS v2_session_songs_session_idx ON v2_session_songs (session_id, position);

-- =============================================================
-- v2_playlist_rooms
-- =============================================================
CREATE TABLE IF NOT EXISTS v2_playlist_rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  circle_id uuid REFERENCES v2_circles(id) ON DELETE SET NULL,
  creator_playlist_id uuid REFERENCES creator_playlists(id) ON DELETE SET NULL,
  slug text NOT NULL,
  name text NOT NULL,
  description text,
  cover_image_url text,
  platform text NOT NULL DEFAULT 'spotify',
  track_count int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT v2_playlist_rooms_slug_not_blank CHECK (length(trim(slug)) > 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS v2_playlist_rooms_slug_uniq ON v2_playlist_rooms (slug);
CREATE INDEX IF NOT EXISTS v2_playlist_rooms_owner_idx ON v2_playlist_rooms (owner_user_id, created_at DESC);

-- =============================================================
-- v2_playlist_room_items
-- =============================================================
CREATE TABLE IF NOT EXISTS v2_playlist_room_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES v2_playlist_rooms(id) ON DELETE CASCADE,
  song_id uuid REFERENCES songs(id) ON DELETE SET NULL,
  position int NOT NULL DEFAULT 0,
  title text NOT NULL,
  artist_name text,
  external_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS v2_playlist_room_items_room_idx ON v2_playlist_room_items (room_id, position);

-- =============================================================
-- v2_session_participation
-- =============================================================
CREATE TABLE IF NOT EXISTS v2_session_participation (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES v2_sessions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'joined' CHECK (status IN ('joined', 'reserved', 'left')),
  joined_at timestamptz NOT NULL DEFAULT now(),
  left_at timestamptz,
  UNIQUE (session_id, user_id)
);

CREATE INDEX IF NOT EXISTS v2_session_participation_session_idx ON v2_session_participation (session_id, status);

-- =============================================================
-- v2_song_feedback
-- =============================================================
CREATE TABLE IF NOT EXISTS v2_song_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES v2_sessions(id) ON DELETE SET NULL,
  circle_id uuid REFERENCES v2_circles(id) ON DELETE SET NULL,
  song_id uuid REFERENCES songs(id) ON DELETE CASCADE,
  from_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating int CHECK (rating IS NULL OR (rating >= 1 AND rating <= 5)),
  body text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS v2_song_feedback_song_idx ON v2_song_feedback (song_id, created_at DESC);
CREATE INDEX IF NOT EXISTS v2_song_feedback_session_idx ON v2_song_feedback (session_id, created_at DESC);

-- =============================================================
-- updated_at triggers
-- =============================================================
CREATE OR REPLACE FUNCTION v2_community_set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS v2_circles_updated_at ON v2_circles;
CREATE TRIGGER v2_circles_updated_at
  BEFORE UPDATE ON v2_circles
  FOR EACH ROW EXECUTE FUNCTION v2_community_set_updated_at();

DROP TRIGGER IF EXISTS v2_sessions_updated_at ON v2_sessions;
CREATE TRIGGER v2_sessions_updated_at
  BEFORE UPDATE ON v2_sessions
  FOR EACH ROW EXECUTE FUNCTION v2_community_set_updated_at();

DROP TRIGGER IF EXISTS v2_playlist_rooms_updated_at ON v2_playlist_rooms;
CREATE TRIGGER v2_playlist_rooms_updated_at
  BEFORE UPDATE ON v2_playlist_rooms
  FOR EACH ROW EXECUTE FUNCTION v2_community_set_updated_at();

-- =============================================================
-- RLS
-- =============================================================
ALTER TABLE v2_circles ENABLE ROW LEVEL SECURITY;
ALTER TABLE v2_circle_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE v2_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE v2_session_songs ENABLE ROW LEVEL SECURITY;
ALTER TABLE v2_playlist_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE v2_playlist_room_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE v2_session_participation ENABLE ROW LEVEL SECURITY;
ALTER TABLE v2_song_feedback ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  -- v2_circles
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'v2_circles' AND policyname = 'v2_circles_public_select') THEN
    CREATE POLICY v2_circles_public_select ON v2_circles FOR SELECT
      USING (visibility = 'public' OR owner_user_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'v2_circles' AND policyname = 'v2_circles_owner_all') THEN
    CREATE POLICY v2_circles_owner_all ON v2_circles FOR ALL
      USING (owner_user_id = auth.uid()) WITH CHECK (owner_user_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'v2_circles' AND policyname = 'v2_circles_admin_select') THEN
    CREATE POLICY v2_circles_admin_select ON v2_circles FOR SELECT USING (is_admin());
  END IF;

  -- v2_circle_members
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'v2_circle_members' AND policyname = 'v2_circle_members_select') THEN
    CREATE POLICY v2_circle_members_select ON v2_circle_members FOR SELECT
      USING (
        user_id = auth.uid()
        OR EXISTS (SELECT 1 FROM v2_circles c WHERE c.id = circle_id AND (c.visibility = 'public' OR c.owner_user_id = auth.uid()))
      );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'v2_circle_members' AND policyname = 'v2_circle_members_self') THEN
    CREATE POLICY v2_circle_members_self ON v2_circle_members FOR ALL
      USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
  END IF;

  -- v2_sessions
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'v2_sessions' AND policyname = 'v2_sessions_select') THEN
    CREATE POLICY v2_sessions_select ON v2_sessions FOR SELECT
      USING (
        host_user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM v2_circles c
          WHERE c.id = v2_sessions.circle_id AND c.visibility = 'public'
        )
        OR circle_id IS NULL
      );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'v2_sessions' AND policyname = 'v2_sessions_host_all') THEN
    CREATE POLICY v2_sessions_host_all ON v2_sessions FOR ALL
      USING (host_user_id = auth.uid()) WITH CHECK (host_user_id = auth.uid());
  END IF;

  -- v2_session_songs
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'v2_session_songs' AND policyname = 'v2_session_songs_select') THEN
    CREATE POLICY v2_session_songs_select ON v2_session_songs FOR SELECT
      USING (EXISTS (SELECT 1 FROM v2_sessions s WHERE s.id = session_id));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'v2_session_songs' AND policyname = 'v2_session_songs_submit') THEN
    CREATE POLICY v2_session_songs_submit ON v2_session_songs FOR INSERT
      WITH CHECK (submitted_by = auth.uid());
  END IF;

  -- v2_playlist_rooms
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'v2_playlist_rooms' AND policyname = 'v2_playlist_rooms_select') THEN
    CREATE POLICY v2_playlist_rooms_select ON v2_playlist_rooms FOR SELECT
      USING (owner_user_id = auth.uid() OR circle_id IS NOT NULL);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'v2_playlist_rooms' AND policyname = 'v2_playlist_rooms_owner_all') THEN
    CREATE POLICY v2_playlist_rooms_owner_all ON v2_playlist_rooms FOR ALL
      USING (owner_user_id = auth.uid()) WITH CHECK (owner_user_id = auth.uid());
  END IF;

  -- v2_playlist_room_items
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'v2_playlist_room_items' AND policyname = 'v2_playlist_room_items_select') THEN
    CREATE POLICY v2_playlist_room_items_select ON v2_playlist_room_items FOR SELECT
      USING (EXISTS (SELECT 1 FROM v2_playlist_rooms r WHERE r.id = room_id));
  END IF;

  -- v2_session_participation
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'v2_session_participation' AND policyname = 'v2_session_participation_self') THEN
    CREATE POLICY v2_session_participation_self ON v2_session_participation FOR ALL
      USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'v2_session_participation' AND policyname = 'v2_session_participation_host_select') THEN
    CREATE POLICY v2_session_participation_host_select ON v2_session_participation FOR SELECT
      USING (EXISTS (SELECT 1 FROM v2_sessions s WHERE s.id = session_id AND s.host_user_id = auth.uid()));
  END IF;

  -- v2_song_feedback
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'v2_song_feedback' AND policyname = 'v2_song_feedback_select') THEN
    CREATE POLICY v2_song_feedback_select ON v2_song_feedback FOR SELECT
      USING (from_user_id = auth.uid() OR EXISTS (SELECT 1 FROM songs so WHERE so.id = song_id AND so.user_id = auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'v2_song_feedback' AND policyname = 'v2_song_feedback_insert') THEN
    CREATE POLICY v2_song_feedback_insert ON v2_song_feedback FOR INSERT
      WITH CHECK (from_user_id = auth.uid());
  END IF;
END $$;

COMMENT ON TABLE v2_circles IS 'ViaTone 2.0 community circles';
COMMENT ON TABLE v2_sessions IS 'ViaTone 2.0 listening sessions — Stream Engine (Aigent4U) hooks in stream_engine_meta';
COMMENT ON COLUMN v2_sessions.stream_engine_meta IS 'TODO: Aigent4U queue, auto-switch, play logs, session report refs';
