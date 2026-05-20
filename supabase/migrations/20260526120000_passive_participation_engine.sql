-- Phase 49D: Passive participation engine

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS lastfm_auto_sync boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS lastfm_last_sync_at timestamptz;

COMMENT ON COLUMN profiles.lastfm_auto_sync IS 'When true, periodic Last.fm sync generates passive activity suggestions.';
COMMENT ON COLUMN profiles.lastfm_last_sync_at IS 'Last background Last.fm sync timestamp.';

CREATE TABLE IF NOT EXISTS campaign_activity_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  campaign_id uuid NOT NULL REFERENCES playlist_campaigns(id) ON DELETE CASCADE,
  member_id uuid REFERENCES playlist_campaign_members(id) ON DELETE SET NULL,
  session_id text NOT NULL,
  confidence text NOT NULL CHECK (confidence IN ('high', 'medium', 'low', 'unclear')),
  summary text NOT NULL,
  matched_tracks jsonb NOT NULL DEFAULT '[]'::jsonb,
  playlist_coverage_percent integer NOT NULL DEFAULT 0,
  session_start_at timestamptz,
  session_end_at timestamptz,
  activity_date date NOT NULL,
  from_date date NOT NULL,
  to_date date NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'ignored')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, campaign_id, session_id)
);

CREATE INDEX IF NOT EXISTS campaign_activity_suggestions_user_pending_idx
  ON campaign_activity_suggestions (user_id, status, created_at DESC)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS campaign_activity_suggestions_campaign_idx
  ON campaign_activity_suggestions (campaign_id, status);

CREATE TABLE IF NOT EXISTS user_participation_streaks (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  daily_current integer NOT NULL DEFAULT 0,
  daily_best integer NOT NULL DEFAULT 0,
  weekly_current integer NOT NULL DEFAULT 0,
  weekly_best integer NOT NULL DEFAULT 0,
  last_participation_date date,
  last_week_key text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS campaign_activity_suggestions_updated_at ON campaign_activity_suggestions;
CREATE TRIGGER campaign_activity_suggestions_updated_at
  BEFORE UPDATE ON campaign_activity_suggestions
  FOR EACH ROW EXECUTE FUNCTION playlist_communities_set_updated_at();

ALTER TABLE campaign_activity_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_participation_streaks ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'campaign_activity_suggestions' AND policyname = 'activity_suggestions_owner_select') THEN
    CREATE POLICY activity_suggestions_owner_select ON campaign_activity_suggestions
      FOR SELECT USING (user_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'campaign_activity_suggestions' AND policyname = 'activity_suggestions_owner_update') THEN
    CREATE POLICY activity_suggestions_owner_update ON campaign_activity_suggestions
      FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'campaign_activity_suggestions' AND policyname = 'activity_suggestions_owner_insert') THEN
    CREATE POLICY activity_suggestions_owner_insert ON campaign_activity_suggestions
      FOR INSERT WITH CHECK (user_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'campaign_activity_suggestions' AND policyname = 'activity_suggestions_admin_select') THEN
    CREATE POLICY activity_suggestions_admin_select ON campaign_activity_suggestions
      FOR SELECT USING (is_admin());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_participation_streaks' AND policyname = 'participation_streaks_owner') THEN
    CREATE POLICY participation_streaks_owner ON user_participation_streaks
      FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_participation_streaks' AND policyname = 'participation_streaks_admin_select') THEN
    CREATE POLICY participation_streaks_admin_select ON user_participation_streaks
      FOR SELECT USING (is_admin());
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
