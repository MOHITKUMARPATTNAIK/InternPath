import {
  Source,
  Internship,
  PublicationStatus,
  ReviewStatus,
  LinkStatus,
  StipendStatus,
  WorkFormat,
} from '@/types';

export interface SourceConfig {
  endpoint?: string;
  rssFeedUrl?: string;
  allowedDomains?: string[];
  timeoutMs?: number;
  maxRetries?: number;
  customHeaders?: Record<string, string>;
  expectedFields?: string[];
  extractionPattern?: 'json' | 'rss' | 'table' | 'meta_tags' | 'curated';
  autoPublishThreshold?: number; // Confidence score (0-100)
}

export interface CandidateOpportunity {
  externalId?: string;
  title: string;
  organization: string;
  department?: string;
  description: string;
  eligibleDisciplines?: string[];
  eligibleDegrees?: string[];
  eligibleYears?: string[];
  minEducationLevel?: string;
  requiredSkills?: string[];
  stipendAmount?: number | null;
  stipendCurrency?: string;
  stipendFrequency?: string;
  stipendStatus?: StipendStatus;
  duration?: string;
  applicationOpeningDate?: string | null;
  applicationDeadline?: string | null;
  location?: string;
  format?: WorkFormat;
  requiredDocuments?: string[];
  benefits?: string[];
  officialApplicationUrl: string;
  originalSourceUrl: string;
  minCgpa?: number | null;
  minPercentage?: number | null;
  institutionRestrictions?: string[];
  citizenshipRequired?: string[];
  requiresNoc?: boolean;
  requiresNomination?: boolean;
  prerequisitesDescription?: string;
  rawPayload?: Record<string, unknown>;
}

export type NormalizedOpportunity = Omit<Internship, 'id'> & {
  id?: string;
  external_id?: string;
  data_fingerprint?: string;
  canonical_url?: string;
};

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export type DuplicateMatchType =
  | 'exact_canonical_url'
  | 'source_external_id'
  | 'title_org_cycle'
  | 'fuzzy_title_org';

export interface DeduplicationResult {
  isDuplicate: boolean;
  matchType?: DuplicateMatchType;
  matchedInternshipId?: string;
  matchedInternship?: Internship;
  confidence: number;
  reason?: string;
  isMaterialConflict?: boolean;
  conflictingFields?: string[];
}

export interface VerificationResult {
  isAuthenticSource: boolean;
  linkStatus: LinkStatus;
  httpStatus?: number | null;
  finalUrl?: string | null;
  linkMessage: string;
  verificationNotes: string;
  isDomainApproved: boolean;
}

export interface PublishingDecision {
  action: 'publish' | 'queue_for_review' | 'reject';
  publicationStatus: PublicationStatus;
  reviewStatus: ReviewStatus;
  confidence: number;
  reasons: string[];
}

export interface AdapterRunOptions {
  timeoutMs?: number;
  maxRetries?: number;
  mockPayload?: unknown;
  fetcher?: typeof fetch;
}

export interface SourceAdapter {
  readonly id: string;
  readonly name: string;
  readonly method: Source['monitoring_method'];

  discoverOpportunities(
    source: Source,
    options?: AdapterRunOptions
  ): Promise<CandidateOpportunity[]>;

  normalizeOpportunity(
    candidate: CandidateOpportunity,
    source: Source
  ): Promise<NormalizedOpportunity>;

  validateOpportunity(opportunity: NormalizedOpportunity): Promise<ValidationResult>;

  checkDuplicate(
    opportunity: NormalizedOpportunity,
    existing: Internship[]
  ): Promise<DeduplicationResult>;

  verifyOpportunity(
    opportunity: NormalizedOpportunity,
    source: Source,
    options?: AdapterRunOptions
  ): Promise<VerificationResult>;

  publishOpportunity(
    opportunity: NormalizedOpportunity,
    validation: ValidationResult,
    dedup: DeduplicationResult,
    verification: VerificationResult
  ): Promise<PublishingDecision>;
}

export interface CollectionPipelineSummary {
  runId: string;
  sourceId: string;
  sourceName: string;
  startedAt: string;
  completedAt: string;
  status: 'success' | 'partial' | 'failed';
  recordsDiscovered: number;
  recordsCreated: number;
  recordsUpdated: number;
  recordsSkipped: number;
  recordsPendingReview: number;
  errors: string[];
  warnings: string[];
  durationMs: number;
}

export interface OpportunityChangeLog {
  id: string;
  internshipId: string;
  fieldName: string;
  oldValue: unknown;
  newValue: unknown;
  changedAt: string;
  changeSource: 'crawler' | 'admin';
  runId?: string;
}
