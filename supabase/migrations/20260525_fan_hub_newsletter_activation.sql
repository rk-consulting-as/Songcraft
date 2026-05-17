-- Phase 26: Fan Hub / Newsletter Activation
-- Capture fan preference and normalized signup source for owner-only fan hub views.

ALTER TABLE newsletter_subscribers
  ADD COLUMN IF NOT EXISTS favorite_song text,
  ADD COLUMN IF NOT EXISTS source text;

CREATE INDEX IF NOT EXISTS newsletter_subscribers_source_idx
  ON newsletter_subscribers (artist_id, source, created_at DESC);

CREATE OR REPLACE FUNCTION set_newsletter_subscriber_owner()
RETURNS trigger AS $$
BEGIN
  SELECT a.user_id INTO NEW.user_id
  FROM artists a
  WHERE a.id = NEW.artist_id;

  NEW.email = lower(trim(NEW.email::text))::citext;
  NEW.name = nullif(trim(coalesce(NEW.name, '')), '');
  NEW.source_page = nullif(trim(coalesce(NEW.source_page, '')), '');
  NEW.favorite_song = nullif(trim(coalesce(NEW.favorite_song, '')), '');
  NEW.source = nullif(left(lower(trim(coalesce(NEW.source, ''))), 80), '');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

NOTIFY pgrst, 'reload schema';
