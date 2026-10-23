-- ==============================================================================
-- Migration: 20261023000002_add_verification_audit_metadata.sql
-- Add link verification, application statuses, and structured eligibility criteria
-- ==============================================================================

-- 1. Extend profiles with academic verification attributes
ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS institution_type TEXT DEFAULT 'other',
    ADD COLUMN IF NOT EXISTS cgpa NUMERIC DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS cgpa_scale NUMERIC DEFAULT 10,
    ADD COLUMN IF NOT EXISTS class_12_percentage NUMERIC DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS citizenship TEXT DEFAULT 'Indian';

-- 2. Extend internships with verification and eligibility metadata
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
    ADD COLUMN IF NOT EXISTS verification_notes TEXT;

-- 3. Relax / Update constraints for verification status
ALTER TABLE public.internships
    DROP CONSTRAINT IF EXISTS internships_verification_status_check;

ALTER TABLE public.internships
    ADD CONSTRAINT internships_verification_status_check
    CHECK (verification_status IN ('official_verified', 'source_checked', 'pending_verification', 'unverified'));

-- 4. Add constraints for new statuses
ALTER TABLE public.internships
    DROP CONSTRAINT IF EXISTS internships_link_status_check;

ALTER TABLE public.internships
    ADD CONSTRAINT internships_link_status_check
    CHECK (link_status IN ('working', 'redirected', 'temporarily_unavailable', 'unreachable', 'access_restricted', 'needs_manual_verification', 'invalid_url'));

ALTER TABLE public.internships
    DROP CONSTRAINT IF EXISTS internships_application_status_check;

ALTER TABLE public.internships
    ADD CONSTRAINT internships_application_status_check
    CHECK (application_status IN ('upcoming', 'open', 'closing_soon', 'closed', 'status_unconfirmed'));

ALTER TABLE public.internships
    DROP CONSTRAINT IF EXISTS internships_eligibility_verification_status_check;

ALTER TABLE public.internships
    ADD CONSTRAINT internships_eligibility_verification_status_check
    CHECK (eligibility_verification_status IN ('verified', 'partial', 'unconfirmed'));

ALTER TABLE public.internships
    DROP CONSTRAINT IF EXISTS internships_review_status_check;

ALTER TABLE public.internships
    ADD CONSTRAINT internships_review_status_check
    CHECK (review_status IN ('approved', 'pending_review', 'flagged', 'archived'));

-- 5. Add helpful indexes for filtering and admin queries
CREATE INDEX IF NOT EXISTS idx_internships_link_status ON public.internships(link_status);
CREATE INDEX IF NOT EXISTS idx_internships_app_status ON public.internships(application_status);
CREATE INDEX IF NOT EXISTS idx_internships_review_status ON public.internships(review_status);
CREATE INDEX IF NOT EXISTS idx_internships_eligibility_status ON public.internships(eligibility_verification_status);
