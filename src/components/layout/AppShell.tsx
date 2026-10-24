'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { StatusBanner } from '@/components/ui/StatusBanner';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, loading } = useAuth();

  // Hide global navigation and local demo banner on authentication entry routes
  const isAuthRoute =
    pathname.startsWith('/auth/') ||
    pathname === '/terms' ||
    pathname === '/privacy' ||
    (pathname === '/' && (!user || loading));

  if (isAuthRoute) {
    return (
      <main className="min-h-screen w-full flex flex-col bg-slate-950 overflow-x-hidden">
        {children}
      </main>
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
