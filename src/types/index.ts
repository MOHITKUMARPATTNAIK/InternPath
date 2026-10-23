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
  created_at?: string;
  updated_at?: string;
}

export type StipendStatus = 'paid' | 'unpaid' | 'stipend_not_specified';
export type WorkFormat = 'remote' | 'hybrid' | 'onsite';
export type PublicationStatus = 'draft' | 'pending_review' | 'published' | 'expired' | 'archived';
export type VerificationStatus = 'official_verified' | 'source_checked' | 'pending_verification';

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
  official_application_url: string;
  original_source_url: string;
  publication_status: PublicationStatus;
  verification_status: VerificationStatus;
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

export interface UserProfile {
  id: string;
  display_name: string;
  email: string;
  college?: string;
  degree?: string;
  academic_year?: string;
  academic_background: string;
  primary_interest: string;
  secondary_interests: string[];
  skills: string[];
  career_goals?: string;
  preferred_format: 'Any' | 'Remote' | 'Onsite' | 'Hybrid';
  preferred_locations: string[];
  min_stipend_preference?: number | null;
  duration_preference?: string;
  role: 'student' | 'admin';
  created_at?: string;
  updated_at?: string;
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
  sortBy: 'newest' | 'deadline' | 'stipend_high' | 'relevance';
}
