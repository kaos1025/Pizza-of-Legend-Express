-- ============================================================
-- 데이터 복원 직후 self-hosted DB 에서 1회 실행
-- (호스티드 Supabase 대시보드에서 설정했던 것들은 dump 에 안 담겨온다)
-- ============================================================

-- 1) Realtime: orders 테이블 변경 브로드캐스트
--    (고객 주문추적 + 관리자 관제센터가 구독)
--    schema.sql 로 스키마를 구성했다면 이미 등록돼 있으므로 중복은 무시한다.
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
EXCEPTION WHEN duplicate_object THEN
  RAISE NOTICE 'orders already in supabase_realtime publication';
END $$;

-- 2) Database Webhook 용 extension
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 3) 검증: 영업시간 차단 트리거가 복원됐는지 확인
--    (migration_business_hours_and_size.sql 의 check_business_hours — 없으면 해당 마이그레이션 재실행)
SELECT tgname FROM pg_trigger WHERE tgname = 'trg_check_business_hours';

-- 4) 검증: updated_at 트리거
SELECT tgname FROM pg_trigger WHERE tgname IN ('orders_updated_at', 'menu_items_updated_at');
