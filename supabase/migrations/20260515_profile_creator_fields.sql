-- Creator-profile fields for the Nordic creator catalog:
--   roles              text[]   — multi-select from a fixed set (vocalist/producer/...)
--   location           text     — free-form city (Oslo, Bergen, Stockholm, ...)
--   languages          text[]   — languages they create in (no, en, sv, da, fi, is)
--   open_to_collab     boolean  — willing to take on collabs / commissions
--   visible_in_catalog boolean  — opt out to hide from /discover (default visible to drive growth)

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS roles              text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS location           text,
  ADD COLUMN IF NOT EXISTS languages          text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS open_to_collab     boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS visible_in_catalog boolean DEFAULT true;

CREATE INDEX IF NOT EXISTS profiles_visible_in_catalog_idx
  ON profiles (visible_in_catalog) WHERE visible_in_catalog = true;

-- GIN indexes for fast filter by roles / languages arrays
CREATE INDEX IF NOT EXISTS profiles_roles_idx     ON profiles USING GIN (roles);
CREATE INDEX IF NOT EXISTS profiles_languages_idx ON profiles USING GIN (languages);

COMMENT ON COLUMN profiles.roles IS 'Creator roles: e.g. {"vocalist","producer","songwriter"}';
COMMENT ON COLUMN profiles.languages IS 'Creation languages: no/en/sv/da/fi/is';
COMMENT ON COLUMN profiles.visible_in_catalog IS 'Opt-out flag for /discover. Default true.';

-- =============================================================
-- RLS: allow anonymous read of catalog-visible profiles
-- =============================================================
-- The existing policies on profiles:
--   - profiles_select_own_or_admin (own row + admin sees all)
--   - profiles_select_basic_for_authenticated (any authenticated user reads all)
-- For the public /discover and /u/[code] pages, we need anon (un-authenticated) read
-- of profiles that have opted into the catalog.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='profiles' AND policyname='profiles_public_catalog_select') THEN
    CREATE POLICY profiles_public_catalog_select ON profiles
      FOR SELECT
      USING (visible_in_catalog = true);
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
