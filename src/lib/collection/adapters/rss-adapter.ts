import { Source } from '@/types';
import { BaseAdapter } from './base-adapter';
import { CandidateOpportunity, AdapterRunOptions } from '../types';

export class RssAdapter extends BaseAdapter {
  readonly id = 'adapter-rss-feed';
  readonly name = 'Institutional RSS/Atom Feed Adapter';
  readonly method = 'RSS';

  async discoverOpportunities(
    source: Source,
    options?: AdapterRunOptions
  ): Promise<CandidateOpportunity[]> {
    if (options?.mockPayload) {
      return this.parseXml(String(options.mockPayload), source);
    }

    try {
      const xmlText = await this.fetchWithRetry(source.opportunity_page_url, {
        ...options,
        headers: { Accept: 'application/rss+xml, application/atom+xml, text/xml;q=0.9' },
      });

      return this.parseXml(xmlText, source);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(`RSS feed parsing failure for "${source.name}": ${msg}`);
    }
  }

  private parseXml(xmlText: string, source: Source): CandidateOpportunity[] {
    const results: CandidateOpportunity[] = [];

    // Match either RSS <item> or Atom <entry> blocks
    const itemRegex = /<(?:item|entry)[\s>]([\s\S]*?)<\/(?:item|entry)>/gi;
    let match: RegExpExecArray | null;

    while ((match = itemRegex.exec(xmlText)) !== null) {
      const block = match[1];

      const title = this.extractTag(block, 'title');
      let link = this.extractTag(block, 'link');

      // Atom link tag often has href attribute: <link href="..." />
      if (!link) {
        const atomLinkMatch = /<link[^>]*href=["']([^"']+)["']/i.exec(block);
        if (atomLinkMatch) {
          link = atomLinkMatch[1];
        }
      }

      const description =
        this.extractTag(block, 'description') ||
        this.extractTag(block, 'content') ||
        this.extractTag(block, 'summary') ||
        '';

      const pubDate = this.extractTag(block, 'pubDate') || this.extractTag(block, 'updated');

      if (!title) continue;

      // Filter: Check if item is an internship/fellowship/training opportunity
      const combinedText = `${title} ${description}`.toLowerCase();
      const isOpportunity =
        combinedText.includes('intern') ||
        combinedText.includes('fellow') ||
        combinedText.includes('trainee') ||
        combinedText.includes('summer research') ||
        combinedText.includes('studentship') ||
        combinedText.includes('placement');

      if (!isOpportunity) {
        // Skip general research news or unrelated tender announcements
        continue;
      }

      // Try extracting application deadline if mentioned in text
      let deadline: string | null = null;
      const deadlineMatch = description.match(
        /(?:deadline|last date|due date)[\s:]*([0-9]{1,2}[-\s/][A-Za-z0-9]+[-\s/][0-9]{2,4})/i
      );
      if (deadlineMatch) {
        try {
          const parsedDate = new Date(deadlineMatch[1]);
          if (!isNaN(parsedDate.getTime())) {
            deadline = parsedDate.toISOString().split('T')[0];
          }
        } catch {
          deadline = null;
        }
      }

      const cleanAppUrl = link ? link.trim() : source.opportunity_page_url;

      results.push({
        title: this.cleanHtml(title),
        organization: source.name,
        description:
          this.cleanHtml(description).slice(0, 500) ||
          `${title} published via ${source.name} official opportunity feed.`,
        applicationDeadline: deadline,
        officialApplicationUrl: cleanAppUrl,
        originalSourceUrl: source.opportunity_page_url,
        eligibleDisciplines: ['Pure Sciences and Research', 'Engineering and Technology'],
        eligibleYears: ['2nd Year', '3rd Year', '4th Year'],
        location: 'Pan-India',
        format: 'onsite',
        rawPayload: { rawItem: block, pubDate },
      });
    }

    return results;
  }

  private extractTag(xml: string, tagName: string): string {
    const cdataRegex = new RegExp(
      `<${tagName}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tagName}>`,
      'i'
    );
    const cdataMatch = cdataRegex.exec(xml);
    if (cdataMatch) return cdataMatch[1].trim();

    const tagRegex = new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`, 'i');
    const match = tagRegex.exec(xml);
    return match ? match[1].trim() : '';
  }

  private cleanHtml(text: string): string {
    return text
      .replace(/<[^>]*>/g, '')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, ' ')
      .trim();
  }
}
