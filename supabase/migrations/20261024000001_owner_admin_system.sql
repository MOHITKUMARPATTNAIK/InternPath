-- ==============================================================================
-- InternPath (InternHub) - Owner-Admin System & Role Hardening Migration
-- Migration: 20261024000001_owner_admin_system.sql
-- ==============================================================================

-- 1. Safely update profiles role check constraint to support ('student', 'admin', 'owner')
DO $$
BEGIN
    -- Drop existing check constraint if it exists
    IF EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'profiles_role_check'
        AND conrelid = 'public.profiles'::regclass
    ) THEN
        ALTER TABLE public.profiles DROP CONSTRAINT profiles_role_check;
    END IF;

    -- Add updated check constraint
    ALTER TABLE public.profiles
        ADD CONSTRAINT profiles_role_check CHECK (role IN ('student', 'admin', 'owner'));
END $$;

-- 2. Update is_admin() helper to include both 'admin' and 'owner'
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role IN ('admin', 'owner')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Hardened role integrity trigger: prevents any unauthorized escalation to 'admin' or 'owner'
CREATE OR REPLACE FUNCTION public.enforce_profile_role_integrity()
RETURNS TRIGGER AS $$
BEGIN
    -- On INSERT: only service_role, postgres, or an existing admin can set role to admin or owner
    IF TG_OP = 'INSERT' THEN
        IF NEW.role IN ('admin', 'owner') AND NOT public.is_admin() AND current_user <> 'service_role' AND current_user <> 'postgres' THEN
            NEW.role := 'student';
        END IF;
        IF NEW.role IS NULL THEN
            NEW.role := 'student';
        END IF;
    END IF;

    -- On UPDATE: only service_role, postgres, or an existing admin can change roles
    IF TG_OP = 'UPDATE' THEN
        IF NEW.role <> OLD.role THEN
            IF NOT public.is_admin() AND current_user <> 'service_role' AND current_user <> 'postgres' THEN
                NEW.role := OLD.role;
            END IF;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_enforce_profile_role_integrity ON public.profiles;
CREATE TRIGGER trg_enforce_profile_role_integrity
    BEFORE INSERT OR UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.enforce_profile_role_integrity();

-- 4. Server-Side Helper Procedure: promote_user_to_admin
-- Callable only by postgres or service_role in Supabase SQL Editor
CREATE OR REPLACE FUNCTION public.promote_user_to_admin(
    target_email TEXT,
    target_role TEXT DEFAULT 'admin'
)
RETURNS JSONB AS $$
DECLARE
    target_user_id UUID;
    updated_profile RECORD;
BEGIN
    -- Validate requested role
    IF target_role NOT IN ('admin', 'owner') THEN
        RAISE EXCEPTION 'Target role must be either "admin" or "owner". Provided: %', target_role;
    END IF;

    -- Lookup user in auth.users
    SELECT id INTO target_user_id
    FROM auth.users
    WHERE LOWER(email) = LOWER(TRIM(target_email));

    IF target_user_id IS NULL THEN
        RAISE EXCEPTION 'User with email "%" was not found in auth.users. Please ensure the user has signed up first.', target_email;
    END IF;

    -- Update or create profile with new admin role
    INSERT INTO public.profiles (id, email, display_name, role)
    VALUES (target_user_id, LOWER(TRIM(target_email)), SPLIT_PART(target_email, '@', 1), target_role)
    ON CONFLICT (id) DO UPDATE SET
        role = target_role,
        updated_at = NOW()
    RETURNING id, email, display_name, role INTO updated_profile;

    RETURN jsonb_build_object(
        'success', true,
        'user_id', updated_profile.id,
        'email', updated_profile.email,
        'display_name', updated_profile.display_name,
        'role', updated_profile.role,
        'message', format('User %s successfully promoted to %s', updated_profile.email, updated_profile.role)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Restrict execution of promote_user_to_admin to service_role and postgres only
REVOKE EXECUTE ON FUNCTION public.promote_user_to_admin(TEXT, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.promote_user_to_admin(TEXT, TEXT) FROM anon;
REVOKE EXECUTE ON FUNCTION public.promote_user_to_admin(TEXT, TEXT) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.promote_user_to_admin(TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.promote_user_to_admin(TEXT, TEXT) TO postgres;
