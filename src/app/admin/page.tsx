'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import {
  Internship,
  Source,
  CollectionRun,
  Report,
  PublicationStatus,
} from '@/types';
import {
  getInternships,
  getSources,
  getCollectionRuns,
  getReports,
  createInternship,
  updateInternship,
  createSource,
  runSourceCheck,
  updateReportStatus,
  validateAndUpdateInternshipLink,
  validateAllInternshipLinks,
} from '@/lib/data-service';
import { DISCIPLINES, SOURCE_CATEGORIES, YEARS } from '@/components/internships/InternshipFilters';
import { VerificationBadge } from '@/components/ui/VerificationBadge';
import {
  Shield,
  Plus,
  RefreshCw,
  ExternalLink,
  CheckCircle,
  Bot,
  Flag,
} from 'lucide-react';

export default function AdminDashboardPage() {
  const { user, switchDemoRole } = useAuth();

  const [activeTab, setActiveTab] = useState<'internships' | 'sources' | 'pipeline' | 'reports'>('internships');
  const [internships, setInternships] = useState<Internship[]>([]);
  const [sources, setSources] = useState<Source[]>([]);
  const [runs, setRuns] = useState<CollectionRun[]>([]);
  const [reports, setReports] = useState<Report[]>([]);

  // New Internship Modal State
  const [showAddInternshipModal, setShowAddInternshipModal] = useState(false);
  const [newInternshipData, setNewInternshipData] = useState<Partial<Internship>>({
    title: '',
    organization: '',
    department: '',
    description: '',
    eligible_disciplines: ['Engineering and Technology'],
    min_education_level: 'Undergraduate',
    eligible_years: ['3rd Year'],
    required_skills: [],
    stipend_status: 'paid',
    stipend_amount: 10000,
    stipend_currency: 'INR',
    duration: '2 Months',
    application_deadline: '',
    location: 'Pan-India',
    format: 'onsite',
    required_documents: ['NOC from College', 'Transcripts'],
    benefits: ['Certificate of Completion', 'Lab Access'],
    official_application_url: '',
    original_source_url: '',
    publication_status: 'published',
    verification_status: 'official_verified',
  });
  const [internshipError, setInternshipError] = useState<string | null>(null);

  // New Source Modal State
  const [showAddSourceModal, setShowAddSourceModal] = useState(false);
  const [newSourceData, setNewSourceData] = useState<Partial<Source>>({
    name: '',
    official_domain: '',
    source_category: 'IIT',
    source_type: 'Public Institution',
    opportunity_page_url: '',
    monitoring_method: 'HTML Scraping',
    status: 'active',
    verification_notes: '',
  });
  const [sourceError, setSourceError] = useState<string | null>(null);

  const [runningSourceId, setRunningSourceId] = useState<string | null>(null);
  const [checkingLinkId, setCheckingLinkId] = useState<string | null>(null);
  const [checkingAllLinks, setCheckingAllLinks] = useState(false);

  const handleCheckLink = async (internshipId: string) => {
    setCheckingLinkId(internshipId);
    try {
      const updated = await validateAndUpdateInternshipLink(internshipId);
      if (updated) {
        setInternships((prev) => prev.map((item) => (item.id === internshipId ? updated : item)));
        alert(`Link check finished: Status is "${updated.link_status}". ${updated.link_check_message || ''}`);
      }
    } finally {
      setCheckingLinkId(null);
    }
  };

  const handleCheckAllLinks = async () => {
    if (!confirm('Run safe SSRF-protected link check across all internship listings?')) return;
    setCheckingAllLinks(true);
    try {
      const summary = await validateAllInternshipLinks();
      const updated = await getInternships();
      setInternships(updated);
      alert(`Validated ${summary.updated} listings. All link health statuses refreshed.`);
    } finally {
      setCheckingAllLinks(false);
    }
  };

  const loadAll = async () => {
    const [allInts, allSrcs, allRuns, allReps] = await Promise.all([
      getInternships(),
      getSources(),
      getCollectionRuns(),
      getReports(),
    ]);
    setInternships(allInts);
    setSources(allSrcs);
    setRuns(allRuns);
    setReports(allReps);
  };

  useEffect(() => {
    loadAll();
  }, []);

  // Access Protection Check
  if (!user || user.role !== 'admin') {
    return (
      <div className="max-w-md mx-auto py-24 px-4 text-center space-y-4">
        <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600 mx-auto border border-amber-200">
          <Shield className="w-8 h-8" />
        </div>
        <h1 className="text-xl font-bold text-slate-900">Administrator Clearance Required</h1>
        <p className="text-xs text-slate-600 leading-relaxed">
          The Admin Portal is restricted to verified administrators and collection supervisors to maintain data
          trustworthiness.
        </p>

        {user ? (
          <div className="pt-2">
            <button
              onClick={() => switchDemoRole('admin')}
              className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
            >
              Switch My Role to Admin (Demo Evaluator)
            </button>
          </div>
        ) : (
          <div className="pt-2 flex justify-center gap-3">
            <Link
              href="/auth/login"
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold"
            >
              Sign In as Admin
            </Link>
          </div>
        )}
      </div>
    );
  }

  // Handle Publication Status Toggle
  const handleUpdateStatus = async (id: string, newStatus: PublicationStatus) => {
    await updateInternship(id, { publication_status: newStatus });
    setInternships((prev) =>
      prev.map((i) => (i.id === id ? { ...i, publication_status: newStatus } : i))
    );
  };

  // Run Collector Check on a single source
  const handleRunCollector = async (sourceId: string) => {
    setRunningSourceId(sourceId);
    try {
      const run = await runSourceCheck(sourceId);
      setRuns((prev) => [run, ...prev]);
      const updatedSources = await getSources();
      setSources(updatedSources);
    } finally {
      setRunningSourceId(null);
    }
  };

  // Create Internship Form Submit
  const handleCreateInternship = async (e: React.FormEvent) => {
    e.preventDefault();
    setInternshipError(null);

    // Validation
    if (!newInternshipData.title || !newInternshipData.organization || !newInternshipData.description) {
      setInternshipError('Title, organization, and description are required.');
      return;
    }
    if (!newInternshipData.official_application_url || !newInternshipData.original_source_url) {
      setInternshipError('Both official application URL and original source URL are required.');
      return;
    }

    // Duplicate Check
    const isDuplicate = internships.some(
      (i) =>
        i.official_application_url.toLowerCase() ===
          newInternshipData.official_application_url?.toLowerCase() ||
        (i.title.toLowerCase() === newInternshipData.title?.toLowerCase() &&
          i.organization.toLowerCase() === newInternshipData.organization?.toLowerCase())
    );

    if (isDuplicate) {
      if (!confirm('Warning: A listing with the same application URL or title already exists. Proceed anyway?')) {
        return;
      }
    }

    const created = await createInternship(
      newInternshipData as Omit<Internship, 'id' | 'created_at' | 'updated_at'>
    );
    setInternships([created, ...internships]);
    setShowAddInternshipModal(false);
    alert('Internship listing verified and created successfully!');
  };

  // Create Source Form Submit
  const handleCreateSource = async (e: React.FormEvent) => {
    e.preventDefault();
    setSourceError(null);

    if (!newSourceData.name || !newSourceData.official_domain || !newSourceData.opportunity_page_url) {
      setSourceError('Institution name, official domain, and opportunity URL are required.');
      return;
    }

    const created = await createSource(
      newSourceData as Omit<Source, 'id' | 'created_at' | 'updated_at'>
    );
    setSources([created, ...sources]);
    setShowAddSourceModal(false);
    alert('Trusted source added to directory!');
  };

  // Handle Report Review
  const handleReportAction = async (reportId: string, newStatus: Report['status']) => {
    await updateReportStatus(reportId, newStatus, 'Reviewed and actioned by admin.');
    setReports((prev) =>
      prev.map((r) => (r.id === reportId ? { ...r, status: newStatus } : r))
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Admin Header */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 sm:p-8 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Shield className="w-5 h-5" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Admin & Verification Console</h1>
          </div>
          <p className="text-xs text-slate-400 max-w-xl leading-relaxed">
            Manage trusted Indian institutional sources, review and publish opportunities, monitor data collectors,
            and resolve user feedback reports.
          </p>
        </div>

        {/* Global Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700">
            <span className="text-slate-400 block text-[10px] uppercase font-semibold">Opportunities</span>
            <span className="text-lg font-bold text-white">{internships.length}</span>
          </div>
          <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700">
            <span className="text-slate-400 block text-[10px] uppercase font-semibold">Sources</span>
            <span className="text-lg font-bold text-white">{sources.length}</span>
          </div>
          <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700">
            <span className="text-slate-400 block text-[10px] uppercase font-semibold">Pipeline Runs</span>
            <span className="text-lg font-bold text-emerald-400">{runs.length}</span>
          </div>
          <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700">
            <span className="text-slate-400 block text-[10px] uppercase font-semibold">Reports</span>
            <span className="text-lg font-bold text-amber-400">
              {reports.filter((r) => r.status === 'pending').length}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-slate-200 gap-4 text-xs font-bold overflow-x-auto">
        <button
          onClick={() => setActiveTab('internships')}
          className={`pb-3 border-b-2 transition flex items-center gap-2 ${
            activeTab === 'internships'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <span>Internship Listings ({internships.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('sources')}
          className={`pb-3 border-b-2 transition flex items-center gap-2 ${
            activeTab === 'sources'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <span>Trusted Sources ({sources.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('pipeline')}
          className={`pb-3 border-b-2 transition flex items-center gap-2 ${
            activeTab === 'pipeline'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Bot className="w-4 h-4" />
          <span>Automation Runs ({runs.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('reports')}
          className={`pb-3 border-b-2 transition flex items-center gap-2 ${
            activeTab === 'reports'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Flag className="w-4 h-4" />
          <span>User Reports ({reports.length})</span>
        </button>
      </div>

      {/* TAB 1: INTERNSHIPS */}
      {activeTab === 'internships' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900">Curated & Verified Internship Listings</h2>
              <p className="text-xs text-slate-500">
                Control publication status, run SSRF-safe link verification, and audit mandatory eligibility criteria.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleCheckAllLinks}
                disabled={checkingAllLinks}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-semibold shadow-xs transition disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${checkingAllLinks ? 'animate-spin' : ''}`} />
                <span>{checkingAllLinks ? 'Auditing Links...' : 'Verify All Links'}</span>
              </button>

              <button
                onClick={() => setShowAddInternshipModal(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs transition"
              >
                <Plus className="w-4 h-4" />
                <span>Add Verified Internship</span>
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Opportunity</th>
                    <th className="py-3 px-4">Organization</th>
                    <th className="py-3 px-4">Stipend</th>
                    <th className="py-3 px-4">Deadline</th>
                    <th className="py-3 px-4">Link Health</th>
                    <th className="py-3 px-4">Verification</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {internships.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50 transition">
                      <td className="py-3 px-4 max-w-xs font-semibold text-slate-900">
                        <Link href={`/internships/${item.id}`} className="hover:text-indigo-600">
                          {item.title}
                        </Link>
                      </td>
                      <td className="py-3 px-4 text-slate-700 font-medium">{item.organization}</td>
                      <td className="py-3 px-4">
                        {item.stipend_amount ? `₹${item.stipend_amount.toLocaleString()}` : item.stipend_status}
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px]">
                        {item.application_deadline || 'Rolling'}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          title={item.link_check_message || ''}
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold capitalize inline-block ${
                            item.link_status === 'working'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : item.link_status === 'unreachable'
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : item.link_status === 'redirected'
                              ? 'bg-sky-50 text-sky-700 border border-sky-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          {item.link_status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <VerificationBadge status={item.verification_status} showText={false} />
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] font-semibold capitalize ${
                            item.publication_status === 'published'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : item.publication_status === 'expired'
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          {item.publication_status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right space-x-1.5 whitespace-nowrap">
                        <button
                          onClick={() => handleCheckLink(item.id)}
                          disabled={checkingLinkId === item.id}
                          className="px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded text-slate-700 text-[11px] font-medium disabled:opacity-50"
                        >
                          {checkingLinkId === item.id ? 'Checking...' : 'Check Link'}
                        </button>
                        {item.publication_status === 'published' ? (
                          <button
                            onClick={() => handleUpdateStatus(item.id, 'expired')}
                            className="px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded text-slate-700 text-[11px] font-medium"
                          >
                            Mark Expired
                          </button>
                        ) : (
                          <button
                            onClick={() => handleUpdateStatus(item.id, 'published')}
                            className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded text-[11px] font-medium border border-emerald-200"
                          >
                            Publish
                          </button>
                        )}
                        <a
                          href={item.official_application_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1 inline-block text-slate-400 hover:text-indigo-600"
                          title="Open official URL"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: SOURCES */}
      {activeTab === 'sources' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900">Monitored Indian Institutions</h2>
              <p className="text-xs text-slate-500">
                Official domains, monitoring frequency, and on-demand collection triggers.
              </p>
            </div>

            <button
              onClick={() => setShowAddSourceModal(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs transition"
            >
              <Plus className="w-4 h-4" />
              <span>Add Monitored Source</span>
            </button>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Institution Name</th>
                    <th className="py-3 px-4">Domain</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Method</th>
                    <th className="py-3 px-4">Last Checked</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sources.map((src) => (
                    <tr key={src.id} className="hover:bg-slate-50 transition">
                      <td className="py-3 px-4 font-semibold text-slate-900">{src.name}</td>
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-700">{src.official_domain}</td>
                      <td className="py-3 px-4">{src.source_category}</td>
                      <td className="py-3 px-4 font-medium text-slate-700">{src.monitoring_method}</td>
                      <td className="py-3 px-4 font-mono text-[11px]">
                        {src.last_checked
                          ? new Date(src.last_checked).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            }) +
                            ' (' +
                            new Date(src.last_checked).toLocaleDateString() +
                            ')'
                          : 'Never'}
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Active</span>
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleRunCollector(src.id)}
                          disabled={runningSourceId === src.id}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded text-[11px] font-semibold border border-indigo-200 disabled:opacity-50"
                        >
                          <RefreshCw
                            className={`w-3 h-3 ${runningSourceId === src.id ? 'animate-spin' : ''}`}
                          />
                          <span>{runningSourceId === src.id ? 'Checking...' : 'Check Now'}</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: PIPELINE AUTOMATION RUNS */}
      {activeTab === 'pipeline' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Scheduled Data Pipeline & Collection Logs</h2>
              <p className="text-xs text-slate-500">
                Audit trail for automated opportunity extraction, URL validation, and normalization.
              </p>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Source Name</th>
                    <th className="py-3 px-4">Timestamp</th>
                    <th className="py-3 px-4">Discovered</th>
                    <th className="py-3 px-4">New</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Execution Summary</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {runs.map((run) => (
                    <tr key={run.id} className="hover:bg-slate-50 transition">
                      <td className="py-3 px-4 font-semibold text-slate-900">{run.source_name}</td>
                      <td className="py-3 px-4 font-mono text-[11px]">
                        {new Date(run.started_at).toLocaleDateString()}{' '}
                        {new Date(run.started_at).toLocaleTimeString()}
                      </td>
                      <td className="py-3 px-4 font-bold">{run.records_discovered}</td>
                      <td className="py-3 px-4 text-emerald-600 font-bold">{run.records_created}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase">
                          {run.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 max-w-sm text-slate-600 truncate">{run.error_summary}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: USER REPORTS */}
      {activeTab === 'reports' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Student Issue Reports</h2>
              <p className="text-xs text-slate-500">
                Review reports submitted by students regarding broken links or deadline changes.
              </p>
            </div>
          </div>

          {reports.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-xs text-slate-500">
              No reports submitted yet. Everything is running cleanly!
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">Internship</th>
                      <th className="py-3 px-4">Issue Category</th>
                      <th className="py-3 px-4">Description</th>
                      <th className="py-3 px-4">Reporter</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {reports.map((rep) => (
                      <tr key={rep.id} className="hover:bg-slate-50 transition">
                        <td className="py-3 px-4 font-semibold text-slate-900 max-w-xs truncate">
                          {rep.internship_title || rep.internship_id}
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-amber-50 text-amber-800 border border-amber-200 capitalize">
                            {rep.category.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="py-3 px-4 max-w-sm text-slate-700">{rep.description}</td>
                        <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                          {rep.reporter_email || 'Anonymous'}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] font-bold uppercase ${
                              rep.status === 'resolved'
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {rep.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right space-x-1.5">
                          {rep.status === 'pending' && (
                            <>
                              <button
                                onClick={() => handleReportAction(rep.id, 'resolved')}
                                className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded text-[11px] font-semibold border border-emerald-200"
                              >
                                Resolve
                              </button>
                              <button
                                onClick={() => handleReportAction(rep.id, 'dismissed')}
                                className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded text-[11px] font-semibold"
                              >
                                Dismiss
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODAL: ADD VERIFIED INTERNSHIP */}
      {showAddInternshipModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 text-slate-900 border border-slate-200 my-8 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-base text-slate-900">Add Verified Internship Opportunity</h3>
              <button
                onClick={() => setShowAddInternshipModal(false)}
                className="p-1 text-slate-400 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            {internshipError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs">
                {internshipError}
              </div>
            )}

            <form onSubmit={handleCreateInternship} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">
                    Internship Title <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newInternshipData.title || ''}
                    onChange={(e) => setNewInternshipData({ ...newInternshipData, title: e.target.value })}
                    placeholder="e.g. Summer Research Internship in Quantum Computing"
                    className="w-full py-2 px-3 border border-slate-200 rounded-lg text-slate-800"
                    required
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Organization / Institution <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newInternshipData.organization || ''}
                    onChange={(e) =>
                      setNewInternshipData({ ...newInternshipData, organization: e.target.value })
                    }
                    placeholder="e.g. IIT Delhi"
                    className="w-full py-2 px-3 border border-slate-200 rounded-lg text-slate-800"
                    required
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Department</label>
                  <input
                    type="text"
                    value={newInternshipData.department || ''}
                    onChange={(e) =>
                      setNewInternshipData({ ...newInternshipData, department: e.target.value })
                    }
                    placeholder="e.g. Department of Computer Science & Engineering"
                    className="w-full py-2 px-3 border border-slate-200 rounded-lg text-slate-800"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">
                    Opportunity Description <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    value={newInternshipData.description || ''}
                    onChange={(e) =>
                      setNewInternshipData({ ...newInternshipData, description: e.target.value })
                    }
                    placeholder="Comprehensive description of research objectives, mentors, and deliverables..."
                    rows={3}
                    className="w-full p-2.5 border border-slate-200 rounded-lg text-slate-800"
                    required
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Primary Discipline</label>
                  <select
                    value={newInternshipData.eligible_disciplines?.[0] || 'Engineering and Technology'}
                    onChange={(e) =>
                      setNewInternshipData({ ...newInternshipData, eligible_disciplines: [e.target.value] })
                    }
                    className="w-full py-2 px-3 border border-slate-200 rounded-lg bg-white text-slate-800"
                  >
                    {DISCIPLINES.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Eligible Year</label>
                  <select
                    value={newInternshipData.eligible_years?.[0] || '3rd Year'}
                    onChange={(e) =>
                      setNewInternshipData({ ...newInternshipData, eligible_years: [e.target.value] })
                    }
                    className="w-full py-2 px-3 border border-slate-200 rounded-lg bg-white text-slate-800"
                  >
                    {YEARS.map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Stipend Status</label>
                  <select
                    value={newInternshipData.stipend_status || 'paid'}
                    onChange={(e) =>
                      setNewInternshipData({
                        ...newInternshipData,
                        stipend_status: e.target.value as Internship['stipend_status'],
                      })
                    }
                    className="w-full py-2 px-3 border border-slate-200 rounded-lg bg-white text-slate-800"
                  >
                    <option value="paid">Paid (Stipend Provided)</option>
                    <option value="unpaid">Unpaid / Research Credit</option>
                    <option value="stipend_not_specified">Not Specified</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Stipend Amount (₹)</label>
                  <input
                    type="number"
                    value={newInternshipData.stipend_amount || 0}
                    onChange={(e) =>
                      setNewInternshipData({ ...newInternshipData, stipend_amount: Number(e.target.value) })
                    }
                    className="w-full py-2 px-3 border border-slate-200 rounded-lg text-slate-800"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Application Deadline</label>
                  <input
                    type="date"
                    value={newInternshipData.application_deadline || ''}
                    onChange={(e) =>
                      setNewInternshipData({ ...newInternshipData, application_deadline: e.target.value })
                    }
                    className="w-full py-2 px-3 border border-slate-200 rounded-lg text-slate-800"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Location & Format</label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={newInternshipData.location || 'New Delhi'}
                      onChange={(e) =>
                        setNewInternshipData({ ...newInternshipData, location: e.target.value })
                      }
                      placeholder="City / State"
                      className="w-full py-2 px-2.5 border border-slate-200 rounded-lg text-slate-800"
                    />
                    <select
                      value={newInternshipData.format || 'onsite'}
                      onChange={(e) =>
                        setNewInternshipData({
                          ...newInternshipData,
                          format: e.target.value as Internship['format'],
                        })
                      }
                      className="w-full py-2 px-2 border border-slate-200 rounded-lg bg-white text-slate-800 capitalize"
                    >
                      <option value="onsite">Onsite</option>
                      <option value="remote">Remote</option>
                      <option value="hybrid">Hybrid</option>
                    </select>
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">
                    Official Application Portal URL <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="url"
                    value={newInternshipData.official_application_url || ''}
                    onChange={(e) =>
                      setNewInternshipData({
                        ...newInternshipData,
                        official_application_url: e.target.value,
                      })
                    }
                    placeholder="https://iitd.ac.in/internships/apply"
                    className="w-full py-2 px-3 border border-slate-200 rounded-lg text-slate-800 font-mono text-[11px]"
                    required
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">
                    Original Source Notice URL <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="url"
                    value={newInternshipData.original_source_url || ''}
                    onChange={(e) =>
                      setNewInternshipData({ ...newInternshipData, original_source_url: e.target.value })
                    }
                    placeholder="https://iitd.ac.in/notice_pdf.pdf"
                    className="w-full py-2 px-3 border border-slate-200 rounded-lg text-slate-800 font-mono text-[11px]"
                    required
                  />
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddInternshipModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-xs"
                >
                  Verify & Publish Listing
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD TRUSTED SOURCE */}
      {showAddSourceModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 text-slate-900 border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-base text-slate-900">Add Monitored Indian Source</h3>
              <button onClick={() => setShowAddSourceModal(false)} className="p-1 text-slate-400 hover:text-slate-700">
                ✕
              </button>
            </div>

            {sourceError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs">
                {sourceError}
              </div>
            )}

            <form onSubmit={handleCreateSource} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Institution Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={newSourceData.name || ''}
                  onChange={(e) => setNewSourceData({ ...newSourceData, name: e.target.value })}
                  placeholder="e.g. National Institute of Technology Trichy (NITT)"
                  className="w-full py-2 px-3 border border-slate-200 rounded-lg text-slate-800"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Official Institutional Domain <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={newSourceData.official_domain || ''}
                  onChange={(e) => setNewSourceData({ ...newSourceData, official_domain: e.target.value })}
                  placeholder="e.g. nitt.edu"
                  className="w-full py-2 px-3 border border-slate-200 rounded-lg text-slate-800 font-mono text-[11px]"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Category</label>
                  <select
                    value={newSourceData.source_category || 'NIT'}
                    onChange={(e) =>
                      setNewSourceData({
                        ...newSourceData,
                        source_category: e.target.value as Source['source_category'],
                      })
                    }
                    className="w-full py-2 px-3 border border-slate-200 rounded-lg bg-white text-slate-800"
                  >
                    {SOURCE_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Monitoring Method</label>
                  <select
                    value={newSourceData.monitoring_method || 'HTML Scraping'}
                    onChange={(e) =>
                      setNewSourceData({
                        ...newSourceData,
                        monitoring_method: e.target.value as Source['monitoring_method'],
                      })
                    }
                    className="w-full py-2 px-3 border border-slate-200 rounded-lg bg-white text-slate-800"
                  >
                    <option value="HTML Scraping">HTML Scraping</option>
                    <option value="API">API</option>
                    <option value="RSS">RSS Feed</option>
                    <option value="Manual Verification">Manual Verification</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Opportunity Portal Page URL <span className="text-rose-500">*</span>
                </label>
                <input
                  type="url"
                  value={newSourceData.opportunity_page_url || ''}
                  onChange={(e) =>
                    setNewSourceData({ ...newSourceData, opportunity_page_url: e.target.value })
                  }
                  placeholder="https://www.nitt.edu/home/internships"
                  className="w-full py-2 px-3 border border-slate-200 rounded-lg text-slate-800 font-mono text-[11px]"
                  required
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddSourceModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-xs"
                >
                  Save Monitored Source
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
