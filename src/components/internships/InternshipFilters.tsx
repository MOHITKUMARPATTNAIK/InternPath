'use client';

import React from 'react';
import { FilterState } from '@/types';
import { Search, RotateCcw, X } from 'lucide-react';

interface Props {
  filters: FilterState;
  onChange: (filters: FilterState) => void;
  onReset: () => void;
  totalCount: number;
}

export const DISCIPLINES = [
  'Engineering and Technology',
  'Computer Science and IT',
  'Medical and Healthcare',
  'Biotechnology and Life Sciences',
  'Pure Sciences and Research',
  'Commerce and Finance',
  'Business and Management',
  'Arts and Humanities',
  'Law',
  'Design and Creative',
  'Agriculture and Environmental Sciences',
];

export const SOURCE_CATEGORIES = [
  'IIT',
  'NIT',
  'IIIT',
  'IISc / IISER',
  'Research Lab / PSU',
  'Government Ministry',
  'Public Fellowship',
  'Corporate / Tech',
];

export const YEARS = ['1st Year', '2nd Year', '3rd Year', '4th Year', 'Final Year'];

export function InternshipFilters({ filters, onChange, onReset, totalCount }: Props) {
  const updateFilter = <K extends keyof FilterState>(key: K, value: FilterState[K]) => {
    onChange({ ...filters, [key]: value });
  };

  const hasActiveFilters =
    Boolean(filters.search) ||
    filters.discipline !== 'all' ||
    filters.sourceCategory !== 'all' ||
    filters.stipendStatus !== 'all' ||
    Boolean(filters.minStipend) ||
    filters.format !== 'all' ||
    filters.year !== 'all' ||
    filters.deadlineFilter !== 'all' ||
    filters.duration !== 'all';

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-5">
      {/* Search Header */}
      <div>
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={filters.search}
            onChange={(e) => updateFilter('search', e.target.value)}
            placeholder="Search role, institution (e.g. IIT Madras, NITI Aayog), skills..."
            className="w-full pl-10 pr-9 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:bg-white transition"
          />
          {filters.search && (
            <button
              onClick={() => updateFilter('search', '')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Primary Filters Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
        {/* Academic Discipline */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1">
            Academic Discipline
          </label>
          <select
            value={filters.discipline}
            onChange={(e) => updateFilter('discipline', e.target.value)}
            className="w-full py-2 px-2.5 border border-slate-200 rounded-lg bg-white text-slate-700 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-xs"
          >
            <option value="all">All Disciplines</option>
            {DISCIPLINES.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>

        {/* Institution / Category */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1">
            Source Institution
          </label>
          <select
            value={filters.sourceCategory}
            onChange={(e) => updateFilter('sourceCategory', e.target.value)}
            className="w-full py-2 px-2.5 border border-slate-200 rounded-lg bg-white text-slate-700 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-xs"
          >
            <option value="all">All Institutions & Types</option>
            {SOURCE_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        {/* Stipend Type */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1">
            Stipend Status
          </label>
          <select
            value={filters.stipendStatus}
            onChange={(e) => updateFilter('stipendStatus', e.target.value)}
            className="w-full py-2 px-2.5 border border-slate-200 rounded-lg bg-white text-slate-700 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-xs"
          >
            <option value="all">All Stipend Options</option>
            <option value="paid">Paid (Stipend Provided)</option>
            <option value="unpaid">Unpaid / Research Credit</option>
            <option value="stipend_not_specified">Not Specified</option>
          </select>
        </div>

        {/* Work Format */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1">
            Format / Delivery
          </label>
          <select
            value={filters.format}
            onChange={(e) => updateFilter('format', e.target.value)}
            className="w-full py-2 px-2.5 border border-slate-200 rounded-lg bg-white text-slate-700 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-xs capitalize"
          >
            <option value="all">Any Format</option>
            <option value="onsite">Onsite (Campus/Lab)</option>
            <option value="remote">Remote (Virtual)</option>
            <option value="hybrid">Hybrid</option>
          </select>
        </div>
      </div>

      {/* Secondary Filters Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100 text-xs">
        {/* Eligible Year */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1">
            Eligible Year
          </label>
          <select
            value={filters.year}
            onChange={(e) => updateFilter('year', e.target.value)}
            className="w-full py-2 px-2.5 border border-slate-200 rounded-lg bg-white text-slate-700 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-xs"
          >
            <option value="all">Any Academic Year</option>
            {YEARS.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>

        {/* Application Deadline */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1">
            Application Deadline
          </label>
          <select
            value={filters.deadlineFilter}
            onChange={(e) => updateFilter('deadlineFilter', e.target.value)}
            className="w-full py-2 px-2.5 border border-slate-200 rounded-lg bg-white text-slate-700 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-xs"
          >
            <option value="all">All Deadlines</option>
            <option value="active">Active Only (Not Expired)</option>
            <option value="7days">Closing Soon (Next 7 Days)</option>
            <option value="30days">Closing this Month (Next 30 Days)</option>
          </select>
        </div>

        {/* Sort By */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1">
            Sort Listings
          </label>
          <select
            value={filters.sortBy}
            onChange={(e) => updateFilter('sortBy', e.target.value as FilterState['sortBy'])}
            className="w-full py-2 px-2.5 border border-slate-200 rounded-lg bg-white text-slate-700 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-xs"
          >
            <option value="newest">Recently Published (Newest)</option>
            <option value="deadline">Closing Soon (Nearest Deadline)</option>
            <option value="stipend_high">Highest Stipend</option>
          </select>
        </div>
      </div>

      {/* Filter Bottom Bar with Counts and Clear Button */}
      <div className="flex items-center justify-between pt-2 text-xs">
        <div className="text-slate-600">
          Showing <strong className="text-slate-900 font-bold">{totalCount}</strong> verified opportunities
        </div>

        {hasActiveFilters && (
          <button
            onClick={onReset}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 transition border border-slate-200 text-xs font-medium"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset All Filters</span>
          </button>
        )}
      </div>
    </div>
  );
}
