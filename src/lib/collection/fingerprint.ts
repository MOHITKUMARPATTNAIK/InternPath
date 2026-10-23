import { Internship } from '@/types';
import { NormalizedOpportunity, DeduplicationResult } from './types';

/**
 * Remove tracking and ephemeral query parameters from URLs
 */
const TRACKING_PARAMS = new Set([
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'ref',
  'referrer',
  'fbclid',
  'gclid',
  '_ga',
  'trk',
  'session',
  'sessionid',
  'source',
]);

export function canonicalizeUrl(rawUrl: string): string {
  if (!rawUrl || typeof rawUrl !== 'string') return '';

  try {
    const url = new URL(rawUrl.trim());

    // Normalize protocol and hostname
    url.protocol = url.protocol.toLowerCase();
    url.hostname = url.hostname.toLowerCase();

    // Strip default port
    if (
      (url.protocol === 'http:' && url.port === '80') ||
      (url.protocol === 'https:' && url.port === '443')
    ) {
      url.port = '';
    }

    // Strip hash fragment
    url.hash = '';

    // Strip tracking parameters
    const keysToDelete: string[] = [];
    url.searchParams.forEach((_, key) => {
      if (TRACKING_PARAMS.has(key.toLowerCase()) || key.toLowerCase().startsWith('utm_')) {
        keysToDelete.push(key);
      }
    });
    for (const key of keysToDelete) {
      url.searchParams.delete(key);
    }

    // Sort query parameters for deterministic representation
    url.searchParams.sort();

    // Normalize pathname trailing slash (except root)
    if (url.pathname.length > 1 && url.pathname.endsWith('/')) {
      url.pathname = url.pathname.slice(0, -1);
    }

    return url.toString();
  } catch {
    // If invalid URL syntax, return trimmed lowercased string
    return rawUrl.trim().toLowerCase();
  }
}

/**
 * Clean and normalize text strings for matching
 */
export function normalizeText(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Extract an application cycle signature (e.g. '2026', 'summer-2026', 'term-1')
 */
export function extractCycleSignature(title: string, deadline?: string | null, opening?: string | null): string {
  const combined = `${title || ''} ${deadline || ''} ${opening || ''}`.toLowerCase();
  const yearMatch = combined.match(/\b(202[4-9]|203[0-5])\b/);
  const termMatch = combined.match(/\b(summer|winter|spring|autumn|term[\s-]*[123]|phase[\s-]*[123])\b/);

  const year = yearMatch ? yearMatch[1] : '';
  const term = termMatch ? termMatch[1].replace(/[\s-]+/g, '') : '';
  if (!year && !term) return '';
  return `${year}-${term}`;
}

/**
 * Compute deterministic 32-bit FNV-1a hash formatted as hex
 */
export function computeHash(input: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

/**
 * Generate a unique data fingerprint for an opportunity
 */
export function generateOpportunityFingerprint(opp: {
  title: string;
  organization: string;
  official_application_url: string;
  application_deadline?: string | null;
}): string {
  const canonUrl = canonicalizeUrl(opp.official_application_url);
  const normTitle = normalizeText(opp.title);
  const normOrg = normalizeText(opp.organization);
  const cycle = extractCycleSignature(opp.title, opp.application_deadline);

  const signature = `${canonUrl}|${normOrg}|${normTitle}|${cycle}`;
  return computeHash(signature);
}

/**
 * Token-based Jaccard similarity between two strings
 */
export function calculateTokenSimilarity(s1: string, s2: string): number {
  const t1 = new Set(normalizeText(s1).split(' ').filter(Boolean));
  const t2 = new Set(normalizeText(s2).split(' ').filter(Boolean));

  if (t1.size === 0 && t2.size === 0) return 1.0;
  if (t1.size === 0 || t2.size === 0) return 0.0;

  let intersection = 0;
  t1.forEach((token) => {
    if (t2.has(token)) intersection++;
  });

  const union = new Set([...t1, ...t2]).size;
  return union === 0 ? 0 : intersection / union;
}

/**
 * Multi-layer Deduplication Engine
 */
export function checkDuplicateOpportunity(
  candidate: NormalizedOpportunity,
  existingList: Internship[]
): DeduplicationResult {
  const candidateCanonUrl = canonicalizeUrl(candidate.official_application_url);
  const candidateNormTitle = normalizeText(candidate.title);
  const candidateNormOrg = normalizeText(candidate.organization);
  const candidateCycle = extractCycleSignature(
    candidate.title,
    candidate.application_deadline,
    candidate.application_opening_date
  );

  // ---------------------------------------------------------------------------
  // Layer 1: Canonical Application URL Match
  // ---------------------------------------------------------------------------
  if (candidateCanonUrl) {
    const urlMatch = existingList.find((item) => {
      const itemCanon = canonicalizeUrl(item.official_application_url);
      return itemCanon && itemCanon === candidateCanonUrl;
    });

    if (urlMatch) {
      // Check for material changes in critical fields
      const conflictingFields: string[] = [];
      if (candidate.application_deadline && urlMatch.application_deadline && candidate.application_deadline !== urlMatch.application_deadline) {
        conflictingFields.push('application_deadline');
      }
      if (candidate.stipend_amount !== undefined && urlMatch.stipend_amount !== undefined && candidate.stipend_amount !== urlMatch.stipend_amount) {
        conflictingFields.push('stipend_amount');
      }

      return {
        isDuplicate: true,
        matchType: 'exact_canonical_url',
        matchedInternshipId: urlMatch.id,
        matchedInternship: urlMatch,
        confidence: 99,
        reason: `Matched exact canonical application URL: ${candidateCanonUrl}`,
        isMaterialConflict: conflictingFields.length > 0,
        conflictingFields,
      };
    }
  }

  // ---------------------------------------------------------------------------
  // Layer 2: Source ID + Stable External Identifier (if provided)
  // ---------------------------------------------------------------------------
  if (candidate.external_id && candidate.source_id) {
    const extMatch = existingList.find(
      (item) =>
        item.source_id === candidate.source_id &&
        ((item as any).external_id === candidate.external_id ||
          Boolean(item.id && typeof item.id === 'string' && item.id.includes(candidate.external_id!)))
    );
    if (extMatch) {
      return {
        isDuplicate: true,
        matchType: 'source_external_id',
        matchedInternshipId: extMatch.id || '',
        matchedInternship: extMatch,
        confidence: 95,
        reason: `Matched source external ID "${candidate.external_id}" under source "${candidate.source_id}"`,
      };
    }
  }

  // ---------------------------------------------------------------------------
  // Layer 3: Normalized Title + Organization + Cycle/Deadline Match
  // ---------------------------------------------------------------------------
  const exactTitleOrgMatch = existingList.find((item) => {
    const itemNormOrg = normalizeText(item.organization);
    const itemNormTitle = normalizeText(item.title);
    const itemCycle = extractCycleSignature(
      item.title,
      item.application_deadline,
      item.application_opening_date
    );

    const isOrgMatch =
      itemNormOrg === candidateNormOrg ||
      itemNormOrg.includes(candidateNormOrg) ||
      candidateNormOrg.includes(itemNormOrg);

    const isTitleMatch = itemNormTitle === candidateNormTitle;
    const isCycleMatch = candidateCycle === itemCycle || !candidateCycle || !itemCycle;

    return isOrgMatch && isTitleMatch && isCycleMatch;
  });

  if (exactTitleOrgMatch) {
    return {
      isDuplicate: true,
      matchType: 'title_org_cycle',
      matchedInternshipId: exactTitleOrgMatch.id,
      matchedInternship: exactTitleOrgMatch,
      confidence: 90,
      reason: `Matched organization "${candidate.organization}" and program title in cycle "${candidateCycle}"`,
    };
  }

  // ---------------------------------------------------------------------------
  // Layer 4: Conservative Fuzzy Matching (Same Organization + High Title Similarity)
  // ---------------------------------------------------------------------------
  for (const item of existingList) {
    const itemNormOrg = normalizeText(item.organization);
    const isSameOrg =
      itemNormOrg === candidateNormOrg ||
      (candidateNormOrg.length > 4 && itemNormOrg.includes(candidateNormOrg)) ||
      (itemNormOrg.length > 4 && candidateNormOrg.includes(itemNormOrg));

    if (!isSameOrg) continue;

    const titleSim = calculateTokenSimilarity(candidate.title, item.title);
    if (titleSim >= 0.85) {
      const candidateYears: string[] = Array.from(candidate.title.match(/\b(202[4-9]|203[0-5])\b/g) || []);
      const itemYears: string[] = Array.from(item.title.match(/\b(202[4-9]|203[0-5])\b/g) || []);

      // If explicit years differ (e.g. 2025 vs 2026), they are DISTINCT annual cycles, NOT duplicates!
      const hasYearDifference =
        candidateYears.length > 0 &&
        itemYears.length > 0 &&
        candidateYears.some((cy) => !itemYears.includes(cy));

      if (hasYearDifference) {
        // Different cycles of the same fellowship: keep separate!
        continue;
      }

      return {
        isDuplicate: true,
        matchType: 'fuzzy_title_org',
        matchedInternshipId: item.id,
        matchedInternship: item,
        confidence: Math.round(titleSim * 85),
        reason: `High lexical similarity (${Math.round(
          titleSim * 100
        )}%) within organization "${item.organization}"`,
        isMaterialConflict: true,
        conflictingFields: ['title', 'similarity_flag'],
      };
    }
  }

  // No duplicate found
  return {
    isDuplicate: false,
    confidence: 0,
  };
}
