-- Phase 42: manual discover spotlight (admin_platform_settings)
INSERT INTO admin_platform_settings (key, value, description)
VALUES (
  'discover_spotlight',
  '{"artist_ids":[],"song_ids":[]}'::jsonb,
  'Featured on ViaTone: artist and song IDs for discover spotlight'
)
ON CONFLICT (key) DO NOTHING;
