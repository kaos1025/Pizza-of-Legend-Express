// Base64 encoded short beep sound (tiny WAV)
const NOTIFICATION_SOUND_DATA = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbsGczFj+a28LekUYnOH2o0dy5bT0jSY2z3NW+aDccQ4Sszt+3ZTEaQ4euz92xXiwYOISq0d+xXi8eO4Gp0N+wXzAhPIKn0N+vYDIiPYOn0N+vXzAhO4Gn0N+wYDIiPYSn0N+wYDIiPYSn0N+wXzAhO4Kn0N+vXzAhO4Gp0d+wXzAhPIKo0d6vXzAhPIKn0N+wXzAhO4Go0N+wXzAhO4Ko0d6vXzAhO4Go0N+wYDIiPYSn0N+wYDIiPIGo0d6wXzAhO4Go0N+wYDIiPYSo0d6vXzEhPIGo0N6wXzAhPIKo0d6vXzAhO4Go0N+wYDIiPYSn0N+wYDIiPIGo0d6vXzAhPIKo0d6vXy8hO4Go0N+wYDIiPYOo0d+wXzAhO4Go0N+vXzAhO4Kn0N+wYDIiPYSn0N+vYDIhPIGo0d6wXzAhPIKo0d+vXzAhO4Go0N+wYDIiPYSn0N+wXzAhO4Go0N+wYDIi';

const TTS_SETTINGS_KEY = 'admin-tts-settings';

export interface TtsSettings {
  enabled: boolean;
  volume: number;
}

const DEFAULT_TTS_SETTINGS: TtsSettings = { enabled: true, volume: 1.0 };

export function getTtsSettings(): TtsSettings {
  try {
    const raw = localStorage.getItem(TTS_SETTINGS_KEY);
    if (raw) return { ...DEFAULT_TTS_SETTINGS, ...JSON.parse(raw) };
  } catch {
    // Invalid JSON
  }
  return DEFAULT_TTS_SETTINGS;
}

export function saveTtsSettings(settings: TtsSettings) {
  localStorage.setItem(TTS_SETTINGS_KEY, JSON.stringify(settings));
}

function isTtsSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

export function speakKorean(text: string, volume = 1.0): void {
  if (!isTtsSupported()) return;
  const settings = getTtsSettings();
  if (!settings.enabled) return;

  try {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ko-KR';
    utterance.rate = 1.0;
    utterance.volume = volume * settings.volume;
    window.speechSynthesis.speak(utterance);
  } catch {
    // SpeechSynthesis not available
  }
}

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

export function notifyNewOrder(orderNumber: string, hotelName: string, roomNumber: string, orderType?: string) {
  // Play sound
  playNotificationSound();

  // TTS announcement (after beep)
  if (orderType === 'pickup') {
    speakKorean(`새로운 픽업 주문이 들어왔습니다. 주문번호 ${orderNumber}.`);
  } else {
    speakKorean(`새로운 배달 주문이 들어왔습니다. ${hotelName} ${roomNumber}호 입니다.`);
  }

  // Browser notification
  if ('Notification' in window && Notification.permission === 'granted') {
    const body = orderType === 'pickup'
      ? `${orderNumber}\n픽업 주문`
      : `${orderNumber}\n${hotelName} ${roomNumber}\uD638`;
    new Notification('\u{1F355} Legendary Order Arrived!', {
      body,
      icon: '/icon-192.png',
      tag: 'new-order',
    });
  }
}

export function notifyDeliveryCompleted(hotelName: string, roomNumber: string, paymentMethod: 'cash' | 'card') {
  const paymentLabel = paymentMethod === 'cash' ? '현금 결제' : '카드 결제';
  speakKorean(`배달 완료. ${hotelName} ${roomNumber}호. ${paymentLabel}.`);
}

export function getNotificationPermission(): NotificationPermission | 'unsupported' {
  if (!('Notification' in window)) return 'unsupported';
  return Notification.permission;
}
