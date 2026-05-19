-- Phase 46A: Playlist Communities Foundation

CREATE TABLE IF NOT EXISTS creator_playlists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  artist_id uuid REFERENCES artists(id) ON DELETE SET NULL,
  spotify_playlist_id text,
  title text NOT NULL DEFAULT '',
  description text,
  spotify_url text NOT NULL DEFAULT '',
  image_url text,
  owner_name text,
  genre text,
  mood text,
  visibility text NOT NULL DEFAULT 'private' CHECK (visibility IN ('private', 'public', 'unlisted')),
  admin_hidden boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS creator_playlists_user_idx ON creator_playlists (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS creator_playlists_artist_idx ON creator_playlists (artist_id) WHERE artist_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS creator_playlists_public_idx ON creator_playlists (visibility) WHERE visibility = 'public' AND admin_hidden = false;

CREATE TABLE IF NOT EXISTS playlist_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  artist_id uuid REFERENCES artists(id) ON DELETE SET NULL,
  playlist_id uuid NOT NULL REFERENCES creator_playlists(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT '',
  description text,
  rules text,
  genre text,
  mood text,
  commitment_level text NOT NULL DEFAULT 'standard' CHECK (commitment_level IN ('flexible', 'standard', 'dedicated')),
  max_members int,
  songs_per_member int NOT NULL DEFAULT 1,
  active_days_per_week int,
  campaign_start_date date,
  campaign_end_date date,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'open', 'active', 'closed', 'archived')),
  visibility text NOT NULL DEFAULT 'private' CHECK (visibility IN ('private', 'public', 'unlisted')),
  admin_hidden boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS playlist_campaigns_user_idx ON playlist_campaigns (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS playlist_campaigns_playlist_idx ON playlist_campaigns (playlist_id);
CREATE INDEX IF NOT EXISTS playlist_campaigns_discover_idx ON playlist_campaigns (status, visibility, created_at DESC)
  WHERE visibility = 'public' AND status IN ('open', 'active') AND admin_hidden = false;

CREATE TABLE IF NOT EXISTS playlist_campaign_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES playlist_campaigns(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  artist_id uuid REFERENCES artists(id) ON DELETE SET NULL,
  song_id uuid REFERENCES songs(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'requested' CHECK (status IN ('requested', 'approved', 'rejected', 'left', 'removed')),
  message text,
  joined_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (campaign_id, user_id)
);

CREATE INDEX IF NOT EXISTS playlist_campaign_members_campaign_idx ON playlist_campaign_members (campaign_id, status);
CREATE INDEX IF NOT EXISTS playlist_campaign_members_user_idx ON playlist_campaign_members (user_id, updated_at DESC);

CREATE OR REPLACE FUNCTION playlist_communities_set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS creator_playlists_updated_at ON creator_playlists;
CREATE TRIGGER creator_playlists_updated_at
  BEFORE UPDATE ON creator_playlists
  FOR EACH ROW EXECUTE FUNCTION playlist_communities_set_updated_at();

DROP TRIGGER IF EXISTS playlist_campaigns_updated_at ON playlist_campaigns;
CREATE TRIGGER playlist_campaigns_updated_at
  BEFORE UPDATE ON playlist_campaigns
  FOR EACH ROW EXECUTE FUNCTION playlist_communities_set_updated_at();

DROP TRIGGER IF EXISTS playlist_campaign_members_updated_at ON playlist_campaign_members;
CREATE TRIGGER playlist_campaign_members_updated_at
  BEFORE UPDATE ON playlist_campaign_members
  FOR EACH ROW EXECUTE FUNCTION playlist_communities_set_updated_at();

ALTER TABLE creator_playlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE playlist_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE playlist_campaign_members ENABLE ROW LEVEL SECURITY;

-- creator_playlists policies
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'creator_playlists' AND policyname = 'creator_playlists_owner_all') THEN
    CREATE POLICY creator_playlists_owner_all ON creator_playlists
      FOR ALL
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'creator_playlists' AND policyname = 'creator_playlists_admin_select') THEN
    CREATE POLICY creator_playlists_admin_select ON creator_playlists
      FOR SELECT
      USING (is_admin());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'creator_playlists' AND policyname = 'creator_playlists_public_select') THEN
    CREATE POLICY creator_playlists_public_select ON creator_playlists
      FOR SELECT
      USING (visibility = 'public' AND admin_hidden = false);
  END IF;
END $$;

-- playlist_campaigns policies
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'playlist_campaigns' AND policyname = 'playlist_campaigns_owner_all') THEN
    CREATE POLICY playlist_campaigns_owner_all ON playlist_campaigns
      FOR ALL
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'playlist_campaigns' AND policyname = 'playlist_campaigns_admin_select') THEN
    CREATE POLICY playlist_campaigns_admin_select ON playlist_campaigns
      FOR SELECT
      USING (is_admin());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'playlist_campaigns' AND policyname = 'playlist_campaigns_public_select') THEN
    CREATE POLICY playlist_campaigns_public_select ON playlist_campaigns
      FOR SELECT
      USING (
        visibility = 'public'
        AND status IN ('open', 'active')
        AND admin_hidden = false
      );
  END IF;
END $$;

-- playlist_campaign_members policies
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'playlist_campaign_members' AND policyname = 'playlist_campaign_members_self_select') THEN
    CREATE POLICY playlist_campaign_members_self_select ON playlist_campaign_members
      FOR SELECT
      USING (user_id = auth.uid());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'playlist_campaign_members' AND policyname = 'playlist_campaign_members_self_insert') THEN
    CREATE POLICY playlist_campaign_members_self_insert ON playlist_campaign_members
      FOR INSERT
      WITH CHECK (user_id = auth.uid());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'playlist_campaign_members' AND policyname = 'playlist_campaign_members_self_update') THEN
    CREATE POLICY playlist_campaign_members_self_update ON playlist_campaign_members
      FOR UPDATE
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'playlist_campaign_members' AND policyname = 'playlist_campaign_members_owner_manage') THEN
    CREATE POLICY playlist_campaign_members_owner_manage ON playlist_campaign_members
      FOR ALL
      USING (
        EXISTS (
          SELECT 1 FROM playlist_campaigns c
          WHERE c.id = playlist_campaign_members.campaign_id
            AND c.user_id = auth.uid()
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM playlist_campaigns c
          WHERE c.id = playlist_campaign_members.campaign_id
            AND c.user_id = auth.uid()
        )
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'playlist_campaign_members' AND policyname = 'playlist_campaign_members_admin_select') THEN
    CREATE POLICY playlist_campaign_members_admin_select ON playlist_campaign_members
      FOR SELECT
      USING (is_admin());
  END IF;

  -- Public: approved members on public open/active campaigns (no PII beyond artist/song public data)
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'playlist_campaign_members' AND policyname = 'playlist_campaign_members_public_approved_select') THEN
    CREATE POLICY playlist_campaign_members_public_approved_select ON playlist_campaign_members
      FOR SELECT
      USING (
        status = 'approved'
        AND EXISTS (
          SELECT 1 FROM playlist_campaigns c
          WHERE c.id = playlist_campaign_members.campaign_id
            AND c.visibility = 'public'
            AND c.status IN ('open', 'active')
            AND c.admin_hidden = false
        )
      );
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
