'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Source, Internship } from '@/types';
import { getSources, getInternships } from '@/lib/data-service';
import {
  Layers,
  Building,
  GraduationCap,
  FlaskConical,
  Award,
  Landmark,
  Cpu,
  ExternalLink,
  ShieldCheck,
  ArrowRight,
} from 'lucide-react';

const CATEGORY_CARDS = [
  {
    key: 'IIT',
    title: 'Indian Institutes of Technology (IITs)',
    subtitle: 'IIT Madras, Bombay, Roorkee, Delhi, Kharagpur, Kanpur',
    description:
      'Prestigious 6-8 week summer research fellowships with faculty mentors. Generally open to 2nd & 3rd year engineering and pure science students with competitive CGPA.',
    icon: GraduationCap,
    color: 'border-indigo-200 bg-indigo-50/50 text-indigo-700',
  },
  {
    key: 'IISc / IISER',
    title: 'IISc & IISERs (Pure Sciences & Research)',
    subtitle: 'IISc Bangalore, IISER Pune, Kolkata, Mohali, Bhopal, TVM',
    description:
      'Premier basic sciences research programmes in Physics, Chemistry, Biology, Earth Sciences, and Mathematics funded by the Academies and central research bodies.',
    icon: FlaskConical,
    color: 'border-emerald-200 bg-emerald-50/50 text-emerald-700',
  },
  {
    key: 'Government Ministry',
    title: 'Central Government Ministries & Schemes',
    subtitle: 'NITI Aayog, Ministry of External Affairs (MEA), DPIIT, MoE',
    description:
      'Government of India internship schemes giving direct exposure to national public policy formulation, governance reforms, international diplomacy, and economic planning.',
    icon: Landmark,
    color: 'border-amber-200 bg-amber-50/50 text-amber-700',
  },
  {
    key: 'Research Lab / PSU',
    title: 'National Research Laboratories & PSUs',
    subtitle: 'CSIR Labs (37 units), DRDO, ISRO (VSSC/SAC), RBI, TIFR',
    description:
      'Cutting-edge laboratory training in scientific missions, central banking, economic research, biotechnology, defence systems, and aerospace engineering.',
    icon: Building,
    color: 'border-sky-200 bg-sky-50/50 text-sky-700',
  },
  {
    key: 'Corporate / Tech',
    title: 'Corporate Research Labs & Tech Fellows',
    subtitle: 'Microsoft Research India, Google Research, IBM Research',
    description:
      'Selective industry research internships focusing on foundational artificial intelligence, systems engineering, socio-technical systems, and data analytics.',
    icon: Cpu,
    color: 'border-purple-200 bg-purple-50/50 text-purple-700',
  },
  {
    key: 'Public Fellowship',
    title: 'National Fellowships & Academies',
    subtitle: 'IASc-INSA-NASI Fellowship, KVPY, INSPIRE, SERB',
    description:
      'Competitive national scholarship programmes connecting students to Academy Fellows across India with travel and living stipends.',
    icon: Award,
    color: 'border-rose-200 bg-rose-50/50 text-rose-700',
  },
];

export default function CategoriesPage() {
  const [sources, setSources] = useState<Source[]>([]);
  const [internships, setInternships] = useState<Internship[]>([]);

  useEffect(() => {
    async function load() {
      const [srcs, ints] = await Promise.all([getSources(), getInternships()]);
      setSources(srcs);
      setInternships(ints);
    }
    load();
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12">
      {/* Header */}
      <div className="max-w-3xl space-y-2">
        <div className="flex items-center gap-2">
          <Layers className="w-5 h-5 text-indigo-600" />
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Institutional Categories & Directory
          </h1>
        </div>
        <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
          InternPath focuses exclusively on genuine, verified institutional sources across India. Browse opportunities
          by category or inspect our official source directory below.
        </p>
      </div>

      {/* Category Cards Grid */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {CATEGORY_CARDS.map((cat) => {
          const Icon = cat.icon;
          const count = internships.filter((i) => {
            const src = sources.find((s) => s.id === i.source_id);
            return src?.source_category === cat.key;
          }).length;

          return (
            <div
              key={cat.key}
              className="bg-white rounded-2xl border border-slate-200/90 p-6 flex flex-col justify-between hover:border-indigo-300 hover:shadow-md transition group"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className={`p-2.5 rounded-xl border ${cat.color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
                    {count} {count === 1 ? 'Opportunity' : 'Opportunities'}
                  </span>
                </div>

                <div>
                  <h3 className="text-base font-bold text-slate-900 group-hover:text-indigo-600 transition">
                    {cat.title}
                  </h3>
                  <p className="text-[11px] font-semibold text-slate-500 mt-0.5">{cat.subtitle}</p>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">{cat.description}</p>
              </div>

              <div className="pt-6 mt-4 border-t border-slate-100">
                <Link
                  href={`/internships?sourceCategory=${encodeURIComponent(cat.key)}`}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 group-hover:text-indigo-800 transition"
                >
                  <span>Explore {cat.key} Opportunities</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </Link>
              </div>
            </div>
          );
        })}
      </section>

      {/* Official Monitored Sources Directory Table */}
      <section className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs space-y-4 p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-2">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
              <h2 className="text-lg font-bold text-slate-900">Curated Indian Source Directory</h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Every indexed internship originates from one of these verified institutional domains.
            </p>
          </div>

          <div className="text-xs font-medium text-slate-600">
            Monitoring <strong className="text-slate-900 font-bold">{sources.length}</strong> official institutions
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Institution / Organization</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Official Domain</th>
                <th className="py-3 px-4">Monitoring Method</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Official Link</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sources.map((src) => (
                <tr key={src.id} className="hover:bg-slate-50/80 transition">
                  <td className="py-3.5 px-4 font-semibold text-slate-900">{src.name}</td>
                  <td className="py-3.5 px-4">
                    <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px] font-medium">
                      {src.source_category}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-[11px] text-slate-700">{src.official_domain}</td>
                  <td className="py-3.5 px-4">
                    <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 text-[11px] font-medium border border-indigo-100">
                      {src.monitoring_method}
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                      <span>Active</span>
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <a
                      href={src.opportunity_page_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-800 font-semibold"
                    >
                      <span>Visit Portal</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
