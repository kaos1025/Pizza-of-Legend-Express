import { NextResponse } from 'next/server';
import { getBusinessHours } from '@/lib/admin/settings';
import { computeOpenState, DEFAULT_BUSINESS_HOURS } from '@/lib/business-hours';

/**
 * Public, read-only business-hours endpoint for the customer UI.
 * Returns the configured hours plus the server-computed open/closed state
 * (Asia/Seoul). Enforcement still lives in the DB trigger — this is UX only.
 */
export async function GET() {
  try {
    const config = await getBusinessHours();
    const state = computeOpenState(config);
    return NextResponse.json(
      { config, state },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch {
    // On any failure, fail open (don't block browsing/ordering UX).
    const config = DEFAULT_BUSINESS_HOURS;
    return NextResponse.json(
      { config, state: computeOpenState(config) },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
