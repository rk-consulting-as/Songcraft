-- Phase 51: Artist Site Studio — artist stories / blog

CREATE TABLE IF NOT EXISTS artist_stories (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  artist_id       uuid NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
  song_id         uuid REFERENCES songs(id) ON DELETE SET NULL,
  title           text NOT NULL,
  slug            text NOT NULL,
  excerpt         text,
  body            text,
  story_type      text NOT NULL DEFAULT 'artist_journal',
  cover_image_url text,
  cover_asset_id  uuid REFERENCES media_assets(id) ON DELETE SET NULL,
  status          text NOT NULL DEFAULT 'draft',
  seo_title       text,
  seo_description text,
  og_image_url    text,
  public_hidden   boolean NOT NULL DEFAULT false,
  admin_hidden    boolean NOT NULL DEFAULT false,
  published_at    timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT artist_stories_title_not_blank CHECK (length(trim(title)) > 0),
  CONSTRAINT artist_stories_slug_not_blank CHECK (length(trim(slug)) > 0),
  CONSTRAINT artist_stories_status_check CHECK (status IN ('draft', 'published', 'archived')),
  CONSTRAINT artist_stories_type_check CHECK (story_type IN (
    'behind_the_song', 'release_story', 'artist_journal', 'lyrics_meaning',
    'campaign_update', 'playlist_feature', 'news'
  ))
);

CREATE UNIQUE INDEX IF NOT EXISTS artist_stories_artist_slug_uniq
  ON artist_stories (artist_id, slug);

CREATE INDEX IF NOT EXISTS artist_stories_artist_status_idx
  ON artist_stories (artist_id, status, published_at DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS artist_stories_owner_idx
  ON artist_stories (user_id, artist_id, updated_at DESC);

CREATE OR REPLACE FUNCTION set_artist_story_owner()
RETURNS trigger AS $$
BEGIN
  SELECT a.user_id INTO NEW.user_id
  FROM artists a
  WHERE a.id = NEW.artist_id;

  NEW.title = trim(NEW.title);
  NEW.slug = lower(regexp_replace(trim(NEW.slug), '[^a-z0-9]+', '-', 'g'));
  NEW.slug = trim(both '-' from NEW.slug);
  NEW.updated_at = now();

  IF NEW.status = 'published' AND NEW.published_at IS NULL THEN
    NEW.published_at = now();
  END IF;
  IF NEW.status <> 'published' AND TG_OP = 'UPDATE' AND OLD.status = 'published' AND NEW.status = 'draft' THEN
    NEW.published_at = NULL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS artist_stories_set_owner ON artist_stories;
CREATE TRIGGER artist_stories_set_owner
  BEFORE INSERT OR UPDATE ON artist_stories
  FOR EACH ROW EXECUTE FUNCTION set_artist_story_owner();

ALTER TABLE artist_stories ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'artist_stories' AND policyname = 'artist_stories_owner_all') THEN
    CREATE POLICY artist_stories_owner_all ON artist_stories
      FOR ALL
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'artist_stories' AND policyname = 'artist_stories_public_select') THEN
    CREATE POLICY artist_stories_public_select ON artist_stories
      FOR SELECT
      USING (
        status = 'published'
        AND public_hidden = false
        AND admin_hidden = false
        AND EXISTS (
          SELECT 1 FROM artists a
          WHERE a.id = artist_stories.artist_id
            AND a.page_enabled = true
            AND a.admin_hidden = false
        )
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'artist_stories' AND policyname = 'artist_stories_admin_select') THEN
    CREATE POLICY artist_stories_admin_select ON artist_stories
      FOR SELECT
      USING (is_admin());
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
