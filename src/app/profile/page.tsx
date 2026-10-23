'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { UserProfile } from '@/types';
import { getRecommendedInternships, ScoredInternship } from '@/lib/data-service';
import { InternshipCard } from '@/components/internships/InternshipCard';
import { DISCIPLINES, YEARS } from '@/components/internships/InternshipFilters';
import {
  User,
  GraduationCap,
  Sparkles,
  Save,
  CheckCircle,
  Plus,
  X,
  Target,
  Compass,
  Building,
} from 'lucide-react';

export default function ProfilePage() {
  const { user, profile, updateProfile } = useAuth();
  const [formData, setFormData] = useState<Partial<UserProfile>>({
    display_name: '',
    college: '',
    degree: '',
    academic_year: '3rd Year',
    academic_background: 'Engineering and Technology',
    primary_interest: '',
    secondary_interests: [],
    skills: [],
    career_goals: '',
    preferred_format: 'Any',
    preferred_locations: [],
    min_stipend_preference: 0,
    duration_preference: '2 Months',
  });

  const [newSkill, setNewSkill] = useState('');
  const [newInterest, setNewInterest] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [recommended, setRecommended] = useState<ScoredInternship[]>([]);
  const [activeTab, setActiveTab] = useState<'profile' | 'recommendations'>('profile');

  useEffect(() => {
    if (profile) {
      setFormData(profile);
      getRecommendedInternships(profile).then(setRecommended);
    }
  }, [profile]);

  if (!user) {
    return (
      <div className="max-w-md mx-auto py-20 px-4 text-center space-y-4">
        <User className="w-12 h-12 text-slate-300 mx-auto" />
        <h2 className="text-xl font-bold text-slate-900">Sign in to manage your profile</h2>
        <p className="text-xs text-slate-500 leading-relaxed">
          Create your student profile to receive tailored, eligibility-checked internship recommendations.
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
            Create Profile
          </Link>
        </div>
      </div>
    );
  }

  const handleAddSkill = (e: React.FormEvent) => {
    e.preventDefault();
    if (newSkill.trim() && !formData.skills?.includes(newSkill.trim())) {
      setFormData({
        ...formData,
        skills: [...(formData.skills || []), newSkill.trim()],
      });
      setNewSkill('');
    }
  };

  const handleRemoveSkill = (skill: string) => {
    setFormData({
      ...formData,
      skills: formData.skills?.filter((s) => s !== skill),
    });
  };

  const handleAddInterest = (e: React.FormEvent) => {
    e.preventDefault();
    if (newInterest.trim() && !formData.secondary_interests?.includes(newInterest.trim())) {
      setFormData({
        ...formData,
        secondary_interests: [...(formData.secondary_interests || []), newInterest.trim()],
      });
      setNewInterest('');
    }
  };

  const handleRemoveInterest = (interest: string) => {
    setFormData({
      ...formData,
      secondary_interests: formData.secondary_interests?.filter((i) => i !== interest),
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveSuccess(false);

    await updateProfile(formData);

    // Refresh recommendations
    if (profile) {
      const recs = await getRecommendedInternships({ ...profile, ...formData } as UserProfile);
      setRecommended(recs);
    }

    setSaving(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header Profile Summary */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-600 to-indigo-800 text-white flex items-center justify-center font-bold text-2xl shadow-md uppercase">
            {formData.display_name?.charAt(0) || user.display_name?.charAt(0) || 'U'}
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                {formData.display_name || user.display_name}
              </h1>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-indigo-50 text-indigo-700 border border-indigo-200">
                {user.role}
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium">{user.email}</p>
            {formData.college && (
              <p className="text-xs text-slate-600 flex items-center gap-1 mt-0.5">
                <Building className="w-3.5 h-3.5 text-slate-400" />
                <span>{formData.college}</span>
              </p>
            )}
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-xl text-xs font-semibold">
          <button
            onClick={() => setActiveTab('profile')}
            className={`px-4 py-2 rounded-lg transition ${
              activeTab === 'profile'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Profile & Eligibility
          </button>
          <button
            onClick={() => setActiveTab('recommendations')}
            className={`px-4 py-2 rounded-lg transition flex items-center gap-1.5 ${
              activeTab === 'recommendations'
                ? 'bg-white text-indigo-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Recommended ({recommended.length})</span>
          </button>
        </div>
      </div>

      {activeTab === 'profile' ? (
        <form onSubmit={handleSubmit} className="space-y-6">
          {saveSuccess && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2 animate-in fade-in">
              <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>Your profile and recommendation preferences have been successfully updated!</span>
            </div>
          )}

          {/* Academic Background Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-5">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <GraduationCap className="w-5 h-5 text-indigo-600" />
              <h2 className="text-base font-bold text-slate-900">Academic Background & Education</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Full Name / Preferred Display Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.display_name || ''}
                  onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                  className="w-full py-2 px-3 border border-slate-200 rounded-lg text-slate-800 focus:ring-1 focus:ring-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Current College / University (Optional)
                </label>
                <input
                  type="text"
                  value={formData.college || ''}
                  onChange={(e) => setFormData({ ...formData, college: e.target.value })}
                  placeholder="e.g. NITK Surathkal, Delhi University, Anna University"
                  className="w-full py-2 px-3 border border-slate-200 rounded-lg text-slate-800 focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Degree / Course</label>
                <input
                  type="text"
                  value={formData.degree || ''}
                  onChange={(e) => setFormData({ ...formData, degree: e.target.value })}
                  placeholder="e.g. B.Tech in CSE, B.Sc in Physics, MBBS, B.Com"
                  className="w-full py-2 px-3 border border-slate-200 rounded-lg text-slate-800 focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Current Academic Year / Semester <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formData.academic_year || '3rd Year'}
                  onChange={(e) => setFormData({ ...formData, academic_year: e.target.value })}
                  className="w-full py-2 px-3 border border-slate-200 rounded-lg bg-white text-slate-800 focus:ring-1 focus:ring-indigo-500"
                >
                  {YEARS.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block font-semibold text-slate-700 mb-1">
                  Broad Academic Discipline <span className="text-rose-500">*</span>
                </label>
                <p className="text-[11px] text-slate-500 mb-2">
                  This is the primary filter used by the recommendation engine to ensure you are strictly eligible
                  for listed opportunities.
                </p>
                <select
                  value={formData.academic_background || 'Engineering and Technology'}
                  onChange={(e) => setFormData({ ...formData, academic_background: e.target.value })}
                  className="w-full py-2.5 px-3 border border-slate-200 rounded-lg bg-white text-slate-800 font-medium focus:ring-1 focus:ring-indigo-500"
                >
                  {DISCIPLINES.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                  <option value="Other Disciplines">Other Disciplines</option>
                </select>
              </div>
            </div>
          </div>

          {/* Interests and Skills Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-5">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <Target className="w-5 h-5 text-indigo-600" />
              <h2 className="text-base font-bold text-slate-900">Interests & Technical Skills</h2>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Primary Field of Interest</label>
                <input
                  type="text"
                  value={formData.primary_interest || ''}
                  onChange={(e) => setFormData({ ...formData, primary_interest: e.target.value })}
                  placeholder="e.g. Artificial Intelligence, VLSI, Bioinformatics, Macroeconomics, Public Policy"
                  className="w-full py-2 px-3 border border-slate-200 rounded-lg text-slate-800 focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              {/* Secondary Interests */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Secondary / Allied Interests</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {formData.secondary_interests?.map((interest) => (
                    <span
                      key={interest}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 font-medium text-xs"
                    >
                      <span>{interest}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveInterest(interest)}
                        className="text-slate-400 hover:text-slate-700"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </span>
                  ))}
                </div>

                <div className="flex gap-2 max-w-sm">
                  <input
                    type="text"
                    value={newInterest}
                    onChange={(e) => setNewInterest(e.target.value)}
                    placeholder="Add an allied interest (e.g. Open Source, Cloud)..."
                    className="flex-1 py-1.5 px-3 border border-slate-200 rounded-lg text-xs"
                  />
                  <button
                    type="button"
                    onClick={handleAddInterest}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold text-xs flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add</span>
                  </button>
                </div>
              </div>

              {/* Skills Tags */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Key Technical / Research Skills</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {formData.skills?.map((skill) => (
                    <span
                      key={skill}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200 font-medium text-xs"
                    >
                      <span>{skill}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveSkill(skill)}
                        className="text-indigo-400 hover:text-indigo-800"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </span>
                  ))}
                </div>

                <div className="flex gap-2 max-w-sm">
                  <input
                    type="text"
                    value={newSkill}
                    onChange={(e) => setNewSkill(e.target.value)}
                    placeholder="Add a skill (e.g. Python, CAD, C++)..."
                    className="flex-1 py-1.5 px-3 border border-slate-200 rounded-lg text-xs"
                  />
                  <button
                    type="button"
                    onClick={handleAddSkill}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold text-xs flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add</span>
                  </button>
                </div>
              </div>

              {/* Career Goals */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Career Ambition / Research Goals</label>
                <textarea
                  value={formData.career_goals || ''}
                  onChange={(e) => setFormData({ ...formData, career_goals: e.target.value })}
                  placeholder="Describe what you hope to achieve through an internship (e.g., publish a research paper, gain hands-on lab experience, transition into public policy)..."
                  rows={2}
                  className="w-full p-2.5 border border-slate-200 rounded-lg text-slate-800 focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Preferences Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-5">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <Compass className="w-5 h-5 text-indigo-600" />
              <h2 className="text-base font-bold text-slate-900">Internship Preferences</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Preferred Format</label>
                <select
                  value={formData.preferred_format || 'Any'}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      preferred_format: e.target.value as UserProfile['preferred_format'],
                    })
                  }
                  className="w-full py-2 px-3 border border-slate-200 rounded-lg bg-white text-slate-800 focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="Any">Any Format (Remote or Onsite)</option>
                  <option value="Onsite">Onsite (Campus or Lab)</option>
                  <option value="Remote">Remote Only</option>
                  <option value="Hybrid">Hybrid</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Minimum Desired Monthly Stipend (₹)
                </label>
                <input
                  type="number"
                  value={formData.min_stipend_preference || 0}
                  onChange={(e) =>
                    setFormData({ ...formData, min_stipend_preference: Number(e.target.value) })
                  }
                  placeholder="0 for any (including unpaid)"
                  className="w-full py-2 px-3 border border-slate-200 rounded-lg text-slate-800 focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Duration Preference</label>
                <input
                  type="text"
                  value={formData.duration_preference || ''}
                  onChange={(e) => setFormData({ ...formData, duration_preference: e.target.value })}
                  placeholder="e.g. 2 Months (Summer), 6-8 Weeks"
                  className="w-full py-2 px-3 border border-slate-200 rounded-lg text-slate-800 focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Submit Action */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs shadow-md transition flex items-center gap-2 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Saving Profile...' : 'Save Profile & Update Recommendations'}</span>
            </button>
          </div>
        </form>
      ) : (
        /* Recommendations Tab */
        <div className="space-y-6">
          <div className="bg-indigo-50/70 rounded-2xl p-6 border border-indigo-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-600" />
                <h2 className="text-base font-bold text-indigo-950">
                  Eligibility-Matched Opportunities ({recommended.length})
                </h2>
              </div>
              <p className="text-xs text-indigo-900/80 mt-1">
                Matched against your declared academic field (<strong>{formData.academic_background}</strong>),{' '}
                <strong>{formData.academic_year}</strong> standing, and skills.
              </p>
            </div>

            <button
              onClick={() => setActiveTab('profile')}
              className="px-3.5 py-1.5 bg-white text-indigo-700 border border-indigo-200 rounded-lg text-xs font-semibold hover:bg-indigo-50"
            >
              Adjust Preferences
            </button>
          </div>

          {recommended.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center max-w-md mx-auto space-y-3">
              <Sparkles className="w-10 h-10 text-slate-300 mx-auto" />
              <h3 className="text-base font-bold text-slate-800">No matching recommendations found</h3>
              <p className="text-xs text-slate-500">
                Try updating your academic discipline, year, or preferred format to see more matched listings.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {recommended.map(({ internship, matchReasons }) => (
                <InternshipCard
                  key={internship.id}
                  internship={internship}
                  highlightReason={matchReasons[0]}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
