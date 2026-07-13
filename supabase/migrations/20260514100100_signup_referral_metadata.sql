-- Bullet-proof referral attribution: read referral_code from raw_user_meta_data
-- when the auth trigger creates a profile, and immediately attribute it via the
-- same logic as attribute_referral().
--
-- Why this matters: the previous flow was:
--   1. User clicks /login?ref=XXX → code stored in localStorage
--   2. User signs up → email confirmation sent
--   3. User opens confirmation email on a DIFFERENT device → localStorage is empty
--   4. User signs in → attribute_referral RPC has no code to pass → no attribution
--
-- With this migration:
--   1. The login page passes the code via supabase.auth.signUp options.data
--   2. Supabase stores it in auth.users.raw_user_meta_data
--   3. The auth trigger creates the profile AND walks up to 5 levels of upline,
--      awarding signup points — all in a single transaction, no client needed.

CREATE OR REPLACE FUNCTION create_profile_for_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  new_code      text;
  retries       int := 0;
  inbound_code  text;
  referrer_id   uuid;
  upline_id     uuid;
  signup_pts    jsonb;
  level         int := 1;
  level_pts     int;
BEGIN
  -- Generate a unique referral code for the new user (with retry on collision).
  LOOP
    new_code := gen_referral_code();
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.profiles WHERE referral_code = new_code);
    retries := retries + 1;
    IF retries > 5 THEN RAISE EXCEPTION 'Could not generate unique referral_code after 5 tries'; END IF;
  END LOOP;

  -- Create the profile row (idempotent — safe if it somehow already exists).
  INSERT INTO public.profiles (id, display_name, referral_code, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'display_name', split_part(NEW.email, '@', 1)),
    new_code,
    'user'
  )
  ON CONFLICT (id) DO NOTHING;

  -- Did this signup come via a referral link? If so, attribute it server-side.
  inbound_code := upper(trim(COALESCE(NEW.raw_user_meta_data ->> 'referral_code', '')));
  IF inbound_code <> '' THEN
    SELECT id INTO referrer_id FROM public.profiles
    WHERE upper(referral_code) = inbound_code
      AND id <> NEW.id;  -- prevent self-referral edge case

    IF referrer_id IS NOT NULL THEN
      -- Set the direct referrer on the new profile.
      UPDATE public.profiles SET referred_by = referrer_id WHERE id = NEW.id;

      -- Read configured signup point amounts.
      SELECT value INTO signup_pts FROM public.system_settings WHERE key = 'points.signup';

      -- Walk up the chain up to 5 levels.
      upline_id := referrer_id;
      WHILE upline_id IS NOT NULL AND level <= 5 LOOP
        INSERT INTO public.referral_relationships (referrer_id, referred_id, level)
        VALUES (upline_id, NEW.id, level)
        ON CONFLICT (referrer_id, referred_id) DO NOTHING;

        level_pts := COALESCE((signup_pts -> ('l' || level::text))::int, 0);
        IF level_pts > 0 THEN
          INSERT INTO public.points_ledger (user_id, points, source, related_user_id)
          VALUES (upline_id, level_pts, 'signup_l' || level::text, NEW.id);
        END IF;

        SELECT referred_by INTO upline_id FROM public.profiles WHERE id = upline_id;
        level := level + 1;
      END LOOP;
    END IF;
  END IF;

  RETURN NEW;
EXCEPTION
  -- Never block auth.users insert because of profile/attribution work.
  WHEN OTHERS THEN
    RAISE WARNING 'create_profile_for_new_user failed for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

DO $$
BEGIN
  EXECUTE 'ALTER FUNCTION public.create_profile_for_new_user() OWNER TO postgres';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not transfer ownership: %', SQLERRM;
END $$;

-- Re-create the trigger so it picks up the updated function.
DROP TRIGGER IF EXISTS create_profile_on_signup ON auth.users;
CREATE TRIGGER create_profile_on_signup
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION create_profile_for_new_user();
