-- ==============================================================================
-- InternPath (InternHub) - PostgreSQL Database Schema & Row-Level Security
-- Trusted Internship Discovery Platform for India
-- ==============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------------------------------------------
-- 1. PROFILES TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name TEXT NOT NULL,
    email TEXT NOT NULL,
    college TEXT,
    degree TEXT,
    academic_year TEXT,
    academic_background TEXT NOT NULL DEFAULT 'Engineering and Technology',
    primary_interest TEXT NOT NULL DEFAULT 'General',
    secondary_interests TEXT[] DEFAULT '{}',
    skills TEXT[] DEFAULT '{}',
    career_goals TEXT,
    preferred_format TEXT NOT NULL DEFAULT 'Any' CHECK (preferred_format IN ('Any', 'Remote', 'Onsite', 'Hybrid')),
    preferred_locations TEXT[] DEFAULT '{}',
    min_stipend_preference NUMERIC DEFAULT 0,
    duration_preference TEXT,
    role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'admin')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index on role for fast permission checks
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- ------------------------------------------------------------------------------
-- 2. SOURCES TABLE (Trusted Indian Institutions & Organizations)
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
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sources_status ON public.sources(status);
CREATE INDEX IF NOT EXISTS idx_sources_category ON public.sources(source_category);

-- ------------------------------------------------------------------------------
-- 3. INTERNSHIPS TABLE
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
        verification_status IN ('official_verified', 'source_checked', 'pending_verification')
    ),
    is_demo BOOLEAN NOT NULL DEFAULT FALSE,
    published_at TIMESTAMPTZ DEFAULT NOW(),
    last_verified_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Search and filter indexes
CREATE INDEX IF NOT EXISTS idx_internships_pub_status ON public.internships(publication_status);
CREATE INDEX IF NOT EXISTS idx_internships_deadline ON public.internships(application_deadline);
CREATE INDEX IF NOT EXISTS idx_internships_stipend_status ON public.internships(stipend_status);
CREATE INDEX IF NOT EXISTS idx_internships_format ON public.internships(format);
CREATE INDEX IF NOT EXISTS idx_internships_disciplines ON public.internships USING GIN (eligible_disciplines);
CREATE INDEX IF NOT EXISTS idx_internships_skills ON public.internships USING GIN (required_skills);

-- ------------------------------------------------------------------------------
-- 4. SAVED INTERNSHIPS TABLE
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
-- 5. COLLECTION RUNS TABLE (Automation & Pipeline Monitoring)
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
    error_summary TEXT
);

CREATE INDEX IF NOT EXISTS idx_collection_runs_started ON public.collection_runs(started_at DESC);

-- ------------------------------------------------------------------------------
-- 6. REPORTS TABLE (User Feedback / Quality Assurance)
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
-- 7. AUTOMATIC TIMESTAMP UPDATE TRIGGER
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

CREATE TRIGGER set_sources_updated_at
BEFORE UPDATE ON public.sources
FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

CREATE TRIGGER set_internships_updated_at
BEFORE UPDATE ON public.internships
FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

CREATE TRIGGER set_saved_internships_updated_at
BEFORE UPDATE ON public.saved_internships
FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

CREATE TRIGGER set_reports_updated_at
BEFORE UPDATE ON public.reports
FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- ------------------------------------------------------------------------------
-- 8. ROW LEVEL SECURITY (RLS) POLICIES
-- ------------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.internships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_internships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collection_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- Helper function to check if current user is an admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- PROFILES POLICIES
CREATE POLICY "Users can view their own profile or admins can view all"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id OR public.is_admin());

CREATE POLICY "Users can update their own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id OR public.is_admin())
    WITH CHECK (auth.uid() = id OR public.is_admin());

CREATE POLICY "Users can insert their own profile on signup"
    ON public.profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

-- SOURCES POLICIES
CREATE POLICY "Everyone can read trusted sources"
    ON public.sources FOR SELECT
    USING (true);

CREATE POLICY "Only admins can modify sources"
    ON public.sources FOR ALL
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- INTERNSHIPS POLICIES
CREATE POLICY "Public can view published internships"
    ON public.internships FOR SELECT
    USING (publication_status = 'published' OR public.is_admin());

CREATE POLICY "Only admins can create internships"
    ON public.internships FOR INSERT
    WITH CHECK (public.is_admin());

CREATE POLICY "Only admins can update internships"
    ON public.internships FOR UPDATE
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

CREATE POLICY "Only admins can delete internships"
    ON public.internships FOR DELETE
    USING (public.is_admin());

-- SAVED INTERNSHIPS POLICIES
CREATE POLICY "Students can view their own saved internships"
    ON public.saved_internships FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Students can save internships"
    ON public.saved_internships FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Students can update their saved internship status"
    ON public.saved_internships FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Students can remove saved internships"
    ON public.saved_internships FOR DELETE
    USING (auth.uid() = user_id);

-- COLLECTION RUNS POLICIES
CREATE POLICY "Public can view collection run logs"
    ON public.collection_runs FOR SELECT
    USING (true);

CREATE POLICY "Admins or service workers can insert collection runs"
    ON public.collection_runs FOR INSERT
    WITH CHECK (public.is_admin());

-- REPORTS POLICIES
CREATE POLICY "Anyone or authenticated students can submit reports"
    ON public.reports FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Admins can view and manage all reports"
    ON public.reports FOR SELECT
    USING (public.is_admin() OR auth.uid() = reporter_id);

CREATE POLICY "Admins can update reports"
    ON public.reports FOR UPDATE
    USING (public.is_admin())
    WITH CHECK (public.is_admin());
