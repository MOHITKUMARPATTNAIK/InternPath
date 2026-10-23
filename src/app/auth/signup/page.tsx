'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { signupSchema } from '@/lib/validations';
import { UserPlus, AlertCircle, ArrowRight, ShieldCheck } from 'lucide-react';

export default function SignupPage() {
  const router = useRouter();
  const { signUp } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const validation = signupSchema.safeParse({ displayName, email, password });
    if (!validation.success) {
      setError(validation.error.issues[0]?.message || 'Please check your input');
      return;
    }

    setLoading(true);
    const result = await signUp(email, password, displayName);
    setLoading(false);

    if (result.error) {
      setError(result.error);
    } else {
      router.push('/profile');
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-lg max-w-md w-full p-6 sm:p-8 space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 mx-auto">
            <UserPlus className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Create Student Profile</h1>
          <p className="text-xs text-slate-500">
            Join thousands of Indian undergraduates discovering verified institutional opportunities.
          </p>
        </div>

        {error && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSignup} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Full Name</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g. Aarav Sharma"
              className="w-full py-2.5 px-3 border border-slate-200 rounded-lg text-slate-800 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
              required
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="aarav@college.edu"
              className="w-full py-2.5 px-3 border border-slate-200 rounded-lg text-slate-800 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
              required
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Password (min. 6 characters)</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full py-2.5 px-3 border border-slate-200 rounded-lg text-slate-800 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
              required
            />
          </div>

          <div className="p-3 bg-slate-50 rounded-lg text-[11px] text-slate-500 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>We never spam or sell your information. Location is always optional.</span>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs shadow-md transition flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <span>{loading ? 'Creating Profile...' : 'Sign Up & Continue'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="pt-2 text-center text-xs text-slate-500 border-t border-slate-100">
          Already have an account?{' '}
          <Link href="/auth/login" className="text-indigo-600 font-semibold hover:underline">
            Log In
          </Link>
        </div>
      </div>
    </div>
  );
}
