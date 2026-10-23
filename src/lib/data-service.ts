import {
  Internship,
  Source,
  SavedInternship,
  CollectionRun,
  Report,
  FilterState,
  UserProfile,
  PersonalApplicationStatus,
} from '@/types';
import { INITIAL_SOURCES, INITIAL_INTERNSHIPS, INITIAL_COLLECTION_RUNS } from '@/data/seedData';
import { createClient, isSupabaseConfigured } from './supabase/client';

const STORAGE_KEYS = {
  SOURCES: 'internpath_sources',
  INTERNSHIPS: 'internpath_internships',
  SAVED: 'internpath_saved_internships',
  RUNS: 'internpath_collection_runs',
  REPORTS: 'internpath_reports',
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
export async function getSources(): Promise<Source[]> {
  if (isSupabaseConfigured()) {
    const supabase = createClient();
    if (supabase) {
      const { data, error } = await supabase.from('sources').select('*').order('name');
      if (!error && data && data.length > 0) return data as Source[];
    }
  }
  initializeSeedData();
  return getLocal<Source[]>(STORAGE_KEYS.SOURCES, INITIAL_SOURCES);
}

export async function getSourceById(id: string): Promise<Source | null> {
  const sources = await getSources();
  return sources.find((s) => s.id === id) || null;
}

export async function createSource(sourceData: Omit<Source, 'id' | 'created_at' | 'updated_at'>): Promise<Source> {
  const newSource: Source = {
    ...sourceData,
    id: 'src-' + Date.now(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  if (isSupabaseConfigured()) {
    const supabase = createClient();
    if (supabase) {
      const { data } = await supabase.from('sources').insert(newSource).select().single();
      if (data) return data as Source;
    }
  }

  const sources = await getSources();
  const updated = [newSource, ...sources];
  setLocal(STORAGE_KEYS.SOURCES, updated);
  return newSource;
}

export async function updateSource(id: string, updates: Partial<Source>): Promise<Source | null> {
  if (isSupabaseConfigured()) {
    const supabase = createClient();
    if (supabase) {
      const { data } = await supabase.from('sources').update(updates).eq('id', id).select().single();
      if (data) return data as Source;
    }
  }

  const sources = await getSources();
  const index = sources.findIndex((s) => s.id === id);
  if (index === -1) return null;

  const updatedSource = { ...sources[index], ...updates, updated_at: new Date().toISOString() };
  sources[index] = updatedSource;
  setLocal(STORAGE_KEYS.SOURCES, sources);
  return updatedSource;
}

// ------------------------------------------------------------------------------
// INTERNSHIPS
// ------------------------------------------------------------------------------
export async function getInternships(filters?: Partial<FilterState>): Promise<Internship[]> {
  let list: Internship[] = [];

  if (isSupabaseConfigured()) {
    const supabase = createClient();
    if (supabase) {
      const { data, error } = await supabase
        .from('internships')
        .select('*')
        .eq('publication_status', 'published')
        .order('published_at', { ascending: false });
      if (!error && data && data.length > 0) {
        list = data as Internship[];
      }
    }
  }

  if (list.length === 0) {
    initializeSeedData();
    list = getLocal<Internship[]>(STORAGE_KEYS.INTERNSHIPS, INITIAL_INTERNSHIPS);
  }

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

    // 3. Stipend Status
    if (filters.stipendStatus && filters.stipendStatus !== 'all') {
      if (item.stipend_status !== filters.stipendStatus) return false;
    }

    // 4. Minimum Stipend
    if (filters.minStipend !== undefined && filters.minStipend !== null && filters.minStipend > 0) {
      if (!item.stipend_amount || item.stipend_amount < filters.minStipend) {
        return false;
      }
    }

    // 5. Format (Remote, Onsite, Hybrid)
    if (filters.format && filters.format !== 'all') {
      if (item.format !== filters.format.toLowerCase()) return false;
    }

    // 6. Location
    if (filters.location && filters.location !== 'all') {
      if (!item.location.toLowerCase().includes(filters.location.toLowerCase())) {
        return false;
      }
    }

    // 7. Eligible Year
    if (filters.year && filters.year !== 'all') {
      const yearMatch = item.eligible_years?.some((y) =>
        y.toLowerCase().includes(filters.year?.toLowerCase() || '')
      );
      if (!yearMatch) return false;
    }

    // 8. Deadline Filter
    if (filters.deadlineFilter && filters.deadlineFilter !== 'all') {
      if (!item.application_deadline) return true;
      const deadlineDate = new Date(item.application_deadline).getTime();
      const now = new Date().getTime();
      const daysDiff = (deadlineDate - now) / (1000 * 60 * 60 * 24);

      if (filters.deadlineFilter === '7days' && (daysDiff < 0 || daysDiff > 7)) return false;
      if (filters.deadlineFilter === '30days' && (daysDiff < 0 || daysDiff > 30)) return false;
      if (filters.deadlineFilter === 'active' && daysDiff < 0) return false;
    }

    // 9. Duration
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

export async function getInternshipById(id: string): Promise<Internship | null> {
  if (isSupabaseConfigured()) {
    const supabase = createClient();
    if (supabase) {
      const { data, error } = await supabase.from('internships').select('*').eq('id', id).single();
      if (!error && data) return data as Internship;
    }
  }

  const internships = await getInternships();
  return internships.find((item) => item.id === id) || null;
}

export async function createInternship(
  data: Omit<Internship, 'id' | 'created_at' | 'updated_at'>
): Promise<Internship> {
  const newInternship: Internship = {
    ...data,
    id: 'intern-' + Date.now(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    published_at: new Date().toISOString(),
    last_verified_at: new Date().toISOString(),
  };

  if (isSupabaseConfigured()) {
    const supabase = createClient();
    if (supabase) {
      const { data: inserted } = await supabase.from('internships').insert(newInternship).select().single();
      if (inserted) return inserted as Internship;
    }
  }

  const list = await getInternships();
  const updated = [newInternship, ...list];
  setLocal(STORAGE_KEYS.INTERNSHIPS, updated);
  return newInternship;
}

export async function updateInternship(id: string, updates: Partial<Internship>): Promise<Internship | null> {
  if (isSupabaseConfigured()) {
    const supabase = createClient();
    if (supabase) {
      const { data } = await supabase.from('internships').update(updates).eq('id', id).select().single();
      if (data) return data as Internship;
    }
  }

  const list = await getInternships();
  const index = list.findIndex((i) => i.id === id);
  if (index === -1) return null;

  const updatedInternship = { ...list[index], ...updates, updated_at: new Date().toISOString() };
  list[index] = updatedInternship;
  setLocal(STORAGE_KEYS.INTERNSHIPS, list);
  return updatedInternship;
}

// ------------------------------------------------------------------------------
// SAVED INTERNSHIPS
// ------------------------------------------------------------------------------
export async function getSavedInternships(userId: string): Promise<SavedInternship[]> {
  if (isSupabaseConfigured()) {
    const supabase = createClient();
    if (supabase) {
      const { data, error } = await supabase
        .from('saved_internships')
        .select('*, internship:internships(*)')
        .eq('user_id', userId)
        .order('saved_at', { ascending: false });
      if (!error && data) return data as SavedInternship[];
    }
  }

  const savedList = getLocal<SavedInternship[]>(STORAGE_KEYS.SAVED, []);
  const userSaved = savedList.filter((s) => s.user_id === userId);
  const allInternships = await getInternships();

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
  notes?: string
): Promise<SavedInternship> {
  const newSaved: SavedInternship = {
    id: 'save-' + Date.now(),
    user_id: userId,
    internship_id: internshipId,
    personal_status: personalStatus,
    notes: notes || '',
    saved_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  if (isSupabaseConfigured()) {
    const supabase = createClient();
    if (supabase) {
      const { data } = await supabase
        .from('saved_internships')
        .upsert(newSaved, { onConflict: 'user_id,internship_id' })
        .select('*, internship:internships(*)')
        .single();
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

export async function unsaveInternship(userId: string, internshipId: string): Promise<void> {
  if (isSupabaseConfigured()) {
    const supabase = createClient();
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
export interface ScoredInternship {
  internship: Internship;
  score: number;
  matchReasons: string[];
}

export async function getRecommendedInternships(profile: UserProfile): Promise<ScoredInternship[]> {
  const allInternships = await getInternships();

  const scored: ScoredInternship[] = [];

  for (const item of allInternships) {
    let score = 0;
    const matchReasons: string[] = [];

    // 1. Mandatory Academic Background Check
    // Must strictly match student's declared academic background unless opportunity is explicitly open to all disciplines
    const backgroundMatches =
      item.eligible_disciplines.length === 0 ||
      item.eligible_disciplines.some((disc) =>
        disc.toLowerCase().includes(profile.academic_background.toLowerCase()) ||
        profile.academic_background.toLowerCase().includes(disc.toLowerCase()) ||
        disc.toLowerCase() === 'all disciplines'
      );

    if (!backgroundMatches) {
      // Strictly disqualify unrelated opportunities (e.g., medical student receiving computer science internships)
      continue;
    }

    score += 40;
    matchReasons.push(`Directly matches your field (${profile.academic_background})`);

    // 2. Academic Year Match
    if (profile.academic_year && item.eligible_years.length > 0) {
      const yearMatches = item.eligible_years.some((y) =>
        y.toLowerCase().includes(profile.academic_year?.toLowerCase() || '')
      );
      if (yearMatches) {
        score += 25;
        matchReasons.push(`Open to ${profile.academic_year} undergraduates`);
      }
    }

    // 3. Skills Match
    if (profile.skills && profile.skills.length > 0 && item.required_skills) {
      const matchedSkills = item.required_skills.filter((reqSkill) =>
        profile.skills.some((userSkill) =>
          reqSkill.toLowerCase().includes(userSkill.toLowerCase()) ||
          userSkill.toLowerCase().includes(reqSkill.toLowerCase())
        )
      );
      if (matchedSkills.length > 0) {
        score += Math.min(matchedSkills.length * 10, 30);
        matchReasons.push(`Matches your skills: ${matchedSkills.slice(0, 3).join(', ')}`);
      }
    }

    // 4. Primary & Secondary Interest Match
    if (profile.primary_interest) {
      const pInterest = profile.primary_interest.toLowerCase();
      const inTitle = item.title.toLowerCase().includes(pInterest);
      const inDesc = item.description.toLowerCase().includes(pInterest);
      const inDept = item.department?.toLowerCase().includes(pInterest);
      if (inTitle || inDesc || inDept) {
        score += 20;
        matchReasons.push(`Aligns with your primary interest in ${profile.primary_interest}`);
      }
    }

    // 5. Work Format Preference
    if (profile.preferred_format && profile.preferred_format !== 'Any') {
      if (item.format.toLowerCase() === profile.preferred_format.toLowerCase()) {
        score += 15;
        matchReasons.push(`Preferred format: ${item.format.toUpperCase()}`);
      }
    } else {
      score += 5;
    }

    // 6. Stipend Preference
    if (profile.min_stipend_preference && profile.min_stipend_preference > 0) {
      if (item.stipend_amount && item.stipend_amount >= profile.min_stipend_preference) {
        score += 10;
        matchReasons.push(`Stipend meets your preference (₹${item.stipend_amount.toLocaleString()})`);
      }
    }

    // Only include if baseline threshold is satisfied
    if (score >= 35) {
      scored.push({
        internship: item,
        score,
        matchReasons,
      });
    }
  }

  return scored.sort((a, b) => b.score - a.score);
}

// ------------------------------------------------------------------------------
// REPORTS (Listing Feedback)
// ------------------------------------------------------------------------------
export async function submitReport(
  data: Omit<Report, 'id' | 'status' | 'created_at' | 'updated_at'>
): Promise<Report> {
  const newReport: Report = {
    ...data,
    id: 'rep-' + Date.now(),
    status: 'pending',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  if (isSupabaseConfigured()) {
    const supabase = createClient();
    if (supabase) {
      const { data: inserted } = await supabase.from('reports').insert(newReport).select().single();
      if (inserted) return inserted as Report;
    }
  }

  const reports = getLocal<Report[]>(STORAGE_KEYS.REPORTS, []);
  reports.unshift(newReport);
  setLocal(STORAGE_KEYS.REPORTS, reports);
  return newReport;
}

export async function getReports(): Promise<Report[]> {
  if (isSupabaseConfigured()) {
    const supabase = createClient();
    if (supabase) {
      const { data, error } = await supabase.from('reports').select('*').order('created_at', { ascending: false });
      if (!error && data) return data as Report[];
    }
  }
  return getLocal<Report[]>(STORAGE_KEYS.REPORTS, []);
}

export async function updateReportStatus(
  reportId: string,
  status: Report['status'],
  adminNotes?: string
): Promise<void> {
  if (isSupabaseConfigured()) {
    const supabase = createClient();
    if (supabase) {
      await supabase.from('reports').update({ status, admin_notes: adminNotes }).eq('id', reportId);
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
// COLLECTION PIPELINE (Source Monitoring & Ingestion Simulation)
// ------------------------------------------------------------------------------
export async function getCollectionRuns(): Promise<CollectionRun[]> {
  if (isSupabaseConfigured()) {
    const supabase = createClient();
    if (supabase) {
      const { data, error } = await supabase.from('collection_runs').select('*').order('started_at', { ascending: false });
      if (!error && data) return data as CollectionRun[];
    }
  }
  return getLocal<CollectionRun[]>(STORAGE_KEYS.RUNS, INITIAL_COLLECTION_RUNS);
}

export async function runSourceCheck(sourceId: string): Promise<CollectionRun> {
  const source = await getSourceById(sourceId);
  const sourceName = source ? source.name : 'Unknown Source';

  const newRun: CollectionRun = {
    id: 'run-' + Date.now(),
    source_id: sourceId,
    source_name: sourceName,
    started_at: new Date().toISOString(),
    completed_at: new Date(Date.now() + 2400).toISOString(),
    status: 'success',
    records_discovered: 1,
    records_created: 0,
    records_updated: 1,
    error_summary: `Checked domain ${source?.official_domain || 'official portal'}. Application guidelines validated; SSL & canonical URL healthy.`,
  };

  if (isSupabaseConfigured()) {
    const supabase = createClient();
    if (supabase) {
      await supabase.from('collection_runs').insert(newRun);
      await supabase.from('sources').update({ last_checked: new Date().toISOString() }).eq('id', sourceId);
      return newRun;
    }
  }

  const runs = getLocal<CollectionRun[]>(STORAGE_KEYS.RUNS, INITIAL_COLLECTION_RUNS);
  runs.unshift(newRun);
  setLocal(STORAGE_KEYS.RUNS, runs);

  // Update source last_checked
  if (source) {
    await updateSource(sourceId, { last_checked: new Date().toISOString() });
  }

  return newRun;
}

// Reset data helper for testing
export function resetDemoData(): void {
  if (typeof window === 'undefined') return;
  setLocal(STORAGE_KEYS.SOURCES, INITIAL_SOURCES);
  setLocal(STORAGE_KEYS.INTERNSHIPS, INITIAL_INTERNSHIPS);
  setLocal(STORAGE_KEYS.RUNS, INITIAL_COLLECTION_RUNS);
  setLocal(STORAGE_KEYS.REPORTS, []);
}
