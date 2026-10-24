-- ==============================================================================
-- Migration: 20261024000001_auth_user_profile_trigger.sql
-- Automatic Student Profile Creation Trigger on Supabase auth.users
-- ==============================================================================

-- 1. Function to handle automatic profile creation when an auth user is created
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER AS $$
DECLARE
    user_display_name TEXT;
BEGIN
    -- Extract display_name from metadata or fall back to email username
    user_display_name := COALESCE(
        NEW.raw_user_meta_data->>'display_name',
        NULLIF(SPLIT_PART(NEW.email, '@', 1), ''),
        'Student'
    );

    INSERT INTO public.profiles (
        id,
        email,
        display_name,
        role,
        academic_background,
        primary_interest,
        secondary_interests,
        skills,
        preferred_format,
        preferred_locations,
        citizenship
    )
    VALUES (
        NEW.id,
        COALESCE(NEW.email, ''),
        user_display_name,
        'student',
        'Engineering and Technology',
        'General',
        '{}',
        '{}',
        'Any',
        '{}',
        'Indian'
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        display_name = COALESCE(NULLIF(public.profiles.display_name, ''), EXCLUDED.display_name);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Attach trigger to auth.users table
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();
