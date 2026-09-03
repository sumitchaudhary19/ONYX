-- ══════════════════════════════════════════════════════════════
-- GUEST MODE SETUP — SQL Script
-- Run this in your Supabase SQL Editor
-- ══════════════════════════════════════════════════════════════

-- 1. Add is_guest column to profiles
-- ───────────────────────────────────
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_guest BOOLEAN DEFAULT false;

-- 2. Temporarily allow @gmail.com in the domain trigger
-- ─────────────────────────────────────────────────────────
-- We replace the strict trigger to also allow gmail for guest testing
CREATE OR REPLACE FUNCTION public.enforce_mnit_domain()
RETURNS TRIGGER AS $$
BEGIN
  -- Google OAuth users MUST have @mnit.ac.in
  IF NEW.raw_app_meta_data->>'provider' = 'google' THEN
    IF NEW.email NOT LIKE '%@mnit.ac.in' THEN
      RAISE EXCEPTION 'Only @mnit.ac.in Google accounts are allowed.';
    END IF;
  END IF;

  -- Email/password signups: allow @mnit.ac.in AND @gmail.com (for guest testing)
  IF NEW.raw_app_meta_data->>'provider' = 'email' THEN
    IF NEW.email NOT LIKE '%@mnit.ac.in' AND NEW.email NOT LIKE '%@gmail.com' THEN
      RAISE EXCEPTION 'Only @mnit.ac.in and @gmail.com email addresses are allowed.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- NOTE: The trigger enforce_mnit_domain_strict already exists and calls this function.
-- No need to recreate the trigger; it will use the updated function automatically.
