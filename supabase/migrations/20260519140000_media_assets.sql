-- Phase 43: Media Library & Brand Assets

CREATE TABLE IF NOT EXISTS media_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  artist_id uuid REFERENCES artists(id) ON DELETE SET NULL,
  song_id uuid REFERENCES songs(id) ON DELETE SET NULL,
  campaign_id uuid,
  type text NOT NULL,
  title text NOT NULL DEFAULT '',
  description text,
  tags jsonb NOT NULL DEFAULT '[]'::jsonb,
  file_url text NOT NULL,
  thumbnail_url text,
  mime_type text,
  size_bytes bigint NOT NULL DEFAULT 0,
  visibility text NOT NULL DEFAULT 'private' CHECK (visibility IN ('private', 'public')),
  is_featured boolean NOT NULL DEFAULT false,
  usage jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS media_assets_user_idx ON media_assets (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS media_assets_artist_idx ON media_assets (artist_id, created_at DESC) WHERE artist_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS media_assets_song_idx ON media_assets (song_id) WHERE song_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS media_assets_type_idx ON media_assets (user_id, type);
CREATE INDEX IF NOT EXISTS media_assets_visibility_idx ON media_assets (visibility) WHERE visibility = 'public';

CREATE OR REPLACE FUNCTION media_assets_set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS media_assets_updated_at ON media_assets;
CREATE TRIGGER media_assets_updated_at
  BEFORE UPDATE ON media_assets
  FOR EACH ROW EXECUTE FUNCTION media_assets_set_updated_at();

ALTER TABLE media_assets ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'media_assets' AND policyname = 'media_assets_owner_all') THEN
    CREATE POLICY media_assets_owner_all ON media_assets
      FOR ALL
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'media_assets' AND policyname = 'media_assets_admin_select') THEN
    CREATE POLICY media_assets_admin_select ON media_assets
      FOR SELECT
      USING (is_admin());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'media_assets' AND policyname = 'media_assets_public_select') THEN
    CREATE POLICY media_assets_public_select ON media_assets
      FOR SELECT
      USING (
        visibility = 'public'
        AND artist_id IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM artists a
          WHERE a.id = media_assets.artist_id
            AND a.page_enabled = true
            AND COALESCE(a.admin_hidden, false) = false
        )
      );
  END IF;
END $$;

-- Storage bucket for media library
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'media-library',
  'media-library',
  true,
  20971520,
  ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/svg+xml']
)
ON CONFLICT (id) DO UPDATE
  SET public = EXCLUDED.public,
      file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'media_library_owner_upload') THEN
    EXECUTE $pol$
      CREATE POLICY media_library_owner_upload ON storage.objects
        FOR INSERT TO authenticated
        WITH CHECK (
          bucket_id = 'media-library'
          AND (storage.foldername(name))[1] = auth.uid()::text
        )
    $pol$;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'media_library_owner_update') THEN
    EXECUTE $pol$
      CREATE POLICY media_library_owner_update ON storage.objects
        FOR UPDATE TO authenticated
        USING (
          bucket_id = 'media-library'
          AND (storage.foldername(name))[1] = auth.uid()::text
        )
    $pol$;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'media_library_owner_delete') THEN
    EXECUTE $pol$
      CREATE POLICY media_library_owner_delete ON storage.objects
        FOR DELETE TO authenticated
        USING (
          bucket_id = 'media-library'
          AND (storage.foldername(name))[1] = auth.uid()::text
        )
    $pol$;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'media_library_public_read') THEN
    EXECUTE $pol$
      CREATE POLICY media_library_public_read ON storage.objects
        FOR SELECT
        USING (bucket_id = 'media-library')
    $pol$;
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
