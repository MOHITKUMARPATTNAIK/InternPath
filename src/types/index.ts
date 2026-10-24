export type SourceCategory =
  | 'IIT'
  | 'NIT'
  | 'IIIT'
  | 'IISc / IISER'
  | 'Research Lab / PSU'
  | 'Government Ministry'
  | 'Public Fellowship'
  | 'Corporate / Tech'
  | 'Other';

export type SourceType =
  | 'Public Institution'
  | 'Autonomous Govt Body'
  | 'Ministry'
  | 'Research Council'
  | 'Enterprise'
  | 'Other';

export type MonitoringMethod = 'API' | 'RSS' | 'HTML Scraping' | 'Manual Verification';

export type SourceStatus = 'active' | 'maintenance' | 'review_needed';

export type CollectionFrequency = 'daily' | 'twice_daily' | 'weekly' | 'hourly';

export interface Source {
  id: string;
  name: string;
  official_domain: string;
  source_category: SourceCategory;
  source_type: SourceType;
  opportunity_page_url: string;
  monitoring_method: MonitoringMethod;
  last_checked: string;
  status: SourceStatus;
  verification_notes?: string;
  enabled?: boolean;
  collection_frequency?: CollectionFrequency;
  last_successful_check?: string | null;
  last_attempted_check?: string | null;
  next_scheduled_check?: string | null;
  last_error?: string | null;
  created_at?: string;
  updated_at?: string;
}

export type StipendStatus = 'paid' | 'unpaid' | 'stipend_not_specified';
export type WorkFormat = 'remote' | 'hybrid' | 'onsite';
export type PublicationStatus = 'draft' | 'pending_review' | 'published' | 'expired' | 'archived';

// Link Verification Statuses
export type LinkStatus =
  | 'working'
  | 'redirected'
  | 'temporarily_unavailable'
  | 'unreachable'
  | 'access_restricted'
  | 'needs_manual_verification'
  | 'invalid_url';

// Application Period Statuses
export type ApplicationStatus =
  | 'upcoming'
  | 'open'
  | 'closing_soon'
  | 'closed'
  | 'status_unconfirmed';

// Distinct Eligibility Statuses (Separating relevance from eligibility)
export type EligibilityMatchStatus =
  | 'eligible'
  | 'potential_match'
  | 'not_eligible'
  | 'eligibility_unknown';

// Verification & Review Metadata
export type SourceVerificationStatus =
  | 'official_verified'
  | 'source_checked'
  | 'pending_verification'
  | 'unverified';

export type VerificationStatus = SourceVerificationStatus;

export type EligibilityVerificationStatus = 'verified' | 'partial' | 'unconfirmed';

export type ReviewStatus = 'approved' | 'pending_review' | 'flagged' | 'archived';

export type UrlType =
  | 'direct_application'
  | 'official_source'
  | 'general_homepage'
  | 'third_party_portal';

export interface Internship {
  id: string;
  title: string;
  organization: string;
  department?: string;
  source_id?: string;
  description: string;
  eligible_disciplines: string[];
  min_education_level: string;
  eligible_years: string[];
  required_skills: string[];
  stipend_amount?: number | null;
  stipend_currency: string;
  stipend_frequency?: string;
  stipend_status: StipendStatus;
  duration: string;
  application_opening_date?: string | null;
  application_deadline?: string | null;
  location: string;
  format: WorkFormat;
  required_documents: string[];
  benefits: string[];

  // Link & Verification Fields
  official_application_url: string;
  original_source_url: string;
  url_type?: UrlType;
  link_status: LinkStatus;
  last_link_checked_at?: string | null;
  last_http_status?: number | null;
  final_url?: string | null;
  link_check_message?: string | null;

  // Structured Eligibility Requirements
  min_cgpa?: number | null;
  cgpa_scale?: number | null;
  min_percentage?: number | null;
  eligible_degrees?: string[];
  institution_restrictions?: string[];
  citizenship_required?: string[];
  requires_noc?: boolean;
  requires_nomination?: boolean;
  prerequisites_description?: string;

  // Status & Metadata
  application_status: ApplicationStatus;
  publication_status: PublicationStatus;
  verification_status: SourceVerificationStatus;
  eligibility_verification_status?: EligibilityVerificationStatus;
  review_status?: ReviewStatus;
  verification_notes?: string;
  canonical_url?: string;
  data_fingerprint?: string;
  is_demo?: boolean;
  published_at?: string;
  last_verified_at?: string;
  created_at?: string;
  updated_at?: string;
}

export type AcademicBackground =
  | 'Engineering and Technology'
  | 'Computer Science and IT'
  | 'Medical and Healthcare'
  | 'Biotechnology and Life Sciences'
  | 'Pure Sciences and Research'
  | 'Commerce and Finance'
  | 'Business and Management'
  | 'Arts and Humanities'
  | 'Law'
  | 'Design and Creative'
  | 'Agriculture and Environmental Sciences'
  | 'Other Disciplines';

export type InstitutionType =
  | 'iit'
  | 'nit'
  | 'iiit'
  | 'iisc_iiser'
  | 'central_university'
  | 'state_university'
  | 'private_university'
  | 'medical_college'
  | 'other';

export type UserRole = 'student' | 'admin' | 'owner';

export function isUserAdmin(role?: string | null): boolean {
  return role === 'admin' || role === 'owner';
}

export interface UserProfile {
  id: string;
  display_name: string;
  email: string;
  college?: string;
  institution_type?: InstitutionType;
  degree?: string;
  academic_year?: string;
  academic_background: string;
  cgpa?: number | null;
  cgpa_scale?: number | null;
  class_12_percentage?: number | null;
  citizenship?: string;
  primary_interest: string;
  secondary_interests: string[];
  skills: string[];
  career_goals?: string;
  preferred_format: 'Any' | 'Remote' | 'Onsite' | 'Hybrid';
  preferred_locations: string[];
  min_stipend_preference?: number | null;
  duration_preference?: string;
  role: UserRole;
  created_at?: string;
  updated_at?: string;
}

export interface EligibilityEvaluation {
  status: EligibilityMatchStatus;
  score: number;
  isEligible: boolean;
  isPotentialMatch: boolean;
  isNotEligible: boolean;
  isUnknown: boolean;
  matchedCriteria: string[];
  unconfirmedCriteria: string[];
  conflictingCriteria: string[];
  interestMatchReason: string;
  verificationAdvice: string;
  profileMissingFields: string[];
}

export interface ScoredInternship {
  internship: Internship;
  evaluation: EligibilityEvaluation;
  score: number;
  matchReasons: string[];
}

export type PersonalApplicationStatus = 'Interested' | 'Planning to Apply' | 'Applied' | 'Not Pursuing';

export interface SavedInternship {
  id: string;
  user_id: string;
  internship_id: string;
  personal_status: PersonalApplicationStatus;
  notes?: string;
  saved_at: string;
  updated_at?: string;
  internship?: Internship;
}

export interface CollectionRun {
  id: string;
  source_id?: string;
  source_name: string;
  started_at: string;
  completed_at?: string;
  status: 'running' | 'success' | 'failed' | 'partial';
  records_discovered: number;
  records_created: number;
  records_updated: number;
  records_skipped?: number;
  records_pending_review?: number;
  duration_ms?: number;
  error_summary?: string;
}

export type ReportCategory =
  | 'expired_listing'
  | 'incorrect_info'
  | 'suspicious_link'
  | 'broken_url'
  | 'other';

export type ReportStatus = 'pending' | 'reviewed' | 'resolved' | 'dismissed';

export interface Report {
  id: string;
  internship_id: string;
  internship_title?: string;
  organization?: string;
  reporter_id?: string;
  reporter_email?: string;
  category: ReportCategory;
  description: string;
  status: ReportStatus;
  admin_notes?: string;
  created_at: string;
  updated_at?: string;
}

export interface FilterState {
  search: string;
  discipline: string;
  sourceCategory: string;
  stipendStatus: string;
  minStipend: number | null;
  format: string;
  location: string;
  year: string;
  deadlineFilter: string; // 'all' | '7days' | '30days' | 'active'
  duration: string;
  applicationStatus?: string; // 'all' | 'open' | 'closing_soon' | 'upcoming' | 'closed'
  eligibilityFilter?: string; // 'all' | 'eligible' | 'potential_match'
  sortBy: 'newest' | 'deadline' | 'stipend_high' | 'relevance';
}
