-- ============================================================
-- Pizza of Legend Express — Guest House Split Migration
-- Date: 2026-03-31
-- Run in Supabase Dashboard > SQL Editor
-- ============================================================

-- 1. Add name_ko column if not exists
ALTER TABLE hotels ADD COLUMN IF NOT EXISTS name_ko TEXT;

-- 2. Deactivate old Guest House entry (preserve FK for existing orders)
UPDATE hotels SET is_active = false WHERE code = 'GUEST_HOUSE';

-- 3. Insert 4 new Guest House entries
INSERT INTO hotels (id, name_ko, name_en, name_zh, name_ja, code, delivery_type, is_active, sort_order)
VALUES
  (gen_random_uuid(), '게스트하우스/어나더룸 1동', 'Guest House & Another Room No.1', '民宿/另一间房 1号楼', 'ゲストハウス＆アナザールーム 1棟', 'GUEST_HOUSE_1', 'door_to_door', true, 6),
  (gen_random_uuid(), '게스트하우스/어나더룸 2동', 'Guest House & Another Room No.2', '民宿/另一间房 2号楼', 'ゲストハウス＆アナザールーム 2棟', 'GUEST_HOUSE_2', 'door_to_door', true, 7),
  (gen_random_uuid(), '게스트하우스/어나더룸 3동', 'Guest House & Another Room No.3', '民宿/另一间房 3号楼', 'ゲストハウス＆アナザールーム 3棟', 'GUEST_HOUSE_3', 'door_to_door', true, 8),
  (gen_random_uuid(), '게스트하우스/어나더룸 4동', 'Guest House & Another Room No.4', '民宿/另一间房 4号楼', 'ゲストハウス＆アナザールーム 4棟', 'GUEST_HOUSE_4', 'door_to_door', true, 9);

-- 4. Update sort_order for existing hotels (ensure correct order)
UPDATE hotels SET sort_order = 1 WHERE code = 'BWP';
UPDATE hotels SET sort_order = 2 WHERE code = 'REGENCY';
UPDATE hotels SET sort_order = 3 WHERE code = 'PARADISECITY';
UPDATE hotels SET sort_order = 4 WHERE code = 'GRAND_HYATT';
UPDATE hotels SET sort_order = 5 WHERE code = 'HUE';

-- ============================================================
-- Done! Guest House split applied.
-- ============================================================
