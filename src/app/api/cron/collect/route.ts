import { NextRequest, NextResponse } from 'next/server';
import { runSourceCheck, runAllDueSources } from '@/lib/data-service';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * Verify authorization for the cron / automation endpoint
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

    if (bearerToken === cronSecret || customHeader === cronSecret) {
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

  try {
    if (sourceId) {
      // Execute single source collection
      const run = await runSourceCheck(sourceId);
      return NextResponse.json({
        success: true,
        type: 'single_source',
        sourceId,
        run,
        timestamp: new Date().toISOString(),
      });
    }

    // Execute batch for all due sources (or force all if requested)
    const runs = await runAllDueSources({ forceAll: force });
    return NextResponse.json({
      success: true,
      type: 'batch_collection',
      count: runs.length,
      runs,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      {
        success: false,
        error: errorMsg,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
