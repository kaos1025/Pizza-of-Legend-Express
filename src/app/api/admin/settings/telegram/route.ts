import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySessionToken, COOKIE_NAME } from '@/lib/admin/session';
import { getTelegramConfig, setTelegramConfig } from '@/lib/admin/settings';
import type { TelegramNotificationConfig } from '@/types/notifications';

function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

export async function GET() {
  const cookieStore = cookies();
  const session = cookieStore.get(COOKIE_NAME);
  if (!session || !verifySessionToken(session.value)) return unauthorized();

  try {
    const config = await getTelegramConfig();
    return NextResponse.json(config);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const cookieStore = cookies();
  const session = cookieStore.get(COOKIE_NAME);
  if (!session || !verifySessionToken(session.value)) return unauthorized();

  let body: Partial<TelegramNotificationConfig>;
  try {
    body = (await request.json()) as Partial<TelegramNotificationConfig>;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // Normalize chat_id: trim + empty → null
  const chatIdRaw = typeof body.chat_id === 'string' ? body.chat_id.trim() : null;
  const chatId = chatIdRaw && chatIdRaw.length > 0 ? chatIdRaw : null;
  const enabled = body.enabled !== false;

  // 서버측 입력 검증: chat_id 가 있다면 정수 형태여야 함
  if (chatId !== null && !/^-?\d+$/.test(chatId)) {
    return NextResponse.json(
      { error: 'chat_id는 정수여야 합니다 (예: -1001234567890 또는 123456789)' },
      { status: 400 },
    );
  }

  try {
    const saved = await setTelegramConfig({ chat_id: chatId, enabled });
    if (!saved) {
      return NextResponse.json({ error: 'Supabase not connected' }, { status: 503 });
    }
    return NextResponse.json(saved);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
