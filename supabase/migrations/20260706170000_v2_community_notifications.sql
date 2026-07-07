-- ViaTone 2.0 Phase 4E — Community notifications, alerts & recaps

-- =============================================================
-- v2_community_notifications — small, generic in-app notification log
-- =============================================================
CREATE TABLE IF NOT EXISTS v2_community_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL,
  title text NOT NULL,
  body text,
  cta_label text,
  cta_href text,
  entity_type text,
  entity_id text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS v2_community_notifications_user_idx
  ON v2_community_notifications (user_id, is_read, created_at DESC);

CREATE INDEX IF NOT EXISTS v2_community_notifications_user_created_idx
  ON v2_community_notifications (user_id, created_at DESC);

-- =============================================================
-- RLS — owner reads/updates own rows; admins may read; no public access.
-- Writes for other users happen via the service role (bypasses RLS).
-- =============================================================
ALTER TABLE v2_community_notifications ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'v2_community_notifications' AND policyname = 'v2_community_notifications_owner_select'
  ) THEN
    CREATE POLICY v2_community_notifications_owner_select ON v2_community_notifications FOR SELECT
      USING (
        user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM profiles p
          WHERE p.id = auth.uid() AND p.role IN ('admin', 'super_admin')
        )
      );
  END IF;

  -- Owner can mark own notifications read (only is_read toggling is expected)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'v2_community_notifications' AND policyname = 'v2_community_notifications_owner_update'
  ) THEN
    CREATE POLICY v2_community_notifications_owner_update ON v2_community_notifications FOR UPDATE
      USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
  END IF;

  -- Owner may insert their own notifications (self-generated reminders, optional)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'v2_community_notifications' AND policyname = 'v2_community_notifications_owner_insert'
  ) THEN
    CREATE POLICY v2_community_notifications_owner_insert ON v2_community_notifications FOR INSERT
      WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

COMMENT ON TABLE v2_community_notifications IS 'ViaTone community — in-app notifications for participation, feedback, sessions and host activity';
