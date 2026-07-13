-- CRITICAL: Multi-tenant Row Level Security
-- Before this migration ran, every authenticated user could read every other user's
-- artists/songs/albums/studio_pages. This migration enables RLS on all user-owned
-- tables and adds policies that scope reads/writes to the row's owner, with the
-- following intentional exceptions:
--   • admins / super_admins can read everything (oversight)
--   • anonymous users can read PUBLIC content (enabled studio pages + their artists/songs/albums)
--   • anonymous users can INSERT into contact_submissions (contact form on studio pages)
--
-- Idempotent: safe to run multiple times.

-- =============================================================
-- 1. artists
-- =============================================================
ALTER TABLE IF EXISTS artists ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  -- Owner: full read/write of own rows
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='artists' AND policyname='artists_owner_all') THEN
    CREATE POLICY artists_owner_all ON artists
      FOR ALL
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
  END IF;

  -- Admin: read everything for oversight (no write — admins should not edit user content directly)
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='artists' AND policyname='artists_admin_select') THEN
    CREATE POLICY artists_admin_select ON artists
      FOR SELECT
      USING (is_admin());
  END IF;

  -- Public: read artists whose page is enabled (for /p/[slug])
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='artists' AND policyname='artists_public_page_select') THEN
    CREATE POLICY artists_public_page_select ON artists
      FOR SELECT
      USING (page_enabled = true);
  END IF;

  -- Public: read artists referenced as featured on an enabled studio page (for /studio/[slug])
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='artists' AND policyname='artists_studio_featured_select') THEN
    CREATE POLICY artists_studio_featured_select ON artists
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM studio_pages sp
          WHERE sp.enabled = true
            AND sp.featured_artist_ids ? artists.id::text
        )
      );
  END IF;
END $$;

-- =============================================================
-- 2. songs
-- =============================================================
ALTER TABLE IF EXISTS songs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='songs' AND policyname='songs_owner_all') THEN
    CREATE POLICY songs_owner_all ON songs
      FOR ALL
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='songs' AND policyname='songs_admin_select') THEN
    CREATE POLICY songs_admin_select ON songs
      FOR SELECT
      USING (is_admin());
  END IF;

  -- Public: read songs whose artist's page is enabled
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='songs' AND policyname='songs_public_page_select') THEN
    CREATE POLICY songs_public_page_select ON songs
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM artists a
          WHERE a.id = songs.artist_id AND a.page_enabled = true
        )
      );
  END IF;

  -- Public: read songs featured on an enabled studio page
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='songs' AND policyname='songs_studio_featured_select') THEN
    CREATE POLICY songs_studio_featured_select ON songs
      FOR SELECT
      USING (
        featured_on_studio_page = true
        AND EXISTS (
          SELECT 1 FROM studio_pages sp
          WHERE sp.enabled = true
            AND sp.featured_artist_ids ? songs.artist_id::text
        )
      );
  END IF;
END $$;

-- =============================================================
-- 3. albums
-- =============================================================
ALTER TABLE IF EXISTS albums ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='albums' AND policyname='albums_owner_all') THEN
    CREATE POLICY albums_owner_all ON albums
      FOR ALL
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='albums' AND policyname='albums_admin_select') THEN
    CREATE POLICY albums_admin_select ON albums
      FOR SELECT
      USING (is_admin());
  END IF;

  -- Public: read albums whose artist's page is enabled
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='albums' AND policyname='albums_public_page_select') THEN
    CREATE POLICY albums_public_page_select ON albums
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM artists a
          WHERE a.id = albums.artist_id AND a.page_enabled = true
        )
      );
  END IF;
END $$;

-- =============================================================
-- 4. studio_pages
-- =============================================================
ALTER TABLE IF EXISTS studio_pages ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='studio_pages' AND policyname='studio_pages_owner_all') THEN
    CREATE POLICY studio_pages_owner_all ON studio_pages
      FOR ALL
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='studio_pages' AND policyname='studio_pages_admin_select') THEN
    CREATE POLICY studio_pages_admin_select ON studio_pages
      FOR SELECT
      USING (is_admin());
  END IF;

  -- Public: read enabled studio pages (for /studio/[slug])
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='studio_pages' AND policyname='studio_pages_public_enabled_select') THEN
    CREATE POLICY studio_pages_public_enabled_select ON studio_pages
      FOR SELECT
      USING (enabled = true);
  END IF;
END $$;

-- =============================================================
-- 5. platform_rules (per-user platform-specific publish rules)
-- =============================================================
ALTER TABLE IF EXISTS platform_rules ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='platform_rules' AND policyname='platform_rules_owner_all') THEN
    CREATE POLICY platform_rules_owner_all ON platform_rules
      FOR ALL
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='platform_rules' AND policyname='platform_rules_admin_select') THEN
    CREATE POLICY platform_rules_admin_select ON platform_rules
      FOR SELECT
      USING (is_admin());
  END IF;
END $$;

-- =============================================================
-- 6. contact_submissions (form submissions to studio pages)
-- Owner reads via studio_pages.user_id linkage. Anonymous can INSERT.
-- =============================================================
ALTER TABLE IF EXISTS contact_submissions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  -- Owner: read submissions for own studio pages
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='contact_submissions' AND policyname='contact_owner_select') THEN
    CREATE POLICY contact_owner_select ON contact_submissions
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM studio_pages sp
          WHERE sp.id = contact_submissions.studio_page_id
            AND sp.user_id = auth.uid()
        )
      );
  END IF;

  -- Owner: update (mark read/archive)
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='contact_submissions' AND policyname='contact_owner_update') THEN
    CREATE POLICY contact_owner_update ON contact_submissions
      FOR UPDATE
      USING (
        EXISTS (
          SELECT 1 FROM studio_pages sp
          WHERE sp.id = contact_submissions.studio_page_id
            AND sp.user_id = auth.uid()
        )
      );
  END IF;

  -- Admin: read all submissions
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='contact_submissions' AND policyname='contact_admin_select') THEN
    CREATE POLICY contact_admin_select ON contact_submissions
      FOR SELECT
      USING (is_admin());
  END IF;

  -- Public: anyone can submit a contact form (insert only)
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='contact_submissions' AND policyname='contact_public_insert') THEN
    CREATE POLICY contact_public_insert ON contact_submissions
      FOR INSERT
      WITH CHECK (true);
  END IF;
END $$;

-- =============================================================
-- 7. Sanity check: count rows missing user_id (informational)
-- =============================================================
-- This block is informational only. If it raises, no data is changed.
DO $$
DECLARE
  orphan_artists int;
  orphan_songs   int;
  orphan_albums  int;
  orphan_studios int;
BEGIN
  SELECT count(*) INTO orphan_artists FROM artists WHERE user_id IS NULL;
  SELECT count(*) INTO orphan_songs   FROM songs   WHERE user_id IS NULL;
  SELECT count(*) INTO orphan_albums  FROM albums  WHERE user_id IS NULL;
  SELECT count(*) INTO orphan_studios FROM studio_pages WHERE user_id IS NULL;

  IF orphan_artists + orphan_songs + orphan_albums + orphan_studios > 0 THEN
    RAISE NOTICE 'WARNING: Found rows with NULL user_id — these will be invisible to non-admins. artists=% songs=% albums=% studio_pages=%',
      orphan_artists, orphan_songs, orphan_albums, orphan_studios;
  END IF;
END $$;
