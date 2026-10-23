import { Source } from '@/types';
import { BaseAdapter } from './base-adapter';
import { CandidateOpportunity, AdapterRunOptions } from '../types';

export class HtmlAdapter extends BaseAdapter {
  readonly id = 'adapter-html-structured';
  readonly name = 'Structured HTML & Schema.org Opportunity Adapter';
  readonly method = 'HTML Scraping';

  async discoverOpportunities(
    source: Source,
    options?: AdapterRunOptions
  ): Promise<CandidateOpportunity[]> {
    let htmlText = '';
    if (options?.mockPayload) {
      htmlText = String(options.mockPayload);
    } else {
      try {
        htmlText = await this.fetchWithRetry(source.opportunity_page_url, options);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        throw new Error(`HTML extraction failure for "${source.name}": ${msg}`);
      }
    }

    const results: CandidateOpportunity[] = [];

    // 1. Try extracting Schema.org JobPosting or Program JSON-LD
    const jsonLdOpportunities = this.extractJsonLd(htmlText, source);
    if (jsonLdOpportunities.length > 0) {
      results.push(...jsonLdOpportunities);
    }

    // 2. Try structured opportunity announcement blocks (cards / tables / lists)
    const blockOpportunities = this.extractOpportunityBlocks(htmlText, source);
    for (const opp of blockOpportunities) {
      // Avoid duplicate discovery within same page
      if (!results.some((r) => r.title.toLowerCase() === opp.title.toLowerCase())) {
        results.push(opp);
      }
    }

    // 3. Fallback: If page specifically targets a single program (e.g. RBI summer placement or IIT SFP page)
    if (results.length === 0) {
      const pageOpp = this.extractPageLevelOpportunity(htmlText, source);
      if (pageOpp) {
        results.push(pageOpp);
      }
    }

    if (results.length === 0) {
      // Record useful error rather than fabricating fake opportunities
      throw new Error(
        `No verified internship openings detected on "${source.name}" (${source.opportunity_page_url}). Page layout may have changed or seasonal admissions window may be closed.`
      );
    }

    return results;
  }

  private extractJsonLd(html: string, source: Source): CandidateOpportunity[] {
    const list: CandidateOpportunity[] = [];
    const jsonLdRegex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
    let match: RegExpExecArray | null;

    while ((match = jsonLdRegex.exec(html)) !== null) {
      try {
        const data = JSON.parse(match[1]);
        const entries = Array.isArray(data) ? data : [data];

        for (const item of entries) {
          if (!item || typeof item !== 'object') continue;
          const type = String(item['@type'] || '');
          if (
            type === 'JobPosting' ||
            type === 'Course' ||
            type === 'EducationalOccupationalProgram' ||
            type === 'Event'
          ) {
            const title = String(item.title || item.name || '').trim();
            const desc = String(item.description || '').trim();
            const url = String(item.url || item.sameAs || source.opportunity_page_url).trim();

            if (title) {
              list.push({
                title,
                organization: source.name,
                description: desc || `${title} verified from official institutional portal.`,
                officialApplicationUrl: url,
                originalSourceUrl: source.opportunity_page_url,
                eligibleDisciplines: ['Engineering and Technology', 'Pure Sciences and Research'],
                eligibleYears: ['2nd Year', '3rd Year', '4th Year'],
                applicationDeadline: item.validThrough ? String(item.validThrough).split('T')[0] : null,
                rawPayload: item,
              });
            }
          }
        }
      } catch {
        // Skip malformed JSON-LD scripts safely
      }
    }

    return list;
  }

  private extractOpportunityBlocks(html: string, source: Source): CandidateOpportunity[] {
    const list: CandidateOpportunity[] = [];

    // Find links or anchor tags containing internship keywords
    const anchorRegex = /<a[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
    let match: RegExpExecArray | null;

    while ((match = anchorRegex.exec(html)) !== null) {
      const rawHref = match[1].trim();
      const rawText = match[2].replace(/<[^>]*>/g, '').trim();

      const lower = rawText.toLowerCase();
      const isOpportunity =
        (lower.includes('intern') ||
          lower.includes('fellowship') ||
          lower.includes('summer research') ||
          lower.includes('studentship')) &&
        rawText.length >= 8 &&
        rawText.length <= 140;

      if (!isOpportunity) continue;

      let resolvedUrl = rawHref;
      try {
        resolvedUrl = new URL(rawHref, source.opportunity_page_url).toString();
      } catch {
        resolvedUrl = source.opportunity_page_url;
      }

      list.push({
        title: rawText,
        organization: source.name,
        description: `Official program announcement: "${rawText}". Sourced from ${source.name} opportunity portal.`,
        officialApplicationUrl: resolvedUrl,
        originalSourceUrl: source.opportunity_page_url,
        eligibleDisciplines: ['All Disciplines'],
        eligibleYears: ['2nd Year', '3rd Year', '4th Year'],
        format: 'onsite',
        rawPayload: { anchorText: rawText, href: rawHref },
      });
    }

    return list;
  }

  private extractPageLevelOpportunity(html: string, source: Source): CandidateOpportunity | null {
    const titleMatch = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html);
    const metaDescMatch = /<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i.exec(
      html
    );

    const pageTitle = titleMatch ? titleMatch[1].replace(/\s+/g, ' ').trim() : '';
    const pageDesc = metaDescMatch ? metaDescMatch[1].replace(/\s+/g, ' ').trim() : '';

    const lower = `${pageTitle} ${pageDesc}`.toLowerCase();
    const isInternshipPage =
      lower.includes('internship') ||
      lower.includes('fellowship') ||
      lower.includes('summer training') ||
      lower.includes('research program');

    if (!isInternshipPage || pageTitle.length < 5) {
      return null;
    }

    return {
      title: pageTitle.replace(/[-|].*$/, '').trim(), // Clean suffix like " - IIT Bombay"
      organization: source.name,
      description: pageDesc || `Official internship scheme offered by ${source.name}.`,
      officialApplicationUrl: source.opportunity_page_url,
      originalSourceUrl: source.opportunity_page_url,
      eligibleDisciplines: ['All Disciplines'],
      eligibleYears: ['2nd Year', '3rd Year', '4th Year'],
      format: 'onsite',
      rawPayload: { pageTitle, pageDesc },
    };
  }
}
