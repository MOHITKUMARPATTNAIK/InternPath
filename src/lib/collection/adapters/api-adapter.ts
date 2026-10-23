import { Source } from '@/types';
import { BaseAdapter } from './base-adapter';
import { CandidateOpportunity, AdapterRunOptions } from '../types';

export class ApiAdapter extends BaseAdapter {
  readonly id = 'adapter-json-api';
  readonly name = 'Official Structured JSON API Adapter';
  readonly method = 'API';

  async discoverOpportunities(
    source: Source,
    options?: AdapterRunOptions
  ): Promise<CandidateOpportunity[]> {
    // If mock payload is provided (e.g. during testing)
    if (options?.mockPayload) {
      return this.parsePayload(options.mockPayload, source);
    }

    try {
      const jsonText = await this.fetchWithRetry(source.opportunity_page_url, {
        ...options,
        headers: { Accept: 'application/json' },
      });

      const parsed = JSON.parse(jsonText);
      return this.parsePayload(parsed, source);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(`API extraction failure for "${source.name}": ${msg}`);
    }
  }

  private parsePayload(payload: unknown, source: Source): CandidateOpportunity[] {
    if (!payload) return [];

    const items: unknown[] = Array.isArray(payload)
      ? payload
      : typeof payload === 'object' && payload !== null && 'opportunities' in payload
      ? (payload as { opportunities: unknown[] }).opportunities
      : typeof payload === 'object' && payload !== null && 'items' in payload
      ? (payload as { items: unknown[] }).items
      : typeof payload === 'object' && payload !== null && 'data' in payload
      ? (payload as { data: unknown[] }).data
      : [payload];

    const results: CandidateOpportunity[] = [];

    for (const raw of items) {
      if (typeof raw !== 'object' || raw === null) continue;
      const rec = raw as Record<string, unknown>;

      const title = String(rec.title || rec.name || rec.program_name || '').trim();
      const desc = String(rec.description || rec.summary || rec.details || '').trim();
      const appUrl = String(
        rec.application_url || rec.url || rec.apply_url || source.opportunity_page_url
      ).trim();

      if (!title) continue;

      results.push({
        externalId: rec.id ? String(rec.id) : undefined,
        title,
        organization: String(rec.organization || source.name).trim(),
        department: rec.department ? String(rec.department) : undefined,
        description: desc || `${title} offered by ${source.name}. Consult official portal for eligibility details.`,
        eligibleDisciplines: Array.isArray(rec.eligible_disciplines)
          ? (rec.eligible_disciplines as string[])
          : undefined,
        eligibleDegrees: Array.isArray(rec.eligible_degrees)
          ? (rec.eligible_degrees as string[])
          : undefined,
        eligibleYears: Array.isArray(rec.eligible_years)
          ? (rec.eligible_years as string[])
          : undefined,
        minEducationLevel: rec.min_education_level ? String(rec.min_education_level) : undefined,
        requiredSkills: Array.isArray(rec.required_skills)
          ? (rec.required_skills as string[])
          : undefined,
        stipendAmount: typeof rec.stipend_amount === 'number' ? rec.stipend_amount : null,
        stipendCurrency: rec.stipend_currency ? String(rec.stipend_currency) : 'INR',
        stipendFrequency: rec.stipend_frequency ? String(rec.stipend_frequency) : 'per month',
        duration: rec.duration ? String(rec.duration) : '6 to 8 Weeks',
        applicationOpeningDate: rec.application_opening_date ? String(rec.application_opening_date) : null,
        applicationDeadline: rec.application_deadline ? String(rec.application_deadline) : null,
        location: rec.location ? String(rec.location) : 'Pan-India',
        format: rec.format ? (String(rec.format) as any) : 'onsite',
        officialApplicationUrl: appUrl,
        originalSourceUrl: source.opportunity_page_url,
        minCgpa: typeof rec.min_cgpa === 'number' ? rec.min_cgpa : null,
        minPercentage: typeof rec.min_percentage === 'number' ? rec.min_percentage : null,
        institutionRestrictions: Array.isArray(rec.institution_restrictions)
          ? (rec.institution_restrictions as string[])
          : undefined,
        citizenshipRequired: Array.isArray(rec.citizenship_required)
          ? (rec.citizenship_required as string[])
          : undefined,
        requiresNoc: Boolean(rec.requires_noc),
        requiresNomination: Boolean(rec.requires_nomination),
        prerequisitesDescription: rec.prerequisites_description
          ? String(rec.prerequisites_description)
          : undefined,
        rawPayload: rec,
      });
    }

    return results;
  }
}
