-- Admin RPC: transfer a user from their current referrer to a new one.
-- Rebuilds referral_relationships up to 5 levels using the new referrer's chain.
--
-- Safety:
--   1. Only admin / super_admin can call this (checked at function start).
--   2. target_user_id and new_referrer_id must both exist.
--   3. No self-referral (can't refer yourself).
--   4. No cycle — new_referrer_id must NOT exist anywhere in target's current downline.
--   5. Setting new_referrer_id to NULL is allowed → just removes the referrer.
--
-- Historic points_ledger entries are intentionally left untouched. Transferring a referrer
-- changes the GO-FORWARD chain. Use a separate manual SQL block to reverse historic points
-- if you need to (we recommend leaving them as accurate history).

CREATE OR REPLACE FUNCTION transfer_referrer(
  target_user_id  uuid,
  new_referrer_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  caller_role  text;
  target_name  text;
  new_name     text;
  upline_id    uuid;
  current_level int := 1;
  levels_built int := 0;
  cycle_found  boolean := false;
BEGIN
  -- 1) Authorisation
  SELECT role INTO caller_role FROM profiles WHERE id = auth.uid();
  IF caller_role NOT IN ('admin', 'super_admin') THEN
    RETURN jsonb_build_object('error', 'not_authorised');
  END IF;

  -- 2) Target must exist
  SELECT display_name INTO target_name FROM profiles WHERE id = target_user_id;
  IF target_name IS NULL AND NOT EXISTS (SELECT 1 FROM profiles WHERE id = target_user_id) THEN
    RETURN jsonb_build_object('error', 'target_not_found');
  END IF;

  -- 3) If new_referrer_id is non-null, validate it
  IF new_referrer_id IS NOT NULL THEN
    -- No self-referral
    IF new_referrer_id = target_user_id THEN
      RETURN jsonb_build_object('error', 'self_referral');
    END IF;

    -- New referrer must exist
    SELECT display_name INTO new_name FROM profiles WHERE id = new_referrer_id;
    IF new_name IS NULL AND NOT EXISTS (SELECT 1 FROM profiles WHERE id = new_referrer_id) THEN
      RETURN jsonb_build_object('error', 'referrer_not_found');
    END IF;

    -- Cycle check: walk up new_referrer's existing upline chain.
    -- If we encounter target_user_id, transferring would create a cycle.
    upline_id := new_referrer_id;
    WHILE upline_id IS NOT NULL LOOP
      IF upline_id = target_user_id THEN
        cycle_found := true;
        EXIT;
      END IF;
      SELECT referred_by INTO upline_id FROM profiles WHERE id = upline_id;
    END LOOP;

    IF cycle_found THEN
      RETURN jsonb_build_object('error', 'would_create_cycle');
    END IF;
  END IF;

  -- 4) Do the transfer
  UPDATE profiles
  SET referred_by = new_referrer_id, updated_at = now()
  WHERE id = target_user_id;

  -- 5) Wipe old referral_relationships where target is the referred party
  DELETE FROM referral_relationships WHERE referred_id = target_user_id;

  -- 6) Build new chain up to 5 levels (only if new_referrer_id is not null)
  IF new_referrer_id IS NOT NULL THEN
    upline_id := new_referrer_id;
    current_level := 1;
    WHILE upline_id IS NOT NULL AND current_level <= 5 LOOP
      INSERT INTO referral_relationships (referrer_id, referred_id, level)
      VALUES (upline_id, target_user_id, current_level)
      ON CONFLICT (referrer_id, referred_id) DO NOTHING;

      levels_built := levels_built + 1;
      SELECT referred_by INTO upline_id FROM profiles WHERE id = upline_id;
      current_level := current_level + 1;
    END LOOP;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'target_user_id', target_user_id,
    'new_referrer_id', new_referrer_id,
    'levels_built', levels_built
  );
END;
$$;

GRANT EXECUTE ON FUNCTION transfer_referrer(uuid, uuid) TO authenticated;

DO $$
BEGIN
  EXECUTE 'ALTER FUNCTION public.transfer_referrer(uuid, uuid) OWNER TO postgres';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not transfer ownership of transfer_referrer: %', SQLERRM;
END $$;

COMMENT ON FUNCTION transfer_referrer(uuid, uuid) IS
  'Admin-only. Move target_user_id under new_referrer_id (or null to remove referrer). Returns jsonb { success | error }.';
