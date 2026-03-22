import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySessionToken, COOKIE_NAME } from '@/lib/admin/session';
import { updateMenuItem, deleteMenuItem, toggleSoldOut, getMenuItem } from '@/lib/admin/menu';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const cookieStore = cookies();
  const session = cookieStore.get(COOKIE_NAME);
  if (!session || !verifySessionToken(session.value)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const item = await getMenuItem(params.id);
  if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ item });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const cookieStore = cookies();
  const session = cookieStore.get(COOKIE_NAME);
  if (!session || !verifySessionToken(session.value)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const data = await request.json();
    const item = await updateMenuItem(params.id, data);
    if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ item });
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const cookieStore = cookies();
  const session = cookieStore.get(COOKIE_NAME);
  if (!session || !verifySessionToken(session.value)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const success = await deleteMenuItem(params.id);
  if (!success) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ success: true });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const cookieStore = cookies();
  const session = cookieStore.get(COOKIE_NAME);
  if (!session || !verifySessionToken(session.value)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    // If toggling sold out
    if ('is_sold_out' in body) {
      const item = await toggleSoldOut(params.id);
      if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      return NextResponse.json({ item });
    }
    // General partial update
    const item = await updateMenuItem(params.id, body);
    if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ item });
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
