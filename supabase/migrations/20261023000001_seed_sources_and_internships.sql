-- ==============================================================================
-- InternPath (InternHub) - Seed Data for Trusted Sources & Verified Internships
-- ==============================================================================

-- 1. Insert Initial Trusted Sources
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

-- 2. Insert Initial Verified Internships
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
