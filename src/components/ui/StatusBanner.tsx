'use client';

import React, { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Database, Info, Shield, X, CheckCircle, RefreshCw } from 'lucide-react';
import { resetDemoData } from '@/lib/data-service';

export function StatusBanner() {
  const { isConfigured, user } = useAuth();
  const [dismissed, setDismissed] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);

  if (dismissed) return null;

  return (
    <>
      <div className="bg-slate-900 text-slate-100 px-4 py-2 text-xs flex flex-wrap items-center justify-between border-b border-slate-800 gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="flex h-2 w-2 relative">
            <span
              className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                isConfigured ? 'bg-emerald-400' : 'bg-amber-400'
              }`}
            ></span>
            <span
              className={`relative inline-flex rounded-full h-2 w-2 ${
                isConfigured ? 'bg-emerald-500' : 'bg-amber-500'
              }`}
            ></span>
          </span>
          <span className="font-semibold text-slate-200">
            {isConfigured ? 'Connected to Supabase PostgreSQL' : 'Local Demo Mode (Offline / In-Memory)'}
          </span>
          <span className="text-slate-400 hidden sm:inline">|</span>
          <span className="text-slate-300">
            {isConfigured
              ? 'Real-time database and auth active'
              : 'Seeded with authentic verified Indian institutional opportunities (IITs, IISc, NITI Aayog, MEA, RBI)'}
          </span>
        </div>

        <div className="flex items-center gap-3">
          {!isConfigured && (
            <>
              <button
                onClick={() => setShowConfigModal(true)}
                className="underline text-indigo-300 hover:text-white transition-colors flex items-center gap-1"
              >
                <Info className="w-3 h-3" />
                <span>Supabase Setup Guide</span>
              </button>

              {user && !isConfigured && process.env.NODE_ENV !== 'production' && (
                <div className="flex items-center gap-1.5 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                  <Shield className="w-3 h-3 text-slate-400" />
                  <span className="text-slate-400">Dev Role:</span>
                  <span className="font-medium text-amber-300 uppercase">
                    {user.role}
                  </span>
                </div>
              )}

              <button
                onClick={() => {
                  if (confirm('Reset demo data to initial Indian institutional seed listings?')) {
                    resetDemoData();
                    window.location.reload();
                  }
                }}
                className="text-slate-400 hover:text-slate-200 flex items-center gap-1"
                title="Reset local storage seed data"
              >
                <RefreshCw className="w-3 h-3" />
                <span className="hidden md:inline">Reset Seed</span>
              </button>
            </>
          )}

          <button
            onClick={() => setDismissed(true)}
            aria-label="Close notification"
            className="text-slate-400 hover:text-slate-200 p-0.5"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {showConfigModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 text-slate-900 border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-base text-slate-900">Supabase Configuration Guide</h3>
              </div>
              <button
                onClick={() => setShowConfigModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4 text-xs text-slate-600 leading-relaxed">
              <p>
                InternPath is fully architected for <strong>Supabase + PostgreSQL</strong> with complete Row Level
                Security (RLS), tables, indexes, and migrations.
              </p>

              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 font-mono text-[11px] text-slate-800">
                <div className="text-slate-500 mb-1"># In your .env.local file:</div>
                <div>NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co</div>
                <div>NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=eyJh... # or NEXT_PUBLIC_SUPABASE_ANON_KEY</div>
                <div>SUPABASE_SERVICE_ROLE_KEY=eyJh... # optional backend key</div>
              </div>

              <div className="space-y-1.5">
                <div className="font-semibold text-slate-800">Steps to connect your Supabase database:</div>
                <ol className="list-decimal list-inside space-y-1 pl-1">
                  <li>Create a free project at <span className="text-indigo-600 font-medium">supabase.com</span>.</li>
                  <li>Copy your Project URL and Publishable/Anon Key into <code className="bg-slate-100 px-1 py-0.5 rounded">.env.local</code>.</li>
                  <li>Run the SQL migrations in <code className="bg-slate-100 px-1 py-0.5 rounded">supabase/migrations/</code> via Supabase SQL Editor.</li>
                  <li>Restart the Next.js dev server.</li>
                </ol>
              </div>

              <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200 flex items-start gap-2 text-emerald-800">
                <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                <span>
                  The app is currently running in <strong>Local Storage / Demo Mode</strong> with complete working
                  functionality: search, filters, student recommendations, saving, reporting, and admin workflows!
                </span>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowConfigModal(false)}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 transition"
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
