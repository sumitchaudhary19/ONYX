-- ==============================================================================
-- UPDATE TRIGGER: Enforce @mnit.ac.in for Google OAuth, Allow standard email 
-- ==============================================================================
-- This script replaces the existing auth restriction trigger function.
-- It ensures that Google OAuth logins must use an @mnit.ac.in email, 
-- while allowing standard Email/Password signups (used by the new Guest Mode).

CREATE OR REPLACE FUNCTION public.check_mnit_email()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if the provider is Google OAuth
    IF NEW.raw_app_meta_data->>'provider' = 'google' THEN
        -- Enforce the @mnit.ac.in domain for Google provider
        IF NEW.email NOT LIKE '%@mnit.ac.in' THEN
            RAISE EXCEPTION 'Access Denied: Only MNIT students (@mnit.ac.in) can log in via Google.';
        END IF;
    END IF;

    -- If provider is 'email' (or anything else), we allow it to pass through
    -- as we assume it's coming from our controlled Guest Registration form.
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- (Optional) If the trigger isn't named 'ensure_mnit_email_trigger', you can recreate it:
-- DROP TRIGGER IF EXISTS ensure_mnit_email_trigger ON auth.users;
-- CREATE TRIGGER ensure_mnit_email_trigger
-- BEFORE INSERT ON auth.users
-- FOR EACH ROW EXECUTE FUNCTION public.check_mnit_email();
