'use client';

// ============================================================
// Admin Web Push — client-side helpers
// ------------------------------------------------------------
// SW 등록은 src/components/pwa/ServiceWorkerRegister.tsx 가 담당.
// 본 파일은 PushManager subscription 의 생성/해제/조회와
// 서버 API 경유 등록까지 처리한다.
// ============================================================

export interface SubscribeOptions {
  deviceLabel: string;
}

export interface SubscribeResult {
  subscription: PushSubscription;
  rowId: string;
}

export function isPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

export async function ensureNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'denied';
  }
  if (Notification.permission === 'granted' || Notification.permission === 'denied') {
    return Notification.permission;
  }
  return Notification.requestPermission();
}

export async function getCurrentSubscription(): Promise<PushSubscription | null> {
  if (!isPushSupported()) return null;
  const reg = await navigator.serviceWorker.ready;
  return reg.pushManager.getSubscription();
}

export async function subscribeToPush(
  options: SubscribeOptions,
): Promise<SubscribeResult> {
  if (!isPushSupported()) {
    throw new Error('이 브라우저는 Push 알림을 지원하지 않습니다.');
  }

  const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!vapidKey) {
    throw new Error(
      'NEXT_PUBLIC_VAPID_PUBLIC_KEY 가 설정되어 있지 않습니다.',
    );
  }

  const permission = await ensureNotificationPermission();
  if (permission !== 'granted') {
    throw new Error(
      permission === 'denied'
        ? '알림 권한이 거부되어 있습니다. 브라우저 설정에서 알림을 허용해주세요.'
        : '알림 권한이 부여되지 않았습니다.',
    );
  }

  const reg = await navigator.serviceWorker.ready;
  let subscription = await reg.pushManager.getSubscription();

  if (!subscription) {
    subscription = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      // PushManager 의 applicationServerKey 타입 시그니처가 BufferSource(ArrayBuffer 기반)인데
      // urlBase64ToUint8Array 가 반환하는 Uint8Array 는 ArrayBufferLike 기반이라 lib.dom 의
      // 최신 정의와 호환되지 않는다. 런타임 동작은 동일하므로 .buffer 를 ArrayBuffer 로 캐스팅.
      applicationServerKey: urlBase64ToUint8Array(vapidKey).buffer as ArrayBuffer,
    });
  }

  const res = await fetch('/api/admin/push/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      subscription: subscription.toJSON(),
      deviceLabel: options.deviceLabel,
      userAgent: navigator.userAgent,
    }),
  });

  if (!res.ok) {
    // 서버 등록 실패 → SW subscription 도 cleanup (orphan 방지)
    try {
      await subscription.unsubscribe();
    } catch {
      /* ignore */
    }
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(data.error ?? `Subscription save failed (HTTP ${res.status})`);
  }

  const data = (await res.json()) as { ok: true; id: string };
  return { subscription, rowId: data.id };
}

export async function unsubscribeFromPush(): Promise<boolean> {
  if (!isPushSupported()) return false;
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription();
  if (!sub) return false;

  // 서버에 먼저 알리고 (실패해도 SW unsubscribe 는 진행)
  try {
    await fetch('/api/admin/push/unsubscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint: sub.endpoint }),
    });
  } catch {
    /* ignore — 어차피 SW unsubscribe 는 진행한다 */
  }

  await sub.unsubscribe();
  return true;
}

export interface TestPushResult {
  ok: boolean;
  total: number;
  sent: number;
  failed: number;
  telegram?: { enabled: boolean; sent: boolean };
}

export async function sendTestPush(): Promise<TestPushResult> {
  const res = await fetch('/api/admin/push/test', { method: 'POST' });
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(data.error ?? `Test push failed (HTTP ${res.status})`);
  }
  return res.json();
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}
