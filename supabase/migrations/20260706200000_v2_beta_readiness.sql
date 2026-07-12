-- ViaTone 2.0 Phase 5C — Beta readiness seed & RLS test fixtures
-- Safe to re-run. Marks demo content and adds a private circle for privacy QA.

DO $$
DECLARE
  host_id uuid;
  c_private uuid;
BEGIN
  SELECT id INTO host_id FROM auth.users ORDER BY created_at ASC LIMIT 1;
  IF host_id IS NULL THEN
    RAISE NOTICE 'v2 beta readiness seed skipped — no auth users';
    RETURN;
  END IF;

  -- Private circle for RLS / visibility testing (must NOT appear on /community/explore)
  INSERT INTO v2_circles (id, owner_user_id, slug, name, description, visibility, featured, member_count)
  VALUES (
    'a1000001-0001-4000-8000-000000009901',
    host_id,
    'beta-private-lab',
    'Beta Private Lab',
    '[Beta QA] Private circle — used to verify invite/private surfaces are not leaked publicly.',
    'private',
    false,
    0
  )
  ON CONFLICT (slug) DO NOTHING;

  SELECT id INTO c_private FROM v2_circles WHERE slug = 'beta-private-lab';

  -- Invite-only session on private circle
  IF c_private IS NOT NULL THEN
    INSERT INTO v2_sessions (id, circle_id, host_user_id, slug, title, description, status, platform, starts_at, features)
    VALUES (
      'b2000001-0001-4000-8000-000000009901',
      c_private,
      host_id,
      'beta-private-session',
      'Beta Private Session',
      '[Beta QA] Must not appear on public discovery.',
      'upcoming',
      'spotify',
      now() + interval '14 days',
      ARRAY['Private QA']
    )
    ON CONFLICT (slug) DO NOTHING;
  END IF;

  -- Mark public seed rows as demo (description prefix)
  UPDATE v2_circles
  SET description = '[Beta demo] ' || description
  WHERE slug IN (
    'dark-country-circle', 'ai-metal-lab', 'nordic-indie-discovery',
    'song-feedback-circle', 'new-release-boost'
  )
  AND description NOT LIKE '[Beta demo]%';

  UPDATE v2_sessions
  SET description = '[Beta demo] ' || description
  WHERE slug IN (
    'friday-dark-country', 'ai-metal-feedback-night', 'tidal-discovery-hour',
    'feedback-lab-live', 'release-boost-friday'
  )
  AND description IS NOT NULL
  AND description NOT LIKE '[Beta demo]%';

  UPDATE v2_playlist_rooms
  SET description = '[Beta demo] ' || description
  WHERE slug IN ('weekly-support', 'friday-discoveries')
  AND description IS NOT NULL
  AND description NOT LIKE '[Beta demo]%';

  -- Completed session recap metadata for host QA
  UPDATE v2_sessions
  SET stream_engine_meta = COALESCE(stream_engine_meta, '{}'::jsonb) || jsonb_build_object(
    'completed_at', (now() - interval '2 days')::text,
    'host_notes', ARRAY['Beta demo recap — great listening room']
  )
  WHERE slug = 'tidal-discovery-hour' AND status = 'ended';

  RAISE NOTICE 'v2 beta readiness seed applied';
END $$;
