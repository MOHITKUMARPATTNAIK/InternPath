import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { runSourceCheck, runAllDueSources } from '@/lib/data-service';
import { isSupabaseConfigured } from '@/lib/supabase/client';
import {
  createAdminClient,
  isSupabaseAdminConfigured,
  getSupabaseAdminDiagnostics,
} from '@/lib/supabase/server-admin';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function timingSafeCompare(a: string, b: string): boolean {
  try {
    const bufA = Buffer.from(a);
    const bufB = Buffer.from(b);
    if (bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}

/**
 * Verify authorization for the cron / automation endpoint.
 * In production: strictly requires a matching CRON_SECRET via Bearer token or x-cron-secret header.
 * In development: permits requests if CRON_SECRET is omitted, or validates it if provided.
 */
function isAuthorized(request: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET;

  // 1. If CRON_SECRET is configured, enforce strict token matching
  if (cronSecret && cronSecret.trim().length > 0) {
    const authHeader = request.headers.get('authorization');
    const customHeader = request.headers.get('x-cron-secret');

    const bearerToken = authHeader?.startsWith('Bearer ')
      ? authHeader.substring(7).trim()
      : null;

    const provided = bearerToken || customHeader;
    if (provided && timingSafeCompare(provided, cronSecret)) {
      return true;
    }
    return false;
  }

  // 2. In local development environment, permit if no secret configured
  if (process.env.NODE_ENV === 'development') {
    return true;
  }

  // 3. In production without a secret configured, reject for security
  return false;
}

export async function GET(request: NextRequest) {
  return handleCollection(request);
}

export async function POST(request: NextRequest) {
  return handleCollection(request);
}

async function handleCollection(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json(
      {
        error: 'Unauthorized',
        message:
          'Valid CRON_SECRET must be supplied via "Authorization: Bearer <secret>" or "x-cron-secret" header.',
      },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(request.url);
  const sourceId = searchParams.get('sourceId');
  const force = searchParams.get('force') === 'true';

  // Obtain server admin client for background collection writes
  let adminClient = null;

  if (isSupabaseConfigured()) {
    if (!isSupabaseAdminConfigured()) {
      const diag = getSupabaseAdminDiagnostics();
      console.error(
        '[Cron Collect] Server admin client missing service role key:',
        diag.helpMessage
      );
      return NextResponse.json(
        {
          success: false,
          error:
            'Database service-role authentication is not configured on the server. SUPABASE_SERVICE_ROLE_KEY is required for background automation.',
          helpMessage: diag.helpMessage,
          timestamp: new Date().toISOString(),
        },
        { status: 503 }
      );
    }

    adminClient = createAdminClient();
  }

  try {
    if (sourceId) {
      // Execute single source collection with server admin privileges
      const run = await runSourceCheck(sourceId, { client: adminClient ?? undefined });
      return NextResponse.json({
        success: true,
        type: 'single_source',
        sourceId,
        run,
        timestamp: new Date().toISOString(),
      });
    }

    // Execute batch for all due sources (or force all if requested)
    const runs = await runAllDueSources({
      forceAll: force,
      client: adminClient ?? undefined,
    });

    return NextResponse.json({
      success: true,
      type: 'batch_collection',
      count: runs.length,
      runs,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error('[Cron Collect] Unhandled collection failure:', errorMsg);

    // Sanitize any potential token or connection string leaks from error output
    const safeError = errorMsg
      .replace(/eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/g, '[REDACTED_TOKEN]')
      .replace(/https:\/\/[^@]+@/g, 'https://');

    return NextResponse.json(
      {
        success: false,
        error: safeError,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
