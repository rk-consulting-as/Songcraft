-- Phase 30: Beta Launch Polish & Test Mode
-- Feedback inbox, beta settings, known issues, and admin-visible launch checklist.

CREATE TABLE IF NOT EXISTS beta_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  page text NOT NULL,
  type text NOT NULL DEFAULT 'feedback' CHECK (type IN ('feedback', 'bug', 'idea', 'billing', 'ux')),
  message text NOT NULL CHECK (length(trim(message)) >= 3 AND length(message) <= 4000),
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'reviewed', 'resolved', 'dismissed')),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  reviewed_at timestamptz
);

CREATE INDEX IF NOT EXISTS beta_feedback_created_idx ON beta_feedback (created_at DESC);
CREATE INDEX IF NOT EXISTS beta_feedback_user_idx ON beta_feedback (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS beta_feedback_status_idx ON beta_feedback (status, created_at DESC);

INSERT INTO admin_platform_settings (key, value, description)
VALUES
  ('beta_mode', '{"enabled":true,"message":"Songcraft er i beta. Test trygt og send feedback underveis.","show_checklist":true}'::jsonb, 'Beta/test mode banner and checklist'),
  ('known_issues', '{"enabled":true,"items":["Beta: enkelte analytics-tall kan være forsinket.","Direkte distributor-integrasjoner er ikke aktivert ennå."]}'::jsonb, 'Admin-managed known issues notice')
ON CONFLICT (key) DO NOTHING;

ALTER TABLE beta_feedback ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='beta_feedback' AND policyname='beta_feedback_owner_insert') THEN
    CREATE POLICY beta_feedback_owner_insert ON beta_feedback
      FOR INSERT
      WITH CHECK (user_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='beta_feedback' AND policyname='beta_feedback_owner_select') THEN
    CREATE POLICY beta_feedback_owner_select ON beta_feedback
      FOR SELECT
      USING (user_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='beta_feedback' AND policyname='beta_feedback_admin_select') THEN
    CREATE POLICY beta_feedback_admin_select ON beta_feedback
      FOR SELECT
      USING (is_admin());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='beta_feedback' AND policyname='beta_feedback_admin_update') THEN
    CREATE POLICY beta_feedback_admin_update ON beta_feedback
      FOR UPDATE
      USING (is_admin())
      WITH CHECK (is_admin());
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
