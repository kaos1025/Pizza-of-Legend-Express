-- ============================================================
-- Pizza of Legend Express — Client Feedback Migration
-- Date: 2026-03-30
-- Run in Supabase Dashboard > SQL Editor
-- ============================================================

-- ============================================================
-- 1. REMOVE SET MENU DATA
-- ============================================================

-- Soft delete: keep rows for FK integrity with existing order_items
UPDATE menu_items SET is_active = false WHERE category = 'set_menu';
-- Keep 'set_menu' in menu_categories for safety (ENUM-like, code-level filtering)

-- ============================================================
-- 2. UPDATE HALF & HALF PRICES
-- ============================================================

-- Update half_half_config if table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'half_half_config') THEN
    UPDATE half_half_config SET price_r = 25900, price_l = 29900 WHERE id = 1;
  END IF;
END $$;

-- Update menu_prices table (production schema uses separate prices table)
UPDATE menu_prices SET price = 25900
  WHERE menu_item_id IN (SELECT id FROM menu_items WHERE category = 'half_half') AND size = 'R';
UPDATE menu_prices SET price = 29900
  WHERE menu_item_id IN (SELECT id FROM menu_items WHERE category = 'half_half') AND size = 'L';

-- ============================================================
-- 3. HOTELS TABLE OVERHAUL
-- ============================================================

-- 3a. Add new columns
ALTER TABLE hotels ADD COLUMN IF NOT EXISTS delivery_type TEXT NOT NULL DEFAULT 'door_to_door';
ALTER TABLE hotels ADD COLUMN IF NOT EXISTS code TEXT;
ALTER TABLE hotels ADD COLUMN IF NOT EXISTS lobby_notice_en TEXT;
ALTER TABLE hotels ADD COLUMN IF NOT EXISTS lobby_notice_ko TEXT;
ALTER TABLE hotels ADD COLUMN IF NOT EXISTS lobby_notice_zh TEXT;
ALTER TABLE hotels ADD COLUMN IF NOT EXISTS lobby_notice_ja TEXT;

-- 3b. Deactivate removed hotels by name (production uses UUID ids)
UPDATE hotels SET is_active = false WHERE name_en IN ('E-Air', 'Nest Hotel', 'Golden Tulip');

-- 3c. Update existing hotels by name
UPDATE hotels SET
  name_en = 'Best Western Premier',
  name_zh = '最佳西方尊贵酒店',
  name_ja = 'ベストウェスタンプレミア',
  code = 'BWP',
  delivery_type = 'door_to_door',
  delivery_note = NULL,
  sort_order = 1
WHERE name_en IN ('Best Western', 'Best Western Premier');

UPDATE hotels SET
  code = 'PARADISECITY',
  delivery_type = 'lobby_only',
  delivery_note = '1층 로비에서 만나주세요',
  lobby_notice_en = 'Please come to the 1st floor lobby. Our staff will arrive in 3-4 minutes.',
  lobby_notice_ko = '1층 로비에서 만나주세요. 직원이 3~4분 내 도착합니다.',
  lobby_notice_zh = '请到1楼大厅。我们的工作人员将在3-4分钟内到达。',
  lobby_notice_ja = '1階ロビーまでお越しください。スタッフが3〜4分で到着します。',
  sort_order = 3
WHERE name_en = 'Paradise City';

-- 3d. Insert new hotels (UUID auto-generated)
INSERT INTO hotels (id, name_en, name_ko, name_zh, name_ja, code, delivery_type, delivery_note, lobby_notice_en, lobby_notice_ko, lobby_notice_zh, lobby_notice_ja, is_active, sort_order) VALUES
  (gen_random_uuid(), 'Hyatt Regency Incheon', '하얏트리젠시', '仁川凯悦酒店', 'ハイアットリージェンシー仁川', 'REGENCY', 'lobby_only', '1층 로비에서 만나주세요',
   'Please come to the 1st floor lobby. Our staff will arrive in 3-4 minutes.',
   '1층 로비에서 만나주세요. 직원이 3~4분 내 도착합니다.',
   '请到1楼大厅。我们的工作人员将在3-4分钟内到达。',
   '1階ロビーまでお越しください。スタッフが3〜4分で到着します。',
   true, 2),
  (gen_random_uuid(), 'Grand Hyatt Incheon - East Tower', '그랜드하얏트 이스트 타워', '仁川君悦酒店东塔', 'グランドハイアット仁川イーストタワー', 'GRAND_HYATT', 'lobby_only', '1층 로비에서 만나주세요',
   'Please come to the 1st floor lobby. Our staff will arrive in 3-4 minutes.',
   '1층 로비에서 만나주세요. 직원이 3~4분 내 도착합니다.',
   '请到1楼大厅。我们的工作人员将在3-4分钟内到达。',
   '1階ロビーまでお越しください。スタッフが3〜4分で到着します。',
   true, 4),
  (gen_random_uuid(), 'Hotel HUE', '호텔휴', '休酒店', 'ホテルヒュー', 'HUE', 'door_to_door', NULL, NULL, NULL, NULL, NULL, true, 5),
  (gen_random_uuid(), 'Guest House & Another Room', '게스트하우스/어나더룸', '民宿/另一间房', 'ゲストハウス＆アナザールーム', 'GUEST_HOUSE', 'door_to_door', NULL, NULL, NULL, NULL, NULL, true, 6);

-- ============================================================
-- 4. ORDERS TABLE NEW COLUMNS
-- ============================================================

ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_type TEXT NOT NULL DEFAULT 'delivery'
  CHECK (order_type IN ('delivery', 'pickup'));
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_fee INTEGER NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS messenger_platform TEXT
  CHECK (messenger_platform IN ('whatsapp', 'wechat', 'line', 'kakaotalk'));

-- Allow null room_number for pickup orders
ALTER TABLE orders ALTER COLUMN room_number DROP NOT NULL;

-- ============================================================
-- 5. SALES VIEWS
-- ============================================================

-- Daily sales summary
CREATE OR REPLACE VIEW daily_sales_summary AS
SELECT
  DATE(created_at AT TIME ZONE 'Asia/Seoul') AS sale_date,
  COUNT(*) AS order_count,
  SUM(total_amount) AS total_sales,
  SUM(delivery_fee) AS total_delivery_fee,
  SUM(CASE WHEN payment_method = 'cash' THEN total_amount ELSE 0 END) AS cash_sales,
  SUM(CASE WHEN payment_method = 'card' THEN total_amount ELSE 0 END) AS card_sales,
  COUNT(CASE WHEN order_type = 'delivery' THEN 1 END) AS delivery_count,
  COUNT(CASE WHEN order_type = 'pickup' THEN 1 END) AS pickup_count
FROM orders
WHERE status = 'completed'
GROUP BY DATE(created_at AT TIME ZONE 'Asia/Seoul');

-- Cumulative sales summary
CREATE OR REPLACE VIEW cumulative_sales_summary AS
SELECT
  COUNT(*) AS total_orders,
  SUM(total_amount) AS total_revenue,
  SUM(delivery_fee) AS total_delivery_fees,
  SUM(CASE WHEN payment_method = 'cash' THEN total_amount ELSE 0 END) AS total_cash,
  SUM(CASE WHEN payment_method = 'card' THEN total_amount ELSE 0 END) AS total_card,
  MIN(created_at) AS first_order_at,
  MAX(created_at) AS last_order_at
FROM orders
WHERE status = 'completed';

-- ============================================================
-- Done! Migration applied.
-- ============================================================
