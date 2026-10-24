-- ==============================================================================
-- InternPath (InternHub) - Migration: Enforce Student Role & Privilege Escalation Protection
-- ==============================================================================

-- 1. Trigger function to enforce student role on profile creation and prevent unauthorized escalation
CREATE OR REPLACE FUNCTION public.enforce_profile_role_integrity()
RETURNS TRIGGER AS $$
BEGIN
    -- On INSERT: ordinary client registrations are strictly enforced as 'student'
    IF TG_OP = 'INSERT' THEN
        -- Only service_role or existing admin can create an admin profile
        IF NEW.role = 'admin' AND NOT public.is_admin() AND current_user <> 'service_role' AND current_user <> 'postgres' THEN
            NEW.role := 'student';
        END IF;
        
        -- Ensure role is always defaulted to student if null
        IF NEW.role IS NULL THEN
            NEW.role := 'student';
        END IF;
    END IF;

    -- On UPDATE: non-admins cannot elevate their own role to 'admin'
    IF TG_OP = 'UPDATE' THEN
        IF NEW.role <> OLD.role THEN
            IF NOT public.is_admin() AND current_user <> 'service_role' AND current_user <> 'postgres' THEN
                -- Revert any unauthorized client-submitted role tampering
                NEW.role := OLD.role;
            END IF;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Attach the trigger to public.profiles
DROP TRIGGER IF EXISTS trg_enforce_profile_role_integrity ON public.profiles;

CREATE TRIGGER trg_enforce_profile_role_integrity
BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.enforce_profile_role_integrity();

-- 3. Update RLS policies on public.profiles to explicitly guard role updates
DROP POLICY IF EXISTS "Users can insert their own profile on signup" ON public.profiles;
CREATE POLICY "Users can insert their own profile on signup"
    ON public.profiles FOR INSERT
    WITH CHECK (auth.uid() = id AND (role = 'student' OR public.is_admin()));

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id OR public.is_admin())
    WITH CHECK (auth.uid() = id AND (role = (SELECT role FROM public.profiles WHERE id = auth.uid()) OR public.is_admin()));
