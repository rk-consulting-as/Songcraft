-- Phase 21: Onboarding Wizard
-- Stores resumable setup progress for each user.

CREATE TABLE IF NOT EXISTS onboarding_progress (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  current_step integer NOT NULL DEFAULT 0,
  artist_id uuid REFERENCES artists(id) ON DELETE SET NULL,
  song_id uuid REFERENCES songs(id) ON DELETE SET NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  skipped boolean NOT NULL DEFAULT false,
  completed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION set_onboarding_progress_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS onboarding_progress_updated_at ON onboarding_progress;
CREATE TRIGGER onboarding_progress_updated_at
  BEFORE UPDATE ON onboarding_progress
  FOR EACH ROW
  EXECUTE FUNCTION set_onboarding_progress_updated_at();

ALTER TABLE onboarding_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS onboarding_progress_owner_select ON onboarding_progress;
CREATE POLICY onboarding_progress_owner_select ON onboarding_progress
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS onboarding_progress_owner_insert ON onboarding_progress;
CREATE POLICY onboarding_progress_owner_insert ON onboarding_progress
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS onboarding_progress_owner_update ON onboarding_progress;
CREATE POLICY onboarding_progress_owner_update ON onboarding_progress
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS onboarding_progress_admin_select ON onboarding_progress;
CREATE POLICY onboarding_progress_admin_select ON onboarding_progress
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('admin', 'super_admin')
    )
  );

NOTIFY pgrst, 'reload schema';
