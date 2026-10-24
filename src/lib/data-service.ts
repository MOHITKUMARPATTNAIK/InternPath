import {
  Internship,
  Source,
  SavedInternship,
  CollectionRun,
  Report,
  FilterState,
  UserProfile,
  PersonalApplicationStatus,
  ScoredInternship,
  EligibilityEvaluation,
  LinkStatus,
  CollectionFrequency,
} from '@/types';
import { INITIAL_SOURCES, INITIAL_INTERNSHIPS, INITIAL_COLLECTION_RUNS } from '@/data/seedData';
import { createClient, isSupabaseConfigured, isDemoModeAllowed } from './supabase/client';
import { generateUUID, isValidUUID } from './uuid';
import type { SupabaseClient } from '@supabase/supabase-js';
import { evaluateEligibility } from './eligibility-engine';
import { getComputedApplicationStatus, isDeadlineClosingSoon, isDeadlineExpired } from './date-utils';
import { validateApplicationUrl } from './link-validator';
import { executeSourceCollection } from './collection/pipeline';
import { sourceRegistry, RegisteredSource } from './collection/source-registry';
import { OpportunityChangeLog, AdapterRunOptions } from './collection/types';

const STORAGE_KEYS = {
  SOURCES: 'internpath_sources',
  INTERNSHIPS: 'internpath_internships',
  SAVED: 'internpath_saved_internships',
  RUNS: 'internpath_collection_runs',
  REPORTS: 'internpath_reports',
  CHANGE_LOGS: 'internpath_change_logs',
  REVIEW_QUEUE: 'internpath_review_queue',
};

// Helper to get local data safely
function getLocal<T>(key: string, defaultValue: T): T {
  if (typeof window === 'undefined') return defaultValue;
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch {
    return defaultValue;
  }
}

function setLocal<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.error(`Failed to save ${key} to localStorage:`, err);
  }
}

// Ensure default seed data is initialized in local storage
export function initializeSeedData(): void {
  if (typeof window === 'undefined') return;

  if (!localStorage.getItem(STORAGE_KEYS.SOURCES)) {
    setLocal(STORAGE_KEYS.SOURCES, INITIAL_SOURCES);
  }
  if (!localStorage.getItem(STORAGE_KEYS.INTERNSHIPS)) {
    setLocal(STORAGE_KEYS.INTERNSHIPS, INITIAL_INTERNSHIPS);
  }
  if (!localStorage.getItem(STORAGE_KEYS.RUNS)) {
    setLocal(STORAGE_KEYS.RUNS, INITIAL_COLLECTION_RUNS);
  }
}

// ------------------------------------------------------------------------------
// SOURCES
// ------------------------------------------------------------------------------
export async function getSources(options?: { client?: SupabaseClient }): Promise<Source[]> {
  if (options?.client || isSupabaseConfigured()) {
    const supabase = options?.client || createClient();
    if (supabase) {
      const { data, error } = await supabase.from('sources').select('*').order('name');
      if (error) {
        console.error('[Supabase Error] Failed to fetch sources:', error.message);
      } else if (data) {
        return data as Source[];
      }
    }
  }

  // Only fall back to local seed data when Supabase is NOT configured and demo mode is permitted
  if (isDemoModeAllowed()) {
    initializeSeedData();
    return getLocal<Source[]>(STORAGE_KEYS.SOURCES, INITIAL_SOURCES);
  }

  return [];
}

export async function getSourceById(
  id: string,
  options?: { client?: SupabaseClient }
): Promise<Source | null> {
  const sources = await getSources(options);
  return sources.find((s) => s.id === id) || null;
}

export async function createSource(
  sourceData: Omit<Source, 'id' | 'created_at' | 'updated_at'> & { id?: string },
  options?: { client?: SupabaseClient }
): Promise<Source> {
  const newSource: Source = {
    ...sourceData,
    id: sourceData.id && isValidUUID(sourceData.id) ? sourceData.id : generateUUID(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  if (options?.client || isSupabaseConfigured()) {
    const supabase = options?.client || createClient();
    if (supabase) {
      const { data, error } = await supabase.from('sources').insert(newSource).select().single();
      if (error) {
        console.error('[Supabase Error] Failed to create source:', error.message);
        throw new Error(`Database error creating source: ${error.message}`);
      }
      if (data) return data as Source;
    }
  }

  if (isDemoModeAllowed()) {
    const sources = await getSources(options);
    const updated = [newSource, ...sources];
    setLocal(STORAGE_KEYS.SOURCES, updated);
    return newSource;
  }

  throw new Error('Supabase is not configured and demo mode is disabled.');
}

export async function updateSource(
  id: string,
  updates: Partial<Source>,
  options?: { client?: SupabaseClient }
): Promise<Source | null> {
  if (options?.client || isSupabaseConfigured()) {
    const supabase = options?.client || createClient();
    if (supabase) {
      const { data, error } = await supabase
        .from('sources')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      if (error) {
        console.error(`[Supabase Error] Failed to update source ${id}:`, error.message);
        throw new Error(`Database error updating source: ${error.message}`);
      }
      if (data) return data as Source;
    }
  }

  if (isDemoModeAllowed()) {
    const sources = await getSources(options);
    const index = sources.findIndex((s) => s.id === id);
    if (index === -1) return null;

    const updatedSource = { ...sources[index], ...updates, updated_at: new Date().toISOString() };
    sources[index] = updatedSource;
    setLocal(STORAGE_KEYS.SOURCES, sources);
    return updatedSource;
  }

  return null;
}

export async function deleteSource(
  id: string,
  options?: { client?: SupabaseClient }
): Promise<boolean> {
  if (options?.client || isSupabaseConfigured()) {
    const supabase = options?.client || createClient();
    if (supabase) {
      const { error } = await supabase.from('sources').delete().eq('id', id);
      if (error) {
        console.error(`[Supabase Error] Failed to delete source ${id}:`, error.message);
        throw new Error(`Database error deleting source: ${error.message}`);
      }
      return true;
    }
  }

  if (isDemoModeAllowed()) {
    const sources = await getSources(options);
    const updated = sources.filter((s) => s.id !== id);
    setLocal(STORAGE_KEYS.SOURCES, updated);
    return true;
  }

  return false;
}

// ------------------------------------------------------------------------------
// INTERNSHIPS
// ------------------------------------------------------------------------------
export async function getInternships(
  filters?: Partial<FilterState>,
  options?: { client?: SupabaseClient; includeAllStatuses?: boolean }
): Promise<Internship[]> {
  let list: Internship[] = [];
  let fetchedFromSupabase = false;

  if (options?.client || isSupabaseConfigured()) {
    const supabase = options?.client || createClient();
    if (supabase) {
      let query = supabase.from('internships').select('*');
      if (!options?.includeAllStatuses) {
        query = query.eq('publication_status', 'published');
      }
      const { data, error } = await query.order('published_at', { ascending: false });

      if (error) {
        console.error('[Supabase Error] Failed to fetch internships:', error.message);
      } else if (data) {
        list = data as Internship[];
        fetchedFromSupabase = true;
      }
    }
  }

  // Only fall back to local seed data if Supabase was NOT configured and demo mode is permitted
  if (!fetchedFromSupabase) {
    if (isDemoModeAllowed()) {
      initializeSeedData();
      list = getLocal<Internship[]>(STORAGE_KEYS.INTERNSHIPS, INITIAL_INTERNSHIPS);
      if (!options?.includeAllStatuses) {
        list = list.filter((item) => item.publication_status === 'published');
      }
    } else {
      list = [];
    }
  }

  // Ensure application_status is computed dynamically using Indian Standard Time
  list = list.map((item) => ({
    ...item,
    application_status: getComputedApplicationStatus(item),
  }));

  // Filter application
  if (!filters) return list;

  return list.filter((item) => {
    // 1. Search Query
    if (filters.search) {
      const q = filters.search.toLowerCase();
      const matchTitle = item.title.toLowerCase().includes(q);
      const matchOrg = item.organization.toLowerCase().includes(q);
      const matchDesc = item.description.toLowerCase().includes(q);
      const matchLoc = item.location.toLowerCase().includes(q);
      const matchSkills = item.required_skills?.some((s) => s.toLowerCase().includes(q));
      if (!matchTitle && !matchOrg && !matchDesc && !matchLoc && !matchSkills) {
        return false;
      }
    }

    // 2. Discipline
    if (filters.discipline && filters.discipline !== 'all') {
      const hasDiscipline = item.eligible_disciplines?.some(
        (d) => d.toLowerCase() === filters.discipline?.toLowerCase()
      );
      if (!hasDiscipline) return false;
    }

    // 3. Source Category
    if (filters.sourceCategory && filters.sourceCategory !== 'all') {
      const cat = filters.sourceCategory.toLowerCase();
      const matchSource =
        (item.source_id && item.source_id.toLowerCase().includes(cat)) ||
        item.organization.toLowerCase().includes(cat);
      if (!matchSource) return false;
    }

    // 4. Application Status
    if (filters.applicationStatus && filters.applicationStatus !== 'all') {
      if (item.application_status !== filters.applicationStatus) return false;
    }

    // 5. Stipend Status
    if (filters.stipendStatus && filters.stipendStatus !== 'all') {
      if (item.stipend_status !== filters.stipendStatus) return false;
    }

    // 6. Minimum Stipend
    if (filters.minStipend !== undefined && filters.minStipend !== null && filters.minStipend > 0) {
      if (!item.stipend_amount || item.stipend_amount < filters.minStipend) {
        return false;
      }
    }

    // 7. Format (Remote, Onsite, Hybrid)
    if (filters.format && filters.format !== 'all') {
      if (item.format !== filters.format.toLowerCase()) return false;
    }

    // 8. Location
    if (filters.location && filters.location !== 'all') {
      if (!item.location.toLowerCase().includes(filters.location.toLowerCase())) {
        return false;
      }
    }

    // 9. Eligible Year
    if (filters.year && filters.year !== 'all') {
      const yearMatch = item.eligible_years?.some((y) =>
        y.toLowerCase().includes(filters.year?.toLowerCase() || '')
      );
      if (!yearMatch) return false;
    }

    // 10. Deadline Filter (Timezone aware)
    if (filters.deadlineFilter && filters.deadlineFilter !== 'all') {
      if (filters.deadlineFilter === 'active') {
        if (isDeadlineExpired(item.application_deadline)) return false;
      } else if (filters.deadlineFilter === '7days') {
        if (!isDeadlineClosingSoon(item.application_deadline, 7)) return false;
      } else if (filters.deadlineFilter === '30days') {
        if (!isDeadlineClosingSoon(item.application_deadline, 30)) return false;
      }
    }

    // 11. Duration
    if (filters.duration && filters.duration !== 'all') {
      if (!item.duration.toLowerCase().includes(filters.duration.toLowerCase())) return false;
    }

    return true;
  }).sort((a, b) => {
    if (filters.sortBy === 'deadline') {
      if (!a.application_deadline) return 1;
      if (!b.application_deadline) return -1;
      return new Date(a.application_deadline).getTime() - new Date(b.application_deadline).getTime();
    }
    if (filters.sortBy === 'stipend_high') {
      return (b.stipend_amount || 0) - (a.stipend_amount || 0);
    }
    // Default: Newest
    return (
      new Date(b.published_at || b.created_at || '').getTime() -
      new Date(a.published_at || a.created_at || '').getTime()
    );
  });
}

export async function getInternshipById(
  id: string,
  options?: { client?: SupabaseClient }
): Promise<Internship | null> {
  if (options?.client || isSupabaseConfigured()) {
    const supabase = options?.client || createClient();
    if (supabase) {
      const { data, error } = await supabase.from('internships').select('*').eq('id', id).maybeSingle();
      if (error) {
        console.error(`[Supabase Error] Failed to fetch internship ${id}:`, error.message);
      } else if (data) {
        return {
          ...data,
          application_status: getComputedApplicationStatus(data as Internship),
        } as Internship;
      }
    }
  }

  if (isDemoModeAllowed()) {
    const internships = await getInternships(undefined, options);
    return internships.find((item) => item.id === id) || null;
  }

  return null;
}

export async function createInternship(
  data: Omit<Internship, 'id' | 'created_at' | 'updated_at'> & { id?: string },
  options?: { client?: SupabaseClient }
): Promise<Internship> {
  const newId = data.id && isValidUUID(data.id) ? data.id : generateUUID();
  const now = new Date().toISOString();
  const newInternship: Internship = {
    ...data,
    id: newId,
    created_at: now,
    updated_at: now,
    published_at: data.published_at || now,
    last_verified_at: data.last_verified_at || now,
  };

  if (options?.client || isSupabaseConfigured()) {
    const supabase = options?.client || createClient();
    if (supabase) {
      const { data: inserted, error } = await supabase
        .from('internships')
        .insert(newInternship)
        .select()
        .single();
      if (error) {
        console.error('[Supabase Error] Failed to create internship:', error.message);
        throw new Error(`Database error creating internship: ${error.message}`);
      }
      if (inserted) return inserted as Internship;
    }
  }

  if (isDemoModeAllowed()) {
    const list = await getInternships(undefined, options);
    const updated = [newInternship, ...list];
    setLocal(STORAGE_KEYS.INTERNSHIPS, updated);
    return newInternship;
  }

  throw new Error('Supabase is not configured and demo mode is disabled.');
}

export async function updateInternship(
  id: string,
  updates: Partial<Internship>,
  options?: { client?: SupabaseClient }
): Promise<Internship | null> {
  if (options?.client || isSupabaseConfigured()) {
    const supabase = options?.client || createClient();
    if (supabase) {
      const { data, error } = await supabase
        .from('internships')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      if (error) {
        console.error(`[Supabase Error] Failed to update internship ${id}:`, error.message);
        throw new Error(`Database error updating internship: ${error.message}`);
      }
      if (data) return data as Internship;
    }
  }

  if (isDemoModeAllowed()) {
    const list = await getInternships(undefined, options);
    const index = list.findIndex((i) => i.id === id);
    if (index === -1) return null;

    const updatedInternship = { ...list[index], ...updates, updated_at: new Date().toISOString() };
    list[index] = updatedInternship;
    setLocal(STORAGE_KEYS.INTERNSHIPS, list);
    return updatedInternship;
  }

  return null;
}

export async function deleteInternship(
  id: string,
  options?: { client?: SupabaseClient }
): Promise<boolean> {
  if (options?.client || isSupabaseConfigured()) {
    const supabase = options?.client || createClient();
    if (supabase) {
      const { error } = await supabase.from('internships').delete().eq('id', id);
      if (error) {
        console.error(`[Supabase Error] Failed to delete internship ${id}:`, error.message);
        throw new Error(`Database error deleting internship: ${error.message}`);
      }
      return true;
    }
  }

  if (isDemoModeAllowed()) {
    const list = getLocal<Internship[]>(STORAGE_KEYS.INTERNSHIPS, INITIAL_INTERNSHIPS);
    const updated = list.filter((i) => i.id !== id);
    setLocal(STORAGE_KEYS.INTERNSHIPS, updated);
    return true;
  }

  return false;
}

export async function archiveInternship(
  id: string,
  options?: { client?: SupabaseClient }
): Promise<Internship | null> {
  return updateInternship(id, { publication_status: 'archived' }, options);
}

export async function verifyInternship(
  id: string,
  notes?: string,
  options?: { client?: SupabaseClient }
): Promise<Internship | null> {
  const updates: Partial<Internship> = {
    verification_status: 'official_verified',
    last_verified_at: new Date().toISOString(),
    verification_notes: notes || 'Verified by administrator.',
  };
  return updateInternship(id, updates, options);
}

// ------------------------------------------------------------------------------
// SAVED INTERNSHIPS
// ------------------------------------------------------------------------------
export async function getSavedInternships(
  userId: string,
  options?: { client?: SupabaseClient }
): Promise<SavedInternship[]> {
  if (options?.client || isSupabaseConfigured()) {
    const supabase = options?.client || createClient();
    if (supabase) {
      const { data, error } = await supabase
        .from('saved_internships')
        .select('*, internship:internships(*)')
        .eq('user_id', userId)
        .order('saved_at', { ascending: false });
      if (error) {
        console.error('[Supabase Error] Failed to fetch saved internships:', error.message);
      } else if (data) {
        return data as SavedInternship[];
      }
    }
  }

  const savedList = getLocal<SavedInternship[]>(STORAGE_KEYS.SAVED, []);
  const userSaved = savedList.filter((s) => s.user_id === userId);
  const allInternships = await getInternships(undefined, options);

  // Attach internship details
  return userSaved.map((s) => ({
    ...s,
    internship: allInternships.find((i) => i.id === s.internship_id),
  }));
}

export async function saveInternship(
  userId: string,
  internshipId: string,
  personalStatus: PersonalApplicationStatus = 'Interested',
  notes?: string,
  options?: { client?: SupabaseClient }
): Promise<SavedInternship> {
  const newSaved: SavedInternship = {
    id: generateUUID(),
    user_id: userId,
    internship_id: internshipId,
    personal_status: personalStatus,
    notes: notes || '',
    saved_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  if (options?.client || isSupabaseConfigured()) {
    const supabase = options?.client || createClient();
    if (supabase) {
      const { data, error } = await supabase
        .from('saved_internships')
        .upsert(newSaved, { onConflict: 'user_id,internship_id' })
        .select('*, internship:internships(*)')
        .single();
      if (error) {
        console.error('[Supabase Error] Failed to save internship:', error.message);
        throw new Error(`Database error saving internship: ${error.message}`);
      }
      if (data) return data as SavedInternship;
    }
  }

  const savedList = getLocal<SavedInternship[]>(STORAGE_KEYS.SAVED, []);
  const existingIdx = savedList.findIndex(
    (s) => s.user_id === userId && s.internship_id === internshipId
  );

  if (existingIdx >= 0) {
    savedList[existingIdx] = { ...savedList[existingIdx], personal_status: personalStatus, notes };
  } else {
    savedList.unshift(newSaved);
  }
  setLocal(STORAGE_KEYS.SAVED, savedList);
  return newSaved;
}

export async function unsaveInternship(
  userId: string,
  internshipId: string,
  options?: { client?: SupabaseClient }
): Promise<void> {
  if (options?.client || isSupabaseConfigured()) {
    const supabase = options?.client || createClient();
    if (supabase) {
      await supabase
        .from('saved_internships')
        .delete()
        .eq('user_id', userId)
        .eq('internship_id', internshipId);
    }
  }

  const savedList = getLocal<SavedInternship[]>(STORAGE_KEYS.SAVED, []);
  const updated = savedList.filter(
    (s) => !(s.user_id === userId && s.internship_id === internshipId)
  );
  setLocal(STORAGE_KEYS.SAVED, updated);
}

export async function updateSavedStatus(
  userId: string,
  internshipId: string,
  status: PersonalApplicationStatus,
  notes?: string
): Promise<void> {
  await saveInternship(userId, internshipId, status, notes);
}

// ------------------------------------------------------------------------------
// STUDENT RECOMMENDATION ENGINE (Strict Eligibility First)
// ------------------------------------------------------------------------------
export type { ScoredInternship };

export async function getRecommendedInternships(profile: UserProfile): Promise<ScoredInternship[]> {
  const allInternships = await getInternships();

  const results: ScoredInternship[] = [];

  for (const item of allInternships) {
    const evaluation = evaluateEligibility(item, profile);

    // If an opportunity has conflicting mandatory requirements, exclude it from top recommendations
    if (evaluation.isNotEligible) {
      continue;
    }

    const reasons = [
      ...evaluation.matchedCriteria,
      ...evaluation.unconfirmedCriteria.map((c) => `Verify: ${c}`),
    ];

    results.push({
      internship: item,
      evaluation,
      score: evaluation.score,
      matchReasons: reasons.length > 0 ? reasons : [evaluation.interestMatchReason],
    });
  }

  // Priority sorting:
  // 1. Fully Eligible matches (highest score first)
  // 2. Potential Matches (highest score first)
  // 3. Unknown / Profile Incomplete
  return results.sort((a, b) => {
    const priority = (evalObj: EligibilityEvaluation) => {
      if (evalObj.isEligible) return 3;
      if (evalObj.isPotentialMatch) return 2;
      if (evalObj.isUnknown) return 1;
      return 0;
    };

    const diffPriority = priority(b.evaluation) - priority(a.evaluation);
    if (diffPriority !== 0) return diffPriority;
    return b.score - a.score;
  });
}

// ------------------------------------------------------------------------------
// LINK VALIDATION RUNNERS
// ------------------------------------------------------------------------------
export async function validateAndUpdateInternshipLink(internshipId: string): Promise<Internship | null> {
  const item = await getInternshipById(internshipId);
  if (!item) return null;

  const checkResult = await validateApplicationUrl(item.official_application_url);
  const updates: Partial<Internship> = {
    link_status: checkResult.status,
    last_link_checked_at: checkResult.checked_at,
    last_http_status: checkResult.http_status,
    final_url: checkResult.final_url,
    link_check_message:
      checkResult.error_message ||
      (checkResult.status === 'working' ? 'Validated successfully (HTTP 200).' : checkResult.status),
  };

  return updateInternship(internshipId, updates);
}

export async function validateAllInternshipLinks(): Promise<{
  total: number;
  updated: number;
  details: Array<{ id: string; title: string; link_status: LinkStatus; message: string }>;
}> {
  const internships = await getInternships();
  const details: Array<{ id: string; title: string; link_status: LinkStatus; message: string }> = [];

  for (const item of internships) {
    const checkResult = await validateApplicationUrl(item.official_application_url);
    await updateInternship(item.id, {
      link_status: checkResult.status,
      last_link_checked_at: checkResult.checked_at,
      last_http_status: checkResult.http_status,
      final_url: checkResult.final_url,
      link_check_message: checkResult.error_message || 'Validated successfully.',
    });
    details.push({
      id: item.id,
      title: item.title,
      link_status: checkResult.status,
      message: checkResult.error_message || 'OK',
    });
  }

  return {
    total: internships.length,
    updated: details.length,
    details,
  };
}

// ------------------------------------------------------------------------------
// REPORTS (Listing Feedback)
// ------------------------------------------------------------------------------
export async function submitReport(
  data: Omit<Report, 'id' | 'status' | 'created_at' | 'updated_at'>,
  options?: { client?: SupabaseClient }
): Promise<Report> {
  const newReport: Report = {
    ...data,
    id: generateUUID(),
    status: 'pending',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  if (isSupabaseConfigured()) {
    const supabase = options?.client || createClient();
    if (supabase) {
      const { data: inserted, error } = await supabase.from('reports').insert(newReport).select().single();
      if (error) {
        console.error('[Supabase Error] Failed to submit report:', error.message);
        throw new Error(`Database error submitting report: ${error.message}`);
      }
      if (inserted) return inserted as Report;
    }
  }

  const reports = getLocal<Report[]>(STORAGE_KEYS.REPORTS, []);
  reports.unshift(newReport);
  setLocal(STORAGE_KEYS.REPORTS, reports);
  return newReport;
}

export async function getReports(options?: { client?: SupabaseClient }): Promise<Report[]> {
  if (isSupabaseConfigured()) {
    const supabase = options?.client || createClient();
    if (supabase) {
      const { data, error } = await supabase.from('reports').select('*').order('created_at', { ascending: false });
      if (error) {
        console.error('[Supabase Error] Failed to fetch reports:', error.message);
      } else if (data) {
        return data as Report[];
      }
    }
  }
  return getLocal<Report[]>(STORAGE_KEYS.REPORTS, []);
}

export async function updateReportStatus(
  reportId: string,
  status: Report['status'],
  adminNotes?: string,
  options?: { client?: SupabaseClient }
): Promise<void> {
  if (isSupabaseConfigured()) {
    const supabase = options?.client || createClient();
    if (supabase) {
      const { error } = await supabase.from('reports').update({ status, admin_notes: adminNotes }).eq('id', reportId);
      if (error) {
        console.error(`[Supabase Error] Failed to update report ${reportId}:`, error.message);
        throw new Error(`Database error updating report: ${error.message}`);
      }
      return;
    }
  }

  const reports = getLocal<Report[]>(STORAGE_KEYS.REPORTS, []);
  const idx = reports.findIndex((r) => r.id === reportId);
  if (idx >= 0) {
    reports[idx] = { ...reports[idx], status, admin_notes: adminNotes, updated_at: new Date().toISOString() };
    setLocal(STORAGE_KEYS.REPORTS, reports);
  }
}

// ------------------------------------------------------------------------------
// COLLECTION PIPELINE (Real Source Adapters, Review Queue & Scheduling)
// ------------------------------------------------------------------------------
export async function getCollectionRuns(options?: { client?: SupabaseClient }): Promise<CollectionRun[]> {
  if (isSupabaseConfigured()) {
    const supabase = options?.client || createClient();
    if (supabase) {
      const { data, error } = await supabase
        .from('collection_runs')
        .select('*')
        .order('started_at', { ascending: false });
      if (error) {
        console.error('[Supabase Error] Failed to fetch collection runs:', error.message);
      } else if (data) {
        return data as CollectionRun[];
      }
    }
  }
  if (isDemoModeAllowed()) {
    return getLocal<CollectionRun[]>(STORAGE_KEYS.RUNS, INITIAL_COLLECTION_RUNS);
  }
  return [];
}

export async function runSourceCheck(
  sourceId: string,
  options?: AdapterRunOptions & { client?: SupabaseClient }
): Promise<CollectionRun> {
  const client = options?.client;
  const source = await getSourceById(sourceId, { client });
  if (!source) {
    throw new Error(`Source with ID "${sourceId}" was not found.`);
  }

  // Get complete current catalog (including pending review) for deduplication
  let allInternships: Internship[] = [];
  if (client || isSupabaseConfigured()) {
    const supabase = client || createClient();
    if (supabase) {
      const { data, error } = await supabase.from('internships').select('*');
      if (error) {
        console.error('[Supabase Error] Failed to fetch catalog for dedup:', error.message);
      } else if (data) {
        allInternships = data as Internship[];
      }
    }
  }
  if (allInternships.length === 0 && isDemoModeAllowed()) {
    allInternships = getLocal<Internship[]>(STORAGE_KEYS.INTERNSHIPS, INITIAL_INTERNSHIPS);
  }

  // Execute collection pipeline for source
  const result = await executeSourceCollection(source as RegisteredSource, allInternships, options);
  const summary = result.summary;

  const collectionRunRecord: CollectionRun = {
    id: summary.runId,
    source_id: source.id,
    source_name: source.name,
    started_at: summary.startedAt,
    completed_at: summary.completedAt,
    status: summary.status,
    records_discovered: summary.recordsDiscovered,
    records_created: summary.recordsCreated,
    records_updated: summary.recordsUpdated,
    records_skipped: summary.recordsSkipped,
    records_pending_review: summary.recordsPendingReview,
    duration_ms: summary.durationMs,
    error_summary:
      summary.errors.length > 0
        ? summary.errors.join('; ')
        : summary.warnings.length > 0
        ? summary.warnings.join('; ')
        : `Collection finished successfully in ${summary.durationMs}ms. Discovered: ${summary.recordsDiscovered}, Created: ${summary.recordsCreated}, Updated: ${summary.recordsUpdated}.`,
  };

  // 1. Update source scheduling timestamps
  const nextScheduled = sourceRegistry.calculateNextSchedule(
    source.collection_frequency || 'daily'
  );
  const sourceUpdates: Partial<Source> = {
    last_checked: summary.completedAt,
    last_attempted_check: summary.startedAt,
    next_scheduled_check: nextScheduled,
    last_error: summary.errors.length > 0 ? summary.errors.join('; ') : null,
  };
  if (summary.status === 'success' || summary.status === 'partial') {
    sourceUpdates.last_successful_check = summary.completedAt;
  }
  await updateSource(sourceId, sourceUpdates, { client });

  // 2. Persist newly created internships
  for (const item of result.createdInternships) {
    await createInternship(item, { client });
  }

  // 3. Persist updated internships
  for (const item of result.updatedInternships) {
    await updateInternship(item.id, item, { client });
  }

  // 4. Persist queued candidates into review queue
  if (result.queuedInternships.length > 0) {
    if (client || isSupabaseConfigured()) {
      const supabase = client || createClient();
      if (supabase) {
        for (const queued of result.queuedInternships) {
          const { error } = await supabase.from('internships').upsert(queued);
          if (error) {
            console.error('[Supabase Error] Failed to upsert review candidate:', error.message);
          }
        }
      }
    }
    if (typeof window !== 'undefined') {
      const currentQueue = getLocal<Internship[]>(STORAGE_KEYS.REVIEW_QUEUE, []);
      for (const q of result.queuedInternships) {
        const existingIdx = currentQueue.findIndex((i) => i.id === q.id || i.title === q.title);
        if (existingIdx >= 0) {
          currentQueue[existingIdx] = q;
        } else {
          currentQueue.unshift(q);
        }
      }
      setLocal(STORAGE_KEYS.REVIEW_QUEUE, currentQueue);
    }
  }

  // 5. Persist change logs
  if (result.changeLogs.length > 0) {
    if (client || isSupabaseConfigured()) {
      const supabase = client || createClient();
      if (supabase) {
        for (const log of result.changeLogs) {
          try {
            const { error } = await supabase.from('opportunity_change_logs').insert({
              id: log.id && isValidUUID(log.id) ? log.id : generateUUID(),
              internship_id: log.internshipId,
              field_name: log.fieldName,
              old_value: log.oldValue !== undefined ? log.oldValue : null,
              new_value: log.newValue !== undefined ? log.newValue : null,
              changed_at: log.changedAt,
              change_source: log.changeSource,
              run_id: log.runId,
            });
            if (error) {
              console.error('[Supabase Error] Failed to insert change log:', error.message);
            }
          } catch (logErr) {
            console.error('[Supabase Error] Exception inserting change log:', logErr);
          }
        }
      }
    }
    if (typeof window !== 'undefined') {
      const existingLogs = getLocal<OpportunityChangeLog[]>(STORAGE_KEYS.CHANGE_LOGS, []);
      setLocal(STORAGE_KEYS.CHANGE_LOGS, [...result.changeLogs, ...existingLogs].slice(0, 500));
    }
  }

  // 6. Persist run record
  if (client || isSupabaseConfigured()) {
    const supabase = client || createClient();
    if (supabase) {
      const { error } = await supabase.from('collection_runs').insert(collectionRunRecord);
      if (error) {
        console.error('[Supabase Error] Failed to insert collection run record:', error.message);
      }
    }
  }
  if (typeof window !== 'undefined') {
    const runs = getLocal<CollectionRun[]>(STORAGE_KEYS.RUNS, INITIAL_COLLECTION_RUNS);
    runs.unshift(collectionRunRecord);
    setLocal(STORAGE_KEYS.RUNS, runs);
  }

  return collectionRunRecord;
}

export async function runAllDueSources(
  options?: { forceAll?: boolean; client?: SupabaseClient } & AdapterRunOptions
): Promise<CollectionRun[]> {
  const sources = await getSources({ client: options?.client });
  const dueSources = sources.filter((s) => {
    if (options?.forceAll) return true;
    return sourceRegistry.isSourceDue(s as RegisteredSource);
  });

  const runRecords: CollectionRun[] = [];

  for (const source of dueSources) {
    try {
      const record = await runSourceCheck(source.id, options);
      runRecords.push(record);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.error(`[Collection Error] Source ${source.name} (${source.id}) failed:`, errorMsg);
      const failedRecord: CollectionRun = {
        id: generateUUID(),
        source_id: source.id,
        source_name: source.name,
        started_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
        status: 'failed',
        records_discovered: 0,
        records_created: 0,
        records_updated: 0,
        records_skipped: 0,
        records_pending_review: 0,
        duration_ms: 0,
        error_summary: errorMsg,
      };

      if (options?.client || isSupabaseConfigured()) {
        const supabase = options?.client || createClient();
        if (supabase) {
          const { error } = await supabase.from('collection_runs').insert(failedRecord);
          if (error) {
            console.error('[Supabase Error] Failed to persist failed run record:', error.message);
          }
        }
      }

      runRecords.push(failedRecord);
    }
  }

  return runRecords;
}

export async function toggleSourceEnabled(sourceId: string, enabled: boolean): Promise<Source | null> {
  const source = await getSourceById(sourceId);
  if (!source) return null;

  const updates: Partial<Source> = {
    enabled,
    next_scheduled_check: enabled
      ? sourceRegistry.calculateNextSchedule(source.collection_frequency || 'daily')
      : null,
  };

  return await updateSource(sourceId, updates);
}

export async function updateSourceFrequency(
  sourceId: string,
  frequency: CollectionFrequency
): Promise<Source | null> {
  const updates: Partial<Source> = {
    collection_frequency: frequency,
    next_scheduled_check: sourceRegistry.calculateNextSchedule(frequency),
  };
  return await updateSource(sourceId, updates);
}

export async function getReviewQueue(options?: { client?: SupabaseClient }): Promise<Internship[]> {
  if (options?.client || isSupabaseConfigured()) {
    const supabase = options?.client || createClient();
    if (supabase) {
      const { data, error } = await supabase
        .from('internships')
        .select('*')
        .in('review_status', ['pending_review', 'flagged'])
        .order('created_at', { ascending: false });
      if (error) {
        console.error('[Supabase Error] Failed to fetch review queue:', error.message);
      } else if (data) {
        return data as Internship[];
      }
    }
  }
  if (isDemoModeAllowed()) {
    return getLocal<Internship[]>(STORAGE_KEYS.REVIEW_QUEUE, []);
  }
  return [];
}

export async function approveReviewCandidate(
  candidateId: string,
  options?: { client?: SupabaseClient }
): Promise<Internship | null> {
  const updates: Partial<Internship> = {
    publication_status: 'published',
    review_status: 'approved',
    verification_status: 'official_verified',
    published_at: new Date().toISOString(),
    last_verified_at: new Date().toISOString(),
    verification_notes: 'Approved via Administrator Review Queue.',
  };

  // If in Supabase
  if (options?.client || isSupabaseConfigured()) {
    const supabase = options?.client || createClient();
    if (supabase) {
      const { data, error } = await supabase
        .from('internships')
        .update(updates)
        .eq('id', candidateId)
        .select()
        .single();
      if (error) {
        console.error(`[Supabase Error] Failed to approve candidate ${candidateId}:`, error.message);
        throw new Error(`Database error approving candidate: ${error.message}`);
      }
      if (data) return data as Internship;
    }
  }

  // Local storage management: Remove from queue and add to internships
  const queue = getLocal<Internship[]>(STORAGE_KEYS.REVIEW_QUEUE, []);
  const candidate = queue.find((c) => c.id === candidateId);
  if (!candidate) return null;

  const approved: Internship = {
    ...candidate,
    ...updates,
  };

  const remainingQueue = queue.filter((c) => c.id !== candidateId);
  setLocal(STORAGE_KEYS.REVIEW_QUEUE, remainingQueue);

  const catalog = getLocal<Internship[]>(STORAGE_KEYS.INTERNSHIPS, INITIAL_INTERNSHIPS);
  const exists = catalog.findIndex((i) => i.id === candidateId);
  if (exists >= 0) {
    catalog[exists] = approved;
  } else {
    catalog.unshift(approved);
  }
  setLocal(STORAGE_KEYS.INTERNSHIPS, catalog);

  return approved;
}

export async function rejectReviewCandidate(
  candidateId: string,
  reason?: string,
  options?: { client?: SupabaseClient }
): Promise<Internship | null> {
  const updates: Partial<Internship> = {
    publication_status: 'archived',
    review_status: 'flagged',
    verification_notes: reason || 'Rejected during administrative review.',
    updated_at: new Date().toISOString(),
  };

  if (options?.client || isSupabaseConfigured()) {
    const supabase = options?.client || createClient();
    if (supabase) {
      const { data, error } = await supabase
        .from('internships')
        .update(updates)
        .eq('id', candidateId)
        .select()
        .single();
      if (error) {
        console.error(`[Supabase Error] Failed to reject candidate ${candidateId}:`, error.message);
        throw new Error(`Database error rejecting candidate: ${error.message}`);
      }
      if (data) return data as Internship;
    }
  }

  const queue = getLocal<Internship[]>(STORAGE_KEYS.REVIEW_QUEUE, []);
  const candidate = queue.find((c) => c.id === candidateId);
  if (!candidate) return null;

  const rejected = { ...candidate, ...updates };
  const remaining = queue.filter((c) => c.id !== candidateId);
  setLocal(STORAGE_KEYS.REVIEW_QUEUE, remaining);
  return rejected;
}

export async function requestRecheckCandidate(candidateId: string): Promise<Internship | null> {
  const queue = getLocal<Internship[]>(STORAGE_KEYS.REVIEW_QUEUE, []);
  const candidate = queue.find((c) => c.id === candidateId);
  if (!candidate) return null;

  const checkRes = await validateApplicationUrl(candidate.official_application_url);
  const rechecked: Internship = {
    ...candidate,
    link_status: checkRes.status,
    last_link_checked_at: checkRes.checked_at,
    last_http_status: checkRes.http_status,
    final_url: checkRes.final_url,
    link_check_message: checkRes.error_message || 'Re-checked successfully.',
    updated_at: new Date().toISOString(),
  };

  const idx = queue.findIndex((c) => c.id === candidateId);
  if (idx >= 0) {
    queue[idx] = rechecked;
    setLocal(STORAGE_KEYS.REVIEW_QUEUE, queue);
  }
  return rechecked;
}

export async function getChangeLogs(
  internshipId?: string,
  options?: { client?: SupabaseClient }
): Promise<OpportunityChangeLog[]> {
  if (options?.client || isSupabaseConfigured()) {
    const supabase = options?.client || createClient();
    if (supabase) {
      let query = supabase
        .from('opportunity_change_logs')
        .select('*')
        .order('changed_at', { ascending: false });

      if (internshipId) {
        query = query.eq('internship_id', internshipId);
      }

      const { data, error } = await query;
      if (error) {
        console.error('[Supabase Error] Failed to fetch change logs:', error.message);
      } else if (data) {
        return data.map((d: any) => ({
          id: d.id,
          internshipId: d.internship_id,
          fieldName: d.field_name,
          oldValue: d.old_value,
          newValue: d.new_value,
          changedAt: d.changed_at,
          changeSource: d.change_source,
          runId: d.run_id,
        }));
      }
    }
  }

  if (isDemoModeAllowed()) {
    const logs = getLocal<OpportunityChangeLog[]>(STORAGE_KEYS.CHANGE_LOGS, []);
    if (!internshipId) return logs;
    return logs.filter((l) => l.internshipId === internshipId);
  }
  return [];
}

// Reset data helper for testing
export function resetDemoData(): void {
  if (typeof window === 'undefined') return;
  setLocal(STORAGE_KEYS.SOURCES, INITIAL_SOURCES);
  setLocal(STORAGE_KEYS.INTERNSHIPS, INITIAL_INTERNSHIPS);
  setLocal(STORAGE_KEYS.RUNS, INITIAL_COLLECTION_RUNS);
  setLocal(STORAGE_KEYS.REPORTS, []);
  setLocal(STORAGE_KEYS.REVIEW_QUEUE, []);
  setLocal(STORAGE_KEYS.CHANGE_LOGS, []);
}
