import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySessionToken, COOKIE_NAME } from '@/lib/admin/session';
import { getBusinessHours, setBusinessHours } from '@/lib/admin/settings';
import { normalizeBusinessHours, type BusinessHours } from '@/lib/business-hours';

function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

// "HH:MM" with HH 00–24, MM 00–59. "24:00" allowed (= midnight).
function isValidTime(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const m = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!m) return false;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h === 24) return min === 0;
  return h >= 0 && h <= 23 && min >= 0 && min <= 59;
}

export async function GET() {
  const cookieStore = cookies();
  const session = cookieStore.get(COOKIE_NAME);
  if (!session || !verifySessionToken(session.value)) return unauthorized();

  try {
    const hours = await getBusinessHours();
    return NextResponse.json(hours);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const cookieStore = cookies();
  const session = cookieStore.get(COOKIE_NAME);
  if (!session || !verifySessionToken(session.value)) return unauthorized();

  let body: Partial<BusinessHours>;
  try {
    body = (await request.json()) as Partial<BusinessHours>;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (body.open !== undefined && !isValidTime(body.open)) {
    return NextResponse.json({ error: '오픈 시간은 HH:MM 형식이어야 합니다' }, { status: 400 });
  }
  if (body.close !== undefined && !isValidTime(body.close)) {
    return NextResponse.json({ error: '마감 시간은 HH:MM 형식이어야 합니다 (24:00 허용)' }, { status: 400 });
  }

  // Merge over current values so partial updates (e.g. just the manual switch) are safe.
  try {
    const current = await getBusinessHours();
    const next = normalizeBusinessHours({
      ...current,
      ...body,
      open: body.open?.trim() ?? current.open,
      close: body.close?.trim() ?? current.close,
    });

    const saved = await setBusinessHours(next);
    if (!saved) {
      return NextResponse.json({ error: 'Supabase not connected' }, { status: 503 });
    }
    return NextResponse.json(saved);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
