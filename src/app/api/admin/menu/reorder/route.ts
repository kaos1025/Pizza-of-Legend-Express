import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySessionToken, COOKIE_NAME } from '@/lib/admin/session';
import { reorderMenuItems } from '@/lib/admin/menu';

export async function POST(request: NextRequest) {
  const cookieStore = cookies();
  const session = cookieStore.get(COOKIE_NAME);
  if (!session || !verifySessionToken(session.value)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { category, orderedIds } = await request.json();
    if (!category || !Array.isArray(orderedIds)) {
      return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
    }
    await reorderMenuItems(category, orderedIds);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
