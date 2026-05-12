// ============================================================
// Notification system shared types
// ============================================================

export interface TelegramNotificationConfig {
  chat_id: string | null;
  enabled: boolean;
}

export interface DiscoveredChat {
  id: string;
  type: string; // 'private' | 'group' | 'supergroup' | 'channel'
  title: string;
}
