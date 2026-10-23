'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Internship, EligibilityEvaluation } from '@/types';
import { VerificationBadge } from '@/components/ui/VerificationBadge';
import { useAuth } from '@/lib/auth-context';
import { saveInternship, unsaveInternship } from '@/lib/data-service';
import {
  Calendar,
  MapPin,
  IndianRupee,
  Bookmark,
  BookmarkCheck,
  Building,
  GraduationCap,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Info,
} from 'lucide-react';

interface Props {
  internship: Internship;
  isSavedInitial?: boolean;
  onSaveToggle?: (isSaved: boolean) => void;
  highlightReason?: string;
  evaluation?: EligibilityEvaluation;
}

export function InternshipCard({
  internship,
  isSavedInitial = false,
  onSaveToggle,
  highlightReason,
  evaluation,
}: Props) {
  const { user } = useAuth();
  const [isSaved, setIsSaved] = useState(isSavedInitial);
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user) {
      alert('Please log in or create a student profile to save opportunities.');
      return;
    }

    setIsSaving(true);
    try {
      if (isSaved) {
        await unsaveInternship(user.id, internship.id);
        setIsSaved(false);
        onSaveToggle?.(false);
      } else {
        await saveInternship(user.id, internship.id, 'Interested');
        setIsSaved(true);
        onSaveToggle?.(true);
      }
    } catch (err) {
      console.error('Failed to toggle saved status:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // Calculate days remaining until deadline
  const daysRemaining = internship.application_deadline
    ? Math.ceil(
        (new Date(internship.application_deadline).getTime() - new Date().getTime()) /
          (1000 * 60 * 60 * 24)
      )
    : null;

  const isClosingSoon =
    internship.application_status === 'closing_soon' ||
    (daysRemaining !== null && daysRemaining > 0 && daysRemaining <= 14);
  const isExpired =
    internship.application_status === 'closed' || (daysRemaining !== null && daysRemaining < 0);

  return (
    <div className="bg-white rounded-xl border border-slate-200/90 hover:border-indigo-300 hover:shadow-md transition-all duration-200 flex flex-col justify-between overflow-hidden group">
      {/* Top Banner / Match Highlight */}
      {highlightReason && (
        <div className="bg-indigo-50/90 text-indigo-800 px-4 py-1.5 text-xs font-medium border-b border-indigo-100 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-indigo-600 flex-shrink-0" />
          <span className="truncate">{highlightReason}</span>
        </div>
      )}

      <div className="p-5 flex-1 flex flex-col">
        {/* Verification and Type Badges */}
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <VerificationBadge status={internship.verification_status} />

            {/* Application Status Badge */}
            {internship.application_status === 'upcoming' && (
              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-sky-50 text-sky-700 border border-sky-200">
                Opening Soon
              </span>
            )}
            {internship.application_status === 'closing_soon' && (
              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 animate-pulse">
                Closing Soon
              </span>
            )}
            {internship.application_status === 'closed' && (
              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                Closed
              </span>
            )}

            {/* Eligibility Evaluation Badge (if provided) */}
            {evaluation && (
              <>
                {evaluation.isEligible && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                    <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                    Eligible
                  </span>
                )}
                {evaluation.isPotentialMatch && (
                  <span
                    title={evaluation.unconfirmedCriteria[0] || 'Check specific requirements'}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200"
                  >
                    <AlertCircle className="w-3 h-3 text-amber-600" />
                    Check Requirements
                  </span>
                )}
                {evaluation.isNotEligible && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                    Not Eligible
                  </span>
                )}
              </>
            )}

            {/* Link Health Warning Tag */}
            {internship.link_status === 'unreachable' && (
              <span
                title="Institutional subdomain is active only during open intake windows"
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-800 border border-amber-200"
              >
                <AlertTriangle className="w-3 h-3 text-amber-600" />
                Intake Window Only
              </span>
            )}
            {internship.link_status === 'needs_manual_verification' && (
              <span
                title="Institutional server requires manual browser certificate acceptance"
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-700 border border-slate-200"
              >
                <Info className="w-3 h-3 text-slate-500" />
                Manual Portal Link
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 ml-auto">
            {/* Format Badge */}
            <span
              className={`px-2 py-0.5 rounded text-[11px] font-medium capitalize ${
                internship.format === 'remote'
                  ? 'bg-purple-50 text-purple-700 border border-purple-200'
                  : internship.format === 'hybrid'
                  ? 'bg-sky-50 text-sky-700 border border-sky-200'
                  : 'bg-slate-100 text-slate-700'
              }`}
            >
              {internship.format}
            </span>

            {/* Save Bookmark button */}
            <button
              onClick={handleSaveClick}
              disabled={isSaving}
              aria-label={isSaved ? 'Remove from saved' : 'Save internship'}
              className={`p-1.5 rounded-lg border transition ${
                isSaved
                  ? 'bg-indigo-50 border-indigo-300 text-indigo-600'
                  : 'bg-white border-slate-200 text-slate-400 hover:text-slate-600 hover:border-slate-300'
              }`}
            >
              {isSaved ? (
                <BookmarkCheck className="w-4 h-4 fill-indigo-600 text-indigo-600" />
              ) : (
                <Bookmark className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        {/* Title & Organization */}
        <div className="mb-3">
          <Link href={`/internships/${internship.id}`}>
            <h3 className="text-base font-bold text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-2 leading-snug">
              {internship.title}
            </h3>
          </Link>
          <div className="flex items-center gap-1.5 mt-1 text-slate-600 text-xs font-medium">
            <Building className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
            <span className="truncate font-semibold text-slate-700">{internship.organization}</span>
          </div>
          {internship.department && (
            <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1 pl-5">
              {internship.department}
            </p>
          )}
        </div>

        {/* Snippet Description */}
        <p className="text-xs text-slate-600 line-clamp-2 mb-4 leading-relaxed">
          {internship.description}
        </p>

        {/* Key Metrics / Pills */}
        <div className="grid grid-cols-2 gap-2 mt-auto pt-3 border-t border-slate-100 text-xs text-slate-600">
          {/* Stipend */}
          <div className="flex items-center gap-1.5">
            <IndianRupee className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
            <span className="truncate font-semibold text-slate-800">
              {internship.stipend_status === 'paid' && internship.stipend_amount
                ? `₹${internship.stipend_amount.toLocaleString()} ${
                    internship.stipend_frequency || '/mo'
                  }`
                : internship.stipend_status === 'unpaid'
                ? 'Unpaid / Experience'
                : 'Stipend Not Specified'}
            </span>
          </div>

          {/* Location */}
          <div className="flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
            <span className="truncate text-slate-700">{internship.location}</span>
          </div>

          {/* Eligibility Year */}
          <div className="flex items-center gap-1.5">
            <GraduationCap className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
            <span className="truncate text-slate-700">
              {internship.eligible_years && internship.eligible_years.length > 0
                ? internship.eligible_years.join(', ')
                : 'All UG Years'}
            </span>
          </div>

          {/* Deadline */}
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
            <span
              className={`truncate font-medium ${
                isExpired
                  ? 'text-rose-600 font-bold'
                  : isClosingSoon
                  ? 'text-amber-700 font-bold'
                  : 'text-slate-700'
              }`}
            >
              {internship.application_deadline
                ? isExpired
                  ? 'Deadline Passed'
                  : isClosingSoon
                  ? `${daysRemaining}d left (${new Date(
                      internship.application_deadline
                    ).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })})`
                  : new Date(internship.application_deadline).toLocaleDateString('en-IN', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })
                : 'Rolling Admissions'}
            </span>
          </div>
        </div>
      </div>

      {/* Card Footer Action */}
      <div className="bg-slate-50/80 px-5 py-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
        <span className="text-[11px] text-slate-500">
          Duration: <strong className="text-slate-700">{internship.duration}</strong>
        </span>

        <Link
          href={`/internships/${internship.id}`}
          className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 group-hover:text-indigo-800 transition"
        >
          <span>View Details</span>
          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </div>
    </div>
  );
}
