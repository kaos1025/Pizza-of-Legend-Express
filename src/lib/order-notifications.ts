import type { OrderStatus } from '@/types/order';

type SupportedLocale = 'en' | 'zh' | 'ja';

const statusMessages: Record<string, Record<SupportedLocale, { title: string; body: string }>> = {
  confirmed: {
    en: { title: '🍕 Pizza of Legend', body: 'Your pizza is being prepared!' },
    zh: { title: '🍕 传奇披萨', body: '您的披萨正在制作中！' },
    ja: { title: '🍕 伝説のピザ', body: 'ピザを準備しています！' },
  },
  delivering: {
    en: { title: '🛵 Pizza of Legend', body: 'Your order is on the way!' },
    zh: { title: '🛵 传奇披萨', body: '您的订单正在配送中！' },
    ja: { title: '🛵 伝説のピザ', body: 'ご注文の配達に向かっています！' },
  },
  completed: {
    en: { title: '✅ Pizza of Legend', body: 'Delivered! Enjoy your pizza!' },
    zh: { title: '✅ 传奇披萨', body: '已送达！请享用披萨！' },
    ja: { title: '✅ 伝説のピザ', body: 'お届け完了！ピザをお楽しみください！' },
  },
};

export function isNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function getOrderNotificationPermission(): NotificationPermission | 'unsupported' {
  if (!isNotificationSupported()) return 'unsupported';
  return Notification.permission;
}

export async function requestOrderNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (!isNotificationSupported()) return 'unsupported';
  return Notification.requestPermission();
}

export function showOrderStatusNotification(
  status: OrderStatus,
  orderNumber: string,
  locale: string,
): void {
  if (!isNotificationSupported()) return;
  if (Notification.permission !== 'granted') return;

  const lang = (['en', 'zh', 'ja'].includes(locale) ? locale : 'en') as SupportedLocale;
  const message = statusMessages[status]?.[lang];
  if (!message) return;

  try {
    new Notification(message.title, {
      body: `${message.body}\n#${orderNumber}`,
      icon: '/icon-192.png',
      tag: `order-${status}`,
    });
  } catch {
    // Notification constructor failed (e.g. in Service Worker context where self.registration.showNotification is needed)
  }
}
