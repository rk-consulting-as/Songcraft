-- Phase 20: Embed Widget / External Player
-- Extend public analytics to track iframe views and embed outbound clicks.

ALTER TABLE analytics_events
  DROP CONSTRAINT IF EXISTS analytics_events_event_type_check;

ALTER TABLE analytics_events
  ADD CONSTRAINT analytics_events_event_type_check
  CHECK (event_type IN (
    'artist_page_view',
    'song_page_view',
    'newsletter_signup',
    'embed_view',
    'embed_click'
  ));

DROP POLICY IF EXISTS analytics_events_public_insert ON analytics_events;
CREATE POLICY analytics_events_public_insert ON analytics_events
  FOR INSERT
  WITH CHECK (
    event_type IN ('artist_page_view', 'song_page_view', 'newsletter_signup', 'embed_view', 'embed_click')
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
  );

NOTIFY pgrst, 'reload schema';
