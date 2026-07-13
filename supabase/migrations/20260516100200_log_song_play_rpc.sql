-- Bulletproof play-logging RPC. Lets us bypass RLS issues on song_plays by going
-- through a SECURITY DEFINER function that runs as postgres.

CREATE OR REPLACE FUNCTION log_song_play(
  p_song_id   uuid,
  p_listener_id uuid,
  p_source    text,
  p_duration  integer,
  p_completed boolean,
  p_ip_hash   text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  new_play_id uuid;
BEGIN
  -- Validate source
  IF p_source NOT IN ('internal','spotify_embed','youtube_embed','soundcloud_embed','apple_embed') THEN
    RETURN jsonb_build_object('error', 'invalid_source');
  END IF;

  -- Validate song exists
  IF NOT EXISTS (SELECT 1 FROM songs WHERE id = p_song_id) THEN
    RETURN jsonb_build_object('error', 'song_not_found');
  END IF;

  INSERT INTO song_plays (song_id, listener_id, source, duration_listened_seconds, completed, points_awarded, ip_hash)
  VALUES (p_song_id, p_listener_id, p_source, COALESCE(p_duration, 0), COALESCE(p_completed, false), 0, p_ip_hash)
  RETURNING id INTO new_play_id;

  RETURN jsonb_build_object('success', true, 'play_id', new_play_id);
END;
$$;

GRANT EXECUTE ON FUNCTION log_song_play(uuid, uuid, text, integer, boolean, text) TO anon, authenticated;

DO $$
BEGIN
  EXECUTE 'ALTER FUNCTION public.log_song_play(uuid, uuid, text, integer, boolean, text) OWNER TO postgres';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not transfer ownership of log_song_play to postgres: %', SQLERRM;
END $$;

NOTIFY pgrst, 'reload schema';
