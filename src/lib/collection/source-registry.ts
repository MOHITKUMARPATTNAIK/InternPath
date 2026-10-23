import { Source } from '@/types';
import { SourceAdapter } from './types';
import { ApiAdapter } from './adapters/api-adapter';
import { RssAdapter } from './adapters/rss-adapter';
import { HtmlAdapter } from './adapters/html-adapter';
import { ManualAdapter } from './adapters/manual-adapter';

export type CollectionFrequency = 'daily' | 'twice_daily' | 'weekly' | 'hourly';

export interface RegisteredSource extends Source {
  enabled?: boolean;
  collection_frequency?: CollectionFrequency;
  last_successful_check?: string | null;
  last_attempted_check?: string | null;
  next_scheduled_check?: string | null;
  last_error?: string | null;
}

class SourceRegistry {
  private methodAdapters: Map<Source['monitoring_method'], SourceAdapter> = new Map();
  private sourceSpecificAdapters: Map<string, SourceAdapter> = new Map();

  constructor() {
    // Default method-based adapters
    const apiAdapter = new ApiAdapter();
    const rssAdapter = new RssAdapter();
    const htmlAdapter = new HtmlAdapter();
    const manualAdapter = new ManualAdapter();

    this.methodAdapters.set('API', apiAdapter);
    this.methodAdapters.set('RSS', rssAdapter);
    this.methodAdapters.set('HTML Scraping', htmlAdapter);
    this.methodAdapters.set('Manual Verification', manualAdapter);
  }

  registerCustomAdapter(sourceId: string, adapter: SourceAdapter): void {
    this.sourceSpecificAdapters.set(sourceId, adapter);
  }

  getAdapter(source: Source): SourceAdapter {
    // 1. Check for source-specific custom adapter override
    if (this.sourceSpecificAdapters.has(source.id)) {
      return this.sourceSpecificAdapters.get(source.id)!;
    }

    // 2. Check for monitoring method adapter
    const adapter = this.methodAdapters.get(source.monitoring_method);
    if (adapter) {
      return adapter;
    }

    // 3. Fallback to manual curation adapter
    return this.methodAdapters.get('Manual Verification')!;
  }

  getAllAdapters(): SourceAdapter[] {
    return [
      ...Array.from(this.methodAdapters.values()),
      ...Array.from(this.sourceSpecificAdapters.values()),
    ];
  }

  /**
   * Calculate next scheduled check timestamp in ISO format
   */
  calculateNextSchedule(frequency: CollectionFrequency = 'daily', fromTime?: Date): string {
    const base = fromTime || new Date();
    const next = new Date(base.getTime());

    switch (frequency) {
      case 'hourly':
        next.setHours(next.getHours() + 1);
        break;
      case 'twice_daily':
        next.setHours(next.getHours() + 12);
        break;
      case 'weekly':
        next.setDate(next.getDate() + 7);
        break;
      case 'daily':
      default:
        next.setDate(next.getDate() + 1);
        break;
    }

    return next.toISOString();
  }

  /**
   * Determine if a source is currently due for a scheduled collection run
   */
  isSourceDue(source: RegisteredSource): boolean {
    if (source.status !== 'active') return false;
    if (source.enabled === false) return false;

    if (!source.next_scheduled_check) return true;

    const scheduledTime = new Date(source.next_scheduled_check).getTime();
    const now = Date.now();
    return now >= scheduledTime;
  }
}

export const sourceRegistry = new SourceRegistry();
