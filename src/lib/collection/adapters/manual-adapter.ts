import { Source } from '@/types';
import { BaseAdapter } from './base-adapter';
import {
  CandidateOpportunity,
  AdapterRunOptions,
  NormalizedOpportunity,
  ValidationResult,
  DeduplicationResult,
  VerificationResult,
  PublishingDecision,
} from '../types';

export class ManualAdapter extends BaseAdapter {
  readonly id = 'adapter-manual-curation';
  readonly name = 'Curated Institutional Review Adapter';
  readonly method = 'Manual Verification';

  async discoverOpportunities(
    source: Source,
    options?: AdapterRunOptions
  ): Promise<CandidateOpportunity[]> {
    if (options?.mockPayload) {
      const items = Array.isArray(options.mockPayload)
        ? options.mockPayload
        : [options.mockPayload];
      return items as CandidateOpportunity[];
    }

    // Verify official portal accessibility
    const htmlText = await this.fetchWithRetry(source.opportunity_page_url, options);

    // Create a curated review candidate for the source's official program
    const titleMatch = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(htmlText);
    const title = titleMatch ? titleMatch[1].replace(/\s+/g, ' ').trim() : source.name;

    return [
      {
        title: `${source.name} Official Internship / Fellowship`,
        organization: source.name,
        description: `Official opportunity listed on ${source.name} portal (${source.opportunity_page_url}). Requires human editorial verification before publication.`,
        officialApplicationUrl: source.opportunity_page_url,
        originalSourceUrl: source.opportunity_page_url,
        eligibleDisciplines: ['All Disciplines'],
        eligibleYears: ['2nd Year', '3rd Year', '4th Year'],
        location: 'India',
        format: 'onsite',
        rawPayload: { portalTitle: title },
      },
    ];
  }

  /**
   * For curated sources, always route new candidates to human review rather than auto-publishing
   */
  override async publishOpportunity(
    _opportunity: NormalizedOpportunity,
    validation: ValidationResult,
    dedup: DeduplicationResult,
    _verification: VerificationResult
  ): Promise<PublishingDecision> {
    if (!validation.isValid) {
      return {
        action: 'reject' as const,
        publicationStatus: 'draft' as const,
        reviewStatus: 'flagged' as const,
        confidence: 0,
        reasons: [`Validation errors: ${validation.errors.join(', ')}`],
      };
    }

    if (dedup.isDuplicate && !dedup.isMaterialConflict) {
      return {
        action: 'publish' as const,
        publicationStatus: 'published' as const,
        reviewStatus: 'approved' as const,
        confidence: 90,
        reasons: ['Existing manual entry refreshed.'],
      };
    }

    return {
      action: 'queue_for_review' as const,
      publicationStatus: 'pending_review' as const,
      reviewStatus: 'pending_review' as const,
      confidence: 70,
      reasons: ['Curated institutional source requires admin review before public release.'],
    };
  }
}
