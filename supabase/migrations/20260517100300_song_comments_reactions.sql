-- Public comments + emoji reactions on songs.
--
-- song_comments  : threaded comments (parent_id for replies, hidden for moderation)
-- song_reactions : composite PK (song_id, user_id, emoji) so one of each emoji per user per song
-- counters       : denormalised comment_count + reaction_count on songs for cheap reads

-- =============================================================
-- 1. song_comments
-- =============================================================
CREATE TABLE IF NOT EXISTS song_comments (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  song_id     uuid NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content     text NOT NULL CHECK (length(trim(content)) > 0 AND length(content) <= 2000),
  parent_id   uuid REFERENCES song_comments(id) ON DELETE CASCADE,
  hidden      boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS song_comments_song_idx  ON song_comments (song_id, created_at DESC) WHERE hidden = false;
CREATE INDEX IF NOT EXISTS song_comments_user_idx  ON song_comments (user_id, created_at DESC);

-- =============================================================
-- 2. song_reactions
-- =============================================================
CREATE TABLE IF NOT EXISTS song_reactions (
  song_id     uuid NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  emoji       text NOT NULL CHECK (length(emoji) BETWEEN 1 AND 32),
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (song_id, user_id, emoji)
);

CREATE INDEX IF NOT EXISTS song_reactions_song_idx ON song_reactions (song_id);
CREATE INDEX IF NOT EXISTS song_reactions_user_idx ON song_reactions (user_id, created_at DESC);

-- =============================================================
-- 3. Denormalised counters on songs
-- =============================================================
ALTER TABLE songs
  ADD COLUMN IF NOT EXISTS comment_count  integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reaction_count integer NOT NULL DEFAULT 0;

-- Backfill if any rows exist (defensive)
UPDATE songs s
SET
  comment_count = (SELECT count(*) FROM song_comments c WHERE c.song_id = s.id AND c.hidden = false),
  reaction_count = (SELECT count(*) FROM song_reactions r WHERE r.song_id = s.id);

-- =============================================================
-- 4. Counter triggers
-- =============================================================
CREATE OR REPLACE FUNCTION bump_song_comment_counter() RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF (TG_OP = 'INSERT' AND NEW.hidden = false) THEN
    UPDATE songs SET comment_count = comment_count + 1 WHERE id = NEW.song_id;
  ELSIF (TG_OP = 'DELETE' AND OLD.hidden = false) THEN
    UPDATE songs SET comment_count = GREATEST(0, comment_count - 1) WHERE id = OLD.song_id;
  ELSIF (TG_OP = 'UPDATE' AND OLD.hidden = false AND NEW.hidden = true) THEN
    UPDATE songs SET comment_count = GREATEST(0, comment_count - 1) WHERE id = NEW.song_id;
  ELSIF (TG_OP = 'UPDATE' AND OLD.hidden = true AND NEW.hidden = false) THEN
    UPDATE songs SET comment_count = comment_count + 1 WHERE id = NEW.song_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS song_comments_counter ON song_comments;
CREATE TRIGGER song_comments_counter
  AFTER INSERT OR DELETE OR UPDATE OF hidden ON song_comments
  FOR EACH ROW EXECUTE FUNCTION bump_song_comment_counter();

CREATE OR REPLACE FUNCTION bump_song_reaction_counter() RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    UPDATE songs SET reaction_count = reaction_count + 1 WHERE id = NEW.song_id;
  ELSIF (TG_OP = 'DELETE') THEN
    UPDATE songs SET reaction_count = GREATEST(0, reaction_count - 1) WHERE id = OLD.song_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS song_reactions_counter ON song_reactions;
CREATE TRIGGER song_reactions_counter
  AFTER INSERT OR DELETE ON song_reactions
  FOR EACH ROW EXECUTE FUNCTION bump_song_reaction_counter();

DO $$
BEGIN
  EXECUTE 'ALTER FUNCTION public.bump_song_comment_counter()  OWNER TO postgres';
  EXECUTE 'ALTER FUNCTION public.bump_song_reaction_counter() OWNER TO postgres';
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- =============================================================
-- 5. RLS — comments
-- =============================================================
ALTER TABLE song_comments  ENABLE ROW LEVEL SECURITY;
ALTER TABLE song_reactions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  -- Anyone can read non-hidden comments on songs whose artist is publicly enabled
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='song_comments' AND policyname='comments_public_select') THEN
    CREATE POLICY comments_public_select ON song_comments
      FOR SELECT
      USING (
        hidden = false
        AND EXISTS (
          SELECT 1 FROM songs s
          JOIN artists a ON a.id = s.artist_id
          WHERE s.id = song_comments.song_id AND a.page_enabled = true
        )
      );
  END IF;

  -- Owner reads own (including hidden ones, for moderation appeals)
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='song_comments' AND policyname='comments_self_select') THEN
    CREATE POLICY comments_self_select ON song_comments
      FOR SELECT
      USING (user_id = auth.uid() OR is_admin());
  END IF;

  -- Authenticated can insert as themselves
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='song_comments' AND policyname='comments_self_insert') THEN
    CREATE POLICY comments_self_insert ON song_comments
      FOR INSERT TO authenticated
      WITH CHECK (user_id = auth.uid());
  END IF;

  -- Owner updates / deletes own
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='song_comments' AND policyname='comments_self_update') THEN
    CREATE POLICY comments_self_update ON song_comments
      FOR UPDATE TO authenticated
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='song_comments' AND policyname='comments_self_delete') THEN
    CREATE POLICY comments_self_delete ON song_comments
      FOR DELETE TO authenticated
      USING (user_id = auth.uid());
  END IF;

  -- Admin can hide (UPDATE) and delete any
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='song_comments' AND policyname='comments_admin_update') THEN
    CREATE POLICY comments_admin_update ON song_comments
      FOR UPDATE
      USING (is_admin())
      WITH CHECK (is_admin());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='song_comments' AND policyname='comments_admin_delete') THEN
    CREATE POLICY comments_admin_delete ON song_comments
      FOR DELETE
      USING (is_admin());
  END IF;

  -- Song owner (the user who owns the artist that owns the song) can also delete comments on their songs
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='song_comments' AND policyname='comments_song_owner_delete') THEN
    CREATE POLICY comments_song_owner_delete ON song_comments
      FOR DELETE
      USING (
        EXISTS (
          SELECT 1 FROM songs s WHERE s.id = song_comments.song_id AND s.user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- =============================================================
-- 6. RLS — reactions
-- =============================================================
DO $$
BEGIN
  -- Public read on reactions of songs whose artist is enabled
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='song_reactions' AND policyname='reactions_public_select') THEN
    CREATE POLICY reactions_public_select ON song_reactions
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM songs s
          JOIN artists a ON a.id = s.artist_id
          WHERE s.id = song_reactions.song_id AND a.page_enabled = true
        )
      );
  END IF;

  -- Own reactions: full insert/delete
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='song_reactions' AND policyname='reactions_self_insert') THEN
    CREATE POLICY reactions_self_insert ON song_reactions
      FOR INSERT TO authenticated
      WITH CHECK (user_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='song_reactions' AND policyname='reactions_self_delete') THEN
    CREATE POLICY reactions_self_delete ON song_reactions
      FOR DELETE TO authenticated
      USING (user_id = auth.uid());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='song_reactions' AND policyname='reactions_admin_all') THEN
    CREATE POLICY reactions_admin_all ON song_reactions
      FOR SELECT
      USING (is_admin());
  END IF;
END $$;

-- =============================================================
-- 7. Realtime publication for live comment + reaction updates
-- =============================================================
DO $$
BEGIN
  EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE song_comments';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not add song_comments to supabase_realtime: %', SQLERRM;
END $$;
DO $$
BEGIN
  EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE song_reactions';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not add song_reactions to supabase_realtime: %', SQLERRM;
END $$;

NOTIFY pgrst, 'reload schema';
