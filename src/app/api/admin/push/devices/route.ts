import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySessionToken, COOKIE_NAME } from '@/lib/admin/session';
import {
  deletePushSubscription,
  listPushSubscriptions,
  maskEndpoint,
} from '@/lib/admin/push';

export async function GET() {
  const cookieStore = cookies();
  const session = cookieStore.get(COOKIE_NAME);
  if (!session || !verifySessionToken(session.value)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const rows = await listPushSubscriptions();
    const devices = rows.map((r) => ({
      id: r.id,
      endpoint: r.endpoint, // 원본 — 클라이언트에서 unsubscribe 호출에 필요
      endpointMasked: maskEndpoint(r.endpoint),
      userAgent: r.user_agent,
      deviceLabel: r.device_label,
      isActive: r.is_active,
      failureCount: r.failure_count,
      lastSuccessAt: r.last_success_at,
      lastFailureAt: r.last_failure_at,
      createdAt: r.created_at,
    }));
    return NextResponse.json({ devices });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const cookieStore = cookies();
  const session = cookieStore.get(COOKIE_NAME);
  if (!session || !verifySessionToken(session.value)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const endpoint = searchParams.get('endpoint');
  if (!endpoint) {
    return NextResponse.json({ error: 'endpoint query required' }, { status: 400 });
  }

  try {
    const ok = await deletePushSubscription(endpoint);
    if (!ok) {
      return NextResponse.json({ error: 'Supabase not connected' }, { status: 503 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
