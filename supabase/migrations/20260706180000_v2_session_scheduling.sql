-- ViaTone 2.0 Phase 4G — Session scheduling, RSVP & calendar foundations

-- =============================================================
-- v2_sessions — scheduling & recurrence (starts_at already exists)
-- =============================================================
ALTER TABLE v2_sessions
  ADD COLUMN IF NOT EXISTS ends_at timestamptz,
  ADD COLUMN IF NOT EXISTS timezone text,
  ADD COLUMN IF NOT EXISTS recurrence_rule text,
  ADD COLUMN IF NOT EXISTS is_recurring boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS parent_session_id uuid REFERENCES v2_sessions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS rsvp_count integer NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS v2_sessions_starts_at_idx ON v2_sessions (starts_at ASC)
  WHERE status IN ('upcoming', 'live');

CREATE INDEX IF NOT EXISTS v2_sessions_parent_idx ON v2_sessions (parent_session_id)
  WHERE parent_session_id IS NOT NULL;

-- =============================================================
-- v2_session_participation — RSVP (Going / Interested)
-- =============================================================
ALTER TABLE v2_session_participation
  ADD COLUMN IF NOT EXISTS rsvp_status text CHECK (rsvp_status IS NULL OR rsvp_status IN ('going', 'interested', 'declined')),
  ADD COLUMN IF NOT EXISTS rsvp_at timestamptz;

CREATE INDEX IF NOT EXISTS v2_session_participation_rsvp_idx
  ON v2_session_participation (session_id, rsvp_status)
  WHERE rsvp_status IS NOT NULL;

-- Keep v2_sessions.rsvp_count in sync (going + interested)
CREATE OR REPLACE FUNCTION v2_sync_session_rsvp_count()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  sid uuid;
BEGIN
  sid := COALESCE(NEW.session_id, OLD.session_id);
  UPDATE v2_sessions SET rsvp_count = (
    SELECT count(*)::int FROM v2_session_participation
    WHERE session_id = sid AND rsvp_status IN ('going', 'interested')
  ) WHERE id = sid;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS v2_session_rsvp_count_sync ON v2_session_participation;
CREATE TRIGGER v2_session_rsvp_count_sync
  AFTER INSERT OR UPDATE OF rsvp_status OR DELETE ON v2_session_participation
  FOR EACH ROW EXECUTE FUNCTION v2_sync_session_rsvp_count();

COMMENT ON COLUMN v2_sessions.recurrence_rule IS 'Future-ready: weekly, biweekly, monthly — no auto-expansion yet';
COMMENT ON COLUMN v2_session_participation.rsvp_status IS 'Pre-session RSVP: going, interested, declined — separate from live join status';
