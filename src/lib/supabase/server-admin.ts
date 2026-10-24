import { createClient, SupabaseClient } from '@supabase/supabase-js';

export interface SupabaseAdminDiagnostics {
  configured: boolean;
  missingUrl: boolean;
  missingServiceKey: boolean;
  hasPlaceholderUrl: boolean;
  hasPlaceholderKey: boolean;
  invalidProtocol: boolean;
  helpMessage: string;
}

/**
 * Diagnostic inspector for the server-only Supabase admin service-role client.
 * Verifies URL and SUPABASE_SERVICE_ROLE_KEY presence and integrity without leaking secrets.
 */
export function getSupabaseAdminDiagnostics(): SupabaseAdminDiagnostics {
  if (typeof window !== 'undefined') {
    return {
      configured: false,
      missingUrl: false,
      missingServiceKey: true,
      hasPlaceholderUrl: false,
      hasPlaceholderKey: false,
      invalidProtocol: false,
      helpMessage:
        'SECURITY GUARD: Supabase admin service-role client is strictly server-only and cannot be inspected in a browser environment.',
    };
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  const missingUrl = url.trim() === '';
  const missingServiceKey = serviceKey.trim() === '';
  const hasPlaceholderUrl = url.includes('your-project-id');
  const hasPlaceholderKey =
    serviceKey.includes('your-service-role-key') ||
    serviceKey.includes('your-service-key') ||
    serviceKey.includes('your-anon-key');
  const invalidProtocol = !missingUrl && !url.startsWith('https://');

  const configured =
    !missingUrl &&
    !missingServiceKey &&
    !hasPlaceholderUrl &&
    !hasPlaceholderKey &&
    !invalidProtocol;

  let helpMessage = 'Supabase admin service-role client is properly configured.';

  if (!configured) {
    if (missingUrl && missingServiceKey) {
      helpMessage =
        'Both SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are missing from the server environment. Background writes will be rejected by RLS.';
    } else if (missingUrl) {
      helpMessage = 'SUPABASE_URL is missing in the server environment.';
    } else if (missingServiceKey) {
      helpMessage =
        'SUPABASE_SERVICE_ROLE_KEY is missing in the server environment. Automated background writes require service-role clearance.';
    } else if (hasPlaceholderUrl || hasPlaceholderKey) {
      helpMessage =
        'Placeholder values detected for SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Please supply authentic credentials in .env.local.';
    } else if (invalidProtocol) {
      helpMessage = 'SUPABASE_URL must start with https://.';
    }
  }

  return {
    configured,
    missingUrl,
    missingServiceKey,
    hasPlaceholderUrl,
    hasPlaceholderKey,
    invalidProtocol,
    helpMessage,
  };
}

export function isSupabaseAdminConfigured(): boolean {
  return getSupabaseAdminDiagnostics().configured;
}

/**
 * Creates a server-only Supabase client utilizing SUPABASE_SERVICE_ROLE_KEY.
 *
 * Security Invariants:
 * 1. Strictly Server-Only: Throws immediately if imported or evaluated in browser context.
 * 2. Bypass RLS for System Automation: Used exclusively by cron jobs, background workers,
 *    and automated collection pipelines that lack interactive admin user sessions.
 * 3. Never leaks the service role secret into logs or errors.
 */
export function createAdminClient(): SupabaseClient | null {
  if (typeof window !== 'undefined') {
    throw new Error(
      'SECURITY VIOLATION: createAdminClient cannot be executed in browser context. Service role keys must never be exposed to the client.'
    );
  }

  const diagnostics = getSupabaseAdminDiagnostics();
  if (!diagnostics.configured) {
    console.warn(`[Supabase Admin Client] Initialization skipped: ${diagnostics.helpMessage}`);
    return null;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  return createClient(url, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
