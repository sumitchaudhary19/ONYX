-- ==============================================================================
-- UPDATE TRIGGER: Enforce @mnit.ac.in for Google OAuth, Allow standard email 
-- ==============================================================================

-- 1. First, let's make sure we drop the OLD trigger if it had a different name.
-- (If you remember the exact name of your old trigger, replace 'check_mnit_email_trigger' below)
DROP TRIGGER IF EXISTS check_mnit_email_trigger ON auth.users;
DROP TRIGGER IF EXISTS ensure_mnit_email_trigger ON auth.users;
DROP TRIGGER IF EXISTS mnit_email_filter ON auth.users;

-- 2. Create the updated function
CREATE OR REPLACE FUNCTION public.allow_guest_emails()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if the provider is Google OAuth
    IF NEW.raw_app_meta_data->>'provider' = 'google' THEN
        -- Enforce the @mnit.ac.in domain for Google provider
        IF NEW.email NOT LIKE '%@mnit.ac.in' THEN
            RAISE EXCEPTION 'Access Denied: Only MNIT students (@mnit.ac.in) can log in via Google.';
        END IF;
    END IF;

    -- If provider is 'email', we allow it to pass through for Guests.
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create the new trigger using the updated function
CREATE TRIGGER enforce_mnit_domain_for_google
BEFORE INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.allow_guest_emails();
