-- Alternative templates for public artist and studio pages.
-- Default = current layout (unchanged). New templates: minimal, cinematic (artist), magazine (studio).

ALTER TABLE artists
  ADD COLUMN IF NOT EXISTS page_template text NOT NULL DEFAULT 'default'
    CHECK (page_template IN ('default','minimal','cinematic'));

ALTER TABLE studio_pages
  ADD COLUMN IF NOT EXISTS template text NOT NULL DEFAULT 'default'
    CHECK (template IN ('default','minimal','magazine'));

NOTIFY pgrst, 'reload schema';
