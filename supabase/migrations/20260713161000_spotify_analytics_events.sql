-- Phase 6C — allow Spotify integration analytics event types

ALTER TABLE analytics_events
  DROP CONSTRAINT IF EXISTS analytics_events_target_required;

ALTER TABLE analytics_events
  ADD CONSTRAINT analytics_events_target_required CHECK (
    artist_id IS NOT NULL
    OR song_id IS NOT NULL
    OR event_type IN (
      'community_public_view',
      'community_follow',
      'community_save',
      'community_signup_cta',
      'community_rsvp_after_signup',
      'community_invite_landing',
      'spotify_connect_started',
      'spotify_connect_completed',
      'spotify_connect_failed',
      'spotify_playlist_linked',
      'spotify_playlist_synced',
      'spotify_playlist_sync_failed',
      'spotify_recently_played_synced',
      'spotify_evidence_detected',
      'spotify_evidence_submitted'
    )
  );

ALTER TABLE analytics_events
  DROP CONSTRAINT IF EXISTS analytics_events_event_type_check;

ALTER TABLE analytics_events
  ADD CONSTRAINT analytics_events_event_type_check
  CHECK (event_type IN (
    'artist_page_view', 'song_page_view', 'newsletter_signup', 'embed_view', 'embed_click',
    'story_view', 'story_song_click',
    'community_public_view', 'community_follow', 'community_save',
    'community_signup_cta', 'community_rsvp_after_signup', 'community_invite_landing',
    'spotify_connect_started', 'spotify_connect_completed', 'spotify_connect_failed',
    'spotify_playlist_linked', 'spotify_playlist_synced', 'spotify_playlist_sync_failed',
    'spotify_recently_played_synced', 'spotify_evidence_detected', 'spotify_evidence_submitted'
  ));

NOTIFY pgrst, 'reload schema';
