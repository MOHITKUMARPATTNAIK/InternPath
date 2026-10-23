'use client';

import React, { useState } from 'react';
import { Internship, ReportCategory } from '@/types';
import { useAuth } from '@/lib/auth-context';
import { submitReport } from '@/lib/data-service';
import { Flag, X, CheckCircle, AlertTriangle } from 'lucide-react';

interface Props {
  internship: Internship;
  isOpen: boolean;
  onClose: () => void;
}

export function ReportModal({ internship, isOpen, onClose }: Props) {
  const { user } = useAuth();
  const [category, setCategory] = useState<ReportCategory>('expired_listing');
  const [description, setDescription] = useState('');
  const [email, setEmail] = useState(user?.email || '');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (description.trim().length < 10) {
      setError('Please provide at least 10 characters explaining the issue.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await submitReport({
        internship_id: internship.id,
        internship_title: internship.title,
        organization: internship.organization,
        reporter_id: user?.id,
        reporter_email: email || undefined,
        category,
        description,
      });
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setDescription('');
        onClose();
      }, 2000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to submit report. Please try again.';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 text-slate-900 border border-slate-200">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-rose-50 text-rose-600">
              <Flag className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900">Report Listing Issue</h3>
              <p className="text-[11px] text-slate-500 truncate max-w-[260px]">{internship.title}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {success ? (
          <div className="py-8 text-center space-y-2">
            <CheckCircle className="w-10 h-10 text-emerald-500 mx-auto" />
            <h4 className="text-sm font-bold text-slate-900">Report Submitted</h4>
            <p className="text-xs text-slate-600 max-w-xs mx-auto">
              Thank you for keeping InternPath trustworthy. Our verification team will review this notice.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-4 space-y-4 text-xs">
            {error && (
              <div className="p-3 bg-rose-50 text-rose-700 rounded-lg flex items-center gap-2 text-xs border border-rose-200">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Issue Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as ReportCategory)}
                className="w-full py-2 px-3 border border-slate-200 rounded-lg bg-white text-slate-800 focus:ring-1 focus:ring-indigo-500"
              >
                <option value="expired_listing">Application Deadline has Passed / Closed</option>
                <option value="broken_url">Official Application URL is Broken / 404</option>
                <option value="incorrect_info">Eligibility, Stipend or Dates are Incorrect</option>
                <option value="suspicious_link">Suspicious Link / Non-Official Domain</option>
                <option value="other">Other Concern</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Details & Verification Notes <span className="text-rose-500">*</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Please describe what changed on the official site (e.g. 'The deadline was extended to Nov 15th on the portal' or 'Application form throws error 404')."
                rows={3}
                className="w-full p-2.5 border border-slate-200 rounded-lg text-slate-800 placeholder:text-slate-400 focus:ring-1 focus:ring-indigo-500"
                required
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Your Email Address (Optional for follow-up)
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your.email@college.edu"
                className="w-full py-2 px-3 border border-slate-200 rounded-lg text-slate-800 focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-lg shadow-2xs transition disabled:opacity-50"
              >
                {submitting ? 'Submitting...' : 'Submit Report'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
