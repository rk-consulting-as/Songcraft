-- ViaTone 2.0 Phase 5B — Community conversion analytics events

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
      'community_invite_landing'
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
    'community_signup_cta', 'community_rsvp_after_signup', 'community_invite_landing'
  ));
