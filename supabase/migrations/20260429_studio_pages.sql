-- Studio / manager-level public page. One per user. Separate from per-artist /p/{slug} pages.
-- URL: /studio/{slug}

CREATE TABLE IF NOT EXISTS studio_pages (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  slug            text NOT NULL,
  enabled         boolean NOT NULL DEFAULT false,
  name            text NOT NULL DEFAULT '',
  tagline         text,
  bio             text,                                -- Markdown
  hero_image_url  text,
  accent_color    text DEFAULT '#d4a843',
  contact_email   text,
  show_contact_form boolean NOT NULL DEFAULT true,
  services        jsonb NOT NULL DEFAULT '[]'::jsonb,  -- [{title, description}]
  featured_projects jsonb NOT NULL DEFAULT '[]'::jsonb,-- [{title, description, image_url, link_url}]
  featured_artist_ids jsonb NOT NULL DEFAULT '[]'::jsonb,  -- [uuid] of artists to show on the page
  social_links    jsonb NOT NULL DEFAULT '{}'::jsonb,
  sections        jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- Each user has at most one studio page; slugs are globally unique.
CREATE UNIQUE INDEX IF NOT EXISTS studio_pages_user_uniq ON studio_pages (user_id);
CREATE UNIQUE INDEX IF NOT EXISTS studio_pages_slug_uniq ON studio_pages (slug);

-- Touch updated_at on writes.
CREATE OR REPLACE FUNCTION set_studio_pages_updated_at()
RETURNS trigger AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS studio_pages_set_updated_at ON studio_pages;
CREATE TRIGGER studio_pages_set_updated_at BEFORE UPDATE ON studio_pages
  FOR EACH ROW EXECUTE FUNCTION set_studio_pages_updated_at();

ALTER TABLE studio_pages ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'studio_pages' AND policyname = 'studio_pages_owner_all') THEN
    CREATE POLICY studio_pages_owner_all ON studio_pages FOR ALL
      USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'studio_pages' AND policyname = 'studio_pages_public_read') THEN
    CREATE POLICY studio_pages_public_read ON studio_pages FOR SELECT
      USING (enabled = true);
  END IF;
END $$;

-- Contact submissions for studio pages.
CREATE TABLE IF NOT EXISTS contact_submissions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_page_id  uuid NOT NULL REFERENCES studio_pages(id) ON DELETE CASCADE,
  from_name       text NOT NULL,
  from_email      text NOT NULL,
  message         text NOT NULL,
  source_ip       text,
  user_agent      text,
  read_at         timestamptz,
  archived_at     timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS contact_submissions_page_idx ON contact_submissions (studio_page_id, created_at DESC);

ALTER TABLE contact_submissions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  -- Public can INSERT (i.e. submit the form on the public page) but cannot SELECT.
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'contact_submissions' AND policyname = 'contact_submissions_public_insert') THEN
    CREATE POLICY contact_submissions_public_insert ON contact_submissions FOR INSERT
      WITH CHECK (
        EXISTS (SELECT 1 FROM studio_pages sp WHERE sp.id = contact_submissions.studio_page_id AND sp.enabled = true AND sp.show_contact_form = true)
      );
  END IF;
  -- Page owner reads / updates / deletes their own inbox.
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'contact_submissions' AND policyname = 'contact_submissions_owner_read') THEN
    CREATE POLICY contact_submissions_owner_read ON contact_submissions FOR SELECT
      USING (EXISTS (SELECT 1 FROM studio_pages sp WHERE sp.id = contact_submissions.studio_page_id AND sp.user_id = auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'contact_submissions' AND policyname = 'contact_submissions_owner_update') THEN
    CREATE POLICY contact_submissions_owner_update ON contact_submissions FOR UPDATE
      USING (EXISTS (SELECT 1 FROM studio_pages sp WHERE sp.id = contact_submissions.studio_page_id AND sp.user_id = auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'contact_submissions' AND policyname = 'contact_submissions_owner_delete') THEN
    CREATE POLICY contact_submissions_owner_delete ON contact_submissions FOR DELETE
      USING (EXISTS (SELECT 1 FROM studio_pages sp WHERE sp.id = contact_submissions.studio_page_id AND sp.user_id = auth.uid()));
  END IF;
END $$;

COMMENT ON COLUMN studio_pages.bio                 IS 'Markdown text rendered to HTML on the public page.';
COMMENT ON COLUMN studio_pages.services            IS 'JSON array of {title, description} entries — services offered by the studio/manager.';
COMMENT ON COLUMN studio_pages.featured_projects   IS 'JSON array of {title, description, image_url, link_url} entries — manual project cards.';
COMMENT ON COLUMN studio_pages.featured_artist_ids IS 'JSON array of artist IDs from this user to feature on the page.';
COMMENT ON COLUMN studio_pages.sections            IS 'Visibility toggles per section (hero, bio, artists, projects, services, contact, social).';
