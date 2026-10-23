'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { loginSchema } from '@/lib/validations';
import { LogIn, AlertCircle, ArrowRight, ShieldCheck, User } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const validation = loginSchema.safeParse({ email, password });
    if (!validation.success) {
      setError(validation.error.issues[0]?.message || 'Please check your input');
      return;
    }

    setLoading(true);
    const result = await signIn(email, password);
    setLoading(false);

    if (result.error) {
      setError(result.error);
    } else {
      router.push('/internships');
    }
  };

  const fillDemoAccount = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('demoPass123!');
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-lg max-w-md w-full p-6 sm:p-8 space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 mx-auto">
            <LogIn className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Log in to InternPath</h1>
          <p className="text-xs text-slate-500">
            Access your saved internships, personalized recommendations, and tracker.
          </p>
        </div>

        {error && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Demo Fast Login Buttons */}
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
          <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
            Fast Demo Profiles
          </span>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => fillDemoAccount('student.demo@iitm.ac.in')}
              className="py-1.5 px-2 bg-white border border-slate-200 hover:border-indigo-300 rounded text-left text-slate-700 hover:text-indigo-600 transition flex items-center gap-1.5 font-medium"
            >
              <User className="w-3.5 h-3.5 text-indigo-600" />
              <span>Student Profile</span>
            </button>
            <button
              type="button"
              onClick={() => fillDemoAccount('admin.evaluator@internpath.in')}
              className="py-1.5 px-2 bg-white border border-slate-200 hover:border-amber-300 rounded text-left text-slate-700 hover:text-amber-700 transition flex items-center gap-1.5 font-medium"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
              <span>Admin Profile</span>
            </button>
          </div>
        </div>

        <form onSubmit={handleLogin} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="student@university.ac.in"
              className="w-full py-2.5 px-3 border border-slate-200 rounded-lg text-slate-800 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
              required
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="font-semibold text-slate-700">Password</label>
              <Link
                href="/auth/reset-password"
                className="text-[11px] text-indigo-600 hover:underline font-medium"
              >
                Forgot Password?
              </Link>
            </div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full py-2.5 px-3 border border-slate-200 rounded-lg text-slate-800 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs shadow-md transition flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <span>{loading ? 'Logging in...' : 'Sign In'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="pt-2 text-center text-xs text-slate-500 border-t border-slate-100">
          Don&apos;t have an account?{' '}
          <Link href="/auth/signup" className="text-indigo-600 font-semibold hover:underline">
            Create Profile
          </Link>
        </div>
      </div>
    </div>
  );
}
