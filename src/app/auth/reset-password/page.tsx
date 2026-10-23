'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { KeyRound, ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react';

export default function ResetPasswordPage() {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError('Please enter your email address');
      return;
    }

    setLoading(true);
    setError(null);
    setMessage(null);

    const res = await resetPassword(email);
    setLoading(false);

    if (res.error) {
      setError(res.error);
    } else {
      setMessage(res.message || 'Password reset link sent to your email.');
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-lg max-w-md w-full p-6 sm:p-8 space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 mx-auto">
            <KeyRound className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Reset Password</h1>
          <p className="text-xs text-slate-500">
            Enter your registered email address to receive password reset instructions.
          </p>
        </div>

        {error && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {message && (
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2">
            <CheckCircle className="w-4 h-4 flex-shrink-0 text-emerald-600" />
            <span>{message}</span>
          </div>
        )}

        <form onSubmit={handleReset} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Registered Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="student@university.ac.in"
              className="w-full py-2.5 px-3 border border-slate-200 rounded-lg text-slate-800 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs shadow-md transition disabled:opacity-50"
          >
            {loading ? 'Sending link...' : 'Send Password Reset Email'}
          </button>
        </form>

        <div className="pt-2 text-center text-xs text-slate-500 border-t border-slate-100">
          <Link href="/auth/login" className="inline-flex items-center gap-1.5 text-indigo-600 font-semibold hover:underline">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Login</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
