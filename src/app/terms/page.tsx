import React from 'react';
import Link from 'next/link';
import { ArrowLeft, ShieldCheck, Scale, FileText, CheckCircle2 } from 'lucide-react';

export const metadata = {
  title: 'Terms of Service — InternPath',
  description: 'Terms and conditions for using the InternPath trusted internship discovery platform for Indian undergraduates.',
};

export default function TermsPage() {
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
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              <Scale className="w-5 h-5" />
            </div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">
              Terms of Service
            </h1>
          </div>
          <p className="text-sm text-slate-400">
            Last Updated: October 2026 • Effective for all InternPath users across India
          </p>
        </div>

        {/* Content */}
        <div className="space-y-6 text-sm text-slate-300 leading-relaxed bg-slate-900/60 border border-slate-800 rounded-2xl p-6 sm:p-8 backdrop-blur-sm">
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-cyan-400" />
              1. Platform Purpose & Scope
            </h2>
            <p>
              InternPath (&quot;Platform&quot;) is an informational discovery and recommendation engine engineered to assist Indian undergraduate and postgraduate students in finding authentic, verified research fellowships, industrial internships, and government-funded training schemes from IITs, NITs, IISc, IISERs, central ministries, and accredited organizations.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-cyan-400" />
              2. Authentic Source Verification & Official Portals
            </h2>
            <p>
              InternPath indexes and points students exclusively to official institutional application portals (e.g., .ac.in, .gov.in, .res.in, and verified corporate domains). InternPath does not charge application fees, does not guarantee acceptance into any program, and does not act as an employer. All application decisions remain solely with the hosting institution.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-cyan-400" />
              3. Student Responsibilities
            </h2>
            <p>
              When utilizing the platform, you agree to:
            </p>
            <ul className="list-disc pl-5 space-y-2 text-slate-400">
              <li>Provide accurate academic discipline, degree, CGPA, and institution information to ensure proper eligibility matching.</li>
              <li>Respect the intellectual property and application deadlines established by participating institutions.</li>
              <li>Review the host institution&apos;s primary circulars before submitting formal applications.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-white">4. No Fee Guarantee</h2>
            <p>
              InternPath is committed to equitable student access. Discovery, eligibility calculation, and official link redirection are free for Indian students. Be cautious of fraudulent entities requesting placement fees.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-white">5. Governing Law</h2>
            <p>
              These terms shall be governed by and construed in accordance with the laws of the Republic of India.
            </p>
          </section>
        </div>

        <div className="pt-4 text-center">
          <Link
            href="/auth/signup"
            className="inline-flex items-center justify-center px-6 py-2.5 rounded-xl font-bold text-xs text-slate-950 bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 transition shadow-[0_0_20px_rgba(6,182,212,0.3)]"
          >
            I Understand — Proceed to Create Account
          </Link>
        </div>
      </div>
    </div>
  );
}
