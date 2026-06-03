-- Phase 52: Story analytics, scheduling, scheduled status

-- 1. Scheduled status + public visibility by published_at
ALTER TABLE artist_stories
  DROP CONSTRAINT IF EXISTS artist_stories_status_check;

ALTER TABLE artist_stories
  ADD CONSTRAINT artist_stories_status_check
  CHECK (status IN ('draft', 'published', 'archived', 'scheduled'));

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

  IF NEW.status = 'scheduled' AND NEW.published_at IS NULL THEN
    NEW.published_at = now() + interval '1 hour';
  END IF;

  IF NEW.status IN ('draft', 'archived') AND TG_OP = 'UPDATE'
     AND OLD.status IN ('published', 'scheduled') AND NEW.status NOT IN ('published', 'scheduled') THEN
    NEW.published_at = NULL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP POLICY IF EXISTS artist_stories_public_select ON artist_stories;
CREATE POLICY artist_stories_public_select ON artist_stories
  FOR SELECT
  USING (
    status IN ('published', 'scheduled')
    AND published_at IS NOT NULL
    AND published_at <= now()
    AND public_hidden = false
    AND admin_hidden = false
    AND EXISTS (
      SELECT 1 FROM artists a
      WHERE a.id = artist_stories.artist_id
        AND a.page_enabled = true
        AND a.admin_hidden = false
    )
  );

-- 2. Story analytics event types
ALTER TABLE analytics_events
  DROP CONSTRAINT IF EXISTS analytics_events_event_type_check;

ALTER TABLE analytics_events
  ADD CONSTRAINT analytics_events_event_type_check
  CHECK (event_type IN (
    'artist_page_view',
    'song_page_view',
    'newsletter_signup',
    'embed_view',
    'embed_click',
    'story_view',
    'story_song_click'
  ));

DROP POLICY IF EXISTS analytics_events_public_insert ON analytics_events;
CREATE POLICY analytics_events_public_insert ON analytics_events
  FOR INSERT
  WITH CHECK (
    event_type IN (
      'artist_page_view', 'song_page_view', 'newsletter_signup',
      'embed_view', 'embed_click', 'story_view', 'story_song_click'
    )
    AND jsonb_typeof(metadata) = 'object'
    AND (artist_id IS NOT NULL OR song_id IS NOT NULL)
    AND (
      artist_id IS NULL
      OR EXISTS (
        SELECT 1 FROM artists a
        WHERE a.id = analytics_events.artist_id
          AND a.page_enabled = true
      )
    )
    AND (
      song_id IS NULL
      OR EXISTS (
        SELECT 1
        FROM songs s
        JOIN artists a ON a.id = s.artist_id
        WHERE s.id = analytics_events.song_id
          AND a.page_enabled = true
      )
    )
    AND (
      artist_id IS NULL
      OR song_id IS NULL
      OR EXISTS (
        SELECT 1 FROM songs s
        WHERE s.id = analytics_events.song_id
          AND s.artist_id = analytics_events.artist_id
      )
    )
    AND (
      event_type NOT IN ('story_view', 'story_song_click')
      OR (
        artist_id IS NOT NULL
        AND (metadata->>'story_id') ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      )
    )
  );

NOTIFY pgrst, 'reload schema';
