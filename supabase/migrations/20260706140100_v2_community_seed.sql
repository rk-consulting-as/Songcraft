-- ViaTone 2.0 Phase 3 — Seed community circles, sessions, playlist rooms
-- Uses the oldest auth user as community host. Safe to re-run (ON CONFLICT DO NOTHING).

DO $$
DECLARE
  host_id uuid;
  c_dark uuid;
  c_metal uuid;
  c_indie uuid;
  c_feedback uuid;
  c_boost uuid;
  s_dark uuid;
  s_metal uuid;
  s_indie uuid;
  r_weekly uuid;
  r_friday uuid;
  sample_song record;
  sample_artist record;
BEGIN
  SELECT id INTO host_id FROM auth.users ORDER BY created_at ASC LIMIT 1;
  IF host_id IS NULL THEN
    RAISE NOTICE 'v2 community seed skipped — no auth users yet';
    RETURN;
  END IF;

  -- Optional: first public artist/song for queue samples
  SELECT a.id, a.name INTO sample_artist
  FROM artists a
  WHERE a.page_enabled = true
  ORDER BY a.created_at ASC
  LIMIT 1;

  SELECT s.id, s.title, s.artist_id INTO sample_song
  FROM songs s
  WHERE s.user_id = host_id OR s.artist_id = sample_artist.id
  ORDER BY s.created_at DESC
  LIMIT 1;

  INSERT INTO v2_circles (id, owner_user_id, slug, name, description, cover_image_url, tags, creation_types, platforms, visibility, featured, member_count, session_count)
  VALUES
    ('a1000001-0001-4000-8000-000000000001', host_id, 'dark-country-circle', 'Dark Country Circle',
     'For outlaw country, cinematic western rock and gritty storytelling.',
     'https://images.unsplash.com/photo-1511379938547-c1f69419868d?auto=format&fit=crop&w=900&q=80',
     ARRAY['Country', 'Dark', 'Storytelling'], ARRAY['human', 'ai_assisted'], ARRAY['spotify'], 'public', true, 0, 2),
    ('a1000001-0001-4000-8000-000000000002', host_id, 'ai-metal-lab', 'AI Metal Circle',
     'For AI metal, hybrid production, heavy prompts and feedback.',
     'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=80',
     ARRAY['Metal', 'AI', 'Feedback'], ARRAY['fully_ai', 'hybrid'], ARRAY['youtube', 'spotify'], 'public', true, 0, 1),
    ('a1000001-0001-4000-8000-000000000003', host_id, 'nordic-indie-discovery', 'Nordic Indie Circle',
     'For nordic artists, soft releases and Tidal/Spotify discovery.',
     'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=900&q=80',
     ARRAY['Indie', 'Nordic', 'Discovery'], ARRAY['human'], ARRAY['tidal', 'spotify'], 'public', true, 0, 1),
    ('a1000001-0001-4000-8000-000000000004', host_id, 'song-feedback-circle', 'Song Feedback Circle',
     'Structured feedback on production, chorus and overall vibe.',
     'https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=900&q=80',
     ARRAY['Feedback', 'Production'], ARRAY['human', 'ai_assisted', 'fully_ai'], ARRAY['mixed'], 'public', false, 0, 1),
    ('a1000001-0001-4000-8000-000000000005', host_id, 'new-release-boost', 'New Release Boost Circle',
     'Submit one song, join sessions, give feedback and build momentum.',
     'https://images.unsplash.com/photo-1524368535928-5b5e00ddc76b?auto=format&fit=crop&w=900&q=80',
     ARRAY['Release', 'Playlist', 'Support'], ARRAY['human', 'hybrid', 'ai_assisted'], ARRAY['mixed'], 'public', true, 0, 1)
  ON CONFLICT (slug) DO NOTHING;

  SELECT id INTO c_dark FROM v2_circles WHERE slug = 'dark-country-circle';
  SELECT id INTO c_metal FROM v2_circles WHERE slug = 'ai-metal-lab';
  SELECT id INTO c_indie FROM v2_circles WHERE slug = 'nordic-indie-discovery';
  SELECT id INTO c_feedback FROM v2_circles WHERE slug = 'song-feedback-circle';
  SELECT id INTO c_boost FROM v2_circles WHERE slug = 'new-release-boost';

  INSERT INTO v2_sessions (id, circle_id, host_user_id, slug, title, description, status, platform, cover_image_url, starts_at, track_count, artist_count, joined_count, feedback_pending, seats_open, features, creation_types)
  VALUES
    ('b2000001-0001-4000-8000-000000000001', c_dark, host_id, 'friday-dark-country', 'Friday Dark Country Stream',
     'Community stream with outlaw picks and feedback.', 'upcoming', 'spotify',
     'https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=900&q=80',
     now() + interval '1 day', 0, 0, 0, 0, 12,
     ARRAY['Auto-Switch', 'Proof log'], ARRAY['hybrid', 'human']),
    ('b2000001-0001-4000-8000-000000000002', c_metal, host_id, 'ai-metal-feedback-night', 'AI Metal Feedback Night',
     'Bring your heaviest AI tracks for structured feedback.', 'upcoming', 'youtube',
     'https://images.unsplash.com/photo-1520166012956-add9ba0835cb?auto=format&fit=crop&w=700&q=80',
     now() + interval '3 hours', 0, 0, 0, 0, 8,
     ARRAY['Comments required', 'Feedback'], ARRAY['fully_ai']),
    ('b2000001-0001-4000-8000-000000000003', c_indie, host_id, 'tidal-discovery-hour', 'Tidal Discovery Hour',
     'HiFi rotation for nordic indie releases.', 'ended', 'tidal',
     'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=900&q=80',
     now() - interval '2 days', 0, 0, 0, 0, NULL,
     ARRAY['HiFi rotation'], ARRAY['human']),
    ('b2000001-0001-4000-8000-000000000004', c_feedback, host_id, 'feedback-lab-live', 'Feedback Lab Live',
     'Open mic feedback on production and hooks.', 'upcoming', 'mixed',
     'https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=900&q=80',
     now() + interval '2 days', 0, 0, 0, 0, 20,
     ARRAY['Structured feedback'], ARRAY['human', 'ai_assisted']),
    ('b2000001-0001-4000-8000-000000000005', c_boost, host_id, 'release-boost-friday', 'Release Boost Friday',
     'New releases get playlist rotation and community support.', 'upcoming', 'spotify',
     'https://images.unsplash.com/photo-1524368535928-5b5e00ddc76b?auto=format&fit=crop&w=900&q=80',
     now() + interval '5 days', 0, 0, 0, 0, 15,
     ARRAY['Playlist boost', 'Proof log'], ARRAY['human', 'hybrid'])
  ON CONFLICT (slug) DO NOTHING;

  SELECT id INTO s_dark FROM v2_sessions WHERE slug = 'friday-dark-country';
  SELECT id INTO s_metal FROM v2_sessions WHERE slug = 'ai-metal-feedback-night';
  SELECT id INTO s_indie FROM v2_sessions WHERE slug = 'tidal-discovery-hour';

  INSERT INTO v2_playlist_rooms (id, owner_user_id, circle_id, slug, name, description, cover_image_url, platform, track_count)
  VALUES
    ('c3000001-0001-4000-8000-000000000001', host_id, c_boost, 'weekly-support', 'Weekly Support Playlist',
     'Rotation of community picks with proof logging.',
     'https://images.unsplash.com/photo-1524368535928-5b5e00ddc76b?auto=format&fit=crop&w=900&q=80', 'spotify', 0),
    ('c3000001-0001-4000-8000-000000000002', host_id, c_dark, 'friday-discoveries', 'Friday Discoveries',
     'New releases from active circle members.',
     'https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=900&q=80', 'spotify', 0)
  ON CONFLICT (slug) DO NOTHING;

  SELECT id INTO r_weekly FROM v2_playlist_rooms WHERE slug = 'weekly-support';
  SELECT id INTO r_friday FROM v2_playlist_rooms WHERE slug = 'friday-discoveries';

  -- Sample queue rows when a real song exists
  IF sample_song.id IS NOT NULL THEN
    INSERT INTO v2_session_songs (session_id, song_id, artist_id, submitted_by, position, title, artist_name, duration_label, is_now_playing, status)
    VALUES
      (s_dark, sample_song.id, sample_song.artist_id, host_id, 1, sample_song.title, COALESCE(sample_artist.name, 'Community'), '3:58', true, 'approved')
    ON CONFLICT DO NOTHING;

    INSERT INTO v2_circle_songs (circle_id, song_id, submitted_by, status)
    VALUES (c_dark, sample_song.id, host_id, 'approved')
    ON CONFLICT (circle_id, song_id) DO NOTHING;

    INSERT INTO v2_playlist_room_items (room_id, song_id, position, title, artist_name, submitted_by)
    VALUES (r_weekly, sample_song.id, 1, sample_song.title, COALESCE(sample_artist.name, 'Artist'), host_id)
    ON CONFLICT DO NOTHING;
  ELSE
    INSERT INTO v2_session_songs (session_id, submitted_by, position, title, artist_name, duration_label, is_now_playing, status)
    VALUES
      (s_dark, host_id, 1, 'Community Pick', 'ViaTone', '3:42', true, 'approved'),
      (s_metal, host_id, 1, 'Steel Cathedral', 'Nordfire', '4:28', true, 'approved')
    ON CONFLICT DO NOTHING;
  END IF;

  UPDATE v2_playlist_rooms SET track_count = (
    SELECT count(*) FROM v2_playlist_room_items WHERE room_id = v2_playlist_rooms.id
  ) WHERE id IN (r_weekly, r_friday);

  UPDATE v2_sessions SET track_count = (
    SELECT count(*) FROM v2_session_songs WHERE session_id = v2_sessions.id AND status = 'approved'
  ) WHERE id IN (s_dark, s_metal, s_indie);

  RAISE NOTICE 'v2 community seed complete for host %', host_id;
END $$;
