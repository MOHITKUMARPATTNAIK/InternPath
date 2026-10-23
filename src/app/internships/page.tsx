'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Internship, FilterState } from '@/types';
import { getInternships, getSavedInternships } from '@/lib/data-service';
import { useAuth } from '@/lib/auth-context';
import { InternshipCard } from '@/components/internships/InternshipCard';
import { InternshipFilters } from '@/components/internships/InternshipFilters';
import { Compass, RotateCcw, Search } from 'lucide-react';

const DEFAULT_FILTERS: FilterState = {
  search: '',
  discipline: 'all',
  sourceCategory: 'all',
  stipendStatus: 'all',
  minStipend: null,
  format: 'all',
  location: 'all',
  year: 'all',
  deadlineFilter: 'all',
  duration: 'all',
  sortBy: 'newest',
};

function ExploreContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useAuth();

  const [filters, setFilters] = useState<FilterState>(() => {
    return {
      search: searchParams.get('search') || '',
      discipline: searchParams.get('discipline') || 'all',
      sourceCategory: searchParams.get('sourceCategory') || 'all',
      stipendStatus: searchParams.get('stipendStatus') || 'all',
      minStipend: searchParams.get('minStipend') ? Number(searchParams.get('minStipend')) : null,
      format: searchParams.get('format') || 'all',
      location: searchParams.get('location') || 'all',
      year: searchParams.get('year') || 'all',
      deadlineFilter: searchParams.get('deadlineFilter') || 'all',
      duration: searchParams.get('duration') || 'all',
      sortBy: (searchParams.get('sortBy') as FilterState['sortBy']) || 'newest',
    };
  });

  const [internships, setInternships] = useState<Internship[]>([]);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  // Sync state with URL params if user navigated from another page
  useEffect(() => {
    const updated: FilterState = {
      search: searchParams.get('search') || '',
      discipline: searchParams.get('discipline') || 'all',
      sourceCategory: searchParams.get('sourceCategory') || 'all',
      stipendStatus: searchParams.get('stipendStatus') || 'all',
      minStipend: searchParams.get('minStipend') ? Number(searchParams.get('minStipend')) : null,
      format: searchParams.get('format') || 'all',
      location: searchParams.get('location') || 'all',
      year: searchParams.get('year') || 'all',
      deadlineFilter: searchParams.get('deadlineFilter') || 'all',
      duration: searchParams.get('duration') || 'all',
      sortBy: (searchParams.get('sortBy') as FilterState['sortBy']) || 'newest',
    };
    setFilters(updated);
  }, [searchParams]);

  // Load internships whenever filters change
  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const data = await getInternships(filters);
      setInternships(data);

      if (user) {
        const saved = await getSavedInternships(user.id);
        setSavedIds(new Set(saved.map((s) => s.internship_id)));
      }
      setLoading(false);
    }
    fetchData();
  }, [filters, user]);

  const handleFilterChange = (newFilters: FilterState) => {
    setFilters(newFilters);
    // Update URL query string
    const params = new URLSearchParams();
    if (newFilters.search) params.set('search', newFilters.search);
    if (newFilters.discipline !== 'all') params.set('discipline', newFilters.discipline);
    if (newFilters.sourceCategory !== 'all') params.set('sourceCategory', newFilters.sourceCategory);
    if (newFilters.stipendStatus !== 'all') params.set('stipendStatus', newFilters.stipendStatus);
    if (newFilters.format !== 'all') params.set('format', newFilters.format);
    if (newFilters.year !== 'all') params.set('year', newFilters.year);
    if (newFilters.deadlineFilter !== 'all') params.set('deadlineFilter', newFilters.deadlineFilter);
    if (newFilters.sortBy !== 'newest') params.set('sortBy', newFilters.sortBy);

    router.replace(`/internships?${params.toString()}`);
  };

  const handleResetFilters = () => {
    setFilters(DEFAULT_FILTERS);
    router.replace('/internships');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Page Title & Context */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 gap-2">
        <div>
          <div className="flex items-center gap-2">
            <Compass className="w-5 h-5 text-indigo-600" />
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Explore Internships</h1>
          </div>
          <p className="text-xs text-slate-600 mt-1">
            Browse verified opportunities from leading Indian institutes, government ministries, and research labs.
          </p>
        </div>
      </div>

      {/* Filter Component */}
      <InternshipFilters
        filters={filters}
        onChange={handleFilterChange}
        onReset={handleResetFilters}
        totalCount={internships.length}
      />

      {/* Results Grid */}
      {loading ? (
        <div className="py-20 text-center space-y-3">
          <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-500 font-medium">Filtering verified opportunities...</p>
        </div>
      ) : internships.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center max-w-lg mx-auto space-y-4 my-8">
          <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 mx-auto">
            <Search className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-800">No matching internships found</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            We couldn&apos;t find any verified opportunities matching your current combination of filters. Try
            relaxing your search criteria or resetting filters.
          </p>
          <button
            onClick={handleResetFilters}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset All Filters</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {internships.map((internship) => (
            <InternshipCard
              key={internship.id}
              internship={internship}
              isSavedInitial={savedIds.has(internship.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function ExplorePage() {
  return (
    <Suspense
      fallback={
        <div className="py-20 text-center">
          <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      }
    >
      <ExploreContent />
    </Suspense>
  );
}
