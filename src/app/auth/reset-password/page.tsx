'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { Futuristic3DBackground } from '@/components/auth/Futuristic3DBackground';
import { KeyRound, ArrowLeft, CheckCircle, AlertCircle, Mail, ArrowRight } from 'lucide-react';

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
    <Futuristic3DBackground>
      <div className="w-full max-w-lg">
        {/* Glassmorphic 3D Card */}
        <div className="rounded-3xl bg-slate-900/75 backdrop-blur-2xl border border-cyan-500/30 shadow-[0_0_60px_rgba(6,182,212,0.18)] p-6 sm:p-9 space-y-6 transition-all duration-300 hover:border-cyan-400/50">
          
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-[11px] font-bold text-cyan-400 tracking-wide uppercase mb-1">
              <KeyRound className="w-3.5 h-3.5" />
              <span>Account Recovery</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Reset Your Password
            </h1>

            <p className="text-xs sm:text-sm text-slate-400">
              Enter your registered email address to receive secure password recovery instructions.
            </p>
          </div>

          {/* Alert Error Box */}
          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-950/50 border border-rose-500/40 text-rose-200 text-xs flex items-start gap-2.5 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
              <span className="leading-snug">{error}</span>
            </div>
          )}

          {/* Success Message Box */}
          {message && (
            <div className="p-3.5 rounded-2xl bg-emerald-950/50 border border-emerald-500/40 text-emerald-200 text-xs flex items-start gap-2.5 animate-in fade-in">
              <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
              <span className="leading-snug">{message}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleReset} className="space-y-4 text-xs" noValidate>
            <div>
              <label className="block font-semibold text-slate-300 mb-1.5">
                Registered Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="student@university.ac.in"
                  className="w-full py-2.5 pl-10 pr-3.5 bg-slate-950/80 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 focus:border-cyan-500 transition"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 px-4 rounded-xl font-bold text-xs text-slate-950 bg-gradient-to-r from-cyan-400 via-blue-500 to-violet-500 hover:from-cyan-300 hover:via-blue-400 hover:to-violet-400 transition-all duration-200 shadow-[0_0_25px_rgba(6,182,212,0.35)] flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  <span>Sending recovery link...</span>
                </>
              ) : (
                <>
                  <span>Send Recovery Instructions</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Back to Login Link */}
          <div className="pt-2 text-center text-xs text-slate-400 border-t border-slate-800/80">
            <Link
              href="/auth/login"
              className="inline-flex items-center gap-1.5 text-cyan-400 font-bold hover:text-cyan-300 hover:underline transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Sign In</span>
            </Link>
          </div>
        </div>
      </div>
    </Futuristic3DBackground>
  );
}
