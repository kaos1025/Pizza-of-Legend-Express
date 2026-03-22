// Base64 encoded short beep sound (tiny WAV)
const NOTIFICATION_SOUND_DATA = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbsGczFj+a28LekUYnOH2o0dy5bT0jSY2z3NW+aDccQ4Sszt+3ZTEaQ4euz92xXiwYOISq0d+xXi8eO4Gp0N+wXzAhPIKn0N+vYDIiPYOn0N+vXzAhO4Gn0N+wYDIiPYSn0N+wYDIiPYSn0N+wXzAhO4Kn0N+vXzAhO4Gp0d+wXzAhPIKo0d6vXzAhPIKn0N+wXzAhO4Go0N+wXzAhO4Ko0d6vXzAhO4Go0N+wYDIiPYSn0N+wYDIiPIGo0d6wXzAhO4Go0N+wYDIiPYSo0d6vXzEhPIGo0N6wXzAhPIKo0d6vXzAhO4Go0N+wYDIiPYSn0N+wYDIiPIGo0d6vXzAhPIKo0d6vXy8hO4Go0N+wYDIiPYOo0d+wXzAhO4Go0N+vXzAhO4Kn0N+wYDIiPYSn0N+vYDIhPIGo0d6wXzAhPIKo0d+vXzAhO4Go0N+wYDIiPYSn0N+wXzAhO4Go0N+wYDIi';

export function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    return Promise.resolve('denied' as NotificationPermission);
  }
  return Notification.requestPermission();
}

export function playNotificationSound() {
  try {
    const audio = new Audio(NOTIFICATION_SOUND_DATA);
    audio.volume = 0.5;
    audio.play().catch(() => {
      // Autoplay blocked - user hasn't interacted yet
    });
  } catch {
    // Audio not supported
  }
}

export function notifyNewOrder(orderNumber: string, hotelName: string, roomNumber: string) {
  // Play sound
  playNotificationSound();

  // Browser notification
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification('\u{1F355} Legendary Order Arrived!', {
      body: `${orderNumber}\n${hotelName} ${roomNumber}\uD638`,
      icon: '/icon-192.png',
      tag: 'new-order',
    });
  }
}

export function getNotificationPermission(): NotificationPermission | 'unsupported' {
  if (!('Notification' in window)) return 'unsupported';
  return Notification.permission;
}
