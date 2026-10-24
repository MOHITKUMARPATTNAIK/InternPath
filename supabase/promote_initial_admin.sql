-- ==============================================================================
-- InternPath (InternHub) - One-Time Initial Owner-Admin Promotion Script
-- Safe to execute in Supabase SQL Editor (Dashboard -> SQL Editor -> New Query)
-- ==============================================================================
-- INSTRUCTIONS:
-- 1. Replace 'YOUR_EMAIL_HERE' below with the email address of your existing
--    registered InternPath account.
-- 2. Click "Run" in the Supabase SQL Editor.
-- 3. Check the "Results" tab below to verify that your role has been set to 'owner' (or 'admin').
-- ==============================================================================

DO $$
DECLARE
    -- >>> REPLACE WITH YOUR REGISTERED EMAIL ADDRESS <<<
    target_email TEXT := 'YOUR_EMAIL_HERE';
    target_role  TEXT := 'owner'; -- Choose 'owner' or 'admin'

    matched_user_id UUID;
    existing_role   TEXT;
BEGIN
    -- Guard: Ensure user replaced the placeholder
    IF target_email = 'YOUR_EMAIL_HERE' OR target_email IS NULL OR TRIM(target_email) = '' THEN
        RAISE EXCEPTION 'Please replace YOUR_EMAIL_HERE with your actual registered email address before running this script.';
    END IF;

    -- Look up the account in Supabase auth.users
    SELECT id INTO matched_user_id
    FROM auth.users
    WHERE LOWER(email) = LOWER(TRIM(target_email));

    IF matched_user_id IS NULL THEN
        RAISE EXCEPTION 'No user found in auth.users with email "%". Please register your account at /auth/signup first, then re-run this script.', target_email;
    END IF;

    -- Update the user profile role in public.profiles
    UPDATE public.profiles
    SET
        role = target_role,
        updated_at = NOW()
    WHERE id = matched_user_id
    RETURNING role INTO existing_role;

    -- If profile row didn't exist yet, insert it
    IF NOT FOUND THEN
        INSERT INTO public.profiles (id, email, display_name, role)
        VALUES (
            matched_user_id,
            LOWER(TRIM(target_email)),
            SPLIT_PART(target_email, '@', 1),
            target_role
        );
    END IF;

    RAISE NOTICE '============================================================';
    RAISE NOTICE 'SUCCESS: User % (ID: %) is now an authorized %!', target_email, matched_user_id, target_role;
    RAISE NOTICE 'You can now sign in at /auth/login and access /admin with full privileges.';
    RAISE NOTICE '============================================================';
END $$;

-- Verification Query: Show the updated profile
SELECT id, email, display_name, role, created_at, updated_at
FROM public.profiles
WHERE role IN ('admin', 'owner')
ORDER BY updated_at DESC;
