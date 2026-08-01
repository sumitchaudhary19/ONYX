-- ══════════════════════════════════════════════════════════════
-- ONYX AUTH SECURITY OVERHAUL — SQL Script
-- Run this in your Supabase SQL Editor
-- ══════════════════════════════════════════════════════════════

-- 1. Drop the guest-email-allowing trigger & function
-- ──────────────────────────────────────────────────────
DROP TRIGGER IF EXISTS enforce_mnit_domain_for_google ON auth.users;
DROP FUNCTION IF EXISTS public.allow_guest_emails();

-- 2. Recreate a stricter trigger that blocks ALL non-MNIT emails
-- ──────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.enforce_mnit_domain()
RETURNS TRIGGER AS $$
BEGIN
  -- Google OAuth users MUST have @mnit.ac.in
  IF NEW.raw_app_meta_data->>'provider' = 'google' THEN
    IF NEW.email NOT LIKE '%@mnit.ac.in' THEN
      RAISE EXCEPTION 'Only @mnit.ac.in Google accounts are allowed.';
    END IF;
  END IF;

  -- Email/password signups MUST also have @mnit.ac.in
  IF NEW.raw_app_meta_data->>'provider' = 'email' THEN
    IF NEW.email NOT LIKE '%@mnit.ac.in' THEN
      RAISE EXCEPTION 'Only @mnit.ac.in email addresses are allowed.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER enforce_mnit_domain_strict
  BEFORE INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_mnit_domain();

-- 3. Enable RLS on profiles (idempotent)
-- ──────────────────────────────────────
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to recreate clean ones
DROP POLICY IF EXISTS "Users can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can delete own profile" ON profiles;
DROP POLICY IF EXISTS "profiles_select_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON profiles;

-- SELECT: Authenticated users can view all profiles (needed for social features)
CREATE POLICY "Users can view all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

-- INSERT: Users can only insert their own row
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- UPDATE: Users can only update their own row
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- DELETE: Users can only delete their own row
CREATE POLICY "Users can delete own profile"
  ON profiles FOR DELETE
  TO authenticated
  USING (auth.uid() = id);
