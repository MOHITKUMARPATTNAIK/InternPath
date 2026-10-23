import { Source, Internship } from '@/types';
import { validateUrlSafety, checkLink } from '@/lib/link-validator';
import { internshipSchema } from '@/lib/validations';
import { getComputedApplicationStatus, isDeadlineExpired } from '@/lib/date-utils';
import {
  SourceAdapter,
  CandidateOpportunity,
  NormalizedOpportunity,
  ValidationResult,
  DeduplicationResult,
  VerificationResult,
  PublishingDecision,
  AdapterRunOptions,
} from '../types';
import {
  canonicalizeUrl,
  generateOpportunityFingerprint,
  checkDuplicateOpportunity,
} from '../fingerprint';

export abstract class BaseAdapter implements SourceAdapter {
  abstract readonly id: string;
  abstract readonly name: string;
  abstract readonly method: Source['monitoring_method'];

  abstract discoverOpportunities(
    source: Source,
    options?: AdapterRunOptions
  ): Promise<CandidateOpportunity[]>;

  /**
   * SSRF-safe HTTP fetch with timeout and exponential backoff
   */
  protected async fetchWithRetry(
    urlString: string,
    options?: AdapterRunOptions & { headers?: Record<string, string> }
  ): Promise<string> {
    const safety = validateUrlSafety(urlString);
    if (!safety.isSafe) {
      throw new Error(`SSRF Prevention: ${safety.reason || 'Blocked destination'}`);
    }

    const timeoutMs = options?.timeoutMs || 8000;
    const maxRetries = options?.maxRetries ?? 2;
    const fetcher = options?.fetcher || fetch;

    let attempt = 0;
    let lastError: Error | null = null;

    while (attempt <= maxRetries) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const response = await fetcher(urlString, {
          signal: controller.signal,
          headers: {
            'User-Agent':
              'InternPathBot/1.0 (+https://internpath.in/bot; Official Indian Internship Discovery Platform)',
            Accept: 'text/html,application/xhtml+xml,application/xml,application/json;q=0.9,*/*;q=0.8',
            ...options?.headers,
          },
        });

        clearTimeout(timer);

        if (!response.ok) {
          if (response.status === 401 || response.status === 403) {
            throw new Error(`HTTP ${response.status}: Access restricted by server firewall`);
          }
          if (response.status >= 500 && attempt < maxRetries) {
            // Temporary server error, retry
            attempt++;
            await new Promise((r) => setTimeout(r, 500 * Math.pow(2, attempt)));
            continue;
          }
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return await response.text();
      } catch (err: unknown) {
        clearTimeout(timer);
        lastError = err instanceof Error ? err : new Error(String(err));

        if (lastError.name === 'AbortError') {
          throw new Error(`Operation timed out after ${timeoutMs}ms`);
        }

        // Do not retry client 4xx or security errors
        if (lastError.message.includes('SSRF') || lastError.message.includes('HTTP 40')) {
          throw lastError;
        }

        attempt++;
        if (attempt <= maxRetries) {
          await new Promise((r) => setTimeout(r, 400 * Math.pow(2, attempt)));
        }
      }
    }

    throw lastError || new Error(`Failed to fetch ${urlString}`);
  }

  /**
   * Normalize candidate record into standardized opportunity
   */
  async normalizeOpportunity(
    candidate: CandidateOpportunity,
    source: Source
  ): Promise<NormalizedOpportunity> {
    const rawAppUrl = candidate.officialApplicationUrl || source.opportunity_page_url;
    const rawSourceUrl = candidate.originalSourceUrl || source.opportunity_page_url;

    const canonicalAppUrl = canonicalizeUrl(rawAppUrl);

    // Compute Indian application status based on IST dates
    const appOpening =
      candidate.applicationOpeningDate || (candidate as any).application_opening_date || undefined;
    const appDeadline =
      candidate.applicationDeadline || (candidate as any).application_deadline || undefined;
    const appStatus = getComputedApplicationStatus({
      application_opening_date: appOpening,
      application_deadline: appDeadline,
    });

    const norm: NormalizedOpportunity = {
      external_id: candidate.externalId,
      title: candidate.title.trim(),
      organization: candidate.organization?.trim() || source.name,
      department: candidate.department?.trim() || undefined,
      source_id: source.id,
      description: candidate.description.trim(),
      eligible_disciplines:
        candidate.eligibleDisciplines && candidate.eligibleDisciplines.length > 0
          ? candidate.eligibleDisciplines
          : ['All Disciplines'],
      min_education_level: candidate.minEducationLevel || 'Undergraduate student',
      eligible_years:
        candidate.eligibleYears && candidate.eligibleYears.length > 0
          ? candidate.eligibleYears
          : ['2nd Year', '3rd Year', '4th Year'],
      required_skills: candidate.requiredSkills || [],
      stipend_amount: candidate.stipendAmount ?? (candidate as any).stipend_amount ?? null,
      stipend_currency: candidate.stipendCurrency || (candidate as any).stipend_currency || 'INR',
      stipend_frequency: candidate.stipendFrequency || (candidate as any).stipend_frequency || 'per month',
      stipend_status:
        candidate.stipendStatus ||
        (candidate as any).stipend_status ||
        (candidate.stipendAmount && candidate.stipendAmount > 0
          ? 'paid'
          : candidate.stipendAmount === 0
          ? 'unpaid'
          : 'stipend_not_specified'),
      duration: candidate.duration || (candidate as any).duration || '6 to 8 Weeks',
      application_opening_date:
        candidate.applicationOpeningDate || (candidate as any).application_opening_date || null,
      application_deadline:
        candidate.applicationDeadline || (candidate as any).application_deadline || null,
      location: candidate.location || 'Pan-India',
      format: candidate.format || 'onsite',
      required_documents: candidate.requiredDocuments || ['Institutional Bonafide Certificate / NOC'],
      benefits: candidate.benefits || ['Official Institutional Certification'],
      official_application_url: rawAppUrl,
      original_source_url: rawSourceUrl,
      canonical_url: canonicalAppUrl,
      url_type: 'direct_application',
      link_status: 'working',
      min_cgpa: candidate.minCgpa ?? null,
      cgpa_scale: 10,
      min_percentage: candidate.minPercentage ?? null,
      eligible_degrees: candidate.eligibleDegrees || [],
      institution_restrictions: candidate.institutionRestrictions || ['open_all'],
      citizenship_required: candidate.citizenshipRequired || ['Indian'],
      requires_noc: candidate.requiresNoc ?? false,
      requires_nomination: candidate.requiresNomination ?? false,
      prerequisites_description: candidate.prerequisitesDescription,
      application_status: appStatus,
      publication_status: 'pending_review',
      verification_status: 'source_checked',
      eligibility_verification_status: 'partial',
      review_status: 'pending_review',
      is_demo: false,
    };

    norm.data_fingerprint = generateOpportunityFingerprint({
      title: norm.title,
      organization: norm.organization,
      official_application_url: norm.official_application_url,
      application_deadline: norm.application_deadline,
    });

    return norm;
  }

  /**
   * Validate normalized opportunity against Zod schema & business rules
   */
  async validateOpportunity(opportunity: NormalizedOpportunity): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check title length
    if (!opportunity.title || opportunity.title.length < 5) {
      errors.push('Internship title must be at least 5 characters');
    }

    // Check description completeness
    if (!opportunity.description || opportunity.description.length < 20) {
      errors.push('Description is too brief (minimum 20 characters required)');
    }

    // Check application URL
    const appUrlSafety = validateUrlSafety(opportunity.official_application_url);
    if (!appUrlSafety.isSafe) {
      errors.push(`Invalid application URL: ${appUrlSafety.reason}`);
    }

    // Check source URL
    const sourceUrlSafety = validateUrlSafety(opportunity.original_source_url);
    if (!sourceUrlSafety.isSafe) {
      errors.push(`Invalid source URL: ${sourceUrlSafety.reason}`);
    }

    // Deadline sanity check
    if (opportunity.application_opening_date && opportunity.application_deadline) {
      if (new Date(opportunity.application_opening_date) > new Date(opportunity.application_deadline)) {
        errors.push(
          `Opening date (${opportunity.application_opening_date}) cannot be later than deadline (${opportunity.application_deadline})`
        );
      }
    }

    // Partial Zod verification
    const parsed = internshipSchema.safeParse(opportunity);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        errors.push(`${issue.path.join('.')}: ${issue.message}`);
      }
    }

    // Warnings for unconfirmed/missing metadata
    if (opportunity.stipend_status === 'stipend_not_specified') {
      warnings.push('Stipend details not specified by official source');
    }
    if (!opportunity.application_deadline) {
      warnings.push('Confirmed application deadline not announced');
    }
    if (!opportunity.eligible_degrees || opportunity.eligible_degrees.length === 0) {
      warnings.push('Degree restrictions unconfirmed');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Deduplication check against known opportunities
   */
  async checkDuplicate(
    opportunity: NormalizedOpportunity,
    existing: Internship[]
  ): Promise<DeduplicationResult> {
    return checkDuplicateOpportunity(opportunity, existing);
  }

  /**
   * Verify source authenticity and link status
   */
  async verifyOpportunity(
    opportunity: NormalizedOpportunity,
    source: Source,
    options?: AdapterRunOptions
  ): Promise<VerificationResult> {
    let isDomainApproved = false;
    let isAuthenticSource = false;

    try {
      const appHost = new URL(opportunity.official_application_url).hostname.toLowerCase();
      const sourceHost = source.official_domain.toLowerCase();

      // Check if application host matches or subdomains the official source domain
      isDomainApproved =
        appHost === sourceHost ||
        appHost.endsWith('.' + sourceHost) ||
        sourceHost.endsWith('.' + appHost);

      isAuthenticSource = Boolean(source.status === 'active' && isDomainApproved);
    } catch {
      isDomainApproved = false;
      isAuthenticSource = false;
    }

    // Check live link status
    const linkCheck = await checkLink(opportunity.official_application_url, {
      timeoutMs: options?.timeoutMs || 6000,
      fetcher: options?.fetcher,
    });

    // If redirected, verify that final destination also resides on an approved institutional host
    if (linkCheck.finalUrl && linkCheck.finalUrl !== opportunity.official_application_url) {
      try {
        const finalHost = new URL(linkCheck.finalUrl).hostname.toLowerCase();
        const sourceHost = source.official_domain.toLowerCase();
        const isFinalApproved =
          finalHost === sourceHost ||
          finalHost.endsWith('.' + sourceHost) ||
          sourceHost.endsWith('.' + finalHost);

        if (!isFinalApproved) {
          isDomainApproved = false;
          isAuthenticSource = false;
        }
      } catch {
        isDomainApproved = false;
        isAuthenticSource = false;
      }
    }

    return {
      isAuthenticSource,
      linkStatus: linkCheck.status,
      httpStatus: linkCheck.httpStatus,
      finalUrl: linkCheck.finalUrl,
      linkMessage: linkCheck.message,
      verificationNotes: isDomainApproved
        ? `Application destination verified against ${source.name} official domain.`
        : `Application host differs from registered source domain (${source.official_domain}). Requires administrative review.`,
      isDomainApproved,
    };
  }

  /**
   * Automated publishing decision policy
   */
  async publishOpportunity(
    opportunity: NormalizedOpportunity,
    validation: ValidationResult,
    dedup: DeduplicationResult,
    verification: VerificationResult
  ): Promise<PublishingDecision> {
    const reasons: string[] = [];

    // 1. Critical validation errors -> REJECT
    if (!validation.isValid) {
      return {
        action: 'reject',
        publicationStatus: 'draft',
        reviewStatus: 'flagged',
        confidence: 0,
        reasons: [`Failed validation criteria: ${validation.errors.join('; ')}`],
      };
    }

    // 2. Expired opportunity check: an opportunity with an expired deadline must NEVER be published to the active catalog
    if (
      isDeadlineExpired(opportunity.application_deadline) ||
      opportunity.application_status === 'closed'
    ) {
      return {
        action: 'reject',
        publicationStatus: 'expired',
        reviewStatus: 'archived',
        confidence: 90,
        reasons: [
          `Application deadline (${opportunity.application_deadline || 'unspecified'}) has passed in Indian Standard Time (Asia/Kolkata). Excluded from active publication.`,
        ],
      };
    }

    // 3. Duplicate handling
    if (dedup.isDuplicate) {
      if (dedup.matchType === 'fuzzy_title_org') {
        // Suspected duplicate via fuzzy matching with potential material difference -> queue for review
        return {
          action: 'queue_for_review',
          publicationStatus: 'pending_review',
          reviewStatus: 'flagged',
          confidence: 60,
          reasons: [
            `Duplicate detected (${dedup.matchType}) with material differences in: ${dedup.conflictingFields?.join(
              ', '
            )}. Queued for review.`,
          ],
        };
      } else {
        // Exact canonical URL or official source external ID match: safe update to existing record
        return {
          action: 'publish',
          publicationStatus: 'published',
          reviewStatus: 'approved',
          confidence: 95,
          reasons: ['Safe update to existing verified record.'],
        };
      }
    }

    // 4. Link health check: only verified working links or approved redirects may be auto-published
    if (verification.linkStatus !== 'working' && verification.linkStatus !== 'redirected') {
      return {
        action: 'queue_for_review',
        publicationStatus: 'pending_review',
        reviewStatus: 'pending_review',
        confidence: 40,
        reasons: [`Application link status is "${verification.linkStatus}": ${verification.linkMessage}`],
      };
    }

    // 5. Domain mismatch: candidate applying on external / third-party domain -> QUEUE FOR REVIEW
    if (!verification.isDomainApproved) {
      return {
        action: 'queue_for_review',
        publicationStatus: 'pending_review',
        reviewStatus: 'pending_review',
        confidence: 50,
        reasons: [
          `Application destination host does not strictly match approved institutional domain (${opportunity.official_application_url}). Queued for administrative review.`,
        ],
      };
    }

    // All strict automated safety criteria passed -> PUBLISH
    reasons.push('Originates from approved official institutional source');
    reasons.push('Application destination domain strictly verified');
    reasons.push('Schema validation and SSRF safety verified');
    reasons.push('Application link health verified');

    return {
      action: 'publish',
      publicationStatus: 'published',
      reviewStatus: 'approved',
      confidence: 95,
      reasons,
    };
  }
}
