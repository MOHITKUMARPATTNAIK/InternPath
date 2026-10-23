'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { SavedInternship, PersonalApplicationStatus } from '@/types';
import { getSavedInternships, updateSavedStatus, unsaveInternship } from '@/lib/data-service';
import { useAuth } from '@/lib/auth-context';
import { VerificationBadge } from '@/components/ui/VerificationBadge';
import {
  Bookmark,
  Calendar,
  MapPin,
  IndianRupee,
  Trash2,
  Compass,
  FileEdit,
} from 'lucide-react';

const STATUS_OPTIONS: PersonalApplicationStatus[] = [
  'Interested',
  'Planning to Apply',
  'Applied',
  'Not Pursuing',
];

export default function SavedInternshipsPage() {
  const { user } = useAuth();
  const [savedItems, setSavedItems] = useState<SavedInternship[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingNotesId, setEditingNotesId] = useState<string | null>(null);
  const [tempNotes, setTempNotes] = useState('');

  useEffect(() => {
    async function load() {
      if (!user) {
        setLoading(false);
        return;
      }
      setLoading(true);
      const items = await getSavedInternships(user.id);
      setSavedItems(items);
      setLoading(false);
    }
    load();
  }, [user]);

  const handleStatusChange = async (internshipId: string, newStatus: PersonalApplicationStatus) => {
    if (!user) return;
    await updateSavedStatus(user.id, internshipId, newStatus);
    setSavedItems((prev) =>
      prev.map((item) =>
        item.internship_id === internshipId ? { ...item, personal_status: newStatus } : item
      )
    );
  };

  const handleRemove = async (internshipId: string) => {
    if (!user) return;
    await unsaveInternship(user.id, internshipId);
    setSavedItems((prev) => prev.filter((item) => item.internship_id !== internshipId));
  };

  const handleSaveNotes = async (internshipId: string) => {
    if (!user) return;
    const current = savedItems.find((i) => i.internship_id === internshipId);
    if (!current) return;
    await updateSavedStatus(user.id, internshipId, current.personal_status, tempNotes);
    setSavedItems((prev) =>
      prev.map((item) =>
        item.internship_id === internshipId ? { ...item, notes: tempNotes } : item
      )
    );
    setEditingNotesId(null);
  };

  if (!user) {
    return (
      <div className="max-w-md mx-auto py-20 px-4 text-center space-y-4">
        <Bookmark className="w-12 h-12 text-slate-300 mx-auto" />
        <h2 className="text-xl font-bold text-slate-900">Sign in to track saved opportunities</h2>
        <p className="text-xs text-slate-500 leading-relaxed">
          Create or log into your student account to save internships, track your application deadlines, and record
          personal notes.
        </p>
        <div className="flex justify-center gap-3 pt-2">
          <Link
            href="/auth/login"
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700"
          >
            Log In
          </Link>
          <Link
            href="/auth/signup"
            className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-50"
          >
            Create Account
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 gap-2">
        <div>
          <div className="flex items-center gap-2">
            <Bookmark className="w-5 h-5 text-indigo-600" />
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Saved Internships & Tracker</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Personal application tracker. Status updates are managed by you to track deadlines and required paperwork.
          </p>
        </div>

        <Link
          href="/internships"
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
        >
          <Compass className="w-3.5 h-3.5 text-indigo-600" />
          <span>Browse More Opportunities</span>
        </Link>
      </div>

      {loading ? (
        <div className="py-20 text-center">
          <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      ) : savedItems.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center max-w-md mx-auto space-y-4 my-8">
          <div className="w-12 h-12 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600 mx-auto">
            <Bookmark className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-800">You haven&apos;t saved any internships yet</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            When you find opportunities from IITs, research institutions, or government schemes, click the bookmark
            icon to track them here.
          </p>
          <Link
            href="/internships"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs"
          >
            <span>Explore Internships</span>
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {savedItems.map((item) => {
            const internship = item.internship;
            if (!internship) return null;

            const daysRemaining = internship.application_deadline
              ? Math.ceil(
                  (new Date(internship.application_deadline).getTime() - new Date().getTime()) /
                    (1000 * 60 * 60 * 24)
                )
              : null;

            return (
              <div
                key={item.id}
                className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-5 hover:border-slate-300 transition"
              >
                {/* Left Info */}
                <div className="space-y-2 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <VerificationBadge status={internship.verification_status} />
                    <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700 capitalize">
                      {internship.format}
                    </span>
                  </div>

                  <Link href={`/internships/${internship.id}`}>
                    <h3 className="text-base font-bold text-slate-900 hover:text-indigo-600 transition">
                      {internship.title}
                    </h3>
                  </Link>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
                    <span className="font-semibold text-slate-800">{internship.organization}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      {internship.location}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <IndianRupee className="w-3.5 h-3.5 text-emerald-600" />
                      {internship.stipend_status === 'paid' && internship.stipend_amount
                        ? `₹${internship.stipend_amount.toLocaleString()} /mo`
                        : internship.stipend_status === 'unpaid'
                        ? 'Unpaid'
                        : 'Not specified'}
                    </span>
                    <span>•</span>
                    <span
                      className={`flex items-center gap-1 font-medium ${
                        daysRemaining !== null && daysRemaining <= 14 ? 'text-amber-600' : 'text-slate-600'
                      }`}
                    >
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      Deadline:{' '}
                      {internship.application_deadline
                        ? new Date(internship.application_deadline).toLocaleDateString('en-IN', {
                            month: 'short',
                            day: 'numeric',
                          })
                        : 'Rolling'}
                    </span>
                  </div>

                  {/* Notes Section */}
                  <div className="pt-2 text-xs">
                    {editingNotesId === item.internship_id ? (
                      <div className="flex items-center gap-2 max-w-lg">
                        <input
                          type="text"
                          value={tempNotes}
                          onChange={(e) => setTempNotes(e.target.value)}
                          placeholder="Add personal notes (e.g. NOC requested, Prof LOR pending)..."
                          className="flex-1 py-1 px-2 border border-slate-300 rounded text-xs"
                        />
                        <button
                          onClick={() => handleSaveNotes(item.internship_id)}
                          className="px-2.5 py-1 bg-indigo-600 text-white rounded text-xs font-semibold"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingNotesId(null)}
                          className="px-2 py-1 text-slate-500 hover:text-slate-700 text-xs"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-slate-500">
                        <span className="italic">
                          {item.notes ? `Note: "${item.notes}"` : 'No personal notes added.'}
                        </span>
                        <button
                          onClick={() => {
                            setEditingNotesId(item.internship_id);
                            setTempNotes(item.notes || '');
                          }}
                          className="text-indigo-600 hover:underline flex items-center gap-0.5 font-medium text-[11px]"
                        >
                          <FileEdit className="w-3 h-3" />
                          <span>{item.notes ? 'Edit' : 'Add Note'}</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Status Controls */}
                <div className="flex sm:flex-col items-center sm:items-end justify-between gap-3 border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100">
                  <div className="space-y-1 text-right">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Stage</span>
                    <select
                      value={item.personal_status}
                      onChange={(e) =>
                        handleStatusChange(item.internship_id, e.target.value as PersonalApplicationStatus)
                      }
                      className="py-1 px-2.5 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 bg-slate-50"
                    >
                      {STATUS_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center gap-2">
                    <Link
                      href={`/internships/${internship.id}`}
                      className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold transition"
                    >
                      Details
                    </Link>

                    <button
                      onClick={() => handleRemove(item.internship_id)}
                      title="Remove from saved"
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
