-- ==============================================================================
-- InternPath (InternHub) - Complete Idempotent Database Setup
-- Run this script in the Supabase SQL Editor (Dashboard -> SQL Editor -> New query)
-- Safe to re-run: All statements use IF NOT EXISTS / DROP ... IF EXISTS
-- ==============================================================================

-- 1. Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------------------------------------------
-- 2. PROFILES TABLE (Student & Administrator Accounts)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name TEXT NOT NULL,
    email TEXT NOT NULL,
    college TEXT,
    institution_type TEXT DEFAULT 'other',
    degree TEXT,
    academic_year TEXT,
    academic_background TEXT NOT NULL DEFAULT 'Engineering and Technology',
    cgpa NUMERIC DEFAULT NULL,
    cgpa_scale NUMERIC DEFAULT 10,
    class_12_percentage NUMERIC DEFAULT NULL,
    citizenship TEXT DEFAULT 'Indian',
    primary_interest TEXT NOT NULL DEFAULT 'General',
    secondary_interests TEXT[] DEFAULT '{}',
    skills TEXT[] DEFAULT '{}',
    career_goals TEXT,
    preferred_format TEXT NOT NULL DEFAULT 'Any' CHECK (preferred_format IN ('Any', 'Remote', 'Onsite', 'Hybrid')),
    preferred_locations TEXT[] DEFAULT '{}',
    min_stipend_preference NUMERIC DEFAULT 0,
    duration_preference TEXT,
    role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'admin', 'owner')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ensure columns exist if table was previously created with earlier schema
ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS institution_type TEXT DEFAULT 'other',
    ADD COLUMN IF NOT EXISTS cgpa NUMERIC DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS cgpa_scale NUMERIC DEFAULT 10,
    ADD COLUMN IF NOT EXISTS class_12_percentage NUMERIC DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS citizenship TEXT DEFAULT 'Indian';

CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- ------------------------------------------------------------------------------
-- 3. SOURCES TABLE (Trusted Indian Institutions & Organizations)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    official_domain TEXT NOT NULL UNIQUE,
    source_category TEXT NOT NULL CHECK (
        source_category IN ('IIT', 'NIT', 'IIIT', 'IISc / IISER', 'Research Lab / PSU', 'Government Ministry', 'Public Fellowship', 'Corporate / Tech', 'Other')
    ),
    source_type TEXT NOT NULL CHECK (
        source_type IN ('Public Institution', 'Autonomous Govt Body', 'Ministry', 'Research Council', 'Enterprise', 'Other')
    ),
    opportunity_page_url TEXT NOT NULL,
    monitoring_method TEXT NOT NULL CHECK (
        monitoring_method IN ('API', 'RSS', 'HTML Scraping', 'Manual Verification')
    ),
    last_checked TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'maintenance', 'review_needed')),
    verification_notes TEXT,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    collection_frequency TEXT NOT NULL DEFAULT 'daily',
    last_attempted_check TIMESTAMPTZ,
    last_successful_check TIMESTAMPTZ,
    next_scheduled_check TIMESTAMPTZ,
    last_error TEXT,
    source_config JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.sources
    ADD COLUMN IF NOT EXISTS enabled BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS collection_frequency TEXT NOT NULL DEFAULT 'daily',
    ADD COLUMN IF NOT EXISTS last_attempted_check TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS last_successful_check TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS next_scheduled_check TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS last_error TEXT,
    ADD COLUMN IF NOT EXISTS source_config JSONB DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_sources_status ON public.sources(status);
CREATE INDEX IF NOT EXISTS idx_sources_category ON public.sources(source_category);
CREATE INDEX IF NOT EXISTS idx_sources_enabled ON public.sources(enabled);

-- ------------------------------------------------------------------------------
-- 4. INTERNSHIPS TABLE (Verified Indian Internships & Fellowships)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.internships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    organization TEXT NOT NULL,
    department TEXT,
    source_id UUID REFERENCES public.sources(id) ON DELETE SET NULL,
    description TEXT NOT NULL,
    eligible_disciplines TEXT[] NOT NULL DEFAULT '{}',
    min_education_level TEXT NOT NULL DEFAULT 'Undergraduate',
    eligible_years TEXT[] NOT NULL DEFAULT '{}',
    required_skills TEXT[] NOT NULL DEFAULT '{}',
    stipend_amount NUMERIC DEFAULT NULL,
    stipend_currency TEXT NOT NULL DEFAULT 'INR',
    stipend_frequency TEXT DEFAULT 'per month',
    stipend_status TEXT NOT NULL DEFAULT 'unpaid' CHECK (stipend_status IN ('paid', 'unpaid', 'stipend_not_specified')),
    duration TEXT NOT NULL,
    application_opening_date DATE,
    application_deadline DATE,
    location TEXT NOT NULL DEFAULT 'Pan-India',
    format TEXT NOT NULL DEFAULT 'onsite' CHECK (format IN ('remote', 'hybrid', 'onsite')),
    required_documents TEXT[] DEFAULT '{}',
    benefits TEXT[] DEFAULT '{}',
    official_application_url TEXT NOT NULL,
    original_source_url TEXT NOT NULL,
    publication_status TEXT NOT NULL DEFAULT 'published' CHECK (
        publication_status IN ('draft', 'pending_review', 'published', 'expired', 'archived')
    ),
    verification_status TEXT NOT NULL DEFAULT 'official_verified' CHECK (
        verification_status IN ('official_verified', 'source_checked', 'pending_verification', 'unverified')
    ),
    is_demo BOOLEAN NOT NULL DEFAULT FALSE,
    url_type TEXT DEFAULT 'direct_application',
    link_status TEXT NOT NULL DEFAULT 'working' CHECK (
        link_status IN ('working', 'redirected', 'temporarily_unavailable', 'unreachable', 'access_restricted', 'needs_manual_verification', 'invalid_url')
    ),
    last_link_checked_at TIMESTAMPTZ DEFAULT NOW(),
    last_http_status INTEGER DEFAULT 200,
    final_url TEXT,
    link_check_message TEXT,
    min_cgpa NUMERIC DEFAULT NULL,
    cgpa_scale NUMERIC DEFAULT 10,
    min_percentage NUMERIC DEFAULT NULL,
    eligible_degrees TEXT[] DEFAULT '{}',
    institution_restrictions TEXT[] DEFAULT '{}',
    citizenship_required TEXT[] DEFAULT '{"Indian"}',
    requires_noc BOOLEAN DEFAULT FALSE,
    requires_nomination BOOLEAN DEFAULT FALSE,
    prerequisites_description TEXT,
    application_status TEXT NOT NULL DEFAULT 'open' CHECK (
        application_status IN ('upcoming', 'open', 'closing_soon', 'closed', 'status_unconfirmed')
    ),
    eligibility_verification_status TEXT NOT NULL DEFAULT 'verified' CHECK (
        eligibility_verification_status IN ('verified', 'partial', 'unconfirmed')
    ),
    review_status TEXT NOT NULL DEFAULT 'approved' CHECK (
        review_status IN ('approved', 'pending_review', 'flagged', 'archived')
    ),
    verification_notes TEXT,
    canonical_url TEXT,
    data_fingerprint TEXT,
    published_at TIMESTAMPTZ DEFAULT NOW(),
    last_verified_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ensure new columns exist on legacy tables
ALTER TABLE public.internships
    ADD COLUMN IF NOT EXISTS url_type TEXT DEFAULT 'direct_application',
    ADD COLUMN IF NOT EXISTS link_status TEXT NOT NULL DEFAULT 'working',
    ADD COLUMN IF NOT EXISTS last_link_checked_at TIMESTAMPTZ DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS last_http_status INTEGER DEFAULT 200,
    ADD COLUMN IF NOT EXISTS final_url TEXT,
    ADD COLUMN IF NOT EXISTS link_check_message TEXT,
    ADD COLUMN IF NOT EXISTS min_cgpa NUMERIC DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS cgpa_scale NUMERIC DEFAULT 10,
    ADD COLUMN IF NOT EXISTS min_percentage NUMERIC DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS eligible_degrees TEXT[] DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS institution_restrictions TEXT[] DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS citizenship_required TEXT[] DEFAULT '{"Indian"}',
    ADD COLUMN IF NOT EXISTS requires_noc BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS requires_nomination BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS prerequisites_description TEXT,
    ADD COLUMN IF NOT EXISTS application_status TEXT NOT NULL DEFAULT 'open',
    ADD COLUMN IF NOT EXISTS eligibility_verification_status TEXT NOT NULL DEFAULT 'verified',
    ADD COLUMN IF NOT EXISTS review_status TEXT NOT NULL DEFAULT 'approved',
    ADD COLUMN IF NOT EXISTS verification_notes TEXT,
    ADD COLUMN IF NOT EXISTS canonical_url TEXT,
    ADD COLUMN IF NOT EXISTS data_fingerprint TEXT;

CREATE INDEX IF NOT EXISTS idx_internships_pub_status ON public.internships(publication_status);
CREATE INDEX IF NOT EXISTS idx_internships_deadline ON public.internships(application_deadline);
CREATE INDEX IF NOT EXISTS idx_internships_stipend_status ON public.internships(stipend_status);
CREATE INDEX IF NOT EXISTS idx_internships_format ON public.internships(format);
CREATE INDEX IF NOT EXISTS idx_internships_disciplines ON public.internships USING GIN (eligible_disciplines);
CREATE INDEX IF NOT EXISTS idx_internships_skills ON public.internships USING GIN (required_skills);
CREATE INDEX IF NOT EXISTS idx_internships_fingerprint ON public.internships(data_fingerprint);
CREATE INDEX IF NOT EXISTS idx_internships_canonical_url ON public.internships(canonical_url);
CREATE INDEX IF NOT EXISTS idx_internships_app_status ON public.internships(application_status);

-- ------------------------------------------------------------------------------
-- 5. SAVED INTERNSHIPS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.saved_internships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    internship_id UUID NOT NULL REFERENCES public.internships(id) ON DELETE CASCADE,
    personal_status TEXT NOT NULL DEFAULT 'Interested' CHECK (
        personal_status IN ('Interested', 'Planning to Apply', 'Applied', 'Not Pursuing')
    ),
    notes TEXT,
    saved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_user_internship_saved UNIQUE (user_id, internship_id)
);

CREATE INDEX IF NOT EXISTS idx_saved_internships_user ON public.saved_internships(user_id);

-- ------------------------------------------------------------------------------
-- 6. COLLECTION RUNS TABLE (Pipeline Monitoring)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.collection_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_id UUID REFERENCES public.sources(id) ON DELETE SET NULL,
    source_name TEXT NOT NULL,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    status TEXT NOT NULL CHECK (status IN ('running', 'success', 'failed', 'partial')),
    records_discovered INT NOT NULL DEFAULT 0,
    records_created INT NOT NULL DEFAULT 0,
    records_updated INT NOT NULL DEFAULT 0,
    records_skipped INT NOT NULL DEFAULT 0,
    records_pending_review INT NOT NULL DEFAULT 0,
    duration_ms INT NOT NULL DEFAULT 0,
    error_summary TEXT
);

CREATE INDEX IF NOT EXISTS idx_collection_runs_started ON public.collection_runs(started_at DESC);

-- ------------------------------------------------------------------------------
-- 7. REPORTS TABLE (Quality Assurance & Flagged Items)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    internship_id UUID NOT NULL REFERENCES public.internships(id) ON DELETE CASCADE,
    reporter_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    reporter_email TEXT,
    category TEXT NOT NULL CHECK (
        category IN ('expired_listing', 'incorrect_info', 'suspicious_link', 'broken_url', 'other')
    ),
    description TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed')),
    admin_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reports_status ON public.reports(status);

-- ------------------------------------------------------------------------------
-- 8. OPPORTUNITY CHANGE LOGS TABLE (Audit History)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.opportunity_change_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    internship_id UUID REFERENCES public.internships(id) ON DELETE CASCADE,
    field_name TEXT NOT NULL,
    old_value JSONB,
    new_value JSONB,
    changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    change_source TEXT NOT NULL DEFAULT 'crawler' CHECK (change_source IN ('crawler', 'admin')),
    run_id TEXT
);

CREATE INDEX IF NOT EXISTS idx_change_logs_internship ON public.opportunity_change_logs(internship_id);
CREATE INDEX IF NOT EXISTS idx_change_logs_changed_at ON public.opportunity_change_logs(changed_at DESC);

-- ------------------------------------------------------------------------------
-- 9. TIMESTAMP TRIGGER FUNCTION
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.profiles;
CREATE TRIGGER set_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

DROP TRIGGER IF EXISTS set_sources_updated_at ON public.sources;
CREATE TRIGGER set_sources_updated_at BEFORE UPDATE ON public.sources FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

DROP TRIGGER IF EXISTS set_internships_updated_at ON public.internships;
CREATE TRIGGER set_internships_updated_at BEFORE UPDATE ON public.internships FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

DROP TRIGGER IF EXISTS set_saved_internships_updated_at ON public.saved_internships;
CREATE TRIGGER set_saved_internships_updated_at BEFORE UPDATE ON public.saved_internships FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

DROP TRIGGER IF EXISTS set_reports_updated_at ON public.reports;
CREATE TRIGGER set_reports_updated_at BEFORE UPDATE ON public.reports FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- ------------------------------------------------------------------------------
-- 10. AUTH TRIGGER: AUTO-CREATE STUDENT PROFILE ON SIGNUP
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER AS $$
DECLARE
    user_display_name TEXT;
BEGIN
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

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

-- ------------------------------------------------------------------------------
-- 11. ROLE ESCALATION PROTECTION TRIGGER ON PROFILES
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role IN ('admin', 'owner')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.enforce_profile_role_integrity()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        IF NEW.role IN ('admin', 'owner') AND NOT public.is_admin() AND current_user <> 'service_role' AND current_user <> 'postgres' THEN
            NEW.role := 'student';
        END IF;
        IF NEW.role IS NULL THEN
            NEW.role := 'student';
        END IF;
    END IF;

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

-- ------------------------------------------------------------------------------
-- 12. ROW LEVEL SECURITY (RLS) POLICIES
-- ------------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.internships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_internships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collection_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opportunity_change_logs ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
DROP POLICY IF EXISTS "Users can view their own profile or admins can view all" ON public.profiles;
CREATE POLICY "Users can view their own profile or admins can view all"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id OR public.is_admin());

DROP POLICY IF EXISTS "Users can insert their own profile on signup" ON public.profiles;
CREATE POLICY "Users can insert their own profile on signup"
    ON public.profiles FOR INSERT
    WITH CHECK (auth.uid() = id AND (role = 'student' OR public.is_admin()));

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id OR public.is_admin())
    WITH CHECK (auth.uid() = id AND (role = (SELECT role FROM public.profiles WHERE id = auth.uid()) OR public.is_admin()));

-- Sources Policies
DROP POLICY IF EXISTS "Everyone can read trusted sources" ON public.sources;
CREATE POLICY "Everyone can read trusted sources"
    ON public.sources FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Only admins can modify sources" ON public.sources;
CREATE POLICY "Only admins can modify sources"
    ON public.sources FOR ALL
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- Internships Policies
DROP POLICY IF EXISTS "Public can view published internships" ON public.internships;
CREATE POLICY "Public can view published internships"
    ON public.internships FOR SELECT
    USING (publication_status = 'published' OR public.is_admin());

DROP POLICY IF EXISTS "Only admins can create internships" ON public.internships;
CREATE POLICY "Only admins can create internships"
    ON public.internships FOR INSERT
    WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Only admins can update internships" ON public.internships;
CREATE POLICY "Only admins can update internships"
    ON public.internships FOR UPDATE
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Only admins can delete internships" ON public.internships;
CREATE POLICY "Only admins can delete internships"
    ON public.internships FOR DELETE
    USING (public.is_admin());

-- Saved Internships Policies
DROP POLICY IF EXISTS "Students can view their own saved internships" ON public.saved_internships;
CREATE POLICY "Students can view their own saved internships"
    ON public.saved_internships FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Students can save internships" ON public.saved_internships;
CREATE POLICY "Students can save internships"
    ON public.saved_internships FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Students can update their saved internship status" ON public.saved_internships;
CREATE POLICY "Students can update their saved internship status"
    ON public.saved_internships FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Students can remove saved internships" ON public.saved_internships;
CREATE POLICY "Students can remove saved internships"
    ON public.saved_internships FOR DELETE
    USING (auth.uid() = user_id);

-- Collection Runs Policies
DROP POLICY IF EXISTS "Public can view collection run logs" ON public.collection_runs;
CREATE POLICY "Public can view collection run logs"
    ON public.collection_runs FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Admins or service workers can insert collection runs" ON public.collection_runs;
CREATE POLICY "Admins or service workers can insert collection runs"
    ON public.collection_runs FOR INSERT
    WITH CHECK (public.is_admin());

-- Reports Policies
DROP POLICY IF EXISTS "Anyone or authenticated students can submit reports" ON public.reports;
CREATE POLICY "Anyone or authenticated students can submit reports"
    ON public.reports FOR INSERT
    WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can view and manage all reports" ON public.reports;
CREATE POLICY "Admins can view and manage all reports"
    ON public.reports FOR SELECT
    USING (public.is_admin() OR auth.uid() = reporter_id);

DROP POLICY IF EXISTS "Admins can update reports" ON public.reports;
CREATE POLICY "Admins can update reports"
    ON public.reports FOR UPDATE
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- Opportunity Change Logs Policies
DROP POLICY IF EXISTS "Admins can view opportunity change logs" ON public.opportunity_change_logs;
CREATE POLICY "Admins can view opportunity change logs"
    ON public.opportunity_change_logs FOR SELECT
    USING (public.is_admin());

DROP POLICY IF EXISTS "Admins and service role can insert change logs" ON public.opportunity_change_logs;
CREATE POLICY "Admins and service role can insert change logs"
    ON public.opportunity_change_logs FOR INSERT
    WITH CHECK (public.is_admin());

-- ------------------------------------------------------------------------------
-- 13. SEED INITIAL TRUSTED SOURCES
-- ------------------------------------------------------------------------------
INSERT INTO public.sources (id, name, official_domain, source_category, source_type, opportunity_page_url, monitoring_method, status, verification_notes)
VALUES
('00000000-0000-0000-0000-000000000001', 'IIT Madras (Indian Institute of Technology Madras)', 'sfp.iitm.ac.in', 'IIT', 'Public Institution', 'https://sfp.iitm.ac.in', 'HTML Scraping', 'active', 'Official portal for Summer Fellowship Programme verified via institutional domain.'),
('00000000-0000-0000-0000-000000000002', 'IIT Bombay (Indian Institute of Technology Bombay)', 'iitb.ac.in', 'IIT', 'Public Institution', 'https://www.iitb.ac.in/en/education/summer-internship', 'HTML Scraping', 'active', 'Centralized and department-level research internship announcements verified.'),
('00000000-0000-0000-0000-000000000003', 'IIT Roorkee (SPARK Programme)', 'spark.iitr.ac.in', 'IIT', 'Public Institution', 'https://spark.iitr.ac.in', 'API', 'active', 'SPARK portal provides structured application windows and fellowship stipends.'),
('00000000-0000-0000-0000-000000000004', 'Indian Institute of Science (IISc Bangalore)', 'iisc.ac.in', 'IISc / IISER', 'Autonomous Govt Body', 'https://iisc.ac.in/admissions/summer-research-fellowship-programme', 'RSS', 'active', 'Jointly administered with Indian Academy of Sciences (IASc-INSA-NASI).'),
('00000000-0000-0000-0000-000000000005', 'CSIR (Council of Scientific and Industrial Research)', 'csir.res.in', 'Research Lab / PSU', 'Research Council', 'https://www.csir.res.in/career-opportunities/internship', 'RSS', 'active', 'National network of 37 national laboratories offering summer research training.'),
('00000000-0000-0000-0000-000000000006', 'NITI Aayog (National Institution for Transforming India)', 'niti.gov.in', 'Government Ministry', 'Ministry', 'https://niti.gov.in/internship', 'API', 'active', 'Monthly window for undergraduate and postgraduate interns.'),
('00000000-0000-0000-0000-000000000007', 'Reserve Bank of India (RBI)', 'rbi.org.in', 'Research Lab / PSU', 'Autonomous Govt Body', 'https://opportunities.rbi.org.in/scripts/summer.aspx', 'HTML Scraping', 'active', 'RBI Summer Placement for domestic students in economics, finance, banking.'),
('00000000-0000-0000-0000-000000000008', 'Microsoft Research India (MSR India)', 'microsoft.com', 'Corporate / Tech', 'Enterprise', 'https://www.microsoft.com/en-us/research/lab/microsoft-research-india/opportunities/', 'Manual Verification', 'active', 'Research Fellow and Research Intern program in Bengaluru lab.')
ON CONFLICT (official_domain) DO NOTHING;
