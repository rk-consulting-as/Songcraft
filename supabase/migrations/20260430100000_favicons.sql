-- Favicons for artist public pages and studio pages, plus app-level favicon
-- when a user is logged in to Songcraft (uses studio_pages.favicon_url).

ALTER TABLE artists
  ADD COLUMN IF NOT EXISTS favicon_url text;

ALTER TABLE studio_pages
  ADD COLUMN IF NOT EXISTS favicon_url text;

COMMENT ON COLUMN artists.favicon_url      IS 'Public URL of the artist page favicon (32x32 or larger PNG, square).';
COMMENT ON COLUMN studio_pages.favicon_url IS 'Public URL of the studio page favicon. Also used as the favicon for the logged-in Songcraft UI of the page owner.';
