'use client';

import React from 'react';
import Link from 'next/link';
import { ShieldCheck, Database } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { isUserAdmin } from '@/types';

export function Footer() {
  const { user } = useAuth();
  return (
    <footer className="bg-slate-900 text-slate-400 border-t border-slate-800 text-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand Col */}
          <div className="md:col-span-2 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-base">
                IP
              </div>
              <span className="text-base font-bold text-white tracking-tight">InternPath</span>
            </div>
            <p className="text-slate-400 max-w-md leading-relaxed text-xs">
              InternPath is India’s dedicated, student-first platform for discovering verified, high-quality
              internships and research fellowships directly from premier Indian institutes (IITs, NITs, IISc, IISERs),
              central government departments (NITI Aayog, MEA, RBI), and scientific research organizations.
            </p>
            <div className="pt-2 flex items-center gap-2 text-slate-300">
              <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span className="text-[11px] font-medium">100% Direct Official Links • Zero Fabricated Listings • No Middleman Fees</span>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-white uppercase tracking-wider">Explore Opportunities</h4>
            <ul className="space-y-1.5">
              <li>
                <Link href="/internships?sourceCategory=IIT" className="hover:text-indigo-400 transition">
                  IIT Research Fellowships
                </Link>
              </li>
              <li>
                <Link href="/internships?sourceCategory=Government+Ministry" className="hover:text-indigo-400 transition">
                  Central Govt Internships
                </Link>
              </li>
              <li>
                <Link href="/internships?sourceCategory=IISc+/+IISER" className="hover:text-indigo-400 transition">
                  IISc & IISER Science Programs
                </Link>
              </li>
              <li>
                <Link href="/internships?stipendStatus=paid" className="hover:text-indigo-400 transition">
                  Stipend-Supported Opportunities
                </Link>
              </li>
              <li>
                <Link href="/internships?format=remote" className="hover:text-indigo-400 transition">
                  Remote & Open Source Projects
                </Link>
              </li>
            </ul>
          </div>

          {/* Platform & Trust */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-white uppercase tracking-wider">Platform & Trust</h4>
            <ul className="space-y-1.5">
              <li>
                <Link href="/categories" className="hover:text-indigo-400 transition">
                  Institutions Directory
                </Link>
              </li>
              <li>
                <Link href="/saved" className="hover:text-indigo-400 transition">
                  Application Tracker
                </Link>
              </li>
              <li>
                <Link href="/profile" className="hover:text-indigo-400 transition">
                  Profile & Eligibility Match
                </Link>
              </li>
              {isUserAdmin(user?.role) && (
                <li>
                  <Link href="/admin" className="hover:text-amber-400 transition flex items-center gap-1.5 text-amber-400 font-medium">
                    <Database className="w-3.5 h-3.5 text-amber-400" />
                    <span>Resource Management</span>
                  </Link>
                </li>
              )}
            </ul>
          </div>
        </div>

        {/* Disclaimer Box */}
        <div className="mt-10 pt-6 border-t border-slate-800 text-[11px] text-slate-500 leading-relaxed space-y-2">
          <p>
            <strong className="text-slate-400">Institutional Transparency Notice:</strong> InternPath indexes and
            organizes publicly available opportunity notices from verified institutional domains (.ac.in, .gov.in,
            .res.in, .org.in). Unless explicitly stated, InternPath is not affiliated with, endorsed by, or an agent
            of any university, ministry, or corporation. All applications are submitted and processed exclusively on
            the official website of the hosting organization.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-between pt-4 gap-2 text-slate-500">
            <div>© {new Date().getFullYear()} InternPath India. Built for Indian undergraduate students.</div>
            <div className="flex items-center gap-1 text-slate-400">
              <span>Made with dedication for authentic student empowerment</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
