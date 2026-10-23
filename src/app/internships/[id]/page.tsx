'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Internship, Source, PersonalApplicationStatus } from '@/types';
import { getInternshipById, getSourceById, saveInternship, getSavedInternships, unsaveInternship } from '@/lib/data-service';
import { useAuth } from '@/lib/auth-context';
import { evaluateEligibility } from '@/lib/eligibility-engine';
import { VerificationBadge } from '@/components/ui/VerificationBadge';
import { ReportModal } from '@/components/internships/ReportModal';
import {
  Building,
  Calendar,
  Clock,
  MapPin,
  IndianRupee,
  FileText,
  CheckCircle,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  HelpCircle,
  XCircle,
  ExternalLink,
  ArrowLeft,
  Bookmark,
  BookmarkCheck,
  Flag,
  ShieldCheck,
  GraduationCap,
  Share2,
  Info,
} from 'lucide-react';

export default function InternshipDetailPage() {
  const params = useParams();
  const { user, profile } = useAuth();
  const internshipId = params.id as string;

  const [internship, setInternship] = useState<Internship | null>(null);
  const [source, setSource] = useState<Source | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSaved, setIsSaved] = useState(false);
  const [savedStatus, setSavedStatus] = useState<PersonalApplicationStatus>('Interested');
  const [userNotes, setUserNotes] = useState('');
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [showApplyWarning, setShowApplyWarning] = useState(false);
  const [savingNotes, setSavingNotes] = useState(false);

  useEffect(() => {
    async function loadData() {
      if (!internshipId) return;
      setLoading(true);
      const data = await getInternshipById(internshipId);
      setInternship(data);

      if (data?.source_id) {
        const src = await getSourceById(data.source_id);
        setSource(src);
      }

      if (user) {
        const savedList = await getSavedInternships(user.id);
        const match = savedList.find((s) => s.internship_id === internshipId);
        if (match) {
          setIsSaved(true);
          setSavedStatus(match.personal_status);
          setUserNotes(match.notes || '');
        }
      }
      setLoading(false);
    }
    loadData();
  }, [internshipId, user]);

  const handleSaveToggle = async () => {
    if (!user) {
      alert('Please log in or sign up to bookmark this opportunity.');
      return;
    }

    if (isSaved) {
      await unsaveInternship(user.id, internshipId);
      setIsSaved(false);
    } else {
      await saveInternship(user.id, internshipId, savedStatus, userNotes);
      setIsSaved(true);
    }
  };

  const handleStatusChange = async (newStatus: PersonalApplicationStatus) => {
    setSavedStatus(newStatus);
    if (user && isSaved) {
      await saveInternship(user.id, internshipId, newStatus, userNotes);
    }
  };

  const handleNotesSave = async () => {
    if (!user) return;
    setSavingNotes(true);
    await saveInternship(user.id, internshipId, savedStatus, userNotes);
    setSavingNotes(false);
  };

  if (loading) {
    return (
      <div className="py-24 text-center">
        <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs text-slate-500 font-medium mt-3">Loading official opportunity details...</p>
      </div>
    );
  }

  if (!internship) {
    return (
      <div className="max-w-md mx-auto py-20 px-4 text-center space-y-4">
        <h2 className="text-lg font-bold text-slate-800">Opportunity Not Found</h2>
        <p className="text-xs text-slate-500">
          The internship record you are looking for does not exist or has been archived.
        </p>
        <Link
          href="/internships"
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Explore</span>
        </Link>
      </div>
    );
  }

  const daysRemaining = internship.application_deadline
    ? Math.ceil(
        (new Date(internship.application_deadline).getTime() - new Date().getTime()) /
          (1000 * 60 * 60 * 24)
      )
    : null;

  const evaluation = evaluateEligibility(internship, profile);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Back button & Breadcrumbs */}
      <div className="flex items-center justify-between">
        <Link
          href="/internships"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-indigo-600 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to All Internships</span>
        </Link>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              if (navigator.clipboard) {
                navigator.clipboard.writeText(window.location.href);
                alert('Opportunity link copied to clipboard!');
              }
            }}
            className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50 text-xs flex items-center gap-1"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Share</span>
          </button>

          <button
            onClick={() => setReportModalOpen(true)}
            className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-rose-600 hover:bg-rose-50 text-xs flex items-center gap-1 transition"
          >
            <Flag className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Report Issue</span>
          </button>
        </div>
      </div>

      {/* Main Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-100">
          <div className="space-y-3 max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <VerificationBadge status={internship.verification_status} />
              <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700 capitalize">
                Format: {internship.format}
              </span>
              {internship.application_status === 'upcoming' && (
                <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-sky-50 text-sky-700 border border-sky-200">
                  Applications Opening Soon
                </span>
              )}
              {internship.application_status === 'closing_soon' && (
                <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 animate-pulse">
                  Closing Soon
                </span>
              )}
              {internship.is_demo && (
                <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200">
                  Demo Seed Record
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight leading-snug">
              {internship.title}
            </h1>

            <div className="flex flex-wrap items-center gap-y-2 gap-x-4 text-xs font-medium text-slate-600">
              <div className="flex items-center gap-1.5">
                <Building className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                <span className="font-bold text-slate-800">{internship.organization}</span>
              </div>
              {internship.department && (
                <div className="text-slate-500">
                  <span>•</span> <span className="ml-2">{internship.department}</span>
                </div>
              )}
            </div>
          </div>

          {/* Action CTAs */}
          <div className="flex flex-col sm:flex-row lg:flex-col gap-2.5 lg:min-w-[220px]">
            <button
              onClick={() => setShowApplyWarning(true)}
              className="w-full py-3 px-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs shadow-md transition flex items-center justify-center gap-2"
            >
              <span>Apply on Official Website</span>
              <ExternalLink className="w-4 h-4" />
            </button>

            <button
              onClick={handleSaveToggle}
              className={`w-full py-2.5 px-4 rounded-xl font-semibold text-xs border transition flex items-center justify-center gap-2 ${
                isSaved
                  ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              {isSaved ? (
                <>
                  <BookmarkCheck className="w-4 h-4 text-indigo-600 fill-indigo-600" />
                  <span>Saved in Tracker</span>
                </>
              ) : (
                <>
                  <Bookmark className="w-4 h-4 text-slate-500" />
                  <span>Save for Later</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Link Health Advisory Banner (if not regular working) */}
        {internship.link_status !== 'working' && (
          <div
            className={`p-4 rounded-xl border text-xs flex items-start gap-3 ${
              internship.link_status === 'unreachable'
                ? 'bg-amber-50/90 border-amber-200 text-amber-900'
                : internship.link_status === 'temporarily_unavailable'
                ? 'bg-sky-50 border-sky-200 text-sky-900'
                : internship.link_status === 'redirected'
                ? 'bg-indigo-50/70 border-indigo-200 text-indigo-900'
                : 'bg-slate-50 border-slate-200 text-slate-800'
            }`}
          >
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <span>
                  Portal Status Note:{' '}
                  {internship.link_status === 'unreachable'
                    ? 'Subdomain Available Only During Intake Window'
                    : internship.link_status === 'temporarily_unavailable'
                    ? 'Institutional Server Temporarily Slow or Timed Out'
                    : internship.link_status === 'needs_manual_verification'
                    ? 'Government NIC Portal (Manual Browser Confirmation)'
                    : 'Redirected to Seasonal Portal'}
                </span>
              </div>
              <p className="leading-relaxed text-[11px]">
                {internship.link_check_message ||
                  'The application link was audited by our verification engine. Please verify using the official source notice link below if direct access is delayed.'}
              </p>
              <div className="pt-1 flex flex-wrap items-center gap-3 text-[11px]">
                <a
                  href={internship.original_source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold underline flex items-center gap-1 text-indigo-700 hover:text-indigo-900"
                >
                  <span>Open Official Guidelines / Notification</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
                <button
                  onClick={() => setReportModalOpen(true)}
                  className="font-semibold text-rose-600 hover:underline"
                >
                  Report Broken Link
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Quick Highlights Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2 text-xs">
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
            <div className="text-[11px] font-semibold text-slate-500 flex items-center gap-1.5 uppercase">
              <IndianRupee className="w-3.5 h-3.5 text-emerald-600" />
              <span>Stipend Support</span>
            </div>
            <div className="mt-1 font-bold text-slate-900 text-sm">
              {internship.stipend_status === 'paid' && internship.stipend_amount
                ? `₹${internship.stipend_amount.toLocaleString()} ${
                    internship.stipend_frequency || '/month'
                  }`
                : internship.stipend_status === 'unpaid'
                ? 'Unpaid / Research Credit'
                : 'Not specified in notice'}
            </div>
          </div>

          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
            <div className="text-[11px] font-semibold text-slate-500 flex items-center gap-1.5 uppercase">
              <Calendar className="w-3.5 h-3.5 text-indigo-600" />
              <span>Application Deadline</span>
            </div>
            <div className="mt-1 font-bold text-slate-900 text-sm">
              {internship.application_deadline
                ? new Date(internship.application_deadline).toLocaleDateString('en-IN', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })
                : 'Rolling Admissions'}
            </div>
            {daysRemaining !== null && (
              <div
                className={`text-[10px] font-medium mt-0.5 ${
                  daysRemaining < 0
                    ? 'text-rose-600 font-bold'
                    : daysRemaining <= 14
                    ? 'text-amber-600 font-bold'
                    : 'text-slate-500'
                }`}
              >
                {daysRemaining < 0
                  ? 'Expired'
                  : daysRemaining === 0
                  ? 'Deadline is Today'
                  : `${daysRemaining} days remaining`}
              </div>
            )}
          </div>

          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
            <div className="text-[11px] font-semibold text-slate-500 flex items-center gap-1.5 uppercase">
              <Clock className="w-3.5 h-3.5 text-indigo-600" />
              <span>Internship Duration</span>
            </div>
            <div className="mt-1 font-bold text-slate-900 text-sm">{internship.duration}</div>
          </div>

          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
            <div className="text-[11px] font-semibold text-slate-500 flex items-center gap-1.5 uppercase">
              <MapPin className="w-3.5 h-3.5 text-indigo-600" />
              <span>Location / Format</span>
            </div>
            <div className="mt-1 font-bold text-slate-900 text-sm capitalize">
              {internship.location} ({internship.format})
            </div>
          </div>
        </div>
      </div>

      {/* Two Column Layout: Description & Requirements on Left, Metadata & Tracker on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column (Details) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Personalized Student Eligibility Evaluation Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
              <div className="flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-indigo-600" />
                <h2 className="text-base font-bold text-slate-900">Your Eligibility Evaluation</h2>
              </div>

              {/* Distinct Status Pill */}
              {evaluation.isEligible && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Eligible</span>
                </span>
              )}
              {evaluation.isPotentialMatch && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-300">
                  <AlertCircle className="w-4 h-4 text-amber-600" />
                  <span>Potential Match — Check Requirements</span>
                </span>
              )}
              {evaluation.isNotEligible && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-300">
                  <XCircle className="w-4 h-4 text-rose-600" />
                  <span>Not Eligible</span>
                </span>
              )}
              {evaluation.isUnknown && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
                  <HelpCircle className="w-4 h-4 text-slate-500" />
                  <span>Eligibility Unknown</span>
                </span>
              )}
            </div>

            {/* Interest & Field Alignment */}
            <div className="text-xs text-slate-700 bg-slate-50 p-3.5 rounded-xl border border-slate-100">
              <span className="font-semibold text-slate-900">Relevance & Academic Discipline: </span>
              <span>{evaluation.interestMatchReason}</span>
            </div>

            {/* Detailed Criteria Checklist */}
            <div className="space-y-3 text-xs">
              {/* Checked & Satisfied Criteria */}
              {evaluation.matchedCriteria.length > 0 && (
                <div className="space-y-1.5">
                  <span className="font-semibold text-emerald-800 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <span>Verified Matching Criteria ({evaluation.matchedCriteria.length})</span>
                  </span>
                  <ul className="space-y-1 pl-6 list-disc text-slate-700 text-[11px]">
                    {evaluation.matchedCriteria.map((c, i) => (
                      <li key={i}>{c}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Unconfirmed Mandatory Criteria */}
              {evaluation.unconfirmedCriteria.length > 0 && (
                <div className="space-y-1.5 bg-amber-50/80 p-3.5 rounded-xl border border-amber-200">
                  <span className="font-semibold text-amber-900 flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                    <span>Unconfirmed Requirements — Verify Before Applying</span>
                  </span>
                  <ul className="space-y-1 pl-6 list-disc text-amber-900 text-[11px]">
                    {evaluation.unconfirmedCriteria.map((c, i) => (
                      <li key={i}>{c}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Conflicting Criteria (If any) */}
              {evaluation.conflictingCriteria.length > 0 && (
                <div className="space-y-1.5 bg-rose-50 p-3.5 rounded-xl border border-rose-200">
                  <span className="font-semibold text-rose-900 flex items-center gap-1.5">
                    <XCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                    <span>Definitive Conflicting Criteria</span>
                  </span>
                  <ul className="space-y-1 pl-6 list-disc text-rose-900 text-[11px]">
                    {evaluation.conflictingCriteria.map((c, i) => (
                      <li key={i}>{c}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Missing Profile Information Alert */}
              {evaluation.profileMissingFields.length > 0 && (
                <div className="p-3.5 bg-indigo-50/80 border border-indigo-100 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="text-indigo-900 leading-relaxed">
                    <strong>Improve Eligibility Precision:</strong> Complete missing fields in your profile (
                    {evaluation.profileMissingFields.join(', ')}) to unlock confirmed matches.
                  </div>
                  <Link
                    href="/profile"
                    className="px-3.5 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 transition flex-shrink-0 text-center"
                  >
                    Update Profile
                  </Link>
                </div>
              )}
            </div>

            {/* Official Authority Reminder */}
            <div className="text-[11px] text-slate-500 pt-2 border-t border-slate-100 flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
              <span>
                The official application page remains the final authority on intake qualifications and seat limits.
              </span>
            </div>
          </div>

          {/* Detailed Description */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-3 shadow-xs">
            <h2 className="text-base font-bold text-slate-900">About the Opportunity</h2>
            <div className="text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-line">
              {internship.description}
            </div>
          </div>

          {/* Academic Eligibility */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-xs">
            <div className="flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-indigo-600" />
              <h2 className="text-base font-bold text-slate-900">Official Eligibility Specifications</h2>
            </div>

            <div className="space-y-3.5 text-xs">
              <div>
                <span className="font-semibold text-slate-700">Eligible Academic Disciplines:</span>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {internship.eligible_disciplines.map((d) => (
                    <span
                      key={d}
                      className="px-2.5 py-1 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-100 text-[11px] font-medium"
                    >
                      {d}
                    </span>
                  ))}
                </div>
              </div>

              {internship.eligible_degrees && internship.eligible_degrees.length > 0 && (
                <div>
                  <span className="font-semibold text-slate-700">Eligible Degree Courses:</span>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {internship.eligible_degrees.map((deg) => (
                      <span
                        key={deg}
                        className="px-2 py-0.5 rounded bg-slate-100 text-slate-800 text-[11px] font-medium border border-slate-200"
                      >
                        {deg}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <span className="font-semibold text-slate-700 block">Minimum Education Level:</span>
                  <p className="text-slate-600 mt-0.5">{internship.min_education_level}</p>
                </div>

                <div>
                  <span className="font-semibold text-slate-700 block">Eligible Undergraduate Years:</span>
                  <p className="text-slate-600 mt-0.5">
                    {internship.eligible_years && internship.eligible_years.length > 0
                      ? internship.eligible_years.join(', ')
                      : 'Open to all enrolled undergraduate students'}
                  </p>
                </div>

                {internship.min_cgpa && (
                  <div>
                    <span className="font-semibold text-slate-700 block">Minimum CGPA Required:</span>
                    <p className="text-slate-800 font-semibold mt-0.5">
                      {internship.min_cgpa} / {internship.cgpa_scale || 10}
                    </p>
                  </div>
                )}

                {internship.min_percentage && (
                  <div>
                    <span className="font-semibold text-slate-700 block">Class 12th Board Cutoff:</span>
                    <p className="text-slate-800 font-semibold mt-0.5">
                      {internship.min_percentage}% or higher
                    </p>
                  </div>
                )}
              </div>

              {internship.institution_restrictions && internship.institution_restrictions.length > 0 && (
                <div>
                  <span className="font-semibold text-slate-700">Institution Restrictions:</span>
                  <div className="mt-1 text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-[11px]">
                    {internship.institution_restrictions.includes('non_iit_only') && (
                      <span className="text-amber-800 font-semibold">
                        Strictly reserved for students enrolled in institutions outside IITs (non-IIT only).
                      </span>
                    )}
                    {internship.institution_restrictions.includes('medical_college_only') && (
                      <span className="text-amber-800 font-semibold">
                        Strictly restricted to students enrolled in recognized Medical/Dental colleges.
                      </span>
                    )}
                    {internship.institution_restrictions.includes('domestic_only') && (
                      <span className="text-slate-700">Open to students studying in recognized domestic universities in India.</span>
                    )}
                    {internship.institution_restrictions.includes('open_all') && (
                      <span className="text-slate-700">Open to recognized universities and colleges pan-India.</span>
                    )}
                  </div>
                </div>
              )}

              {internship.prerequisites_description && (
                <div>
                  <span className="font-semibold text-slate-700">Prerequisite Details:</span>
                  <p className="text-slate-600 mt-0.5 leading-relaxed">{internship.prerequisites_description}</p>
                </div>
              )}

              {internship.required_skills && internship.required_skills.length > 0 && (
                <div>
                  <span className="font-semibold text-slate-700">Prerequisite Skills:</span>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {internship.required_skills.map((s) => (
                      <span
                        key={s}
                        className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px] font-medium"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Benefits and Facilities */}
          {internship.benefits && internship.benefits.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-3 shadow-xs">
              <h2 className="text-base font-bold text-slate-900">Benefits & Campus Facilities</h2>
              <ul className="space-y-2 text-xs text-slate-700">
                {internship.benefits.map((benefit, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                    <span>{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Required Documents */}
          {internship.required_documents && internship.required_documents.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-3 shadow-xs">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-600" />
                <h2 className="text-base font-bold text-slate-900">Required Documents for Application</h2>
              </div>
              <ul className="space-y-2 text-xs text-slate-700">
                {internship.required_documents.map((doc, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 flex-shrink-0" />
                    <span>{doc}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Right Column: Source Verification, Application Tracker & Notes */}
        <div className="space-y-6">
          {/* Institutional Trust Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 shadow-xs">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800">
                Official Verification Details
              </h3>
            </div>

            <div className="space-y-2.5 text-xs text-slate-600">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Hosting Body</span>
                <span className="font-semibold text-slate-900">{internship.organization}</span>
              </div>

              {source && (
                <>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                      Institutional Domain
                    </span>
                    <a
                      href={`https://${source.official_domain}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-indigo-600 hover:underline flex items-center gap-1"
                    >
                      <span>{source.official_domain}</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>

                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                      Monitoring Method
                    </span>
                    <span className="text-slate-800">{source.monitoring_method}</span>
                  </div>
                </>
              )}

              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Last Checked</span>
                <span className="text-slate-800">
                  {internship.last_verified_at
                    ? new Date(internship.last_verified_at).toLocaleDateString('en-IN', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })
                    : 'Recently verified'}
                </span>
              </div>

              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                  Original Source Notice
                </span>
                <a
                  href={internship.original_source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-indigo-600 hover:underline inline-flex items-center gap-1 text-[11px] font-medium break-all"
                >
                  <span>Official Notification Link</span>
                  <ExternalLink className="w-3 h-3 flex-shrink-0" />
                </a>
              </div>
            </div>
          </div>

          {/* Personal Application Tracker (Saved State & Notes) */}
          {user && (
            <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 shadow-xs">
              <div className="flex items-center gap-2">
                <Bookmark className="w-4 h-4 text-indigo-600" />
                <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800">
                  Personal Application Tracker
                </h3>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-600 font-medium mb-1">My Stage:</label>
                  <select
                    value={savedStatus}
                    onChange={(e) => handleStatusChange(e.target.value as PersonalApplicationStatus)}
                    className="w-full py-1.5 px-2.5 border border-slate-200 rounded-lg text-xs bg-slate-50 font-semibold text-slate-800"
                  >
                    <option value="Interested">Interested</option>
                    <option value="Planning to Apply">Planning to Apply</option>
                    <option value="Applied">Application Submitted</option>
                    <option value="Not Pursuing">Not Pursuing</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-600 font-medium mb-1">Personal Notes & Deadlines:</label>
                  <textarea
                    value={userNotes}
                    onChange={(e) => setUserNotes(e.target.value)}
                    placeholder="e.g., Sent NOC request to HOD on Monday; need recommendation letter from Prof. Rao."
                    rows={3}
                    className="w-full p-2 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder:text-slate-400"
                  />
                  <button
                    onClick={handleNotesSave}
                    disabled={savingNotes}
                    className="mt-1.5 px-3 py-1 bg-slate-800 text-white rounded text-[11px] font-semibold hover:bg-slate-900 transition disabled:opacity-50"
                  >
                    {savingNotes ? 'Saving...' : 'Save Notes'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* External Application Notice Modal */}
      {showApplyWarning && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 text-slate-900 border border-slate-200 space-y-4">
            <div className="flex items-center gap-2 text-indigo-600">
              <ExternalLink className="w-5 h-5" />
              <h3 className="font-bold text-base text-slate-900">Redirecting to Official Application Portal</h3>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-xl text-xs text-slate-600 space-y-2 border border-slate-200">
              <p>
                You are about to be redirected to the official website of <strong>{internship.organization}</strong>:
              </p>
              <p className="font-mono text-indigo-700 bg-white p-2 rounded border border-slate-200 break-all text-[11px]">
                {internship.official_application_url}
              </p>
            </div>

            {/* Health Advisory if link has caveats */}
            {internship.link_status !== 'working' && (
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 space-y-1">
                <div className="font-bold flex items-center gap-1">
                  <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                  <span>Important Link Health Note:</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  {internship.link_check_message ||
                    'This institutional portal link may require an active intake session, campus network, or browser certificate confirmation.'}
                </p>
                {internship.original_source_url && (
                  <p className="text-[11px] pt-1 font-medium">
                    Alternatively, view the{' '}
                    <a
                      href={internship.original_source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-700 underline font-semibold"
                    >
                      Official Source Notice
                    </a>{' '}
                    first.
                  </p>
                )}
              </div>
            )}

            <div className="text-xs text-slate-500 leading-relaxed">
              <strong className="text-slate-700">Important:</strong> The selection, shortlisting, and application
              processing are handled exclusively by the hosting institution. InternPath does not process applications or
              charge any fees.
            </div>

            <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100">
              <button
                onClick={() => {
                  setShowApplyWarning(false);
                  setReportModalOpen(true);
                }}
                className="text-[11px] text-rose-600 hover:underline font-medium"
              >
                Link Not Opening? Report Issue
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowApplyWarning(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <a
                  href={internship.official_application_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setShowApplyWarning(false)}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1.5"
                >
                  <span>Continue to Official Website</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Report Modal */}
      <ReportModal
        internship={internship}
        isOpen={reportModalOpen}
        onClose={() => setReportModalOpen(false)}
      />
    </div>
  );
}
