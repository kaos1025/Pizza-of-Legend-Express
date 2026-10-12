-- ============================================================
-- Pizza of Legend Express — 영업시간 + 사이즈 단일화 migration
-- Date: 2026-06-16
-- Run in Supabase Dashboard > SQL Editor
--
-- 목적:
--   1) store_settings 에 'business_hours' 키 추가 (영업시간/임시휴무 설정)
--   2) orders BEFORE INSERT 트리거로 영업시간 외 / 임시휴무 주문 차단
--   3) R(레귤러) 사이즈 제거 → L(라지) 단일 운영
--      - menu_prices 의 R 행 제거
--      - 반반피자(Half & Half) L 가격을 ₩29,900 로 통일
--
-- 주의:
--   - pizza_size ENUM 은 변경/DROP 하지 않음 (코드 레벨에서 R 필터).
--   - 과거 order_items 는 size/unit_price/subtotal 을 스냅샷으로 보관하므로
--     menu_prices R 행 제거가 과거 주문을 깨뜨리지 않음.
--   - 트리거는 BEFORE INSERT 전용 — 진행 중 주문의 상태 변경/완료/정산은 영향 없음.
-- ============================================================

-- ============================================================
-- 1. 영업시간 설정 (store_settings JSONB 패턴)
-- ============================================================
INSERT INTO store_settings (key, value)
VALUES (
  'business_hours',
  '{"enabled": true, "open": "12:00", "close": "24:00", "timezone": "Asia/Seoul", "manual_closed": false}'::jsonb
)
ON CONFLICT (key) DO NOTHING;

-- ============================================================
-- 2. 영업시간 주문 차단 트리거
-- ============================================================
-- store_settings.business_hours 를 읽어 Asia/Seoul 기준으로 판정.
-- enabled=false 면 무조건 통과(24시간 주문 허용).
-- manual_closed=true 면 STORE_CLOSED_MANUAL 로 reject.
-- 영업시간 외면 STORE_CLOSED 로 reject.
-- close > open 이면 같은 날 구간, close <= open 이면 자정 횡단 구간.
-- "24:00" 은 Postgres TIME 으로 유효하므로 그대로 비교.
CREATE OR REPLACE FUNCTION check_business_hours()
RETURNS TRIGGER AS $$
DECLARE
  v_settings  JSONB;
  v_enabled   BOOLEAN;
  v_manual    BOOLEAN;
  v_open      TIME;
  v_close     TIME;
  v_now       TIME;
  v_is_open   BOOLEAN;
BEGIN
  SELECT value INTO v_settings
  FROM store_settings
  WHERE key = 'business_hours';

  -- 설정 없으면 통과
  IF v_settings IS NULL THEN
    RETURN NEW;
  END IF;

  v_enabled := COALESCE((v_settings->>'enabled')::boolean, true);
  IF NOT v_enabled THEN
    RETURN NEW;
  END IF;

  v_manual := COALESCE((v_settings->>'manual_closed')::boolean, false);
  IF v_manual THEN
    RAISE EXCEPTION 'STORE_CLOSED_MANUAL';
  END IF;

  v_now   := (now() AT TIME ZONE 'Asia/Seoul')::time;
  v_open  := (v_settings->>'open')::time;
  v_close := (v_settings->>'close')::time;   -- '24:00' 도 유효

  IF v_close > v_open THEN
    v_is_open := (v_now >= v_open AND v_now < v_close);
  ELSE
    -- 자정 횡단 (예: 18:00~02:00)
    v_is_open := (v_now >= v_open OR v_now < v_close);
  END IF;

  IF NOT v_is_open THEN
    RAISE EXCEPTION 'STORE_CLOSED';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_check_business_hours ON orders;
CREATE TRIGGER trg_check_business_hours
  BEFORE INSERT ON orders
  FOR EACH ROW
  EXECUTE FUNCTION check_business_hours();

-- ============================================================
-- 3. R(레귤러) 사이즈 제거 → L(라지) 단일 운영
-- ============================================================
-- 3-1. 모든 R 가격 행 제거 (피자/반반/세트 등)
DELETE FROM menu_prices WHERE size = 'R';

-- 3-2. 반반피자 L 고정가 = ₩29,900 통일
UPDATE menu_prices
SET price = 29900
WHERE size = 'L'
  AND menu_item_id IN (SELECT id FROM menu_items WHERE category = 'half_half');

-- ============================================================
-- 검증:
--   SELECT key, value FROM store_settings WHERE key = 'business_hours';
--   SELECT size, count(*) FROM menu_prices GROUP BY size;   -- 'R' 행 0 기대
--   -- 영업시간 외/임시휴무 시 INSERT INTO orders ... 가 STORE_CLOSED(_MANUAL) 로 reject 되는지 확인
-- ============================================================
