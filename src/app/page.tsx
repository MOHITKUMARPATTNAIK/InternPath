'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Internship, ScoredInternship } from '@/types';
import { getInternships, getRecommendedInternships } from '@/lib/data-service';
import { useAuth } from '@/lib/auth-context';
import { InternshipCard } from '@/components/internships/InternshipCard';
import {
  Search,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Building2,
  Calendar,
  IndianRupee,
  Compass,
  CheckCircle,
  Award,
} from 'lucide-react';

export default function HomePage() {
  const router = useRouter();
  const { user, profile, loading } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [internships, setInternships] = useState<Internship[]>([]);
  const [recommended, setRecommended] = useState<ScoredInternship[]>([]);

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/auth/signup');
    }
  }, [loading, user, router]);

  useEffect(() => {
    async function loadData() {
      const all = await getInternships();
      setInternships(all);

      if (profile) {
        const recs = await getRecommendedInternships(profile);
        setRecommended(recs.slice(0, 3));
      }
    }
    if (user) {
      loadData();
    }
  }, [profile, user]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/internships?search=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      router.push('/internships');
    }
  };

  // Sections derivation
  const recentlyAdded = internships.slice(0, 3);

  const closingSoon = internships
    .filter((i) => {
      if (!i.application_deadline) return false;
      const diffDays =
        (new Date(i.application_deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24);
      return diffDays > 0 && diffDays <= 45;
    })
    .sort((a, b) => new Date(a.application_deadline!).getTime() - new Date(b.application_deadline!).getTime())
    .slice(0, 3);

  const paidOpportunities = internships
    .filter((i) => i.stipend_status === 'paid' && (i.stipend_amount || 0) > 0)
    .sort((a, b) => (b.stipend_amount || 0) - (a.stipend_amount || 0))
    .slice(0, 3);

  const govtAndInstitutes = internships
    .filter((i) => {
      const org = i.organization.toLowerCase();
      return (
        org.includes('iit') ||
        org.includes('iisc') ||
        org.includes('niti aayog') ||
        org.includes('ministry') ||
        org.includes('rbi') ||
        org.includes('csir')
      );
    })
    .slice(0, 3);

  const quickFilterChips = [
    { label: 'Paid Internships', href: '/internships?stipendStatus=paid', icon: IndianRupee },
    { label: 'IITs & Premier Institutes', href: '/internships?sourceCategory=IIT', icon: Building2 },
    { label: 'Government Portals', href: '/internships?sourceCategory=Government+Ministry', icon: Award },
    { label: 'IISc & Research Labs', href: '/internships?sourceCategory=IISc+/+IISER', icon: ShieldCheck },
    { label: 'Remote / Virtual', href: '/internships?format=remote', icon: Compass },
    { label: 'Upcoming Deadlines', href: '/internships?deadlineFilter=30days', icon: Calendar },
    { label: 'Unpaid / Research Credit', href: '/internships?stipendStatus=unpaid', icon: CheckCircle },
  ];

  if (loading || !user) {
    return (
      <div className="min-h-[85vh] flex items-center justify-center bg-slate-950">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-cyan-400 border-t-transparent rounded-full animate-spin shadow-[0_0_20px_rgba(6,182,212,0.5)]" />
          <p className="text-xs text-cyan-300 font-semibold tracking-wider uppercase">Loading InternPath...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-14 pb-16">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-b from-indigo-950 via-slate-900 to-slate-900 text-white pt-16 pb-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
        {/* Subtle Background Pattern */}
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#818cf8_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />

        <div className="relative max-w-4xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-900/60 border border-indigo-700/60 text-indigo-300 text-xs font-semibold">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>100% Direct Official Sources • Verified Indian Institutions</span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-tight">
            Discover Your Next Internship.{' '}
            <span className="bg-gradient-to-r from-indigo-300 via-sky-300 to-emerald-300 bg-clip-text text-transparent">
              Build Your Future.
            </span>
          </h1>

          <p className="text-slate-300 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
            Find trusted internship opportunities from leading Indian institutions, government departments,
            research organizations, and companies — all in one place.
          </p>

          {/* Prominent Search Bar */}
          <form
            onSubmit={handleSearchSubmit}
            className="max-w-2xl mx-auto flex flex-col sm:flex-row items-center gap-2 bg-white/10 p-2 rounded-2xl border border-white/20 shadow-xl backdrop-blur-md"
          >
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by role, institution (e.g. IIT Madras, NITI Aayog), or skill..."
                className="w-full pl-11 pr-4 py-3 bg-white/90 text-slate-900 text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 font-medium placeholder:text-slate-400"
              />
            </div>
            <button
              type="submit"
              className="w-full sm:w-auto px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm rounded-xl transition flex items-center justify-center gap-2 shadow-lg"
            >
              <span>Search</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Action CTAs */}
          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            <Link
              href="/internships"
              className="px-5 py-2.5 rounded-xl bg-white text-slate-900 font-semibold text-xs hover:bg-slate-100 transition shadow-sm flex items-center gap-1.5"
            >
              <span>Explore All Internships</span>
              <ArrowRight className="w-3.5 h-3.5 text-indigo-600" />
            </Link>

            <Link
              href={user ? '/profile' : '/auth/signup'}
              className="px-5 py-2.5 rounded-xl bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200 border border-indigo-500/40 font-semibold text-xs transition"
            >
              {user ? 'View My Profile' : 'Create Your Student Profile'}
            </Link>
          </div>

          {/* Trust Statement */}
          <p className="text-[11px] text-slate-400 max-w-lg mx-auto pt-2">
            Every listing directs students straight to verified institutional domains (.ac.in, .gov.in, .res.in).
            No application fees, no intermediary spam.
          </p>
        </div>
      </section>

      {/* Quick Filters Pill Bar */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 relative z-20">
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200/80 p-4 sm:p-5">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
            <Compass className="w-4 h-4 text-indigo-600" />
            <span>Popular Fast Filters</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {quickFilterChips.map((chip) => {
              const Icon = chip.icon;
              return (
                <Link
                  key={chip.label}
                  href={chip.href}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-50 text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 border border-slate-200 transition"
                >
                  <Icon className="w-3.5 h-3.5 text-slate-500" />
                  <span>{chip.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* Featured Section 1: Personalized Recommendations (If user is logged in & has profile) */}
      {recommended.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-gradient-to-r from-indigo-50 via-sky-50 to-emerald-50 rounded-2xl p-6 sm:p-8 border border-indigo-100/80 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 gap-2 border-b border-indigo-200/60">
              <div>
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-indigo-600" />
                  <h2 className="text-xl font-bold text-slate-900">Recommended for You</h2>
                </div>
                <p className="text-xs text-slate-600 mt-1">
                  Personalized based on your academic field ({profile?.academic_background}), {profile?.academic_year},{' '}
                  and skills.
                </p>
              </div>

              <Link
                href="/profile"
                className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-700 hover:text-indigo-900"
              >
                <span>Edit Profile Preferences</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-6">
              {recommended.map(({ internship, evaluation, matchReasons }) => (
                <InternshipCard
                  key={internship.id}
                  internship={internship}
                  highlightReason={matchReasons?.[0]}
                  evaluation={evaluation}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Featured Section 2: Recently Added Opportunities */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">Recently Added Internships</h2>
            <p className="text-xs text-slate-500">Freshly verified opportunities from official Indian institution portals.</p>
          </div>
          <Link
            href="/internships?sortBy=newest"
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
          >
            <span>View All</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {recentlyAdded.length === 0 ? (
          <div className="p-8 text-center bg-white rounded-xl border border-slate-200 text-xs text-slate-500">
            No recently added opportunities found.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {recentlyAdded.map((item) => (
              <InternshipCard key={item.id} internship={item} />
            ))}
          </div>
        )}
      </section>

      {/* Featured Section 3: Closing Soon (Urgent Deadlines) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"></span>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">Closing Soon</h2>
            </div>
            <p className="text-xs text-slate-500">Upcoming application cut-offs — apply on the official portals before deadlines lapse.</p>
          </div>
          <Link
            href="/internships?deadlineFilter=30days&sortBy=deadline"
            className="text-xs font-semibold text-amber-700 hover:text-amber-900 flex items-center gap-1"
          >
            <span>View Closing Soon</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {closingSoon.length === 0 ? (
          <div className="p-8 text-center bg-white rounded-xl border border-slate-200 text-xs text-slate-500">
            No deadlines closing within 45 days at this moment.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {closingSoon.map((item) => (
              <InternshipCard key={item.id} internship={item} />
            ))}
          </div>
        )}
      </section>

      {/* Featured Section 4: Paid & Stipend Supported */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">Paid Research & Industry Fellowships</h2>
            <p className="text-xs text-slate-500">Opportunities with explicitly confirmed stipends and student honorariums.</p>
          </div>
          <Link
            href="/internships?stipendStatus=paid"
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
          >
            <span>View All Paid</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {paidOpportunities.length === 0 ? (
          <div className="p-8 text-center bg-white rounded-xl border border-slate-200 text-xs text-slate-500">
            No paid opportunities found.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {paidOpportunities.map((item) => (
              <InternshipCard key={item.id} internship={item} />
            ))}
          </div>
        )}
      </section>

      {/* Featured Section 5: Government & Premier Institutes */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              Government Ministries & Premier National Labs
            </h2>
            <p className="text-xs text-slate-500">
              National bodies including NITI Aayog, MEA, CSIR labs, RBI, and premier IITs.
            </p>
          </div>
          <Link
            href="/categories"
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
          >
            <span>Explore Categories</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {govtAndInstitutes.map((item) => (
            <InternshipCard key={item.id} internship={item} />
          ))}
        </div>
      </section>

      {/* Trust & Transparency Pillar Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <div className="bg-slate-900 text-white rounded-2xl p-8 sm:p-10 relative overflow-hidden">
          <div className="relative z-10 max-w-3xl space-y-4">
            <span className="text-indigo-400 text-xs font-bold uppercase tracking-widest">
              Built on Trust & Institutional Accuracy
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Why Indian Students Rely on InternPath
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-4 text-xs text-slate-300">
              <div className="space-y-1.5">
                <div className="font-semibold text-white flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Direct Official Portals</span>
                </div>
                <p className="leading-relaxed text-slate-400">
                  We never create intermediate application forms. Every listing directs you straight to the official
                  university or government domain.
                </p>
              </div>

              <div className="space-y-1.5">
                <div className="font-semibold text-white flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4 text-sky-400" />
                  <span>Strict Eligibility First</span>
                </div>
                <p className="leading-relaxed text-slate-400">
                  We filter by year of study, degree, and exact academic disciplines so you never waste time on
                  opportunities you aren&apos;t eligible for.
                </p>
              </div>

              <div className="space-y-1.5">
                <div className="font-semibold text-white flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-amber-400" />
                  <span>Zero Fabricated Data</span>
                </div>
                <p className="leading-relaxed text-slate-400">
                  Every stipend, deadline, and eligibility criterion is extracted from authentic notification PDFs and
                  institutional announcements.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
