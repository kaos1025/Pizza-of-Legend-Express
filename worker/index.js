// ============================================================
// Pizza of Legend Express — Custom Service Worker
// ------------------------------------------------------------
// next-pwa 5.x 는 빌드 시 이 파일을 sw.js 에 importScripts 로 합쳐 넣는다.
// 본 파일은 Admin Web Push 핸들러만 담당.
//   - push:              백그라운드면 알림 표시, 포그라운드면 클라이언트에 메시지 전달
//   - notificationclick: 기존 admin 탭 focus / 없으면 새 창 오픈
// ============================================================

/* eslint-disable no-restricted-globals */

self.addEventListener('push', (event) => {
  /** @type {{title?: string, body?: string, tag?: string, url?: string, requireInteraction?: boolean, orderNumber?: string}} */
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (_) {
    // 텍스트 payload fallback
    try {
      data = { body: event.data ? event.data.text() : '' };
    } catch (_2) {
      data = {};
    }
  }

  event.waitUntil(
    (async () => {
      const clientList = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      });

      // Foreground: admin 탭이 visible 이면 알림 스킵, 메시지만 전달
      // (기존 Realtime + TTS 로직이 처리)
      const adminVisible = clientList.some(
        (c) => c.visibilityState === 'visible' && c.url.includes('/admin'),
      );

      if (adminVisible) {
        clientList.forEach((c) => {
          try {
            c.postMessage({ type: 'PUSH_RECEIVED_FOREGROUND', data });
          } catch (_) {
            /* ignore */
          }
        });
        return;
      }

      // Background: 실제 알림 표시
      const title = data.title || '🍕 새 주문';
      await self.registration.showNotification(title, {
        body: data.body || '',
        icon: '/icon-192.png',
        tag: data.tag || `order-${Date.now()}`,
        renotify: true,
        requireInteraction: data.requireInteraction !== false,
        vibrate: [200, 100, 200, 100, 200],
        data: { url: data.url || '/admin/orders', orderNumber: data.orderNumber },
      });
    })(),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl =
    (event.notification.data && event.notification.data.url) || '/admin/orders';

  event.waitUntil(
    (async () => {
      const clientList = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      });

      // 이미 admin 페이지가 열려있으면 focus + navigate 시도
      const existing = clientList.find((c) => c.url.includes('/admin'));
      if (existing) {
        try {
          await existing.focus();
        } catch (_) {
          /* ignore */
        }
        if ('navigate' in existing) {
          try {
            await existing.navigate(targetUrl);
          } catch (_) {
            /* same-origin / lifecycle 제약 시 무시 */
          }
        }
        return;
      }

      // 없으면 새 창
      await self.clients.openWindow(targetUrl);
    })(),
  );
});
