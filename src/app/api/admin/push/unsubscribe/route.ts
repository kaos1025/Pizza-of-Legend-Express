import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySessionToken, COOKIE_NAME } from '@/lib/admin/session';
import { deactivatePushSubscription } from '@/lib/admin/push';

interface UnsubscribeBody {
  endpoint: string;
}

export async function POST(request: NextRequest) {
  const cookieStore = cookies();
  const session = cookieStore.get(COOKIE_NAME);
  if (!session || !verifySessionToken(session.value)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: UnsubscribeBody;
  try {
    body = (await request.json()) as UnsubscribeBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!body.endpoint || typeof body.endpoint !== 'string') {
    return NextResponse.json({ error: 'endpoint required' }, { status: 400 });
  }

  try {
    const ok = await deactivatePushSubscription(body.endpoint);
    if (!ok) {
      return NextResponse.json({ error: 'Supabase not connected' }, { status: 503 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
