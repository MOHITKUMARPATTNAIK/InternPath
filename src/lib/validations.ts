import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const signupSchema = z.object({
  displayName: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const userProfileSchema = z.object({
  display_name: z.string().min(2, 'Name is required'),
  college: z.string().optional(),
  institution_type: z
    .enum([
      'iit',
      'nit',
      'iiit',
      'iisc_iiser',
      'central_university',
      'state_university',
      'private_university',
      'medical_college',
      'other',
    ])
    .optional(),
  degree: z.string().optional(),
  academic_year: z.string().optional(),
  academic_background: z.string().min(1, 'Please select your academic discipline'),
  cgpa: z.number().min(0).max(10).nullable().optional(),
  cgpa_scale: z.number().default(10).optional(),
  class_12_percentage: z.number().min(0).max(100).nullable().optional(),
  citizenship: z.string().default('Indian').optional(),
  primary_interest: z.string().min(2, 'Please specify your primary area of interest'),
  secondary_interests: z.array(z.string()).default([]),
  skills: z.array(z.string()).default([]),
  career_goals: z.string().optional(),
  preferred_format: z.enum(['Any', 'Remote', 'Onsite', 'Hybrid']),
  preferred_locations: z.array(z.string()).default([]),
  min_stipend_preference: z.number().nullable().optional(),
  duration_preference: z.string().optional(),
});

export const reportSchema = z.object({
  internship_id: z.string().min(1, 'Internship ID is required'),
  reporter_email: z.string().email('Valid email is required').optional().or(z.literal('')),
  category: z.enum(['expired_listing', 'incorrect_info', 'suspicious_link', 'broken_url', 'other']),
  description: z.string().min(10, 'Please describe the issue in at least 10 characters'),
});

export const sourceSchema = z.object({
  name: z.string().min(3, 'Institution/Organization name is required'),
  official_domain: z.string().min(3, 'Official domain is required (e.g., iitm.ac.in, niti.gov.in)'),
  source_category: z.enum([
    'IIT',
    'NIT',
    'IIIT',
    'IISc / IISER',
    'Research Lab / PSU',
    'Government Ministry',
    'Public Fellowship',
    'Corporate / Tech',
    'Other',
  ]),
  source_type: z.enum([
    'Public Institution',
    'Autonomous Govt Body',
    'Ministry',
    'Research Council',
    'Enterprise',
    'Other',
  ]),
  opportunity_page_url: z.string().url('Must be a valid URL starting with http:// or https://'),
  monitoring_method: z.enum(['API', 'RSS', 'HTML Scraping', 'Manual Verification']),
  verification_notes: z.string().optional(),
});

export const internshipSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters'),
  organization: z.string().min(2, 'Organization name is required'),
  department: z.string().optional(),
  description: z.string().min(20, 'Detailed description is required'),
  eligible_disciplines: z.array(z.string()).min(1, 'At least one eligible discipline is required'),
  min_education_level: z.string().min(2, 'Education level is required'),
  eligible_years: z.array(z.string()).min(1, 'At least one eligible year is required'),
  required_skills: z.array(z.string()).default([]),
  stipend_status: z.enum(['paid', 'unpaid', 'stipend_not_specified']),
  stipend_amount: z.number().nullable().optional(),
  stipend_currency: z.string().default('INR'),
  stipend_frequency: z.string().optional(),
  duration: z.string().min(2, 'Duration is required (e.g., 2 Months, 6-8 Weeks)'),
  application_opening_date: z.string().nullable().optional(),
  application_deadline: z.string().nullable().optional(),
  location: z.string().min(2, 'Location is required'),
  format: z.enum(['remote', 'hybrid', 'onsite']),
  required_documents: z.array(z.string()).default([]),
  benefits: z.array(z.string()).default([]),
  official_application_url: z.string().url('Must be a valid official application URL'),
  original_source_url: z.string().url('Must be a valid source URL'),
  url_type: z.enum(['direct_application', 'official_source', 'general_homepage', 'third_party_portal']).optional(),
  link_status: z
    .enum([
      'working',
      'redirected',
      'temporarily_unavailable',
      'unreachable',
      'access_restricted',
      'needs_manual_verification',
      'invalid_url',
    ])
    .default('working'),
  min_cgpa: z.number().nullable().optional(),
  cgpa_scale: z.number().default(10).optional(),
  min_percentage: z.number().nullable().optional(),
  eligible_degrees: z.array(z.string()).default([]),
  institution_restrictions: z.array(z.string()).default([]),
  citizenship_required: z.array(z.string()).default(['Indian']),
  requires_noc: z.boolean().default(false),
  requires_nomination: z.boolean().default(false),
  prerequisites_description: z.string().optional(),
  application_status: z
    .enum(['upcoming', 'open', 'closing_soon', 'closed', 'status_unconfirmed'])
    .default('open'),
  publication_status: z.enum(['draft', 'pending_review', 'published', 'expired', 'archived']),
  verification_status: z.enum(['official_verified', 'source_checked', 'pending_verification', 'unverified']),
  eligibility_verification_status: z.enum(['verified', 'partial', 'unconfirmed']).default('verified'),
  review_status: z.enum(['approved', 'pending_review', 'flagged', 'archived']).default('approved'),
  verification_notes: z.string().optional(),
  is_demo: z.boolean().default(false),
});
