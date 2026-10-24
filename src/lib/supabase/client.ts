import { createBrowserClient } from '@supabase/ssr';

export interface SupabaseDiagnostics {
  configured: boolean;
  missingUrl: boolean;
  missingAnonKey: boolean;
  hasPlaceholderUrl: boolean;
  hasPlaceholderKey: boolean;
  invalidProtocol: boolean;
  helpMessage: string;
}

export const getSupabaseDiagnostics = (): SupabaseDiagnostics => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

  const missingUrl = url.trim() === '';
  const missingAnonKey = key.trim() === '';
  const hasPlaceholderUrl = url.includes('your-project-id');
  const hasPlaceholderKey = key.includes('your-anon-key');
  const invalidProtocol = !missingUrl && !url.startsWith('https://');

  const configured =
    !missingUrl &&
    !missingAnonKey &&
    !hasPlaceholderUrl &&
    !hasPlaceholderKey &&
    !invalidProtocol;

  let helpMessage = 'Supabase PostgreSQL and Auth are properly configured.';

  if (!configured) {
    if (missingUrl && missingAnonKey) {
      helpMessage =
        'Supabase is not configured. Both NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are missing in .env.local.';
    } else if (missingUrl) {
      helpMessage = 'NEXT_PUBLIC_SUPABASE_URL is missing in .env.local.';
    } else if (missingAnonKey) {
      helpMessage = 'NEXT_PUBLIC_SUPABASE_ANON_KEY is missing in .env.local.';
    } else if (hasPlaceholderUrl || hasPlaceholderKey) {
      helpMessage =
        'Placeholder Supabase credentials detected in .env.local. Please replace with your real project URL and public anon key.';
    } else if (invalidProtocol) {
      helpMessage = 'NEXT_PUBLIC_SUPABASE_URL must start with https://.';
    }
  }

  return {
    configured,
    missingUrl,
    missingAnonKey,
    hasPlaceholderUrl,
    hasPlaceholderKey,
    invalidProtocol,
    helpMessage,
  };
};

export const isSupabaseConfigured = (): boolean => {
  return getSupabaseDiagnostics().configured;
};

/**
 * Demo mode is strictly restricted to development environments and can only be
 * activated if explicitly enabled via NEXT_PUBLIC_ENABLE_DEMO_MODE="true".
 * It is unconditionally disabled in production builds or whenever Supabase is configured.
 */
export const isDemoModeAllowed = (): boolean => {
  if (process.env.NODE_ENV === 'production') {
    return false;
  }
  if (isSupabaseConfigured()) {
    return false;
  }
  return process.env.NEXT_PUBLIC_ENABLE_DEMO_MODE === 'true';
};

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!isSupabaseConfigured() || !supabaseUrl || !supabaseAnonKey) {
    return null;
  }

  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}
