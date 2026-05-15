-- Chat extensions: attachments, group conversations, structured ticket system.
--
-- Attachments: messages.attachments jsonb array of {url, type, name, size, mime}
-- Groups: conversations.title + avatar_url already exist; just need RPCs to create + manage
-- Tickets: extend conversations with subject + status + priority + category + assigned_to

-- =============================================================
-- 1. New columns
-- =============================================================
ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS attachments jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS avatar_url      text,
  ADD COLUMN IF NOT EXISTS subject         text,
  ADD COLUMN IF NOT EXISTS ticket_status   text DEFAULT 'open'   CHECK (ticket_status IN ('open','in_progress','resolved','closed')),
  ADD COLUMN IF NOT EXISTS ticket_priority text DEFAULT 'normal' CHECK (ticket_priority IN ('low','normal','high','urgent')),
  ADD COLUMN IF NOT EXISTS ticket_category text,
  ADD COLUMN IF NOT EXISTS assigned_to     uuid REFERENCES profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS conversations_ticket_status_idx
  ON conversations (ticket_status, ticket_priority, updated_at DESC)
  WHERE type = 'support';

CREATE INDEX IF NOT EXISTS conversations_assigned_idx
  ON conversations (assigned_to) WHERE assigned_to IS NOT NULL;

-- =============================================================
-- 2. RPC: create_group_conversation(title, member_ids[])
-- =============================================================
CREATE OR REPLACE FUNCTION create_group_conversation(
  group_title text,
  member_ids uuid[]
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  me uuid := auth.uid();
  new_id uuid;
  member uuid;
BEGIN
  IF me IS NULL THEN RETURN jsonb_build_object('error','not_authenticated'); END IF;
  IF group_title IS NULL OR length(trim(group_title)) < 2 THEN
    RETURN jsonb_build_object('error','title_too_short');
  END IF;
  IF member_ids IS NULL OR array_length(member_ids, 1) < 1 THEN
    RETURN jsonb_build_object('error','need_members');
  END IF;

  INSERT INTO conversations (type, title) VALUES ('group', trim(group_title)) RETURNING id INTO new_id;
  -- Add the creator
  INSERT INTO conversation_participants (conversation_id, user_id) VALUES (new_id, me);
  -- Add each invited member (skip blocked + self)
  FOREACH member IN ARRAY member_ids LOOP
    IF member = me THEN CONTINUE; END IF;
    IF EXISTS (
      SELECT 1 FROM user_blocks
      WHERE (blocker_id = member AND blocked_id = me) OR (blocker_id = me AND blocked_id = member)
    ) THEN CONTINUE; END IF;
    INSERT INTO conversation_participants (conversation_id, user_id)
    VALUES (new_id, member)
    ON CONFLICT DO NOTHING;
  END LOOP;

  RETURN jsonb_build_object('success', true, 'conversation_id', new_id);
END;
$$;

GRANT EXECUTE ON FUNCTION create_group_conversation(text, uuid[]) TO authenticated;

DO $$
BEGIN
  EXECUTE 'ALTER FUNCTION public.create_group_conversation(text, uuid[]) OWNER TO postgres';
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- =============================================================
-- 3. RPC: add_group_member(conversation_id, member_id)
-- =============================================================
CREATE OR REPLACE FUNCTION add_group_member(conv_id uuid, member_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  me uuid := auth.uid();
  conv_type text;
BEGIN
  IF me IS NULL THEN RETURN jsonb_build_object('error','not_authenticated'); END IF;

  SELECT type INTO conv_type FROM conversations WHERE id = conv_id;
  IF conv_type IS NULL THEN RETURN jsonb_build_object('error','conversation_not_found'); END IF;
  IF conv_type <> 'group' THEN RETURN jsonb_build_object('error','not_a_group'); END IF;

  -- Caller must be a participant
  IF NOT EXISTS (SELECT 1 FROM conversation_participants WHERE conversation_id = conv_id AND user_id = me) THEN
    RETURN jsonb_build_object('error','not_a_participant');
  END IF;

  -- Block check
  IF EXISTS (
    SELECT 1 FROM user_blocks
    WHERE (blocker_id = member_id AND blocked_id = me) OR (blocker_id = me AND blocked_id = member_id)
  ) THEN RETURN jsonb_build_object('error','blocked'); END IF;

  INSERT INTO conversation_participants (conversation_id, user_id)
  VALUES (conv_id, member_id)
  ON CONFLICT DO NOTHING;

  RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION add_group_member(uuid, uuid) TO authenticated;

DO $$
BEGIN
  EXECUTE 'ALTER FUNCTION public.add_group_member(uuid, uuid) OWNER TO postgres';
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- =============================================================
-- 4. RPC: leave_group(conversation_id)
-- =============================================================
CREATE OR REPLACE FUNCTION leave_group(conv_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  me uuid := auth.uid();
BEGIN
  IF me IS NULL THEN RETURN jsonb_build_object('error','not_authenticated'); END IF;
  DELETE FROM conversation_participants WHERE conversation_id = conv_id AND user_id = me;
  RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION leave_group(uuid) TO authenticated;

DO $$
BEGIN
  EXECUTE 'ALTER FUNCTION public.leave_group(uuid) OWNER TO postgres';
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- =============================================================
-- 5. RPC: create_ticket(subject, category, priority, content)
-- =============================================================
CREATE OR REPLACE FUNCTION create_ticket(
  subject text,
  category text,
  priority text,
  initial_message text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  me uuid := auth.uid();
  new_id uuid;
  admin_rec record;
BEGIN
  IF me IS NULL THEN RETURN jsonb_build_object('error','not_authenticated'); END IF;
  IF subject IS NULL OR length(trim(subject)) < 3 THEN
    RETURN jsonb_build_object('error','subject_too_short');
  END IF;
  IF priority NOT IN ('low','normal','high','urgent') THEN priority := 'normal'; END IF;

  INSERT INTO conversations (type, title, subject, ticket_status, ticket_priority, ticket_category)
  VALUES ('support', subject, subject, 'open', priority, category)
  RETURNING id INTO new_id;

  -- Add reporter
  INSERT INTO conversation_participants (conversation_id, user_id) VALUES (new_id, me);
  -- Add all admins
  FOR admin_rec IN SELECT id FROM profiles WHERE role IN ('admin','super_admin') LOOP
    INSERT INTO conversation_participants (conversation_id, user_id)
    VALUES (new_id, admin_rec.id)
    ON CONFLICT DO NOTHING;
  END LOOP;

  -- Add the initial message
  IF initial_message IS NOT NULL AND length(trim(initial_message)) > 0 THEN
    INSERT INTO messages (conversation_id, sender_id, content)
    VALUES (new_id, me, trim(initial_message));
  END IF;

  RETURN jsonb_build_object('success', true, 'conversation_id', new_id);
END;
$$;

GRANT EXECUTE ON FUNCTION create_ticket(text, text, text, text) TO authenticated;

DO $$
BEGIN
  EXECUTE 'ALTER FUNCTION public.create_ticket(text, text, text, text) OWNER TO postgres';
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- =============================================================
-- 6. RPC: update_ticket_status — admin-only
-- =============================================================
CREATE OR REPLACE FUNCTION update_ticket_status(
  conv_id uuid,
  new_status text,
  new_priority text DEFAULT NULL,
  new_assignee uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  caller_role text;
BEGIN
  SELECT role INTO caller_role FROM profiles WHERE id = auth.uid();
  IF caller_role NOT IN ('admin','super_admin') THEN
    RETURN jsonb_build_object('error','not_authorised');
  END IF;
  IF new_status NOT IN ('open','in_progress','resolved','closed') THEN
    RETURN jsonb_build_object('error','invalid_status');
  END IF;
  IF new_priority IS NOT NULL AND new_priority NOT IN ('low','normal','high','urgent') THEN
    RETURN jsonb_build_object('error','invalid_priority');
  END IF;

  UPDATE conversations
  SET ticket_status = new_status,
      ticket_priority = COALESCE(new_priority, ticket_priority),
      assigned_to = COALESCE(new_assignee, assigned_to),
      updated_at = now()
  WHERE id = conv_id AND type = 'support';

  -- Emit a system message documenting the change
  INSERT INTO messages (conversation_id, sender_id, content)
  VALUES (conv_id, auth.uid(),
    '— Ticket status: ' || new_status
    || CASE WHEN new_priority IS NOT NULL THEN ', priority: ' || new_priority ELSE '' END
  );

  RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION update_ticket_status(uuid, text, text, uuid) TO authenticated;

DO $$
BEGIN
  EXECUTE 'ALTER FUNCTION public.update_ticket_status(uuid, text, text, uuid) OWNER TO postgres';
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- =============================================================
-- 7. Storage bucket for chat attachments
-- =============================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'chat-attachments',
  'chat-attachments',
  true,                                       -- public so we can use simple public URLs
  52428800,                                   -- 50 MB
  ARRAY[
    'image/png','image/jpeg','image/webp','image/gif',
    'audio/mpeg','audio/mp3','audio/wav','audio/ogg','audio/x-m4a','audio/mp4',
    'application/pdf','application/zip',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain'
  ]
)
ON CONFLICT (id) DO UPDATE
  SET public = true,
      file_size_limit = 52428800,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Storage RLS — only authenticated can upload. Anyone can read since it's public.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='objects' AND policyname='chat_attachments_authenticated_upload') THEN
    EXECUTE $pol$
      CREATE POLICY chat_attachments_authenticated_upload ON storage.objects
        FOR INSERT TO authenticated
        WITH CHECK (bucket_id = 'chat-attachments')
    $pol$;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='objects' AND policyname='chat_attachments_public_read') THEN
    EXECUTE $pol$
      CREATE POLICY chat_attachments_public_read ON storage.objects
        FOR SELECT
        USING (bucket_id = 'chat-attachments')
    $pol$;
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
