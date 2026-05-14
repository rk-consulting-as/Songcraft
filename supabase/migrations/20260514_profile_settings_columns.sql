-- Add user-facing profile settings columns:
--   avatar_url            — either a public URL to an uploaded image,
--                           or a preset key like 'preset:guitar', 'preset:mic',
--                           or NULL (renders an initial-letter avatar).
--   bio                   — short text shown on referral page + future public profiles.
--   preferred_lang        — 'no' | 'en' — for UI strings.
--   preferred_song_lang   — 'no' | 'en' | 'auto' — default language for AI generation.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS avatar_url          text,
  ADD COLUMN IF NOT EXISTS bio                 text,
  ADD COLUMN IF NOT EXISTS preferred_lang      text DEFAULT 'no'   CHECK (preferred_lang IN ('no', 'en')),
  ADD COLUMN IF NOT EXISTS preferred_song_lang text DEFAULT 'auto' CHECK (preferred_song_lang IN ('no', 'en', 'auto'));

COMMENT ON COLUMN profiles.avatar_url IS 'Public URL of uploaded avatar, or preset key like "preset:guitar", or NULL for initial fallback.';
COMMENT ON COLUMN profiles.bio IS 'Short user bio (max ~280 chars). Enforced client-side.';
