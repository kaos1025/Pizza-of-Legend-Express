-- ============================================================
-- Pizza of Legend Express — Admin Web Push Subscriptions
-- Date: 2026-05-09
-- Run in Supabase Dashboard > SQL Editor
--   (or via `supabase db push` if CLI 환경이 셋업되어 있다면)
--
-- 목적:
--   Admin 디바이스(사장님 iPhone, 매장 PC 등)에서 발급받은
--   Web Push subscription을 저장. 신규 주문 INSERT 시
--   Database Webhook → Edge Function `send-order-push` 가
--   이 테이블의 활성 subscription 전체로 푸시를 발사한다.
-- ============================================================

-- ============================================================
-- 1. TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS admin_push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  device_label TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  failure_count INTEGER NOT NULL DEFAULT 0,
  last_success_at TIMESTAMPTZ,
  last_failure_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 활성 subscription 빠른 조회용 partial index
CREATE INDEX IF NOT EXISTS idx_admin_push_active
  ON admin_push_subscriptions(is_active)
  WHERE is_active = true;

-- ============================================================
-- 2. TRIGGER — auto-update updated_at
-- (schema.sql 의 update_updated_at() 함수 재사용)
-- ============================================================
DROP TRIGGER IF EXISTS trg_admin_push_updated ON admin_push_subscriptions;
CREATE TRIGGER trg_admin_push_updated
  BEFORE UPDATE ON admin_push_subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 3. RLS — service_role 만 접근
-- 클라이언트 등록은 Next.js API Route(ADMIN_PIN 세션 검증) 경유
-- ============================================================
ALTER TABLE admin_push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_only" ON admin_push_subscriptions;
CREATE POLICY "service_role_only" ON admin_push_subscriptions
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ============================================================
-- 4. COMMENTS
-- ============================================================
COMMENT ON TABLE admin_push_subscriptions IS
  'Admin 디바이스의 Web Push subscription 저장. 만료/실패 시 is_active=false 로 soft delete';
COMMENT ON COLUMN admin_push_subscriptions.device_label IS
  'Admin 이 설정 화면에서 직접 입력하는 디바이스 별명 (예: "사장님 iPhone")';
COMMENT ON COLUMN admin_push_subscriptions.failure_count IS
  '연속 실패 카운트. 3회 이상 시 자동 비활성화';
COMMENT ON COLUMN admin_push_subscriptions.endpoint IS
  'Push service 가 발급한 unique endpoint URL (FCM, APNs 등)';

-- ============================================================
-- Done.
--   적용 방법:
--     A. Supabase Dashboard → SQL Editor 에 붙여넣기 후 Run
--     B. 또는 CLI:  supabase db push
--   적용 후 검증:
--     SELECT * FROM admin_push_subscriptions LIMIT 1;
--     -- (빈 결과여야 정상)
-- ============================================================
