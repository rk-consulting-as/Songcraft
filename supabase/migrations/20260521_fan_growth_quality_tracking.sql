-- Phase 18: Fan Growth Quality + Tracking Pack
-- Public page analytics, QR attribution, and stricter newsletter email quality.

-- =============================================================
-- 1. Harden newsletter email validation at the database boundary
-- =============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'newsletter_subscribers_email_format'
      AND conrelid = 'newsletter_subscribers'::regclass
  ) THEN
    ALTER TABLE newsletter_subscribers
      ADD CONSTRAINT newsletter_subscribers_email_format
      CHECK (
        length(trim(email::text)) <= 254
        AND email::text ~* '^[A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,}$'
      );
  END IF;
END $$;

-- =============================================================
-- 2. analytics_events — public page traffic + conversion tracking
-- =============================================================
CREATE TABLE IF NOT EXISTS analytics_events (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id  uuid REFERENCES artists(id) ON DELETE CASCADE,
  song_id    uuid REFERENCES songs(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN ('artist_page_view', 'song_page_view', 'newsletter_signup')),
  source     text,
  user_agent text,
  referrer   text,
  created_at timestamptz NOT NULL DEFAULT now(),
  metadata   jsonb NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT analytics_events_target_required CHECK (artist_id IS NOT NULL OR song_id IS NOT NULL),
  CONSTRAINT analytics_events_metadata_object CHECK (jsonb_typeof(metadata) = 'object'),
  CONSTRAINT analytics_events_source_safe CHECK (source IS NULL OR length(source) <= 80),
  CONSTRAINT analytics_events_user_agent_safe CHECK (user_agent IS NULL OR length(user_agent) <= 500),
  CONSTRAINT analytics_events_referrer_safe CHECK (referrer IS NULL OR length(referrer) <= 500)
);

CREATE INDEX IF NOT EXISTS analytics_events_artist_created_idx
  ON analytics_events (artist_id, created_at DESC)
  WHERE artist_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS analytics_events_song_created_idx
  ON analytics_events (song_id, created_at DESC)
  WHERE song_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS analytics_events_type_created_idx
  ON analytics_events (event_type, created_at DESC);

CREATE INDEX IF NOT EXISTS analytics_events_source_created_idx
  ON analytics_events (source, created_at DESC)
  WHERE source IS NOT NULL;

ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='analytics_events' AND policyname='analytics_events_public_insert') THEN
    CREATE POLICY analytics_events_public_insert ON analytics_events
      FOR INSERT
      WITH CHECK (
        event_type IN ('artist_page_view', 'song_page_view', 'newsletter_signup')
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
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='analytics_events' AND policyname='analytics_events_owner_select') THEN
    CREATE POLICY analytics_events_owner_select ON analytics_events
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM artists a
          WHERE a.id = analytics_events.artist_id
            AND a.user_id = auth.uid()
        )
        OR EXISTS (
          SELECT 1 FROM songs s
          WHERE s.id = analytics_events.song_id
            AND s.user_id = auth.uid()
        )
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='analytics_events' AND policyname='analytics_events_admin_select') THEN
    CREATE POLICY analytics_events_admin_select ON analytics_events
      FOR SELECT
      USING (is_admin());
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
