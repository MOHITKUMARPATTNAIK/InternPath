'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { loginSchema } from '@/lib/validations';
import { Futuristic3DBackground } from '@/components/auth/Futuristic3DBackground';
import {
  LogIn,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  Eye,
  EyeOff,
  Lock,
  Mail,
  Database,
} from 'lucide-react';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get('redirect') || '/internships';
  const { user, loading: authLoading, signIn, isConfigured } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // If already authenticated, redirect to requested destination
  useEffect(() => {
    if (!authLoading && user) {
      router.replace(redirectUrl);
    }
  }, [user, authLoading, router, redirectUrl]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    setError(null);

    const validation = loginSchema.safeParse({ email, password });
    if (!validation.success) {
      setError(validation.error.issues[0]?.message || 'Please check your input');
      return;
    }

    setSubmitting(true);
    const result = await signIn(email, password);
    setSubmitting(false);

    if (result.error) {
      setError(result.error);
    } else {
      router.push(redirectUrl);
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
              <LogIn className="w-3.5 h-3.5" />
              <span>Secure Gateway</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Sign In to InternPath
            </h1>

            <p className="text-xs sm:text-sm text-slate-400">
              Access your personalized recommendations, saved internships, and tracker.
            </p>
          </div>

          {/* Supabase Configuration Diagnostic Notice */}
          {!isConfigured && (
            <div className="p-3.5 rounded-2xl bg-amber-950/40 border border-amber-500/30 text-amber-200 text-xs flex items-start gap-2.5">
              <Database className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-semibold text-amber-300">Supabase Backend Required</p>
                <p className="text-[11px] text-amber-200/80 leading-relaxed">
                  Real authentication requires setting <code className="bg-amber-900/50 px-1 py-0.5 rounded text-amber-100 font-mono">NEXT_PUBLIC_SUPABASE_URL</code> and <code className="bg-amber-900/50 px-1 py-0.5 rounded text-amber-100 font-mono">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> in <code className="bg-amber-900/50 px-1 py-0.5 rounded text-amber-100 font-mono">.env.local</code>.
                </p>
              </div>
            </div>
          )}

          {/* Alert Error Box */}
          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-950/50 border border-rose-500/40 text-rose-200 text-xs flex items-start gap-2.5 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
              <span className="leading-snug">{error}</span>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-4 text-xs" noValidate>
            {/* Email Address */}
            <div>
              <label className="block font-semibold text-slate-300 mb-1.5">
                Email Address
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

            {/* Password */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="font-semibold text-slate-300">
                  Password
                </label>
                <Link
                  href="/auth/reset-password"
                  className="text-[11px] text-cyan-400 hover:text-cyan-300 font-medium hover:underline transition"
                >
                  Forgot Password?
                </Link>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full py-2.5 pl-10 pr-10 bg-slate-950/80 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 focus:border-cyan-500 transition"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-cyan-400 transition cursor-pointer"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Primary CTA Submit Button */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full mt-2 py-3 px-4 rounded-xl font-bold text-xs text-slate-950 bg-gradient-to-r from-cyan-400 via-blue-500 to-violet-500 hover:from-cyan-300 hover:via-blue-400 hover:to-violet-400 transition-all duration-200 shadow-[0_0_25px_rgba(6,182,212,0.35)] flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  <span>Signing In...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Reassurance Badge */}
          <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800 text-[11px] text-slate-400 flex items-center gap-2.5">
            <ShieldCheck className="w-4 h-4 text-cyan-400 flex-shrink-0" />
            <span>
              End-to-end encrypted session. Direct link to official Indian institutional portals.
            </span>
          </div>

          {/* Secondary Link: Create Account */}
          <div className="pt-2 text-center text-xs text-slate-400 border-t border-slate-800/80">
            Don&apos;t have an account?{' '}
            <Link
              href={redirectUrl !== '/internships' ? `/auth/signup?redirect=${encodeURIComponent(redirectUrl)}` : '/auth/signup'}
              className="text-cyan-400 font-bold hover:text-cyan-300 hover:underline transition"
            >
              Create Account
            </Link>
          </div>
        </div>
      </div>
    </Futuristic3DBackground>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen w-full flex items-center justify-center bg-slate-950">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-3 border-cyan-400 border-t-transparent rounded-full animate-spin shadow-[0_0_20px_rgba(6,182,212,0.5)]" />
            <p className="text-xs text-cyan-300 font-semibold tracking-wider uppercase">Loading InternPath...</p>
          </div>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
