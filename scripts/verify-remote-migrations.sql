-- =============================================================================
-- ViaTone — READ-ONLY remote migration verification script
-- =============================================================================
-- Run in Supabase SQL Editor (or psql) against the REMOTE project.
-- This script does NOT modify anything. It only SELECTs from catalogs.
--
-- Usage:
--   1. Run section 0 to see what Supabase thinks is applied.
--   2. Run section 1 for a quick pass/fail matrix.
--   3. Run individual migration blocks (section 2+) for deep checks.
--   4. Compare results to docs/SUPABASE_MIGRATION_REPAIR_PLAN.md
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 0. Remote migration history (authoritative for CLI repair decisions)
-- -----------------------------------------------------------------------------
SELECT version, name
FROM supabase_migrations.schema_migrations
ORDER BY version;

-- Count local duplicate-risk versions still recorded remotely
SELECT version, COUNT(*) AS rows
FROM supabase_migrations.schema_migrations
GROUP BY version
HAVING COUNT(*) > 1;

-- -----------------------------------------------------------------------------
-- 1. Quick existence matrix — core tables by era
-- -----------------------------------------------------------------------------
WITH expected(table_name, migration_hint) AS (
  VALUES
    -- Pre-v2 core (20260428–20260501)
    ('albums', '20260428_albums'),
    ('profiles', '20260501_profiles_referrals'),
    ('studio_pages', '20260429100300_studio_pages'),
    -- 20260514+ SaaS / social
    ('follows', '20260515_follows_activity_feed'),
    ('conversations', '20260516_chat_system'),
    ('song_comments', '20260517_song_comments_reactions'),
    ('notification_preferences', '20260517_notification_prefs'),
    ('media_assets', '20260519140000_media_assets'),
    ('creator_playlists', '20260520120000_playlist_communities'),
    ('playlist_campaigns', '20260520120000_playlist_communities'),
    ('campaign_activity_logs', '20260521120000_campaign_activity_logs'),
    ('plans', '20260522_stripe_free_pro_plans'),
    ('subscriptions', '20260522_stripe_free_pro_plans'),
    ('analytics_events', '20260521_fan_growth_quality_tracking'),
    ('onboarding_progress', '20260524_onboarding_wizard'),
    ('beta_feedback', '20260527_beta_launch_polish'),
    ('manual_plan_overrides', '20260528_manual_pro_access'),
    ('artist_stories', '20260529120000_artist_stories'),
    -- ViaTone 2.0 community (20260706*)
    ('v2_circles', '20260706120000_v2_community_layer'),
    ('v2_sessions', '20260706120000_v2_community_layer'),
    ('v2_playlist_rooms', '20260706120000_v2_community_layer'),
    ('v2_session_play_logs', '20260706150000_v2_stream_engine_beta'),
    ('v2_playlist_room_participation', '20260706160000_v2_supporter_participation'),
    ('v2_community_notifications', '20260706170000_v2_community_notifications'),
    ('v2_circle_follows', '20260706190000_v2_community_follows_saves'),
    ('v2_saved_community_items', '20260706190000_v2_community_follows_saves'),
    -- Playback / Curator / Spotify (20260713*)
    ('playlist_snapshots', '20260713120000_playback_evidence_engine'),
    ('playback_sessions', '20260713120000_playback_evidence_engine'),
    ('playback_evidence', '20260713120000_playback_evidence_engine'),
    ('v2_curator_linked_playlists', '20260713140000_v2_curator_rooms'),
    ('v2_spotify_connections', '20260713160000_v2_spotify_connections'),
    ('v2_spotify_evidence_pending', '20260713160000_v2_spotify_connections')
)
SELECT
  e.table_name,
  e.migration_hint,
  CASE WHEN t.table_name IS NOT NULL THEN 'YES' ELSE 'NO' END AS table_exists
FROM expected e
LEFT JOIN information_schema.tables t
  ON t.table_schema = 'public' AND t.table_name = e.table_name
ORDER BY e.migration_hint, e.table_name;

-- -----------------------------------------------------------------------------
-- 2. Duplicate-version group verification (20260428 family)
-- -----------------------------------------------------------------------------
-- 20260428100000_artist_spotify_links
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'artists'
  AND column_name IN ('spotify_url', 'spotify_image_url', 'spotify_followers', 'spotify_popularity', 'spotify_genres', 'social_links')
ORDER BY column_name;

-- 20260428100100_song_spotify_import
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'songs'
  AND column_name IN ('spotify_track_id', 'spotify_url', 'spotify_popularity', 'spotify_release_date', 'spotify_album', 'spotify_cover_url', 'album_id')
ORDER BY column_name;

SELECT indexname
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname IN ('songs_artist_spotify_track_uniq', 'artists_user_spotify_id_uniq', 'albums_artist_idx');

-- -----------------------------------------------------------------------------
-- 3. Column-level checks — v2 community extensions
-- -----------------------------------------------------------------------------
SELECT column_name
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'v2_sessions'
  AND column_name IN ('rsvp_count', 'scheduled_ends_at', 'reminder_sent_at')
ORDER BY column_name;

SELECT column_name
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'v2_playlist_rooms'
  AND column_name IN ('room_meta', 'submission_open', 'current_snapshot_id')
ORDER BY column_name;

SELECT column_name
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'v2_playlist_room_items'
  AND column_name IN ('status', 'pitch', 'curator_note', 'ai_match', 'song_dna_snapshot')
ORDER BY column_name;

SELECT column_name
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'v2_curator_linked_playlists'
  AND column_name IN ('sync_status', 'latest_snapshot_id', 'last_sync_error')
ORDER BY column_name;

-- -----------------------------------------------------------------------------
-- 4. Functions / triggers spot checks
-- -----------------------------------------------------------------------------
SELECT p.proname AS function_name
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN (
    'create_profile_for_new_user',
    'log_song_play',
    'get_or_create_direct_conversation',
    'v2_community_set_updated_at',
    'v2_sync_circle_member_count',
    'v2_sync_session_rsvp_count',
    'v2_sync_circle_follower_count',
    'check_spotify_claim'
  )
ORDER BY p.proname;

-- -----------------------------------------------------------------------------
-- 5. RLS policy spot checks (sample)
-- -----------------------------------------------------------------------------
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'albums', 'v2_circles', 'playback_sessions', 'v2_spotify_connections',
    'v2_curator_linked_playlists', 'analytics_events'
  )
ORDER BY tablename, policyname;

-- -----------------------------------------------------------------------------
-- 6. analytics_events constraint verification (community + spotify events)
-- -----------------------------------------------------------------------------
SELECT conname, pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid = 'public.analytics_events'::regclass
  AND contype = 'c'
ORDER BY conname;

-- Check whether spotify event types are allowed (Phase 6C)
SELECT pg_get_constraintdef(oid) LIKE '%spotify_connect_started%' AS spotify_events_in_check
FROM pg_constraint
WHERE conrelid = 'public.analytics_events'::regclass
  AND conname = 'analytics_events_event_type_check';

-- -----------------------------------------------------------------------------
-- 7. Seed / data presence (non-destructive reads)
-- -----------------------------------------------------------------------------
SELECT slug, name FROM v2_circles WHERE slug IN ('dark-country-circle', 'dark-country-beta') ORDER BY slug;
SELECT COUNT(*) AS v2_session_count FROM v2_sessions;
SELECT COUNT(*) AS playback_session_count FROM playback_sessions;
SELECT COUNT(*) AS spotify_connection_count FROM v2_spotify_connections;

-- -----------------------------------------------------------------------------
-- 8. Storage buckets (media_assets migration)
-- -----------------------------------------------------------------------------
SELECT id, name, public FROM storage.buckets WHERE id IN ('media-library') ORDER BY id;

-- -----------------------------------------------------------------------------
-- 9. Per-migration checklist output (expand as needed)
-- -----------------------------------------------------------------------------
-- Returns one row per check with EXISTS/MISSING for repair planning.
WITH checks(check_id, object_type, object_name, migration_file) AS (
  VALUES
    ('m_20260428_albums', 'table', 'albums', '20260428_albums.sql'),
    ('m_20260428_artist', 'column', 'artists.spotify_url', '20260428100000_artist_spotify_links.sql'),
    ('m_20260428_song', 'column', 'songs.spotify_track_id', '20260428100100_song_spotify_import.sql'),
    ('m_20260429_studio', 'table', 'studio_pages', '20260429100300_studio_pages.sql'),
    ('m_20260501', 'table', 'profiles', '20260501_profiles_referrals.sql'),
    ('m_20260514_rls', 'policy', 'artists_owner_all', '20260514100300_multitenant_rls.sql'),
    ('m_20260516_chat', 'table', 'conversations', '20260516100000_chat_system.sql'),
    ('m_20260522_billing', 'table', 'subscriptions', '20260522_stripe_free_pro_plans.sql'),
    ('m_20260706120000', 'table', 'v2_circles', '20260706120000_v2_community_layer.sql'),
    ('m_20260706140000', 'table', 'v2_circle_songs', '20260706140000_v2_community_workflows.sql'),
    ('m_20260706150000', 'table', 'v2_session_play_logs', '20260706150000_v2_stream_engine_beta.sql'),
    ('m_20260706170000', 'table', 'v2_community_notifications', '20260706170000_v2_community_notifications.sql'),
    ('m_20260706190000', 'table', 'v2_circle_follows', '20260706190000_v2_community_follows_saves.sql'),
    ('m_20260713120000', 'table', 'playlist_snapshots', '20260713120000_playback_evidence_engine.sql'),
    ('m_20260713140000', 'table', 'v2_curator_linked_playlists', '20260713140000_v2_curator_rooms.sql'),
    ('m_20260713160000', 'table', 'v2_spotify_connections', '20260713160000_v2_spotify_connections.sql'),
    ('m_20260713161000', 'constraint', 'analytics_events_event_type_check.spotify', '20260713161000_spotify_analytics_events.sql')
)
SELECT
  c.check_id,
  c.migration_file,
  c.object_type,
  c.object_name,
  CASE
    WHEN c.object_type = 'table' AND EXISTS (
      SELECT 1 FROM information_schema.tables t
      WHERE t.table_schema = 'public' AND t.table_name = c.object_name
    ) THEN 'EXISTS'
    WHEN c.object_type = 'column' AND EXISTS (
      SELECT 1 FROM information_schema.columns col
      WHERE col.table_schema = 'public'
        AND col.table_name = split_part(c.object_name, '.', 1)
        AND col.column_name = split_part(c.object_name, '.', 2)
    ) THEN 'EXISTS'
    WHEN c.object_type = 'policy' AND EXISTS (
      SELECT 1 FROM pg_policies p
      WHERE p.schemaname = 'public' AND p.policyname = c.object_name
    ) THEN 'EXISTS'
    WHEN c.object_type = 'constraint' AND c.object_name LIKE '%spotify%' AND EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conrelid = 'public.analytics_events'::regclass
        AND conname = 'analytics_events_event_type_check'
        AND pg_get_constraintdef(oid) LIKE '%spotify_connect_started%'
    ) THEN 'EXISTS'
    ELSE 'MISSING'
  END AS status
FROM checks c
ORDER BY c.check_id;

-- -----------------------------------------------------------------------------
-- 10. Manual-review migrations (seed / duplicate DDL)
-- -----------------------------------------------------------------------------
-- 20260517180106_add_project_tables — duplicate of song_comments (verify once)
SELECT EXISTS (
  SELECT 1 FROM information_schema.tables
  WHERE table_schema = 'public' AND table_name = 'song_comments'
) AS song_comments_exists;

-- 20260706140100 + 20260706200000 — seed rows (do not repair until confirmed)
SELECT slug, name, created_at
FROM v2_circles
WHERE slug IN ('dark-country-circle', 'dark-country-beta', 'ai-metal-lab')
ORDER BY slug;

SELECT COUNT(*) AS seeded_sessions_with_fixed_ids
FROM v2_sessions
WHERE id IN (
  'b1000001-0001-4000-8000-000000000001',
  'b1000001-0001-4000-8000-000000000002'
);

-- 20260706190100 — community analytics constraint (separate from spotify)
SELECT pg_get_constraintdef(oid) LIKE '%community_public_view%' AS community_events_in_check
FROM pg_constraint
WHERE conrelid = 'public.analytics_events'::regclass
  AND conname = 'analytics_events_event_type_check';

