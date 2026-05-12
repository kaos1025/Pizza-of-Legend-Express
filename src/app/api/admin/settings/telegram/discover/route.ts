import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySessionToken, COOKIE_NAME } from '@/lib/admin/session';
import type { DiscoveredChat } from '@/types/notifications';

// ============================================================
// GET /api/admin/settings/telegram/discover
//
// 봇이 최근 24h 안에 받은 메시지에서 unique chat 추출 (getUpdates).
// 주의: getUpdates 는 폴링 기반이므로 봇이 webhook 모드면 빈 결과.
//       이 프로젝트의 봇은 webhook 안 쓰니까 OK.
//
// 필수 env: TELEGRAM_BOT_TOKEN (.env.local + Vercel 양쪽 등록)
// ============================================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RawUpdate = Record<string, any>;

export async function GET() {
  const cookieStore = cookies();
  const session = cookieStore.get(COOKIE_NAME);
  if (!session || !verifySessionToken(session.value)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    return NextResponse.json(
      {
        error:
          'TELEGRAM_BOT_TOKEN 이 Next.js env 에 설정되어 있지 않습니다. .env.local 과 Vercel 환경변수에 추가해주세요.',
      },
      { status: 500 },
    );
  }

  let res: Response;
  try {
    res = await fetch(`https://api.telegram.org/bot${token}/getUpdates`, {
      cache: 'no-store',
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'fetch failed';
    return NextResponse.json({ error: `Telegram API 호출 실패: ${message}` }, { status: 502 });
  }

  if (!res.ok) {
    return NextResponse.json(
      { error: `Telegram API HTTP ${res.status}` },
      { status: 502 },
    );
  }

  const json = (await res.json().catch(() => null)) as
    | { ok?: boolean; result?: RawUpdate[]; description?: string }
    | null;
  if (!json?.ok) {
    return NextResponse.json(
      { error: 'Telegram API error', detail: json?.description ?? null },
      { status: 502 },
    );
  }

  const chatsMap = new Map<string, DiscoveredChat>();
  for (const update of json.result ?? []) {
    const chat =
      update.message?.chat ??
      update.channel_post?.chat ??
      update.my_chat_member?.chat ??
      update.edited_message?.chat;
    if (!chat) continue;

    const key = String(chat.id);
    if (chatsMap.has(key)) continue;

    const titleParts: string[] = [];
    if (chat.title) titleParts.push(chat.title);
    if (chat.first_name) titleParts.push(chat.first_name);
    if (chat.last_name) titleParts.push(chat.last_name);
    if (chat.username && titleParts.length === 0) titleParts.push(`@${chat.username}`);
    const title = titleParts.join(' ').trim() || '(이름 없음)';

    chatsMap.set(key, {
      id: String(chat.id),
      type: String(chat.type ?? 'unknown'),
      title,
    });
  }

  return NextResponse.json({ chats: Array.from(chatsMap.values()) });
}
