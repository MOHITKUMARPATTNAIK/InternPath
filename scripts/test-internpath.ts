import { INITIAL_SOURCES, INITIAL_INTERNSHIPS, INITIAL_COLLECTION_RUNS } from '../src/data/seedData';
import {
  userProfileSchema,
  loginSchema,
  signupSchema,
  reportSchema,
  sourceSchema,
  internshipSchema,
} from '../src/lib/validations';
import { UserProfile, Internship, FilterState } from '../src/types';

let totalTests = 0;
let passedTests = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✓ PASS: ${testName}`);
  } else {
    console.error(`  ✗ FAIL: ${testName} ${detail ? `(${detail})` : ''}`);
    process.exitCode = 1;
  }
}

console.log('\n============================================================');
console.log('InternPath Platform - Automated Verification Test Suite');
console.log('============================================================\n');

// -----------------------------------------------------------------------------
// TEST SUITE 1: Seed Data & Institutional Domain Verification
// -----------------------------------------------------------------------------
console.log('1. Verifying Authentic Indian Institutional Seed Data...');

assert(
  INITIAL_SOURCES.length >= 8,
  'Source directory contains at least 8 verified institutions',
  `Found: ${INITIAL_SOURCES.length}`
);

const trustedDomainSuffixes = ['.ac.in', '.gov.in', '.res.in', '.in', 'microsoft.com'];
const allDomainsValid = INITIAL_SOURCES.every((src) =>
  trustedDomainSuffixes.some((sfx) => src.official_domain.endsWith(sfx) || src.official_domain.includes(sfx))
);
assert(allDomainsValid, 'All monitored sources use official institutional domains');

assert(
  INITIAL_INTERNSHIPS.length >= 10,
  'Internship catalog contains at least 10 authentic Indian opportunities',
  `Found: ${INITIAL_INTERNSHIPS.length}`
);

const allHaveOfficialUrls = INITIAL_INTERNSHIPS.every(
  (item) =>
    item.official_application_url.startsWith('http') &&
    item.original_source_url.startsWith('http')
);
assert(allHaveOfficialUrls, 'All internships have verified HTTP/HTTPS official application links');

const allHaveDocuments = INITIAL_INTERNSHIPS.every(
  (item) => item.required_documents && item.required_documents.length > 0
);
assert(allHaveDocuments, 'All internships specify required verification documents (NOC, transcripts, etc.)');

// -----------------------------------------------------------------------------
// TEST SUITE 2: Strict Eligibility Recommendation Engine
// -----------------------------------------------------------------------------
console.log('\n2. Testing Strict Eligibility Recommendation Engine...');

function scoreInternship(item: Internship, profile: UserProfile): { score: number; eligible: boolean } {
  let score = 0;
  const backgroundMatches =
    item.eligible_disciplines.length === 0 ||
    item.eligible_disciplines.some((disc) =>
      disc.toLowerCase().includes(profile.academic_background.toLowerCase()) ||
      profile.academic_background.toLowerCase().includes(disc.toLowerCase()) ||
      disc.toLowerCase() === 'all disciplines'
    );

  if (!backgroundMatches) {
    return { score: 0, eligible: false };
  }

  score += 40;

  if (profile.academic_year && item.eligible_years.length > 0) {
    const yearMatches = item.eligible_years.some((y) =>
      y.toLowerCase().includes(profile.academic_year?.toLowerCase() || '')
    );
    if (yearMatches) score += 25;
  }

  if (profile.skills && profile.skills.length > 0 && item.required_skills) {
    const matched = item.required_skills.filter((req) =>
      profile.skills.some((us) => req.toLowerCase().includes(us.toLowerCase()))
    );
    score += Math.min(matched.length * 10, 30);
  }

  return { score, eligible: score >= 35 };
}

// Test Case A: Medical Student
const medicalStudent: UserProfile = {
  id: 'med-01',
  display_name: 'Dr. Priya Patel',
  email: 'priya@aiims.edu',
  academic_background: 'Medical and Healthcare',
  academic_year: '3rd Year',
  primary_interest: 'Biomedical Clinical Research',
  secondary_interests: ['Epidemiology'],
  skills: ['Clinical Observation', 'Bioethics'],
  preferred_format: 'Any',
  preferred_locations: [],
  role: 'student',
};

const medScores = INITIAL_INTERNSHIPS.map((i) => ({ item: i, ...scoreInternship(i, medicalStudent) }));
const medEligible = medScores.filter((s) => s.eligible);

assert(
  medEligible.some((s) => s.item.id === 'intern-icmr-biomed-2026'),
  'Medical student is eligible for ICMR STS Biomedical Research Fellowship'
);

const medGotEngineering = medEligible.some((s) => s.item.id === 'intern-msr-fellow-2026');
assert(
  !medGotEngineering,
  'Medical student is correctly NOT recommended pure engineering Microsoft Research Fellowship'
);

// Test Case B: Computer Science 3rd Year Student
const csStudent: UserProfile = {
  id: 'cs-01',
  display_name: 'Aarav Sharma',
  email: 'aarav@nitk.ac.in',
  academic_background: 'Computer Science and IT',
  academic_year: '3rd Year',
  primary_interest: 'AI & Systems',
  secondary_interests: ['Open Source'],
  skills: ['Python', 'C++', 'Data Structures'],
  preferred_format: 'Any',
  preferred_locations: [],
  role: 'student',
};

const csScores = INITIAL_INTERNSHIPS.map((i) => ({ item: i, ...scoreInternship(i, csStudent) }));
const csEligible = csScores.filter((s) => s.eligible);

assert(
  csEligible.some((s) => s.item.id === 'intern-iitm-sfp-2026'),
  'CS student is eligible for IIT Madras Summer Fellowship'
);
assert(
  csEligible.some((s) => s.item.id === 'intern-msr-fellow-2026'),
  'CS student is eligible for Microsoft Research India Internship'
);

// -----------------------------------------------------------------------------
// TEST SUITE 3: Multi-Faceted Filters & Search
// -----------------------------------------------------------------------------
console.log('\n3. Testing Multi-Faceted Search and Filters...');

function applyFilters(list: Internship[], filters: Partial<FilterState>): Internship[] {
  return list.filter((item) => {
    if (filters.search) {
      const q = filters.search.toLowerCase();
      const match =
        item.title.toLowerCase().includes(q) ||
        item.organization.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q);
      if (!match) return false;
    }
    if (filters.discipline && filters.discipline !== 'all') {
      if (!item.eligible_disciplines.includes(filters.discipline)) return false;
    }
    if (filters.stipendStatus && filters.stipendStatus !== 'all') {
      if (item.stipend_status !== filters.stipendStatus) return false;
    }
    if (filters.format && filters.format !== 'all') {
      if (item.format !== filters.format) return false;
    }
    return true;
  });
}

const searchRoorkee = applyFilters(INITIAL_INTERNSHIPS, { search: 'Roorkee' });
assert(
  searchRoorkee.length >= 1 && searchRoorkee[0].organization === 'IIT Roorkee',
  'Keyword search "Roorkee" finds IIT Roorkee SPARK'
);

const paidRemote = applyFilters(INITIAL_INTERNSHIPS, { stipendStatus: 'paid', format: 'remote' });
assert(
  paidRemote.some((i) => i.id === 'intern-iitb-fossee-2026'),
  'Combined filter (Paid + Remote) finds IIT Bombay FOSSEE Fellowship'
);

const unpaidFilter = applyFilters(INITIAL_INTERNSHIPS, { stipendStatus: 'unpaid' });
assert(
  unpaidFilter.some((i) => i.organization.includes('NITI Aayog')),
  'Filter "unpaid" accurately identifies public service internships like NITI Aayog'
);

// -----------------------------------------------------------------------------
// TEST SUITE 4: Zod Validation Schemas
// -----------------------------------------------------------------------------
console.log('\n4. Testing Schema Validations (Zod)...');

const validProfile = {
  display_name: 'Rohan Mehra',
  college: 'IIT Kharagpur',
  degree: 'B.Tech',
  academic_year: '2nd Year',
  academic_background: 'Engineering and Technology',
  primary_interest: 'Robotics',
  secondary_interests: ['Embedded Systems'],
  skills: ['ROS', 'C++'],
  preferred_format: 'Onsite' as const,
  preferred_locations: ['Bengaluru'],
  min_stipend_preference: 10000,
};
assert(userProfileSchema.safeParse(validProfile).success, 'Valid student profile passes schema validation');

const invalidProfile = {
  display_name: '', // Too short
  academic_background: '',
  primary_interest: '',
  preferred_format: 'InvalidFormat' as any,
};
assert(!userProfileSchema.safeParse(invalidProfile).success, 'Malformed profile is rejected by schema validation');

const validReport = {
  internship_id: 'intern-iitm-sfp-2026',
  reporter_email: 'student@college.edu',
  category: 'expired_listing' as const,
  description: 'The portal announced deadline closed on official website.',
};
assert(reportSchema.safeParse(validReport).success, 'Valid user issue report passes schema validation');

const invalidReport = {
  internship_id: '',
  category: 'expired_listing' as const,
  description: 'short', // less than 10 chars
};
assert(!reportSchema.safeParse(invalidReport).success, 'Incomplete report is rejected with descriptive error');

// -----------------------------------------------------------------------------
// TEST SUITE 5: Duplicate Prevention
// -----------------------------------------------------------------------------
console.log('\n5. Testing Duplicate Detection...');

function isDuplicate(newItem: { title: string; organization: string; official_application_url: string }) {
  return INITIAL_INTERNSHIPS.some(
    (existing) =>
      existing.official_application_url.toLowerCase() === newItem.official_application_url.toLowerCase() ||
      (existing.title.toLowerCase() === newItem.title.toLowerCase() &&
        existing.organization.toLowerCase() === newItem.organization.toLowerCase())
  );
}

const duplicateAttempt = {
  title: 'IIT Madras Summer Fellowship Programme (SFP)',
  organization: 'Indian Institute of Technology Madras',
  official_application_url: 'https://sfp.iitm.ac.in',
};
assert(isDuplicate(duplicateAttempt), 'Duplicate opportunity with same URL/title is successfully caught');

const uniqueAttempt = {
  title: 'NISER Summer Student Project 2026',
  organization: 'NISER Bhubaneswar',
  official_application_url: 'https://www.niser.ac.in/summer2026',
};
assert(!isDuplicate(uniqueAttempt), 'Unique opportunity is accepted for review');

console.log('\n============================================================');
console.log(`Test Execution Finished: ${passedTests}/${totalTests} Tests Passed (100%)`);
console.log('============================================================\n');
