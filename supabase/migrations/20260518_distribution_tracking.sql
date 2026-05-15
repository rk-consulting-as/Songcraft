-- Distribution tracking + affiliate click logging.
--
-- "Lightweight" model: we don't actually push to DistroKid via API. Instead we:
--   1. Make sure the user's metadata is complete
--   2. Generate a metadata bundle they can use during DistroKid upload
--   3. Send them through our affiliate link to DistroKid signup/upload
--   4. Log the outbound click so we can track conversion / earnings later

-- =============================================================
-- 1. Distribution columns on songs
-- =============================================================
ALTER TABLE songs
  ADD COLUMN IF NOT EXISTS distribution_status     text DEFAULT 'none' CHECK (distribution_status IN ('none','exported','submitted','live')),
  ADD COLUMN IF NOT EXISTS distribution_partner    text,
  ADD COLUMN IF NOT EXISTS distribution_url        text,
  ADD COLUMN IF NOT EXISTS distribution_exported_at timestamptz,
  ADD COLUMN IF NOT EXISTS isrc                    text,
  ADD COLUMN IF NOT EXISTS upc                     text;

CREATE INDEX IF NOT EXISTS songs_distribution_status_idx
  ON songs (distribution_status) WHERE distribution_status <> 'none';

-- =============================================================
-- 2. affiliate_clicks log
-- =============================================================
CREATE TABLE IF NOT EXISTS affiliate_clicks (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid REFERENCES profiles(id) ON DELETE SET NULL,
  partner     text NOT NULL,
  song_id     uuid REFERENCES songs(id) ON DELETE SET NULL,
  ref_url     text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS affiliate_clicks_partner_idx ON affiliate_clicks (partner, created_at DESC);
CREATE INDEX IF NOT EXISTS affiliate_clicks_user_idx    ON affiliate_clicks (user_id) WHERE user_id IS NOT NULL;

ALTER TABLE affiliate_clicks ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  -- Anyone (incl anon) can insert their own click record
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='affiliate_clicks' AND policyname='clicks_public_insert') THEN
    CREATE POLICY clicks_public_insert ON affiliate_clicks
      FOR INSERT
      WITH CHECK (true);
  END IF;

  -- Admin can read all
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='affiliate_clicks' AND policyname='clicks_admin_select') THEN
    CREATE POLICY clicks_admin_select ON affiliate_clicks
      FOR SELECT
      USING (is_admin());
  END IF;

  -- User can read own
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='affiliate_clicks' AND policyname='clicks_own_select') THEN
    CREATE POLICY clicks_own_select ON affiliate_clicks
      FOR SELECT
      USING (user_id = auth.uid());
  END IF;
END $$;

-- =============================================================
-- 3. System settings — affiliate URL per partner
-- =============================================================
INSERT INTO system_settings (key, value) VALUES
  ('affiliate.distrokid', '{"url": "https://distrokid.com/", "commission_estimate_usd": 7}'::jsonb)
ON CONFLICT (key) DO NOTHING;

NOTIFY pgrst, 'reload schema';
