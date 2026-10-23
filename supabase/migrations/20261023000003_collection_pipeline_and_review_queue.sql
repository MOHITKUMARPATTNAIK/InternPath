-- ==============================================================================
-- Migration: 20261023000003_collection_pipeline_and_review_queue.sql
-- Automated collection pipeline, deduplication fingerprints, and review queue
-- ==============================================================================

-- 1. Extend sources table with scheduling & error tracking
ALTER TABLE public.sources
    ADD COLUMN IF NOT EXISTS enabled BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS collection_frequency TEXT NOT NULL DEFAULT 'daily',
    ADD COLUMN IF NOT EXISTS last_attempted_check TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS last_successful_check TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS next_scheduled_check TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS last_error TEXT,
    ADD COLUMN IF NOT EXISTS source_config JSONB DEFAULT '{}'::jsonb;

-- Add check constraint for collection frequency
ALTER TABLE public.sources
    DROP CONSTRAINT IF EXISTS sources_collection_frequency_check;

ALTER TABLE public.sources
    ADD CONSTRAINT sources_collection_frequency_check
    CHECK (collection_frequency IN ('daily', 'twice_daily', 'weekly', 'hourly'));

CREATE INDEX IF NOT EXISTS idx_sources_enabled ON public.sources(enabled);
CREATE INDEX IF NOT EXISTS idx_sources_next_scheduled ON public.sources(next_scheduled_check);

-- 2. Extend internships with canonical URL and deduplication fingerprint
ALTER TABLE public.internships
    ADD COLUMN IF NOT EXISTS canonical_url TEXT,
    ADD COLUMN IF NOT EXISTS data_fingerprint TEXT;

CREATE INDEX IF NOT EXISTS idx_internships_fingerprint ON public.internships(data_fingerprint);
CREATE INDEX IF NOT EXISTS idx_internships_canonical_url ON public.internships(canonical_url);

-- 3. Extend collection_runs with metrics
ALTER TABLE public.collection_runs
    ADD COLUMN IF NOT EXISTS records_skipped INT NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS records_pending_review INT NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS duration_ms INT NOT NULL DEFAULT 0;

-- 4. Create opportunity change logs table for auditability
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

-- 5. Row-Level Security for Change Logs and Collection Runs
ALTER TABLE public.opportunity_change_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collection_runs ENABLE ROW LEVEL SECURITY;

-- Change logs read policy: Authenticated admins can view audit logs
DROP POLICY IF EXISTS "Admins can view opportunity change logs" ON public.opportunity_change_logs;
CREATE POLICY "Admins can view opportunity change logs"
    ON public.opportunity_change_logs
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );

-- Change logs write policy: Only service role or admins can write logs
DROP POLICY IF EXISTS "Admins and service role can insert change logs" ON public.opportunity_change_logs;
CREATE POLICY "Admins and service role can insert change logs"
    ON public.opportunity_change_logs
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );
