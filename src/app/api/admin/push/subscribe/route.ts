import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySessionToken, COOKIE_NAME } from '@/lib/admin/session';
import { upsertPushSubscription } from '@/lib/admin/push';

interface PushSubscriptionJSON {
  endpoint: string;
  keys: { p256dh: string; auth: string };
  expirationTime?: number | null;
}

interface SubscribeBody {
  subscription: PushSubscriptionJSON;
  deviceLabel?: string;
  userAgent?: string;
}

export async function POST(request: NextRequest) {
  const cookieStore = cookies();
  const session = cookieStore.get(COOKIE_NAME);
  if (!session || !verifySessionToken(session.value)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: SubscribeBody;
  try {
    body = (await request.json()) as SubscribeBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const sub = body.subscription;
  if (!sub?.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) {
    return NextResponse.json(
      { error: 'Invalid subscription payload (endpoint/keys missing)' },
      { status: 400 },
    );
  }

  const deviceLabel = (body.deviceLabel ?? '').trim().slice(0, 60) || null;
  const userAgent = (body.userAgent ?? '').slice(0, 500) || null;

  try {
    const row = await upsertPushSubscription({
      endpoint: sub.endpoint,
      p256dh: sub.keys.p256dh,
      auth: sub.keys.auth,
      userAgent,
      deviceLabel,
    });
    if (!row) {
      return NextResponse.json({ error: 'Supabase not connected' }, { status: 503 });
    }
    return NextResponse.json({ ok: true, id: row.id });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
