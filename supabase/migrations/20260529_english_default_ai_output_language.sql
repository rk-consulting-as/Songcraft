-- Phase 31: English default + AI output language control

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS preferred_ai_output_lang text NOT NULL DEFAULT 'en';

ALTER TABLE profiles
  ALTER COLUMN preferred_lang SET DEFAULT 'en';

UPDATE profiles
SET preferred_lang = 'en'
WHERE preferred_lang IS NULL;

UPDATE profiles
SET preferred_ai_output_lang = CASE
  WHEN preferred_song_lang IN ('no', 'en') THEN preferred_song_lang
  ELSE 'en'
END
WHERE preferred_ai_output_lang IS NULL OR preferred_ai_output_lang = '';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'profiles_preferred_ai_output_lang_check'
  ) THEN
    ALTER TABLE profiles
      ADD CONSTRAINT profiles_preferred_ai_output_lang_check
      CHECK (preferred_ai_output_lang IN ('en', 'no', 'sv', 'da', 'de', 'fr', 'es', 'custom'));
  END IF;
END $$;

COMMENT ON COLUMN profiles.preferred_ai_output_lang IS 'Default language for AI-assisted/generated content, separate from UI language.';

NOTIFY pgrst, 'reload schema';
