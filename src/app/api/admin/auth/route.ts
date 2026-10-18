import { NextRequest, NextResponse } from 'next/server';
import { createSessionToken, verifyPin, isAdminConfigured, COOKIE_NAME } from '@/lib/admin/session';

export async function POST(request: NextRequest) {
  try {
    // 운영에서 ADMIN_PIN / ADMIN_SESSION_SECRET 이 빠져 있으면 "Invalid PIN" 으로 숨기지 말고
    // 설정 누락임을 드러낸다 (기본 PIN 으로 열리던 폴백 제거에 따른 진단용).
    if (!isAdminConfigured()) {
      return NextResponse.json({ error: 'Admin is not configured' }, { status: 503 });
    }

    const { pin } = await request.json();

    if (!pin || typeof pin !== 'string') {
      return NextResponse.json({ error: 'PIN is required' }, { status: 400 });
    }

    if (!verifyPin(pin)) {
      return NextResponse.json({ error: 'Invalid PIN' }, { status: 401 });
    }

    const token = createSessionToken();
    const response = NextResponse.json({ success: true });

    response.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 24 * 60 * 60, // 24 hours
    });

    return response;
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.delete(COOKIE_NAME);
  return response;
}
