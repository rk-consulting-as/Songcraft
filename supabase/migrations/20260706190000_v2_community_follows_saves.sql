-- ViaTone 2.0 Phase 5B — Follow, save & conversion loop

-- =============================================================
-- v2_circle_follows
-- =============================================================
CREATE TABLE IF NOT EXISTS v2_circle_follows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  circle_id uuid NOT NULL REFERENCES v2_circles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, circle_id)
);

CREATE INDEX IF NOT EXISTS v2_circle_follows_user_idx ON v2_circle_follows (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS v2_circle_follows_circle_idx ON v2_circle_follows (circle_id);

-- =============================================================
-- v2_host_follows
-- =============================================================
CREATE TABLE IF NOT EXISTS v2_host_follows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  host_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, host_user_id),
  CONSTRAINT v2_host_follows_not_self CHECK (user_id <> host_user_id)
);

CREATE INDEX IF NOT EXISTS v2_host_follows_user_idx ON v2_host_follows (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS v2_host_follows_host_idx ON v2_host_follows (host_user_id);

-- =============================================================
-- v2_saved_community_items
-- =============================================================
CREATE TABLE IF NOT EXISTS v2_saved_community_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entity_type text NOT NULL CHECK (entity_type IN ('session', 'playlist_room')),
  entity_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, entity_type, entity_id)
);

CREATE INDEX IF NOT EXISTS v2_saved_items_user_idx ON v2_saved_community_items (user_id, entity_type, created_at DESC);
CREATE INDEX IF NOT EXISTS v2_saved_items_entity_idx ON v2_saved_community_items (entity_type, entity_id);

-- Public aggregate counts on circles (followers only — no identity exposure)
ALTER TABLE v2_circles
  ADD COLUMN IF NOT EXISTS follower_count integer NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION v2_sync_circle_follower_count()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE cid uuid;
BEGIN
  cid := COALESCE(NEW.circle_id, OLD.circle_id);
  UPDATE v2_circles SET follower_count = (
    SELECT count(*)::int FROM v2_circle_follows WHERE circle_id = cid
  ) WHERE id = cid;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS v2_circle_follower_count_sync ON v2_circle_follows;
CREATE TRIGGER v2_circle_follower_count_sync
  AFTER INSERT OR DELETE ON v2_circle_follows
  FOR EACH ROW EXECUTE FUNCTION v2_sync_circle_follower_count();

-- =============================================================
-- RLS
-- =============================================================
ALTER TABLE v2_circle_follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE v2_host_follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE v2_saved_community_items ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'v2_circle_follows' AND policyname = 'v2_circle_follows_self') THEN
    CREATE POLICY v2_circle_follows_self ON v2_circle_follows FOR ALL
      USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'v2_circle_follows' AND policyname = 'v2_circle_follows_public_count') THEN
    CREATE POLICY v2_circle_follows_public_count ON v2_circle_follows FOR SELECT
      USING (EXISTS (SELECT 1 FROM v2_circles c WHERE c.id = circle_id AND c.visibility = 'public'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'v2_host_follows' AND policyname = 'v2_host_follows_self') THEN
    CREATE POLICY v2_host_follows_self ON v2_host_follows FOR ALL
      USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'v2_saved_community_items' AND policyname = 'v2_saved_items_self') THEN
    CREATE POLICY v2_saved_items_self ON v2_saved_community_items FOR ALL
      USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

COMMENT ON TABLE v2_circle_follows IS 'User follows a public circle for activity updates';
COMMENT ON TABLE v2_host_follows IS 'User follows a community host/curator';
COMMENT ON TABLE v2_saved_community_items IS 'Bookmarked sessions and playlist rooms';
