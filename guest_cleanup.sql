-- ══════════════════════════════════════════════════════════════
-- GUEST DATA CLEANUP — Run this when beta testing is over
-- ⚠️ WARNING: This permanently deletes ALL guest accounts and
-- their associated data (posts, messages, likes, etc.)
-- ══════════════════════════════════════════════════════════════

-- Step 1: Delete all guest users from auth.users
-- (Cascading deletes will clean up profiles, posts, messages, etc.)
DELETE FROM auth.users
WHERE id IN (SELECT id FROM public.profiles WHERE is_guest = true);

-- Step 2: Restore the strict MNIT-only domain trigger
CREATE OR REPLACE FUNCTION public.enforce_mnit_domain()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.raw_app_meta_data->>'provider' = 'google' THEN
    IF NEW.email NOT LIKE '%@mnit.ac.in' THEN
      RAISE EXCEPTION 'Only @mnit.ac.in Google accounts are allowed.';
    END IF;
  END IF;

  IF NEW.raw_app_meta_data->>'provider' = 'email' THEN
    IF NEW.email NOT LIKE '%@mnit.ac.in' THEN
      RAISE EXCEPTION 'Only @mnit.ac.in email addresses are allowed.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 3 (Optional): Remove the is_guest column after cleanup
-- ALTER TABLE profiles DROP COLUMN IF EXISTS is_guest;
