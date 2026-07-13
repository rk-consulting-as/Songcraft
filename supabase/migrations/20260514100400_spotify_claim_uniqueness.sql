-- Ensure a single Spotify artist can be VERIFIED claimed by at most one Songcraft user.
--
-- Model:
--   - Multiple users can pick the same Spotify artist from search (spotify_id set, but
--     spotify_verified = false). That's just "import metadata", not ownership.
--   - Only ONE user can have spotify_verified = true for a given spotify_id. That's the
--     ownership claim and is enforced by a partial unique index.
--   - If a collision is detected when a user tries to verify, the UI shows a warning
--     and instructs them to request a transfer (Phase 2: actual transfer workflow).

-- Partial unique index: scoped to verified claims only, ignores NULLs.
CREATE UNIQUE INDEX IF NOT EXISTS artists_spotify_id_verified_unique
  ON artists (spotify_id)
  WHERE spotify_verified = true AND spotify_id IS NOT NULL;

-- RPC the dashboard calls BEFORE attempting to verify, so the user gets a friendly
-- message instead of a raw 23505 unique-violation. Returns either NULL (free to claim)
-- or a JSON with the existing claimant's public display_name + claim date.
--
-- SECURITY DEFINER so it can read across user_id; only exposes non-sensitive fields.
CREATE OR REPLACE FUNCTION check_spotify_claim(spotify_id_to_check text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  result jsonb;
BEGIN
  IF spotify_id_to_check IS NULL OR length(trim(spotify_id_to_check)) = 0 THEN
    RETURN NULL;
  END IF;

  SELECT jsonb_build_object(
    'artist_id',         a.id,
    'artist_name',       a.name,
    'claimant_user_id',  a.user_id,
    'claimant_name',     COALESCE(p.display_name, 'Anonym bruker'),
    'claimed_at',        a.updated_at,
    'is_self',           (a.user_id = auth.uid())
  )
  INTO result
  FROM artists a
  LEFT JOIN profiles p ON p.id = a.user_id
  WHERE a.spotify_id = spotify_id_to_check
    AND a.spotify_verified = true
  LIMIT 1;

  RETURN result;  -- NULL if no verified claim exists
END;
$$;

GRANT EXECUTE ON FUNCTION check_spotify_claim(text) TO authenticated;

-- Ensure ownership transfer to postgres so it bypasses RLS (defence in depth).
DO $$
BEGIN
  EXECUTE 'ALTER FUNCTION public.check_spotify_claim(text) OWNER TO postgres';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not transfer ownership of check_spotify_claim to postgres: %', SQLERRM;
END $$;

COMMENT ON FUNCTION check_spotify_claim(text) IS
  'Returns the existing verified claimant for a Spotify artist id, or NULL if available. Used by the dashboard to warn before duplicate-claim attempts.';
