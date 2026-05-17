-- Phase 17: Fan Growth Pack
-- Newsletter subscribers, public tour dates, and owner-safe RLS.

CREATE EXTENSION IF NOT EXISTS citext;

-- =============================================================
-- 1. newsletter_subscribers
-- =============================================================
CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id   uuid NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
  user_id     uuid REFERENCES profiles(id) ON DELETE CASCADE,
  email       citext NOT NULL,
  name        text,
  source_page text,
  confirmed   boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT newsletter_subscribers_email_not_blank CHECK (length(trim(email::text)) > 3)
);

CREATE UNIQUE INDEX IF NOT EXISTS newsletter_subscribers_artist_email_uniq
  ON newsletter_subscribers (artist_id, email);

CREATE INDEX IF NOT EXISTS newsletter_subscribers_owner_idx
  ON newsletter_subscribers (user_id, artist_id, created_at DESC);

CREATE INDEX IF NOT EXISTS newsletter_subscribers_artist_idx
  ON newsletter_subscribers (artist_id, created_at DESC);

CREATE OR REPLACE FUNCTION set_newsletter_subscriber_owner()
RETURNS trigger AS $$
BEGIN
  SELECT a.user_id INTO NEW.user_id
  FROM artists a
  WHERE a.id = NEW.artist_id;

  NEW.email = lower(trim(NEW.email::text))::citext;
  NEW.name = nullif(trim(coalesce(NEW.name, '')), '');
  NEW.source_page = nullif(trim(coalesce(NEW.source_page, '')), '');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS newsletter_subscribers_set_owner ON newsletter_subscribers;
CREATE TRIGGER newsletter_subscribers_set_owner
  BEFORE INSERT OR UPDATE ON newsletter_subscribers
  FOR EACH ROW EXECUTE FUNCTION set_newsletter_subscriber_owner();

ALTER TABLE newsletter_subscribers ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='newsletter_subscribers' AND policyname='newsletter_public_insert') THEN
    CREATE POLICY newsletter_public_insert ON newsletter_subscribers
      FOR INSERT
      WITH CHECK (
        confirmed = false
        AND EXISTS (
          SELECT 1 FROM artists a
          WHERE a.id = newsletter_subscribers.artist_id
            AND a.page_enabled = true
            AND a.user_id = newsletter_subscribers.user_id
        )
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='newsletter_subscribers' AND policyname='newsletter_owner_select') THEN
    CREATE POLICY newsletter_owner_select ON newsletter_subscribers
      FOR SELECT
      USING (user_id = auth.uid());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='newsletter_subscribers' AND policyname='newsletter_admin_select') THEN
    CREATE POLICY newsletter_admin_select ON newsletter_subscribers
      FOR SELECT
      USING (is_admin());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='newsletter_subscribers' AND policyname='newsletter_owner_delete') THEN
    CREATE POLICY newsletter_owner_delete ON newsletter_subscribers
      FOR DELETE
      USING (user_id = auth.uid());
  END IF;
END $$;

-- =============================================================
-- 2. artist_events
-- =============================================================
CREATE TABLE IF NOT EXISTS artist_events (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id  uuid NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title      text NOT NULL,
  date       date NOT NULL,
  venue      text,
  city       text,
  country    text,
  ticket_url text,
  status     text NOT NULL DEFAULT 'scheduled'
    CHECK (status IN ('scheduled', 'sold_out', 'cancelled', 'past', 'hidden')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS artist_events_owner_idx
  ON artist_events (user_id, artist_id, date ASC);

CREATE INDEX IF NOT EXISTS artist_events_public_idx
  ON artist_events (artist_id, date ASC)
  WHERE status IN ('scheduled', 'sold_out');

CREATE OR REPLACE FUNCTION set_artist_events_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS artist_events_set_updated_at ON artist_events;
CREATE TRIGGER artist_events_set_updated_at
  BEFORE UPDATE ON artist_events
  FOR EACH ROW EXECUTE FUNCTION set_artist_events_updated_at();

ALTER TABLE artist_events ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='artist_events' AND policyname='artist_events_owner_all') THEN
    CREATE POLICY artist_events_owner_all ON artist_events
      FOR ALL
      USING (
        user_id = auth.uid()
        AND EXISTS (
          SELECT 1 FROM artists a
          WHERE a.id = artist_events.artist_id
            AND a.user_id = auth.uid()
        )
      )
      WITH CHECK (
        user_id = auth.uid()
        AND EXISTS (
          SELECT 1 FROM artists a
          WHERE a.id = artist_events.artist_id
            AND a.user_id = auth.uid()
        )
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='artist_events' AND policyname='artist_events_public_select') THEN
    CREATE POLICY artist_events_public_select ON artist_events
      FOR SELECT
      USING (
        status IN ('scheduled', 'sold_out')
        AND EXISTS (
          SELECT 1 FROM artists a
          WHERE a.id = artist_events.artist_id
            AND a.page_enabled = true
        )
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='artist_events' AND policyname='artist_events_admin_select') THEN
    CREATE POLICY artist_events_admin_select ON artist_events
      FOR SELECT
      USING (is_admin());
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
