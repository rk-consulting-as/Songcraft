-- ViaTone 2.0 Phase 6B — Curator Rooms 2.0
-- Extends playlist rooms with curator workflow, DNA, linked playlists, submission pipeline.

-- =============================================================
-- Room metadata (DNA, notes, submission settings)
-- =============================================================
ALTER TABLE v2_playlist_rooms
  ADD COLUMN IF NOT EXISTS room_meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS current_snapshot_id uuid REFERENCES playlist_snapshots(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS submission_open boolean NOT NULL DEFAULT true;

-- =============================================================
-- Linked external playlists (one room → many playlists)
-- =============================================================
CREATE TABLE IF NOT EXISTS v2_curator_linked_playlists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES v2_playlist_rooms(id) ON DELETE CASCADE,
  platform text NOT NULL CHECK (platform IN ('spotify', 'youtube', 'apple', 'mixed', 'other')),
  playlist_url text NOT NULL,
  external_playlist_id text,
  title text,
  description text,
  cover_image_url text,
  curator_name text,
  sync_status text NOT NULL DEFAULT 'manual'
    CHECK (sync_status IN ('connected', 'manual', 'sync_unavailable', 'needs_configuration')),
  last_synced_at timestamptz,
  track_count int NOT NULL DEFAULT 0,
  total_duration_seconds int NOT NULL DEFAULT 0,
  latest_snapshot_id uuid REFERENCES playlist_snapshots(id) ON DELETE SET NULL,
  position int NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS v2_curator_linked_playlists_room_idx
  ON v2_curator_linked_playlists (room_id, position);

-- =============================================================
-- Submission pipeline on room items
-- =============================================================
ALTER TABLE v2_playlist_room_items
  ADD COLUMN IF NOT EXISTS status text,
  ADD COLUMN IF NOT EXISTS pitch text,
  ADD COLUMN IF NOT EXISTS curator_note text,
  ADD COLUMN IF NOT EXISTS curator_note_shared boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS song_dna_snapshot jsonb,
  ADD COLUMN IF NOT EXISTS ai_match jsonb,
  ADD COLUMN IF NOT EXISTS featured boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS session_id uuid REFERENCES v2_sessions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS external_added_at timestamptz,
  ADD COLUMN IF NOT EXISTS round_number int NOT NULL DEFAULT 1;

-- Backfill status from legacy played_at / implicit pending
UPDATE v2_playlist_room_items
SET status = CASE
  WHEN played_at IS NOT NULL THEN 'added_to_playlist'
  ELSE 'pending'
END
WHERE status IS NULL;

ALTER TABLE v2_playlist_room_items
  ALTER COLUMN status SET DEFAULT 'pending',
  ALTER COLUMN status SET NOT NULL;

ALTER TABLE v2_playlist_room_items
  DROP CONSTRAINT IF EXISTS v2_playlist_room_items_status_check;

ALTER TABLE v2_playlist_room_items
  ADD CONSTRAINT v2_playlist_room_items_status_check
  CHECK (status IN (
    'pending', 'reviewing', 'shortlisted', 'accepted', 'rejected',
    'added_to_playlist', 'removed_from_playlist',
    'approved', 'removed'
  ));

-- =============================================================
-- RLS: linked playlists + host item updates
-- =============================================================
ALTER TABLE v2_curator_linked_playlists ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'v2_curator_linked_playlists' AND policyname = 'curator_linked_playlists_read') THEN
    CREATE POLICY curator_linked_playlists_read ON v2_curator_linked_playlists FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM v2_playlist_rooms r
          JOIN v2_circles c ON c.id = r.circle_id
          WHERE r.id = room_id AND (c.visibility = 'public' OR r.owner_user_id = auth.uid())
        )
        OR EXISTS (SELECT 1 FROM v2_playlist_rooms r WHERE r.id = room_id AND r.circle_id IS NULL)
        OR EXISTS (SELECT 1 FROM v2_playlist_rooms r WHERE r.id = room_id AND r.owner_user_id = auth.uid())
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'v2_curator_linked_playlists' AND policyname = 'curator_linked_playlists_host') THEN
    CREATE POLICY curator_linked_playlists_host ON v2_curator_linked_playlists FOR ALL
      USING (EXISTS (SELECT 1 FROM v2_playlist_rooms r WHERE r.id = room_id AND r.owner_user_id = auth.uid()))
      WITH CHECK (EXISTS (SELECT 1 FROM v2_playlist_rooms r WHERE r.id = room_id AND r.owner_user_id = auth.uid()));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'v2_playlist_room_items' AND policyname = 'v2_playlist_room_items_host_update') THEN
    CREATE POLICY v2_playlist_room_items_host_update ON v2_playlist_room_items FOR UPDATE
      USING (EXISTS (SELECT 1 FROM v2_playlist_rooms r WHERE r.id = room_id AND r.owner_user_id = auth.uid()))
      WITH CHECK (EXISTS (SELECT 1 FROM v2_playlist_rooms r WHERE r.id = room_id AND r.owner_user_id = auth.uid()));
  END IF;
END $$;

COMMENT ON COLUMN v2_playlist_rooms.room_meta IS 'Curator Room DNA, public/private notes, guidelines — Phase 6B';
COMMENT ON TABLE v2_curator_linked_playlists IS 'External playlists linked to a Curator Room (Spotify/YouTube/etc.)';

NOTIFY pgrst, 'reload schema';
