-- Phase 47: Activity proof & participation board

CREATE TABLE IF NOT EXISTS campaign_activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES playlist_campaigns(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES playlist_campaign_members(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  artist_id uuid REFERENCES artists(id) ON DELETE SET NULL,
  song_id uuid REFERENCES songs(id) ON DELETE SET NULL,
  activity_date date NOT NULL DEFAULT (CURRENT_DATE),
  status text NOT NULL DEFAULT 'submitted' CHECK (status IN ('pending', 'submitted', 'approved', 'rejected', 'missed')),
  proof_type text NOT NULL DEFAULT 'text' CHECK (proof_type IN ('image', 'csv', 'text', 'manual')),
  proof_asset_id uuid REFERENCES media_assets(id) ON DELETE SET NULL,
  proof_text text,
  owner_note text,
  ai_summary text,
  ai_confidence text CHECK (ai_confidence IS NULL OR ai_confidence IN ('high', 'medium', 'low', 'unclear')),
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (member_id, activity_date)
);

CREATE INDEX IF NOT EXISTS campaign_activity_logs_campaign_idx ON campaign_activity_logs (campaign_id, activity_date DESC);
CREATE INDEX IF NOT EXISTS campaign_activity_logs_member_idx ON campaign_activity_logs (member_id, activity_date DESC);
CREATE INDEX IF NOT EXISTS campaign_activity_logs_user_idx ON campaign_activity_logs (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS campaign_activity_logs_status_idx ON campaign_activity_logs (campaign_id, status);

DROP TRIGGER IF EXISTS campaign_activity_logs_updated_at ON campaign_activity_logs;
CREATE TRIGGER campaign_activity_logs_updated_at
  BEFORE UPDATE ON campaign_activity_logs
  FOR EACH ROW EXECUTE FUNCTION playlist_communities_set_updated_at();

ALTER TABLE campaign_activity_logs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'campaign_activity_logs' AND policyname = 'campaign_activity_logs_member_select') THEN
    CREATE POLICY campaign_activity_logs_member_select ON campaign_activity_logs
      FOR SELECT
      USING (user_id = auth.uid());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'campaign_activity_logs' AND policyname = 'campaign_activity_logs_member_insert') THEN
    CREATE POLICY campaign_activity_logs_member_insert ON campaign_activity_logs
      FOR INSERT
      WITH CHECK (
        user_id = auth.uid()
        AND EXISTS (
          SELECT 1 FROM playlist_campaign_members m
          WHERE m.id = campaign_activity_logs.member_id
            AND m.user_id = auth.uid()
            AND m.status = 'approved'
            AND m.campaign_id = campaign_activity_logs.campaign_id
        )
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'campaign_activity_logs' AND policyname = 'campaign_activity_logs_member_update_own') THEN
    CREATE POLICY campaign_activity_logs_member_update_own ON campaign_activity_logs
      FOR UPDATE
      USING (user_id = auth.uid() AND status IN ('pending', 'submitted'))
      WITH CHECK (user_id = auth.uid());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'campaign_activity_logs' AND policyname = 'campaign_activity_logs_owner_all') THEN
    CREATE POLICY campaign_activity_logs_owner_all ON campaign_activity_logs
      FOR ALL
      USING (
        EXISTS (
          SELECT 1 FROM playlist_campaigns c
          WHERE c.id = campaign_activity_logs.campaign_id
            AND c.user_id = auth.uid()
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM playlist_campaigns c
          WHERE c.id = campaign_activity_logs.campaign_id
            AND c.user_id = auth.uid()
        )
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'campaign_activity_logs' AND policyname = 'campaign_activity_logs_admin_select') THEN
    CREATE POLICY campaign_activity_logs_admin_select ON campaign_activity_logs
      FOR SELECT
      USING (is_admin());
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
