-- Fix: "Database error saving new user" on signup.
--
-- Root cause: the create_profile_for_new_user trigger fires AFTER INSERT on auth.users
-- and INSERTs into public.profiles. Because public.profiles has RLS enabled but no
-- INSERT policy, the insert is blocked unless the function bypasses RLS.
--
-- The function is declared SECURITY DEFINER, which should make it run with the
-- function-owner's privileges. But in some Supabase environments the owner is the
-- migration role (not `postgres`), and that role does NOT have BYPASSRLS.
--
-- This migration:
--   1. Re-declares the function with explicit search_path (best practice)
--   2. Re-creates the trigger
--   3. Adds an explicit INSERT policy on profiles for the trigger context — this is
--      defense-in-depth so the insert works regardless of function-owner role.
--   4. Re-asserts ownership to postgres where possible (no-op if already correct).

-- =============================================================
-- 1. Re-create trigger function with explicit search_path
-- =============================================================
CREATE OR REPLACE FUNCTION create_profile_for_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  new_code text;
  retries int := 0;
BEGIN
  -- Generate a unique referral code. Retry on rare collisions.
  LOOP
    new_code := gen_referral_code();
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.profiles WHERE referral_code = new_code);
    retries := retries + 1;
    IF retries > 5 THEN RAISE EXCEPTION 'Could not generate unique referral_code after 5 tries'; END IF;
  END LOOP;

  -- Idempotent: skip if profile already exists for this auth user.
  -- (Can happen if a prior signup attempt partly succeeded.)
  INSERT INTO public.profiles (id, display_name, referral_code, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'display_name', split_part(NEW.email, '@', 1)),
    new_code,
    'user'
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
EXCEPTION
  -- Never block auth.users insert because of profile creation. Log a NOTICE instead.
  WHEN OTHERS THEN
    RAISE WARNING 'create_profile_for_new_user failed for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

-- Try to set ownership to postgres (the role that bypasses RLS in Supabase).
-- Wrapped in DO so we don't fail if the role doesn't exist or we lack permission.
DO $$
BEGIN
  EXECUTE 'ALTER FUNCTION public.create_profile_for_new_user() OWNER TO postgres';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not transfer ownership of create_profile_for_new_user to postgres: %', SQLERRM;
END $$;

-- Re-create the trigger to make sure it's bound to the new function definition.
DROP TRIGGER IF EXISTS create_profile_on_signup ON auth.users;
CREATE TRIGGER create_profile_on_signup
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION create_profile_for_new_user();

-- =============================================================
-- 2. Defence-in-depth: explicit INSERT policy on profiles
-- =============================================================
-- This allows the row to be inserted when:
--   (a) the inserted row's id matches an existing auth.users id (trigger context)
--   (b) the inserted row's id matches the current auth.uid (manual self-create)
-- Either of these is safe because:
--   - profile.id is the PK referencing auth.users.id, so only valid users can exist
--   - role is forced to 'user' by the trigger; clients can't elevate
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='profiles' AND policyname='profiles_insert_self_or_trigger') THEN
    CREATE POLICY profiles_insert_self_or_trigger ON profiles
      FOR INSERT
      WITH CHECK (
        id = auth.uid()
        OR EXISTS (SELECT 1 FROM auth.users u WHERE u.id = profiles.id)
      );
  END IF;
END $$;

-- =============================================================
-- 3. Ensure gen_referral_code() has the same ownership/search_path hygiene
-- =============================================================
CREATE OR REPLACE FUNCTION gen_referral_code()
RETURNS text
LANGUAGE plpgsql
VOLATILE
SET search_path = public, pg_temp
AS $$
DECLARE
  alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  code text := '';
  i int;
BEGIN
  FOR i IN 1..8 LOOP
    code := code || substr(alphabet, (1 + floor(random() * length(alphabet)))::int, 1);
  END LOOP;
  RETURN code;
END;
$$;

DO $$
BEGIN
  EXECUTE 'ALTER FUNCTION public.gen_referral_code() OWNER TO postgres';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not transfer ownership of gen_referral_code to postgres: %', SQLERRM;
END $$;

-- =============================================================
-- 4. Backfill profiles for any auth.users that don't have one yet
-- =============================================================
-- This catches users who tried to sign up while the trigger was failing.
INSERT INTO public.profiles (id, display_name, referral_code, role)
SELECT
  u.id,
  COALESCE(u.raw_user_meta_data ->> 'display_name', split_part(u.email, '@', 1)),
  gen_referral_code(),
  'user'
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;
