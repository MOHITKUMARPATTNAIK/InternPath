'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { isUserAdmin } from '@/types';
import { StatusBanner } from '@/components/ui/StatusBanner';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

const PROTECTED_PREFIXES = [
  '/internships',
  '/categories',
  '/saved',
  '/profile',
  '/admin',
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading } = useAuth();

  const isProtectedRoute = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix + '/')
  );

  const isAuthRoute =
    pathname.startsWith('/auth/') ||
    pathname === '/terms' ||
    pathname === '/privacy' ||
    (pathname === '/' && (!user || loading));

  // Client-side route protection: unauthenticated visitors attempting to view protected pages
  useEffect(() => {
    if (!loading && !user && isProtectedRoute) {
      const currentFullUrl =
        typeof window !== 'undefined'
          ? window.location.pathname + window.location.search
          : pathname;
      router.replace(`/auth/signup?redirect=${encodeURIComponent(currentFullUrl)}`);
    }
  }, [loading, user, isProtectedRoute, pathname, router]);

  // If viewing an auth entry route (Signup, Login, Reset, Terms, Privacy)
  if (isAuthRoute) {
    return (
      <main className="min-h-screen w-full flex flex-col bg-slate-950 overflow-x-hidden">
        {children}
      </main>
    );
  }

  // If accessing a protected route while authentication state is resolving
  if (isProtectedRoute && loading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-slate-950">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-cyan-400 border-t-transparent rounded-full animate-spin shadow-[0_0_20px_rgba(6,182,212,0.5)]" />
          <p className="text-xs text-cyan-300 font-semibold tracking-wider uppercase">
            Verifying Clearance...
          </p>
        </div>
      </div>
    );
  }

  // If unauthenticated on a protected route: strictly unmount children and hold in redirecting state
  if (isProtectedRoute && !user) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-slate-950">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-cyan-400 border-t-transparent rounded-full animate-spin shadow-[0_0_20px_rgba(6,182,212,0.5)]" />
          <p className="text-xs text-cyan-300 font-semibold tracking-wider uppercase">
            Authentication Required. Redirecting...
          </p>
        </div>
      </div>
    );
  }

  // If a student account attempts to access admin routes: 403 Forbidden screen
  if (pathname.startsWith('/admin') && user && !isUserAdmin(user.role)) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
        <StatusBanner />
        <Navbar />
        <main className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-rose-100 p-8 text-center space-y-4">
            <div className="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-600 mx-auto border border-rose-200 shadow-sm">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h1 className="text-xl font-bold text-slate-900">403 — Administrator Clearance Required</h1>
              <p className="text-xs text-slate-500 font-medium">Clearance Level: Student (Insufficient)</p>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Resource Management and administrative console controls are restricted to verified supervisors.
              Your account does not possess administrator privileges.
            </p>
            <div className="pt-2">
              <Link
                href="/internships"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition shadow-sm"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Return to Internships</span>
              </Link>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <StatusBanner />
      <Navbar />
      <main className="flex-1 flex flex-col">{children}</main>
      <Footer />
    </div>
  );
}
