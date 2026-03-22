import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySessionToken, COOKIE_NAME } from '@/lib/admin/session';
import { getMenuItems, createMenuItem } from '@/lib/admin/menu';

export async function GET(request: NextRequest) {
  const cookieStore = cookies();
  const session = cookieStore.get(COOKIE_NAME);
  if (!session || !verifySessionToken(session.value)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category') || undefined;
  const items = await getMenuItems(category);
  return NextResponse.json({ items });
}

export async function POST(request: NextRequest) {
  const cookieStore = cookies();
  const session = cookieStore.get(COOKIE_NAME);
  if (!session || !verifySessionToken(session.value)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const data = await request.json();
    if (!data.id || !data.category || !data.name_en) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    const item = await createMenuItem(data);
    return NextResponse.json({ item }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
