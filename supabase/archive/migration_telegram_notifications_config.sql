-- ============================================================
-- Pizza of Legend Express — Telegram 알림 설정 seed
-- Date: 2026-05-12
-- Run in Supabase Dashboard > SQL Editor
--
-- 목적:
--   TELEGRAM_CHAT_ID 를 Supabase Secret 에서 store_settings 의
--   key='telegram_notifications' JSONB 행으로 이전.
--   사장님이 Admin UI 에서 직접 chat_id / enabled 변경 가능.
--
-- JSONB schema:
--   {
--     "chat_id": "<text|null>",   -- "-1001234567890" or null
--     "enabled": true|false
--   }
--
-- 호환:
--   Edge Function 은 DB 값 우선, 없으면 TELEGRAM_CHAT_ID env 폴백
--   → 이 마이그레이션만 적용해도 기존 동작 안 깨짐.
-- ============================================================

INSERT INTO store_settings (key, value)
VALUES (
  'telegram_notifications',
  '{"chat_id": null, "enabled": true}'::jsonb
)
ON CONFLICT (key) DO NOTHING;

-- 검증:
--   SELECT key, value FROM store_settings WHERE key = 'telegram_notifications';
--   -- 기대: 1 row, value = {"chat_id": null, "enabled": true}
