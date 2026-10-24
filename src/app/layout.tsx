import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/lib/auth-context';
import { AppShell } from '@/components/layout/AppShell';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'InternPath — Trusted Internship Discovery Platform for India',
  description:
    'Discover authentic, verified internships from premier Indian institutions (IITs, NITs, IISc, IISERs), central government ministries (NITI Aayog, MEA, RBI), and top research organizations.',
  keywords: [
    'internships india',
    'IIT summer internship',
    'IISc summer fellowship',
    'government internship scheme',
    'NITI aayog internship',
    'research fellowship India',
    'student opportunities',
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} min-h-screen flex flex-col bg-slate-950 text-slate-900 antialiased`}>
        <AuthProvider>
          <AppShell>{children}</AppShell>
        </AuthProvider>
      </body>
    </html>
  );
}
