import { Internship } from '@/types';
import { generateUUID } from '../uuid';
import { sourceRegistry, RegisteredSource } from './source-registry';
import {
  CollectionPipelineSummary,
  OpportunityChangeLog,
  AdapterRunOptions,
} from './types';

// In-memory mutex to prevent concurrent collection runs for the same source
const ACTIVE_RUN_LOCKS = new Set<string>();

export interface PipelineExecutionResult {
  summary: CollectionPipelineSummary;
  createdInternships: Internship[];
  updatedInternships: Internship[];
  queuedInternships: Internship[];
  changeLogs: OpportunityChangeLog[];
}

export async function executeSourceCollection(
  source: RegisteredSource,
  existingInternships: Internship[],
  options?: AdapterRunOptions
): Promise<PipelineExecutionResult> {
  const runId = generateUUID();
  const startedAt = new Date().toISOString();
  const startTime = Date.now();

  // 1. Prevent concurrent overlapping executions for the same source
  if (ACTIVE_RUN_LOCKS.has(source.id)) {
    throw new Error(
      `Concurrent collection job already active for source "${source.name}" (${source.id}). Run skipped.`
    );
  }

  ACTIVE_RUN_LOCKS.add(source.id);

  const errors: string[] = [];
  const warnings: string[] = [];
  const createdInternships: Internship[] = [];
  const updatedInternships: Internship[] = [];
  const queuedInternships: Internship[] = [];
  const changeLogs: OpportunityChangeLog[] = [];

  let discoveredCount = 0;
  let createdCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;
  let pendingReviewCount = 0;

  try {
    const adapter = sourceRegistry.getAdapter(source);

    // 2. Discover raw opportunities
    const candidates = await adapter.discoverOpportunities(source, options);
    discoveredCount = candidates.length;

    // Working copy of internships for intra-run deduplication
    const currentCatalog = [...existingInternships];

    // 3. Process each discovered candidate
    for (const candidate of candidates) {
      try {
        const normalized = await adapter.normalizeOpportunity(candidate, source);
        const validation = await adapter.validateOpportunity(normalized);
        const dedup = await adapter.checkDuplicate(normalized, currentCatalog);
        const verification = await adapter.verifyOpportunity(normalized, source, options);
        const decision = await adapter.publishOpportunity(
          normalized,
          validation,
          dedup,
          verification
        );

        if (decision.action === 'reject') {
          skippedCount++;
          continue;
        }

        if (decision.action === 'publish') {
          if (dedup.isDuplicate && dedup.matchedInternship) {
            // Safe Update to existing record
            const existing = dedup.matchedInternship;
            const updated: Internship = {
              ...existing,
              // Update changed values
              title: normalized.title || existing.title,
              description: normalized.description || existing.description,
              application_deadline: normalized.application_deadline ?? existing.application_deadline,
              stipend_amount: normalized.stipend_amount !== undefined ? normalized.stipend_amount : existing.stipend_amount,
              stipend_status: normalized.stipend_status || existing.stipend_status,
              link_status: verification.linkStatus,
              last_link_checked_at: new Date().toISOString(),
              last_http_status: verification.httpStatus ?? existing.last_http_status,
              final_url: verification.finalUrl ?? existing.final_url,
              link_check_message: verification.linkMessage,
              last_verified_at: new Date().toISOString(),
              application_status: normalized.application_status,
            };

            // Record change log for material diffs
            if (existing.application_deadline !== updated.application_deadline) {
              changeLogs.push({
                id: generateUUID(),
                internshipId: existing.id,
                fieldName: 'application_deadline',
                oldValue: existing.application_deadline,
                newValue: updated.application_deadline,
                changedAt: new Date().toISOString(),
                changeSource: 'crawler',
                runId,
              });
            }
            if (existing.stipend_amount !== updated.stipend_amount) {
              changeLogs.push({
                id: generateUUID(),
                internshipId: existing.id,
                fieldName: 'stipend_amount',
                oldValue: existing.stipend_amount,
                newValue: updated.stipend_amount,
                changedAt: new Date().toISOString(),
                changeSource: 'crawler',
                runId,
              });
            }
            if (existing.link_status !== updated.link_status) {
              changeLogs.push({
                id: generateUUID(),
                internshipId: existing.id,
                fieldName: 'link_status',
                oldValue: existing.link_status,
                newValue: updated.link_status,
                changedAt: new Date().toISOString(),
                changeSource: 'crawler',
                runId,
              });
            }

            updatedInternships.push(updated);
            updatedCount++;

            // Replace in current catalog
            const idx = currentCatalog.findIndex((c) => c.id === existing.id);
            if (idx >= 0) currentCatalog[idx] = updated;
          } else {
            // Insert brand new published opportunity
            const newRecord: Internship = {
              ...normalized,
              id: generateUUID(),
              publication_status: 'published',
              review_status: 'approved',
              verification_status: 'source_checked',
              link_status: verification.linkStatus,
              last_link_checked_at: new Date().toISOString(),
              last_http_status: verification.httpStatus ?? 200,
              final_url: verification.finalUrl,
              link_check_message: verification.linkMessage,
              verification_notes: verification.verificationNotes,
              published_at: new Date().toISOString(),
              last_verified_at: new Date().toISOString(),
            };

            createdInternships.push(newRecord);
            currentCatalog.push(newRecord);
            createdCount++;
          }
        } else if (decision.action === 'queue_for_review') {
          // Send candidate to admin review queue
          const reviewCandidate: Internship = {
            ...normalized,
            id: generateUUID(),
            publication_status: 'pending_review',
            review_status: 'pending_review',
            verification_status: 'pending_verification',
            link_status: verification.linkStatus,
            last_link_checked_at: new Date().toISOString(),
            last_http_status: verification.httpStatus ?? null,
            final_url: verification.finalUrl,
            link_check_message: verification.linkMessage,
            verification_notes: decision.reasons.join(' | '),
            created_at: new Date().toISOString(),
          };

          queuedInternships.push(reviewCandidate);
          pendingReviewCount++;
        }
      } catch (oppErr: unknown) {
        const oppMsg = oppErr instanceof Error ? oppErr.message : String(oppErr);
        warnings.push(`Error processing candidate "${candidate.title}": ${oppMsg}`);
        skippedCount++;
      }
    }
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    errors.push(errorMsg);
  } finally {
    ACTIVE_RUN_LOCKS.delete(source.id);
  }

  const completedAt = new Date().toISOString();
  const durationMs = Date.now() - startTime;
  const status =
    errors.length === 0 ? 'success' : createdCount > 0 || updatedCount > 0 ? 'partial' : 'failed';

  const summary: CollectionPipelineSummary = {
    runId,
    sourceId: source.id,
    sourceName: source.name,
    startedAt,
    completedAt,
    status,
    recordsDiscovered: discoveredCount,
    recordsCreated: createdCount,
    recordsUpdated: updatedCount,
    recordsSkipped: skippedCount,
    recordsPendingReview: pendingReviewCount,
    errors,
    warnings,
    durationMs,
  };

  return {
    summary,
    createdInternships,
    updatedInternships,
    queuedInternships,
    changeLogs,
  };
}

/**
 * Execute collection batch across multiple sources with complete failure isolation
 */
export async function executeMultiSourceCollection(
  sources: RegisteredSource[],
  existingInternships: Internship[],
  options?: AdapterRunOptions
): Promise<{
  summaries: CollectionPipelineSummary[];
  allCreated: Internship[];
  allUpdated: Internship[];
  allQueued: Internship[];
  allChangeLogs: OpportunityChangeLog[];
}> {
  const summaries: CollectionPipelineSummary[] = [];
  const allCreated: Internship[] = [];
  const allUpdated: Internship[] = [];
  const allQueued: Internship[] = [];
  const allChangeLogs: OpportunityChangeLog[] = [];

  let currentInternships = [...existingInternships];

  for (const source of sources) {
    try {
      const res = await executeSourceCollection(source, currentInternships, options);
      summaries.push(res.summary);
      allCreated.push(...res.createdInternships);
      allUpdated.push(...res.updatedInternships);
      allQueued.push(...res.queuedInternships);
      allChangeLogs.push(...res.changeLogs);

      // Incorporate created items into next source run
      currentInternships = [...currentInternships, ...res.createdInternships];
    } catch (err: unknown) {
      // Failure isolation: Failure of one source must NOT block other sources!
      const errorMsg = err instanceof Error ? err.message : String(err);
      summaries.push({
        runId: generateUUID(),
        sourceId: source.id,
        sourceName: source.name,
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        status: 'failed',
        recordsDiscovered: 0,
        recordsCreated: 0,
        recordsUpdated: 0,
        recordsSkipped: 0,
        recordsPendingReview: 0,
        errors: [errorMsg],
        warnings: [],
        durationMs: 0,
      });
    }
  }

  return {
    summaries,
    allCreated,
    allUpdated,
    allQueued,
    allChangeLogs,
  };
}
