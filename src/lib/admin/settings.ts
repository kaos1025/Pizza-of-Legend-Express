import { createAdminClient } from '@/lib/supabase-admin';
import type { TelegramNotificationConfig } from '@/types/notifications';

// ============================================================
// store_settings — server-side DB ops
//
// store_settings 는 key/JSONB-value 패턴. 각 설정 종류마다 별도 row.
//   - 'store_info'           — 매장 기본정보
//   - 'delivery_settings'    — 배달 정책
//   - 'payment_notice'       — 결제 안내 문구
//   - 'telegram_notifications' — Telegram 알림 설정 (본 모듈)
// ============================================================

const KEY_TELEGRAM = 'telegram_notifications';

const DEFAULT_TELEGRAM_CONFIG: TelegramNotificationConfig = {
  chat_id: null,
  enabled: true,
};

export async function getTelegramConfig(): Promise<TelegramNotificationConfig> {
  const supabase = createAdminClient();
  if (!supabase) return DEFAULT_TELEGRAM_CONFIG;

  const { data, error } = await supabase
    .from('store_settings')
    .select('value')
    .eq('key', KEY_TELEGRAM)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return DEFAULT_TELEGRAM_CONFIG;

  const v = data.value as Partial<TelegramNotificationConfig>;
  return {
    chat_id: typeof v.chat_id === 'string' ? v.chat_id : null,
    enabled: v.enabled !== false,
  };
}

export async function setTelegramConfig(
  config: TelegramNotificationConfig,
): Promise<TelegramNotificationConfig | null> {
  const supabase = createAdminClient();
  if (!supabase) return null;

  const { error } = await supabase
    .from('store_settings')
    .upsert({ key: KEY_TELEGRAM, value: config }, { onConflict: 'key' });

  if (error) throw new Error(error.message);
  return config;
}
