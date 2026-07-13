-- Direct messaging + support chat + moderation primitives.
-- Real-time via Supabase Realtime publication on messages.
--
-- Design:
--   - conversations table holds metadata (type, created_at, optional title for groups later)
--   - conversation_participants connects users to conversations
--   - messages table holds individual messages
--   - user_blocks lets users block someone from messaging them
--   - message_reports queues content for admin moderation

-- =============================================================
-- 1. conversations
-- =============================================================
CREATE TABLE IF NOT EXISTS conversations (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type        text NOT NULL DEFAULT 'direct' CHECK (type IN ('direct','support','group')),
  title       text,            -- for groups later; null for direct
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS conversations_type_idx ON conversations (type, updated_at DESC);

-- =============================================================
-- 2. conversation_participants
-- =============================================================
CREATE TABLE IF NOT EXISTS conversation_participants (
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id         uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  joined_at       timestamptz NOT NULL DEFAULT now(),
  last_read_at    timestamptz,
  PRIMARY KEY (conversation_id, user_id)
);

CREATE INDEX IF NOT EXISTS participants_user_idx ON conversation_participants (user_id);

-- =============================================================
-- 3. messages
-- =============================================================
CREATE TABLE IF NOT EXISTS messages (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id       uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content         text NOT NULL,
  hidden          boolean NOT NULL DEFAULT false,  -- moderation: set true to hide
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS messages_conversation_idx ON messages (conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS messages_sender_idx       ON messages (sender_id, created_at DESC);

-- Bump conversation.updated_at when a new message arrives so the list sorts naturally.
CREATE OR REPLACE FUNCTION bump_conversation_updated_at() RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE conversations SET updated_at = NEW.created_at WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS messages_bump_conversation ON messages;
CREATE TRIGGER messages_bump_conversation
  AFTER INSERT ON messages
  FOR EACH ROW EXECUTE FUNCTION bump_conversation_updated_at();

DO $$
BEGIN
  EXECUTE 'ALTER FUNCTION public.bump_conversation_updated_at() OWNER TO postgres';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not transfer ownership: %', SQLERRM;
END $$;

-- =============================================================
-- 4. user_blocks — "I don't want this person to message me"
-- =============================================================
CREATE TABLE IF NOT EXISTS user_blocks (
  blocker_id  uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  blocked_id  uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (blocker_id, blocked_id),
  CHECK (blocker_id <> blocked_id)
);

CREATE INDEX IF NOT EXISTS blocks_blocker_idx ON user_blocks (blocker_id);
CREATE INDEX IF NOT EXISTS blocks_blocked_idx ON user_blocks (blocked_id);

-- =============================================================
-- 5. message_reports — moderation queue
-- =============================================================
CREATE TABLE IF NOT EXISTS message_reports (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id   uuid NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  reporter_id  uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reason       text NOT NULL,
  status       text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','dismissed','actioned')),
  reviewed_by  uuid REFERENCES profiles(id) ON DELETE SET NULL,
  reviewed_at  timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (message_id, reporter_id)
);

CREATE INDEX IF NOT EXISTS reports_status_idx ON message_reports (status, created_at DESC);

-- =============================================================
-- 6. RLS
-- =============================================================
ALTER TABLE conversations               ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_participants   ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_blocks                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_reports             ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  -- conversations: participants read, admin reads all
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='conversations' AND policyname='conversations_participant_select') THEN
    CREATE POLICY conversations_participant_select ON conversations
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM conversation_participants p
          WHERE p.conversation_id = conversations.id AND p.user_id = auth.uid()
        ) OR is_admin()
      );
  END IF;

  -- conversations: anyone authenticated can create one (server route adds participants)
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='conversations' AND policyname='conversations_authenticated_insert') THEN
    CREATE POLICY conversations_authenticated_insert ON conversations
      FOR INSERT TO authenticated
      WITH CHECK (true);
  END IF;

  -- participants: a user sees rows for conversations they're in; admins see all
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='conversation_participants' AND policyname='participants_select') THEN
    CREATE POLICY participants_select ON conversation_participants
      FOR SELECT
      USING (
        user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM conversation_participants p2
          WHERE p2.conversation_id = conversation_participants.conversation_id
            AND p2.user_id = auth.uid()
        )
        OR is_admin()
      );
  END IF;

  -- participants: own row insert (joining yourself) — actual creation usually via RPC
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='conversation_participants' AND policyname='participants_self_insert') THEN
    CREATE POLICY participants_self_insert ON conversation_participants
      FOR INSERT TO authenticated
      WITH CHECK (user_id = auth.uid());
  END IF;

  -- participants: own row update (e.g. last_read_at)
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='conversation_participants' AND policyname='participants_self_update') THEN
    CREATE POLICY participants_self_update ON conversation_participants
      FOR UPDATE TO authenticated
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
  END IF;

  -- messages: participants read, admin reads all
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='messages' AND policyname='messages_participant_select') THEN
    CREATE POLICY messages_participant_select ON messages
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM conversation_participants p
          WHERE p.conversation_id = messages.conversation_id AND p.user_id = auth.uid()
        )
        OR is_admin()
      );
  END IF;

  -- messages: send only as yourself, only into conversations you're in
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='messages' AND policyname='messages_participant_insert') THEN
    CREATE POLICY messages_participant_insert ON messages
      FOR INSERT TO authenticated
      WITH CHECK (
        sender_id = auth.uid()
        AND EXISTS (
          SELECT 1 FROM conversation_participants p
          WHERE p.conversation_id = messages.conversation_id AND p.user_id = auth.uid()
        )
      );
  END IF;

  -- messages: admin can hide (set hidden = true) for moderation
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='messages' AND policyname='messages_admin_update') THEN
    CREATE POLICY messages_admin_update ON messages
      FOR UPDATE
      USING (is_admin())
      WITH CHECK (is_admin());
  END IF;

  -- user_blocks: own rows only
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='user_blocks' AND policyname='blocks_owner_all') THEN
    CREATE POLICY blocks_owner_all ON user_blocks
      FOR ALL TO authenticated
      USING (blocker_id = auth.uid())
      WITH CHECK (blocker_id = auth.uid());
  END IF;

  -- message_reports: reporter can insert + read own. Admin reads all.
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='message_reports' AND policyname='reports_reporter_insert') THEN
    CREATE POLICY reports_reporter_insert ON message_reports
      FOR INSERT TO authenticated
      WITH CHECK (reporter_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='message_reports' AND policyname='reports_select_own_or_admin') THEN
    CREATE POLICY reports_select_own_or_admin ON message_reports
      FOR SELECT
      USING (reporter_id = auth.uid() OR is_admin());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='message_reports' AND policyname='reports_admin_update') THEN
    CREATE POLICY reports_admin_update ON message_reports
      FOR UPDATE
      USING (is_admin())
      WITH CHECK (is_admin());
  END IF;
END $$;

-- =============================================================
-- 7. RPC: get_or_create_direct_conversation
-- Server-side helper that finds an existing 1:1 conversation between
-- the caller and another user, or creates one if none exists.
-- Respects blocks: returns error if either party has blocked the other.
-- =============================================================
CREATE OR REPLACE FUNCTION get_or_create_direct_conversation(other_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  me uuid := auth.uid();
  existing_id uuid;
  new_id uuid;
BEGIN
  IF me IS NULL THEN RETURN jsonb_build_object('error','not_authenticated'); END IF;
  IF other_user_id IS NULL OR other_user_id = me THEN
    RETURN jsonb_build_object('error','invalid_recipient');
  END IF;

  -- Block check
  IF EXISTS (
    SELECT 1 FROM user_blocks
    WHERE (blocker_id = other_user_id AND blocked_id = me)
       OR (blocker_id = me           AND blocked_id = other_user_id)
  ) THEN
    RETURN jsonb_build_object('error','blocked');
  END IF;

  -- Look for an existing direct conversation that contains exactly these two users
  SELECT c.id INTO existing_id
  FROM conversations c
  WHERE c.type = 'direct'
    AND (SELECT count(*) FROM conversation_participants p WHERE p.conversation_id = c.id) = 2
    AND EXISTS (SELECT 1 FROM conversation_participants p WHERE p.conversation_id = c.id AND p.user_id = me)
    AND EXISTS (SELECT 1 FROM conversation_participants p WHERE p.conversation_id = c.id AND p.user_id = other_user_id)
  LIMIT 1;

  IF existing_id IS NOT NULL THEN
    RETURN jsonb_build_object('conversation_id', existing_id, 'created', false);
  END IF;

  -- Create new
  INSERT INTO conversations (type) VALUES ('direct') RETURNING id INTO new_id;
  INSERT INTO conversation_participants (conversation_id, user_id) VALUES (new_id, me), (new_id, other_user_id);

  RETURN jsonb_build_object('conversation_id', new_id, 'created', true);
END;
$$;

GRANT EXECUTE ON FUNCTION get_or_create_direct_conversation(uuid) TO authenticated;

DO $$
BEGIN
  EXECUTE 'ALTER FUNCTION public.get_or_create_direct_conversation(uuid) OWNER TO postgres';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not transfer ownership: %', SQLERRM;
END $$;

-- =============================================================
-- 8. RPC: get_or_create_support_conversation
-- Each user gets one support conversation that includes them + all admins.
-- =============================================================
CREATE OR REPLACE FUNCTION get_or_create_support_conversation()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  me uuid := auth.uid();
  existing_id uuid;
  new_id uuid;
  admin_rec record;
BEGIN
  IF me IS NULL THEN RETURN jsonb_build_object('error','not_authenticated'); END IF;

  -- Find existing support conversation for this user
  SELECT c.id INTO existing_id
  FROM conversations c
  JOIN conversation_participants p ON p.conversation_id = c.id
  WHERE c.type = 'support' AND p.user_id = me
  LIMIT 1;

  IF existing_id IS NOT NULL THEN
    RETURN jsonb_build_object('conversation_id', existing_id, 'created', false);
  END IF;

  INSERT INTO conversations (type, title) VALUES ('support', 'Support') RETURNING id INTO new_id;
  INSERT INTO conversation_participants (conversation_id, user_id) VALUES (new_id, me);
  -- Add all current admins/super_admins as participants
  FOR admin_rec IN SELECT id FROM profiles WHERE role IN ('admin','super_admin') LOOP
    INSERT INTO conversation_participants (conversation_id, user_id)
    VALUES (new_id, admin_rec.id)
    ON CONFLICT DO NOTHING;
  END LOOP;

  RETURN jsonb_build_object('conversation_id', new_id, 'created', true);
END;
$$;

GRANT EXECUTE ON FUNCTION get_or_create_support_conversation() TO authenticated;

DO $$
BEGIN
  EXECUTE 'ALTER FUNCTION public.get_or_create_support_conversation() OWNER TO postgres';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not transfer ownership: %', SQLERRM;
END $$;

-- =============================================================
-- 9. Enable Realtime publication on messages
-- =============================================================
-- Supabase Realtime listens to the supabase_realtime publication.
-- We add the messages table so subscribed clients receive INSERTs in real time.
DO $$
BEGIN
  EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE messages';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not add messages to supabase_realtime publication: %', SQLERRM;
END $$;

NOTIFY pgrst, 'reload schema';
