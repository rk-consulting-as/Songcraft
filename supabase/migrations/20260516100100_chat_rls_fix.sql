-- Fix infinite recursion in conversation_participants RLS policies.
-- The original policies referenced conversation_participants from within their own
-- USING clause, triggering Postgres recursion detection.
--
-- Solution: use a SECURITY DEFINER helper function to check participation. The
-- function bypasses RLS so we can query the same table without triggering policies.

CREATE OR REPLACE FUNCTION is_conversation_participant(conv_id uuid, check_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM conversation_participants
    WHERE conversation_id = conv_id AND user_id = check_user_id
  );
$$;

GRANT EXECUTE ON FUNCTION is_conversation_participant(uuid, uuid) TO anon, authenticated;

DO $$
BEGIN
  EXECUTE 'ALTER FUNCTION public.is_conversation_participant(uuid, uuid) OWNER TO postgres';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not transfer ownership of is_conversation_participant: %', SQLERRM;
END $$;

-- Drop and recreate policies using the helper function

-- conversations
DROP POLICY IF EXISTS conversations_participant_select ON conversations;
CREATE POLICY conversations_participant_select ON conversations
  FOR SELECT
  USING (is_conversation_participant(id) OR is_admin());

-- conversation_participants — own row OR any row in a conversation we're part of
DROP POLICY IF EXISTS participants_select ON conversation_participants;
CREATE POLICY participants_select ON conversation_participants
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR is_conversation_participant(conversation_id)
    OR is_admin()
  );

-- messages
DROP POLICY IF EXISTS messages_participant_select ON messages;
CREATE POLICY messages_participant_select ON messages
  FOR SELECT
  USING (is_conversation_participant(conversation_id) OR is_admin());

DROP POLICY IF EXISTS messages_participant_insert ON messages;
CREATE POLICY messages_participant_insert ON messages
  FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND is_conversation_participant(conversation_id)
  );

NOTIFY pgrst, 'reload schema';
