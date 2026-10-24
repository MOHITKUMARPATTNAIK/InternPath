'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { signupFormSchema } from '@/lib/validations';
import { Futuristic3DBackground } from '@/components/auth/Futuristic3DBackground';
import {
  Sparkles,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  Eye,
  EyeOff,
  CheckCircle2,
  MailCheck,
  Lock,
  User,
  Mail,
  Database,
} from 'lucide-react';

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get('redirect') || '/internships';
  const { user, loading: authLoading, signUp, isConfigured } = useAuth();

  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ [key: string]: string }>({});
  const [submitting, setSubmitting] = useState(false);
  const [requiresConfirmation, setRequiresConfirmation] = useState(false);
  const [confirmationEmail, setConfirmationEmail] = useState('');

  // If already authenticated, redirect away from signup to requested destination
  useEffect(() => {
    if (!authLoading && user) {
      router.replace(redirectUrl);
    }
  }, [user, authLoading, router, redirectUrl]);

  // Dynamic Password Strength Calculation
  const passwordStrength = useMemo(() => {
    if (!password) return { score: 0, label: '', color: 'bg-slate-700' };
    let score = 0;
    if (password.length >= 6) score += 1;
    if (password.length >= 8) score += 1;
    if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1;
    if (/[0-9]/.test(password) || /[^A-Za-z0-9]/.test(password)) score += 1;

    switch (score) {
      case 1:
        return { score: 25, label: 'Weak', color: 'bg-rose-500', text: 'text-rose-400' };
      case 2:
        return { score: 50, label: 'Fair', color: 'bg-amber-500', text: 'text-amber-400' };
      case 3:
        return { score: 75, label: 'Good', color: 'bg-cyan-500', text: 'text-cyan-400' };
      case 4:
        return { score: 100, label: 'Strong', color: 'bg-emerald-400', text: 'text-emerald-400' };
      default:
        return { score: 0, label: '', color: 'bg-slate-700', text: 'text-slate-500' };
    }
  }, [password]);

  const passwordsMatch = confirmPassword.length > 0 && password === confirmPassword;

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    setError(null);
    setFieldErrors({});

    const validation = signupFormSchema.safeParse({
      displayName,
      email,
      password,
      confirmPassword,
      agreeTerms,
    });

    if (!validation.success) {
      const fieldMap: { [key: string]: string } = {};
      validation.error.issues.forEach((issue) => {
        const fieldName = issue.path[0] as string;
        if (fieldName && !fieldMap[fieldName]) {
          fieldMap[fieldName] = issue.message;
        }
      });
      setFieldErrors(fieldMap);
      setError(validation.error.issues[0]?.message || 'Please correct the highlighted errors.');
      return;
    }

    setSubmitting(true);
    const result = await signUp(email, password, displayName);
    setSubmitting(false);

    if (result.error) {
      setError(result.error);
    } else if (result.requiresEmailConfirmation) {
      setConfirmationEmail(email);
      setRequiresConfirmation(true);
    } else {
      router.push(redirectUrl);
    }
  };

  // If Supabase returned an email confirmation requirement
  if (requiresConfirmation) {
    return (
      <Futuristic3DBackground>
        <div className="w-full max-w-md p-8 rounded-3xl bg-slate-900/80 backdrop-blur-2xl border border-cyan-500/30 shadow-[0_0_60px_rgba(6,182,212,0.2)] text-center space-y-6">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-[0_0_30px_rgba(6,182,212,0.3)] animate-pulse">
            <MailCheck className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-black text-white tracking-tight">
              Verify Your Email
            </h2>
            <p className="text-sm text-slate-300">
              We have dispatched a verification link to:
            </p>
            <p className="font-mono text-sm font-bold text-cyan-400 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700/70 inline-block">
              {confirmationEmail}
            </p>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed">
            Please click the link in your inbox to confirm your account and begin discovering verified internships across IITs, NITs, and premier research centers.
          </p>

          <div className="pt-2">
            <Link
              href={redirectUrl !== '/internships' ? `/auth/login?redirect=${encodeURIComponent(redirectUrl)}` : '/auth/login'}
              className="inline-flex items-center justify-center w-full py-3 px-4 rounded-xl font-bold text-xs text-slate-900 bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 transition shadow-[0_0_20px_rgba(6,182,212,0.3)]"
            >
              Sign In to Your Account
            </Link>
          </div>
        </div>
      </Futuristic3DBackground>
    );
  }

  return (
    <Futuristic3DBackground>
      <div className="w-full max-w-lg">
        {/* Glassmorphic 3D Futuristic Card */}
        <div className="rounded-3xl bg-slate-900/75 backdrop-blur-2xl border border-cyan-500/30 shadow-[0_0_60px_rgba(6,182,212,0.18)] p-6 sm:p-9 space-y-6 transition-all duration-300 hover:border-cyan-400/50">
          
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-[11px] font-bold text-cyan-400 tracking-wide uppercase mb-1">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Next-Gen Discovery</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Create Your InternPath Account
            </h1>

            <p className="text-xs sm:text-sm text-slate-400">
              Start discovering trusted internship opportunities across India.
            </p>
          </div>

          {/* Supabase Configuration Diagnostic Notice */}
          {!isConfigured && (
            <div className="p-3.5 rounded-2xl bg-amber-950/40 border border-amber-500/30 text-amber-200 text-xs flex items-start gap-2.5">
              <Database className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-semibold text-amber-300">Supabase Backend Required</p>
                <p className="text-[11px] text-amber-200/80 leading-relaxed">
                  Real authentication requires setting <code className="bg-amber-900/50 px-1 py-0.5 rounded text-amber-100 font-mono">NEXT_PUBLIC_SUPABASE_URL</code> and <code className="bg-amber-900/50 px-1 py-0.5 rounded text-amber-100 font-mono">NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY</code> (or <code className="bg-amber-900/50 px-1 py-0.5 rounded text-amber-100 font-mono">NEXT_PUBLIC_SUPABASE_ANON_KEY</code>) in <code className="bg-amber-900/50 px-1 py-0.5 rounded text-amber-100 font-mono">.env.local</code>.
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

          {/* Signup Form */}
          <form onSubmit={handleSignup} className="space-y-4 text-xs" noValidate>
            
            {/* Full Name */}
            <div>
              <label className="block font-semibold text-slate-300 mb-1.5">
                Full Name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => {
                    setDisplayName(e.target.value);
                    if (fieldErrors.displayName) {
                      setFieldErrors((prev) => ({ ...prev, displayName: '' }));
                    }
                  }}
                  placeholder="e.g. Aarav Sharma"
                  className={`w-full py-2.5 pl-10 pr-3.5 bg-slate-950/80 border rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 transition ${
                    fieldErrors.displayName
                      ? 'border-rose-500 focus:border-rose-500'
                      : 'border-slate-800 focus:border-cyan-500'
                  }`}
                  required
                />
              </div>
              {fieldErrors.displayName && (
                <p className="mt-1 text-[11px] text-rose-400 font-medium">
                  {fieldErrors.displayName}
                </p>
              )}
            </div>

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
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (fieldErrors.email) {
                      setFieldErrors((prev) => ({ ...prev, email: '' }));
                    }
                  }}
                  placeholder="student@university.ac.in"
                  className={`w-full py-2.5 pl-10 pr-3.5 bg-slate-950/80 border rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 transition ${
                    fieldErrors.email
                      ? 'border-rose-500 focus:border-rose-500'
                      : 'border-slate-800 focus:border-cyan-500'
                  }`}
                  required
                />
              </div>
              {fieldErrors.email && (
                <p className="mt-1 text-[11px] text-rose-400 font-medium">
                  {fieldErrors.email}
                </p>
              )}
            </div>

            {/* Password */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="font-semibold text-slate-300">
                  Password
                </label>
                {passwordStrength.label && (
                  <span className={`text-[10px] font-bold ${passwordStrength.text}`}>
                    Strength: {passwordStrength.label}
                  </span>
                )}
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (fieldErrors.password) {
                      setFieldErrors((prev) => ({ ...prev, password: '' }));
                    }
                  }}
                  placeholder="Min. 6 characters"
                  className={`w-full py-2.5 pl-10 pr-10 bg-slate-950/80 border rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 transition ${
                    fieldErrors.password
                      ? 'border-rose-500 focus:border-rose-500'
                      : 'border-slate-800 focus:border-cyan-500'
                  }`}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-cyan-400 transition"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Password Strength Meter Bar */}
              {password && (
                <div className="mt-2 space-y-1">
                  <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${passwordStrength.color}`}
                      style={{ width: `${passwordStrength.score}%` }}
                    />
                  </div>
                </div>
              )}
              {fieldErrors.password && (
                <p className="mt-1 text-[11px] text-rose-400 font-medium">
                  {fieldErrors.password}
                </p>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="font-semibold text-slate-300">
                  Confirm Password
                </label>
                {confirmPassword && (
                  <span
                    className={`text-[10px] font-bold flex items-center gap-1 ${
                      passwordsMatch ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {passwordsMatch ? (
                      <>
                        <CheckCircle2 className="w-3 h-3" /> Passwords match
                      </>
                    ) : (
                      'Passwords do not match'
                    )}
                  </span>
                )}
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (fieldErrors.confirmPassword) {
                      setFieldErrors((prev) => ({ ...prev, confirmPassword: '' }));
                    }
                  }}
                  placeholder="Re-enter your password"
                  className={`w-full py-2.5 pl-10 pr-10 bg-slate-950/80 border rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 transition ${
                    fieldErrors.confirmPassword
                      ? 'border-rose-500 focus:border-rose-500'
                      : 'border-slate-800 focus:border-cyan-500'
                  }`}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-cyan-400 transition"
                  aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {fieldErrors.confirmPassword && (
                <p className="mt-1 text-[11px] text-rose-400 font-medium">
                  {fieldErrors.confirmPassword}
                </p>
              )}
            </div>

            {/* Terms of Service & Privacy Policy Agreement */}
            <div className="pt-1">
              <label className="flex items-start gap-2.5 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={agreeTerms}
                  onChange={(e) => {
                    setAgreeTerms(e.target.checked);
                    if (fieldErrors.agreeTerms) {
                      setFieldErrors((prev) => ({ ...prev, agreeTerms: '' }));
                    }
                  }}
                  className="mt-0.5 w-4 h-4 rounded border-slate-700 bg-slate-950 text-cyan-500 focus:ring-cyan-500/30 focus:ring-offset-0"
                />
                <span className="text-[11px] text-slate-300 leading-snug group-hover:text-slate-200">
                  I agree to the{' '}
                  <Link
                    href="/terms"
                    target="_blank"
                    className="text-cyan-400 hover:underline font-semibold"
                  >
                    Terms of Service
                  </Link>{' '}
                  and{' '}
                  <Link
                    href="/privacy"
                    target="_blank"
                    className="text-cyan-400 hover:underline font-semibold"
                  >
                    Privacy Policy
                  </Link>
                  .
                </span>
              </label>
              {fieldErrors.agreeTerms && (
                <p className="mt-1 text-[11px] text-rose-400 font-medium">
                  {fieldErrors.agreeTerms}
                </p>
              )}
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
                  <span>Creating Account...</span>
                </>
              ) : (
                <>
                  <span>Create Account</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Reassurance Badge */}
          <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800 text-[11px] text-slate-400 flex items-center gap-2.5">
            <ShieldCheck className="w-4 h-4 text-cyan-400 flex-shrink-0" />
            <span>
              100% verified institutional opportunities. Free for Indian undergraduate students.
            </span>
          </div>

          {/* Secondary Link: Sign In */}
          <div className="pt-2 text-center text-xs text-slate-400 border-t border-slate-800/80">
            Already have an account?{' '}
            <Link
              href={redirectUrl !== '/internships' ? `/auth/login?redirect=${encodeURIComponent(redirectUrl)}` : '/auth/login'}
              className="text-cyan-400 font-bold hover:text-cyan-300 hover:underline transition"
            >
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </Futuristic3DBackground>
  );
}

export default function SignupPage() {
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
      <SignupForm />
    </Suspense>
  );
}
