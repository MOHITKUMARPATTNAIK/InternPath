-- ==============================================================================
-- InternPath (InternHub) - Seed Internships Repair Script
-- File: supabase/seed_internships_repair.sql
--
-- Purpose:
--   Populates the 5 baseline verified Indian internship opportunities from
--   supabase/migrations/20261023000001_seed_sources_and_internships.sql into
--   public.internships without altering tables, policies, triggers, or permissions.
--
-- Safety Guarantees:
--   1. Validates that all referenced source UUIDs exist in public.sources.
--      If any source is missing, the transaction halts with a clear error.
--   2. Uses exact opportunity data and source UUIDs from the baseline migration.
--   3. Uses valid PostgreSQL UUIDs for primary keys.
--   4. Uses ON CONFLICT (id) DO NOTHING (idempotent, safe to run multiple times).
--   5. Pure DML (data manipulation only): No CREATE, DROP, or ALTER statements.
--   6. Concludes with a verification query to inspect the seeded records.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. PRE-CHECK: VERIFY REFERENCED SOURCES EXIST IN public.sources
-- ------------------------------------------------------------------------------
DO $$
DECLARE
    missing_sources TEXT;
    required_uuids UUID[] := ARRAY[
        '00000000-0000-0000-0000-000000000001'::uuid, -- IIT Madras
        '00000000-0000-0000-0000-000000000003'::uuid, -- IIT Roorkee
        '00000000-0000-0000-0000-000000000004'::uuid, -- Indian Institute of Science (IISc)
        '00000000-0000-0000-0000-000000000006'::uuid, -- NITI Aayog
        '00000000-0000-0000-0000-000000000007'::uuid  -- Reserve Bank of India (RBI)
    ];
BEGIN
    SELECT string_agg(u::text, ', ')
    INTO missing_sources
    FROM unnest(required_uuids) AS u
    WHERE NOT EXISTS (
        SELECT 1 FROM public.sources s WHERE s.id = u
    );

    IF missing_sources IS NOT NULL AND missing_sources <> '' THEN
        RAISE EXCEPTION 'Aborting seed insert: Required source UUID(s) not found in public.sources: %. Please ensure public.sources has been seeded before inserting opportunities.', missing_sources;
    END IF;
END;
$$;

-- ------------------------------------------------------------------------------
-- 2. INSERT 5 BASELINE VERIFIED INTERNSHIP OPPORTUNITIES
-- ------------------------------------------------------------------------------
INSERT INTO public.internships (
    id, title, organization, department, source_id, description,
    eligible_disciplines, min_education_level, eligible_years, required_skills,
    stipend_amount, stipend_currency, stipend_frequency, stipend_status,
    duration, application_opening_date, application_deadline, location, format,
    required_documents, benefits, official_application_url, original_source_url,
    publication_status, verification_status, is_demo
) VALUES
(
    '10000000-0000-0000-0000-000000000001',
    'IIT Madras Summer Fellowship Programme (SFP)',
    'Indian Institute of Technology Madras',
    'Departments of Aerospace, BioTech, CSE, EE, Mechanical & Sciences',
    '00000000-0000-0000-0000-000000000001',
    'The IIT Madras Summer Fellowship Programme is designed to encourage talented undergraduate students from outside IITs to carry out innovative research projects under the guidance of esteemed faculty members. Selected fellows spend two months working in cutting-edge laboratory facilities.',
    ARRAY['Engineering and Technology', 'Computer Science and IT', 'Biotechnology and Life Sciences', 'Pure Sciences and Research'],
    'Undergraduate (3rd Year B.Tech/B.E, or 1st Year M.Sc/M.A)',
    ARRAY['3rd Year', '4th Year'],
    ARRAY['Problem Solving', 'Subject Fundamentals', 'Research Methodology', 'Python / MATLAB / C++'],
    6000, 'INR', 'per month', 'paid',
    '2 Months (May - July)', '2026-11-01', '2026-12-15', 'Chennai, Tamil Nadu', 'onsite',
    ARRAY['Bonafide Certificate / NOC signed by Head of Institution', 'Consolidated Grade Card / Transcripts', 'Resume / Curriculum Vitae'],
    ARRAY['Monthly stipend of INR 6,000 for 2 months', 'Subsidized hostel accommodation on IIT Madras campus', 'Access to central research facilities and Central Library', 'Official Certificate of Completion from IIT Madras'],
    'https://sfp.iitm.ac.in', 'https://sfp.iitm.ac.in/fellowship_guidelines.pdf',
    'published', 'official_verified', FALSE
),
(
    '10000000-0000-0000-0000-000000000002',
    'SPARK Summer Internship Programme 2026',
    'IIT Roorkee',
    'All Engineering, Architecture, Sciences & Management Departments',
    '00000000-0000-0000-0000-000000000003',
    'SPARK is a premier research internship programme by IIT Roorkee to attract students with an outstanding academic record. Interns work with faculty on frontier projects ranging from artificial intelligence and quantum materials to sustainable civil infrastructure.',
    ARRAY['Engineering and Technology', 'Computer Science and IT', 'Pure Sciences and Research', 'Design and Creative', 'Business and Management'],
    'B.Tech/B.E/B.Arch/Integrated M.Sc (CGPA > 7.5 or 8.0 for non-IITs/NITs)',
    ARRAY['2nd Year', '3rd Year', '4th Year'],
    ARRAY['Analytical Skills', 'Domain Fundamentals', 'Programming / CAD / Lab Techniques'],
    2500, 'INR', 'per week', 'paid',
    '6 to 8 Weeks', '2026-10-15', '2026-11-30', 'Roorkee, Uttarakhand', 'onsite',
    ARRAY['No Objection Certificate (NOC) on institutional letterhead', 'Official Academic Transcripts', '500-word Statement of Research Purpose'],
    ARRAY['Weekly fellowship of INR 2,500', 'Campus hostel accommodation provided', 'Research mentorship and lab resources'],
    'https://spark.iitr.ac.in', 'https://spark.iitr.ac.in/guidelines',
    'published', 'official_verified', FALSE
),
(
    '10000000-0000-0000-0000-000000000003',
    'NITI Aayog Undergraduate Internship Scheme',
    'NITI Aayog (Government of India)',
    'Policy Verticals: Education, Health, Agriculture, Economics, Infrastructure, AI & Governance',
    '00000000-0000-0000-0000-000000000006',
    'The NITI Aayog Internship Scheme allows undergraduate and postgraduate students from recognized universities in India and abroad to closely understand the functioning of the Government of India and contribute to public policy formulation, sectoral research, and governance reforms.',
    ARRAY['Commerce and Finance', 'Business and Management', 'Engineering and Technology', 'Computer Science and IT', 'Law', 'Arts and Humanities', 'Medical and Healthcare', 'Agriculture and Environmental Sciences'],
    'Undergraduate student who has appeared in 2nd year / 4th semester exams with >= 85% in Class 12',
    ARRAY['2nd Year', '3rd Year', '4th Year', 'Final Year'],
    ARRAY['Policy Analysis', 'Report Writing', 'Data Interpretation', 'MS Office / Excel / Statistical Tools'],
    NULL, 'INR', NULL, 'unpaid',
    '6 Weeks to 6 Months', '2026-10-01', '2026-11-10', 'New Delhi (NITI Bhawan)', 'onsite',
    ARRAY['College NOC / Recommendation Form strictly as per NITI Annexure-A', 'Class 12 Marksheet with >= 85%', 'College Semester Marksheets'],
    ARRAY['Direct exposure to national developmental policy decisions', 'Mentorship from Advisors and Senior Specialists at NITI Aayog', 'Government of India Certificate of Internship'],
    'https://niti.gov.in/internship', 'https://niti.gov.in/guidelines-internship-scheme',
    'published', 'official_verified', FALSE
),
(
    '10000000-0000-0000-0000-000000000004',
    'Reserve Bank of India (RBI) Summer Placement',
    'Reserve Bank of India',
    'Monetary Policy, Economic Research, Financial Markets & Banking Regulation',
    '00000000-0000-0000-0000-000000000007',
    'The RBI Summer Placement provides a prestigious opportunity for domestic students pursuing courses in economics, finance, banking, data analytics, and law to undertake research projects under the supervision of senior RBI economists and central bankers across regional offices.',
    ARRAY['Commerce and Finance', 'Business and Management', 'Pure Sciences and Research', 'Computer Science and IT', 'Law'],
    'Penultimate year of 3-year or 4-year degree (B.Com/B.Sc/Economics/Law/B.Tech)',
    ARRAY['2nd Year', '3rd Year', '4th Year'],
    ARRAY['Macroeconomics', 'Financial Modeling', 'Econometrics', 'Python / R / Stata', 'Quantitative Research'],
    20000, 'INR', 'per month', 'paid',
    '3 Months (April - July)', '2026-10-15', '2026-12-15', 'Mumbai / Delhi / Kolkata / Chennai (Regional Offices)', 'onsite',
    ARRAY['Official nomination from college / university principal', 'Curriculum Vitae', 'Semester Grade Cards'],
    ARRAY['Monthly stipend of INR 20,000', 'Second class return railway fare reimbursement', 'Hands-on exposure to India’s central banking and financial regulatory framework'],
    'https://opportunities.rbi.org.in/scripts/summer.aspx', 'https://opportunities.rbi.org.in/scripts/summer_instructions.aspx',
    'published', 'official_verified', FALSE
),
(
    '10000000-0000-0000-0000-000000000005',
    'IISc Summer Research Fellowship Programme (SRFP)',
    'Indian Institute of Science (IISc Bangalore)',
    'Division of Biological, Chemical, Physical & Mathematical Sciences',
    '00000000-0000-0000-0000-000000000004',
    'Jointly offered by the three National Science Academies and IISc Bangalore, the SRFP is the most coveted science fellowship in India. Selected fellows are matched with academy fellows for two months of rigorous experimental and theoretical laboratory work.',
    ARRAY['Pure Sciences and Research', 'Biotechnology and Life Sciences', 'Engineering and Technology'],
    '2nd or 3rd year B.Sc / B.Tech / Integrated M.Sc with consistent 1st Class',
    ARRAY['2nd Year', '3rd Year'],
    ARRAY['Scientific Inquiry', 'Experimental Laboratory Practices', 'Literature Survey', 'Data Analysis'],
    12500, 'INR', 'per month', 'paid',
    '8 Weeks', '2026-10-10', '2026-11-25', 'Bengaluru, Karnataka', 'onsite',
    ARRAY['Recommendation letter from teacher / professor (online upload)', 'Class 10, 12 and University Grade Sheets', '200-word write-up on what you wish to learn'],
    ARRAY['Round-trip train travel allowance (Sleeper/AC 3-Tier)', 'Monthly fellowship of INR 12,500', 'Hostel accommodation on IISc or partner campus'],
    'https://web-japps.ias.ac.in/fellowship2026/', 'https://iisc.ac.in/admissions/summer-research-fellowship-programme',
    'published', 'official_verified', FALSE
)
ON CONFLICT (id) DO NOTHING;

-- ------------------------------------------------------------------------------
-- 3. VERIFICATION QUERY: CONFIRM SEEDED OPPORTUNITIES IN public.internships
-- ------------------------------------------------------------------------------
SELECT
    i.id AS internship_id,
    i.title,
    i.organization,
    s.name AS source_institution,
    i.stipend_amount,
    i.stipend_currency,
    i.stipend_status,
    i.duration,
    i.application_opening_date,
    i.application_deadline,
    i.format,
    i.publication_status,
    i.verification_status
FROM public.internships i
JOIN public.sources s ON i.source_id = s.id
WHERE i.id IN (
    '10000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000002',
    '10000000-0000-0000-0000-000000000003',
    '10000000-0000-0000-0000-000000000004',
    '10000000-0000-0000-0000-000000000005'
)
ORDER BY i.id ASC;
