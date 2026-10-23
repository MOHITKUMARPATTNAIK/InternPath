import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Shield, Lock, EyeOff, Database } from 'lucide-react';

export const metadata = {
  title: 'Privacy Policy — InternPath',
  description: 'Privacy policy and data protection commitments for InternPath users across India.',
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Back Link */}
        <div>
          <Link
            href="/auth/signup"
            className="inline-flex items-center gap-2 text-xs font-semibold text-cyan-400 hover:text-cyan-300 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Sign Up</span>
          </Link>
        </div>

        {/* Header */}
        <div className="border-b border-slate-800 pb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400">
              <Shield className="w-5 h-5" />
            </div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">
              Privacy Policy
            </h1>
          </div>
          <p className="text-sm text-slate-400">
            Commitment to Indian Undergraduate Privacy & Zero Commercial Spam
          </p>
        </div>

        {/* Content */}
        <div className="space-y-6 text-sm text-slate-300 leading-relaxed bg-slate-900/60 border border-slate-800 rounded-2xl p-6 sm:p-8 backdrop-blur-sm">
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <EyeOff className="w-4 h-4 text-cyan-400" />
              1. Our Core Promise: No Data Brokering
            </h2>
            <p>
              InternPath does <strong className="text-white">NOT</strong> sell, rent, monetize, or trade student profile data, contact details, or academic records to third-party marketing firms, lead generators, or coaching institutes.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Database className="w-4 h-4 text-cyan-400" />
              2. Information We Collect & Why
            </h2>
            <p>
              We collect minimal profile information strictly to determine program eligibility:
            </p>
            <ul className="list-disc pl-5 space-y-2 text-slate-400">
              <li><strong className="text-slate-200">Account Credentials:</strong> Full name and email address for authentication and notification dispatch.</li>
              <li><strong className="text-slate-200">Academic Profile:</strong> Degree, current year of study, academic discipline, and optional CGPA — strictly utilized to calculate eligibility match scores against institutional circulars.</li>
              <li><strong className="text-slate-200">Preferences:</strong> Geographic preferences and research domains to filter the opportunity feed.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Lock className="w-4 h-4 text-cyan-400" />
              3. Security & Storage
            </h2>
            <p>
              Authentication tokens and user profiles are secured via industry-standard Row Level Security (RLS) in PostgreSQL / Supabase, encrypted in transit (TLS 1.3) and at rest. Passwords are never stored in plaintext.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-white">4. Your Control & Account Deletion</h2>
            <p>
              You maintain total ownership of your profile. You may modify or delete your preferences and saved opportunities at any time directly through your profile settings.
            </p>
          </section>
        </div>

        <div className="pt-4 text-center">
          <Link
            href="/auth/signup"
            className="inline-flex items-center justify-center px-6 py-2.5 rounded-xl font-bold text-xs text-slate-950 bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 transition shadow-[0_0_20px_rgba(6,182,212,0.3)]"
          >
            Understood — Back to Create Account
          </Link>
        </div>
      </div>
    </div>
  );
}
