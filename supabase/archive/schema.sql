-- ============================================================
-- Pizza of Legend Express — Supabase Schema
-- Run this in Supabase Dashboard > SQL Editor
-- ============================================================

-- ============================================================
-- 1. TABLES
-- ============================================================

-- Hotels
CREATE TABLE hotels (
  id TEXT PRIMARY KEY,
  name_ko TEXT,
  name_en TEXT NOT NULL,
  name_zh TEXT NOT NULL,
  name_ja TEXT NOT NULL,
  delivery_note TEXT,
  delivery_type TEXT NOT NULL DEFAULT 'door_to_door',
  code TEXT,
  lobby_notice_en TEXT,
  lobby_notice_ko TEXT,
  lobby_notice_zh TEXT,
  lobby_notice_ja TEXT,
  is_active BOOLEAN DEFAULT true,
  sort_order INT DEFAULT 0
);

-- Menu Categories
CREATE TABLE menu_categories (
  key TEXT PRIMARY KEY,
  label_en TEXT NOT NULL,
  label_zh TEXT NOT NULL,
  label_ja TEXT NOT NULL,
  icon TEXT,
  sort_order INT DEFAULT 0
);

-- Menu Items (unified)
CREATE TABLE menu_items (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL REFERENCES menu_categories(key),
  name_ko TEXT NOT NULL,
  name_en TEXT NOT NULL,
  name_zh TEXT NOT NULL,
  name_ja TEXT NOT NULL,
  desc_en TEXT,
  desc_zh TEXT,
  desc_ja TEXT,
  price INT,
  price_r INT,
  price_l INT,
  sub_category TEXT,
  badge TEXT,
  half_half BOOLEAN DEFAULT false,
  image_url TEXT,
  is_sold_out BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Half & Half Config (single row)
CREATE TABLE half_half_config (
  id INT PRIMARY KEY DEFAULT 1,
  name_en TEXT,
  name_zh TEXT,
  name_ja TEXT,
  desc_en TEXT,
  desc_zh TEXT,
  desc_ja TEXT,
  price_r INT NOT NULL,
  price_l INT NOT NULL,
  badge TEXT
);

-- Orders
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT UNIQUE NOT NULL,
  hotel_id TEXT REFERENCES hotels(id),
  room_number TEXT,
  messenger_id TEXT,
  messenger_platform TEXT CHECK (messenger_platform IN ('whatsapp', 'wechat', 'line', 'kakaotalk')),
  special_requests TEXT,
  total_amount INT NOT NULL,
  delivery_fee INT NOT NULL DEFAULT 0,
  order_type TEXT NOT NULL DEFAULT 'delivery' CHECK (order_type IN ('delivery', 'pickup')),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','confirmed','delivering','completed','cancelled')),
  payment_method TEXT
    CHECK (payment_method IN ('cash','card')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Order Items
CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  menu_item_id TEXT,
  item_type TEXT NOT NULL,
  name_snapshot JSONB NOT NULL,
  size TEXT,
  quantity INT NOT NULL DEFAULT 1,
  unit_price INT NOT NULL,
  half_half_left_id TEXT,
  half_half_right_id TEXT,
  set_selections JSONB
);

-- Admin Settings
CREATE TABLE admin_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- ============================================================
-- 2. TRIGGERS — auto-update updated_at
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER menu_items_updated_at
  BEFORE UPDATE ON menu_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 3. REALTIME
-- ============================================================

ALTER PUBLICATION supabase_realtime ADD TABLE orders;

-- ============================================================
-- 4. ROW LEVEL SECURITY (RLS)
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE hotels ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE half_half_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_settings ENABLE ROW LEVEL SECURITY;

-- hotels: anon can SELECT
CREATE POLICY "hotels_anon_select" ON hotels
  FOR SELECT TO anon USING (true);

CREATE POLICY "hotels_service_all" ON hotels
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- menu_categories: anon can SELECT
CREATE POLICY "menu_categories_anon_select" ON menu_categories
  FOR SELECT TO anon USING (true);

CREATE POLICY "menu_categories_service_all" ON menu_categories
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- menu_items: anon can SELECT, service_role can all
CREATE POLICY "menu_items_anon_select" ON menu_items
  FOR SELECT TO anon USING (true);

CREATE POLICY "menu_items_service_all" ON menu_items
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- half_half_config: anon can SELECT, service_role can all
CREATE POLICY "half_half_config_anon_select" ON half_half_config
  FOR SELECT TO anon USING (true);

CREATE POLICY "half_half_config_service_all" ON half_half_config
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- orders: anon can SELECT (customer tracking), service_role can all
CREATE POLICY "orders_anon_select" ON orders
  FOR SELECT TO anon USING (true);

CREATE POLICY "orders_service_all" ON orders
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- order_items: anon can SELECT, service_role can all
CREATE POLICY "order_items_anon_select" ON order_items
  FOR SELECT TO anon USING (true);

CREATE POLICY "order_items_service_all" ON order_items
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- admin_settings: service_role only
CREATE POLICY "admin_settings_service_all" ON admin_settings
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============================================================
-- 5. SEED DATA
-- ============================================================

-- 5.1 Hotels
INSERT INTO hotels (id, name_ko, name_en, name_zh, name_ja, code, delivery_type, delivery_note, lobby_notice_en, lobby_notice_ko, lobby_notice_zh, lobby_notice_ja, sort_order) VALUES
  ('best-western', '베스트웨스턴 프리미어', 'Best Western Premier', '最佳西方尊贵酒店', 'ベストウェスタンプレミア', 'BWP', 'door_to_door', NULL, NULL, NULL, NULL, NULL, 1),
  ('hyatt-regency', '하얏트리젠시', 'Hyatt Regency Incheon', '仁川凯悦酒店', 'ハイアットリージェンシー仁川', 'REGENCY', 'lobby_only', '1층 로비에서 만나주세요',
   'Please come to the 1st floor lobby. Our staff will arrive in 3-4 minutes.',
   '1층 로비에서 만나주세요. 직원이 3~4분 내 도착합니다.',
   '请到1楼大厅。我们的工作人员将在3-4分钟内到达。',
   '1階ロビーまでお越しください。スタッフが3〜4分で到着します。', 2),
  ('paradise-city', '파라다이스시티', 'Paradise City', '天堂城', 'パラダイスシティ', 'PARADISECITY', 'lobby_only', '1층 로비에서 만나주세요',
   'Please come to the 1st floor lobby. Our staff will arrive in 3-4 minutes.',
   '1층 로비에서 만나주세요. 직원이 3~4분 내 도착합니다.',
   '请到1楼大厅。我们的工作人员将在3-4分钟内到达。',
   '1階ロビーまでお越しください。スタッフが3〜4分で到着します。', 3),
  ('grand-hyatt', '그랜드하얏트 이스트 타워', 'Grand Hyatt Incheon - East Tower', '仁川君悦酒店东塔', 'グランドハイアット仁川イーストタワー', 'GRAND_HYATT', 'lobby_only', '1층 로비에서 만나주세요',
   'Please come to the 1st floor lobby. Our staff will arrive in 3-4 minutes.',
   '1층 로비에서 만나주세요. 직원이 3~4분 내 도착합니다.',
   '请到1楼大厅。我们的工作人员将在3-4分钟内到达。',
   '1階ロビーまでお越しください。スタッフが3〜4分で到着します。', 4),
  ('hotel-hue', '호텔휴', 'Hotel HUE', '休酒店', 'ホテルヒュー', 'HUE', 'door_to_door', NULL, NULL, NULL, NULL, NULL, 5),
  ('guest-house-1', '게스트하우스/어나더룸 1동', 'Guest House & Another Room No.1', '民宿/另一间房 1号楼', 'ゲストハウス＆アナザールーム 1棟', 'GUEST_HOUSE_1', 'door_to_door', NULL, NULL, NULL, NULL, NULL, 6),
  ('guest-house-2', '게스트하우스/어나더룸 2동', 'Guest House & Another Room No.2', '民宿/另一间房 2号楼', 'ゲストハウス＆アナザールーム 2棟', 'GUEST_HOUSE_2', 'door_to_door', NULL, NULL, NULL, NULL, NULL, 7),
  ('guest-house-3', '게스트하우스/어나더룸 3동', 'Guest House & Another Room No.3', '民宿/另一间房 3号楼', 'ゲストハウス＆アナザールーム 3棟', 'GUEST_HOUSE_3', 'door_to_door', NULL, NULL, NULL, NULL, NULL, 8),
  ('guest-house-4', '게스트하우스/어나더룸 4동', 'Guest House & Another Room No.4', '民宿/另一间房 4号楼', 'ゲストハウス＆アナザールーム 4棟', 'GUEST_HOUSE_4', 'door_to_door', NULL, NULL, NULL, NULL, NULL, 9);

-- 5.2 Menu Categories
INSERT INTO menu_categories (key, label_en, label_zh, label_ja, icon, sort_order) VALUES
  ('half_half', 'Legendary Half & Half', '传奇半半披萨',       '伝説のハーフ＆ハーフ',       '🍕', 1),
  ('pizza',     'Signature Pizzas',      '招牌披萨',           'シグネチャーピザ',           '🍕', 2),
  ('set_menu',  'Value Sets',            '超值套餐',           'お得セット',                '🎁', 3),
  ('side',      'Sides',                 '小食',               'サイド',                    '🍗', 4),
  ('drink',     'Drinks',                '饮料',               'ドリンク',                  '🥤', 5),
  ('sauce',     'Sauces & Extras',       '酱料',               'ソース・トッピング',         '🫙', 6);

-- 5.3 Half & Half Config
INSERT INTO half_half_config (id, name_en, name_zh, name_ja, desc_en, desc_zh, desc_ja, price_r, price_l, badge) VALUES
  (1,
   'Half & Half',
   '半半披萨',
   'ハーフ＆ハーフ',
   'Pick any 2 flavors you love',
   '随心选择两种口味',
   'お好みの2つの味を選べる',
   25900, 29900,
   'popular');

-- 5.4 Pizzas (15)
INSERT INTO menu_items (id, category, name_ko, name_en, name_zh, name_ja, desc_en, desc_zh, desc_ja, price_r, price_l, badge, half_half, sort_order) VALUES
  ('cheese',              'pizza', '치즈',            'Cheese',              '芝士披萨',          'チーズ',                'Chewy dough with fresh cheese — Simple is best',                    '劲道面饼配新鲜芝士',                                    'もちもち生地と新鮮なチーズ',                                      19900, 23900, NULL,        true, 1),
  ('flower-pepperoni',    'pizza', '꽃 페퍼로니',      'Flower Pepperoni',    '花式意大利辣香肠',    'フラワーペパロニ',        'Pepperoni blossoms on crispy dough',                                '面饼上盛开的意大利辣香肠花',                              'ドウの上にペパロニの花が咲く',                                    20900, 24900, NULL,        true, 2),
  ('super-combination',   'pizza', '슈퍼 콤비네이션',   'Super Combination',   '超级组合披萨',       'スーパーコンビネーション',  'Crunchy veggies & generous meat — a classic done right',            '爽脆蔬菜与丰富肉类的经典披萨',                            'シャキシャキ野菜とたっぷり肉の定番ピザ',                            20900, 24900, NULL,        true, 3),
  ('double-cheddar-bacon','pizza', '더블 체다 베이컨',  'Double Cheddar Bacon','双重切达培根',       'ダブルチェダーベーコン',    'Crispy bacon & gooey cheddar cheese',                               '酥脆培根与浓郁切达芝士',                                  'カリカリベーコンと濃厚チェダーチーズ',                              20900, 24900, NULL,        true, 4),
  ('bulgogi',             'pizza', '직화 불고기',      'Bulgogi',             '烤肉披萨',          '直火プルコギ',           'Korean-style sweet & savory flame-grilled beef',                    '韩式甜咸烤肉',                                          '韓国式甘辛プルコギ',                                              21900, 25900, 'popular',   true, 5),
  ('spicy-bulgogi',       'pizza', '매콤 직화 불고기',  'Spicy Bulgogi',       '辣烤肉披萨',        '辛口直火プルコギ',        'Spicy Korean chili sauce meets flame-grilled beef',                 '韩式辣椒酱与烤肉',                                      '韓国式コチュジャンソースとプルコギ',                                21900, 25900, 'chefs_pick',true, 6),
  ('sweet-potato',        'pizza', '스윗 고구마',      'Sweet Potato',        '红薯披萨',          'スイートポテト',          'Real sweet potato mousse — authentically sweet',                    '真正红薯慕斯制作的红薯味披萨',                            'リアルさつまいもムースの本格さつまいもピザ',                        21900, 25900, NULL,        true, 7),
  ('bacon-potato',        'pizza', '베이컨 포테이토',   'Bacon Potato',        '培根土豆披萨',       'ベーコンポテト',          'Crispy bacon, fluffy potato & savory mayo',                         '酥脆培根、软糯土豆与香浓蛋黄酱',                          'カリカリベーコン、ホクホクポテト、香ばしいマヨネーズ',                21900, 25900, NULL,        true, 8),
  ('mega-potato',         'pizza', '메가 포테이토',    'Mega Potato',         '超级土豆披萨',       'メガポテト',             'Bacon & assorted potato shapes — irresistibly cute',                '培根与各种形状土豆的可爱披萨',                            'ベーコンと色々な形のポテトが可愛いピザ',                            22900, 26900, NULL,        true, 9),
  ('hawaiian',            'pizza', '통 하와이안',      'Hawaiian',            '夏威夷披萨',        'ハワイアン',              'Whole pineapple chunks — sweet & savory perfection',                '大块菠萝的完美甜咸搭配',                                  'パイナップルまるごとの甘じょっぱいピザ',                            21900, 25900, NULL,        true, 10),
  ('bacon-shrimp',        'pizza', '베이컨 쉬림프',    'Bacon Shrimp',        '培根虾仁披萨',       'ベーコンシュリンプ',       'Plump shrimp, savory bacon & heart-shaped potatoes',                '饱满虾仁与培根、心形土豆的可爱披萨',                      'プリプリエビと香ばしいベーコン、ハート型ポテト',                    22900, 26900, NULL,        true, 11),
  ('hot-chicken',         'pizza', '핫치킨',          'Hot Chicken',         '辣鸡肉披萨',        'ホットチキン',            'Clean & spicy hot chicken pizza',                                   '清爽辣味炸鸡披萨',                                      'すっきり辛いホットチキンピザ',                                    20900, 24900, NULL,        true, 12),
  ('hot-chicken-shrimp',  'pizza', '핫치킨 쉬림프',    'Hot Chicken Shrimp',  '辣鸡虾仁披萨',       'ホットチキンシュリンプ',    'Plump shrimp & spicy hot chicken',                                  '饱满虾仁与辣味炸鸡',                                    'プリプリエビと辛いホットチキン',                                    22900, 26900, NULL,        true, 13),
  ('cream-buldak',        'pizza', '크림 불닭',        'Cream Buldak',        '奶油火鸡面披萨',     'クリームブルダック',       'Creamy sauce meets spicy hot chicken — perfect harmony',            '浓郁奶油酱与辣味炸鸡的完美搭配',                          '濃厚クリームソースと辛いチキンの絶妙なハーモニー',                  22900, 26900, NULL,        true, 14),
  ('cheddar-bulgalbi',    'pizza', '체다 불갈비',      'Cheddar Bulgalbi',    '切达烤排骨披萨',     'チェダープルカルビ',       'Gooey cheddar cheese & sweet-savory grilled beef',                  '浓郁切达芝士与甜咸烤肉',                                  '濃厚チェダーチーズと甘辛プルコギ',                                22900, 26900, 'signature', true, 15);

-- 5.5 Set Menus — REMOVED (disabled per client feedback, data preserved in menu_categories for future use)

-- 5.6 Sides (11)
INSERT INTO menu_items (id, category, name_ko, name_en, name_zh, name_ja, desc_en, price, sub_category, sort_order) VALUES
  ('meat-oven-spaghetti',  'side', '미트오븐스파게티',    'Meat Oven Spaghetti',      '肉酱焗意面',            'ミートオーブンスパゲティ',       NULL, 6500,  'spaghetti', 1),
  ('carbonara',            'side', '카르보나라',         'Carbonara',                '奶油培根意面',           'カルボナーラ',                 NULL, 7000,  'spaghetti', 2),
  ('cream-buldak-spaghetti','side','크림불닭스파게티',    'Cream Buldak Spaghetti',   '奶油火鸡面意面',         'クリームブルダックスパゲティ',    NULL, 7500,  'spaghetti', 3),
  ('bulgogi-spaghetti',    'side', '불고기스파게티',     'Bulgogi Spaghetti',        '烤肉意面',              'プルコギスパゲティ',            NULL, 7500,  'spaghetti', 4),
  ('buffalo-wings-5',      'side', '버팔로윙5조각',     'Buffalo Wings (5pcs)',     '水牛城鸡翅(5个)',        'バッファローウィング(5個)',      NULL, 5900,  'chicken',   5),
  ('buffalo-wings-10',     'side', '버팔로윙10조각',    'Buffalo Wings (10pcs)',    '水牛城鸡翅(10个)',       'バッファローウィング(10個)',     NULL, 10900, 'chicken',   6),
  ('side-combo',           'side', '사이드콤보',        'Side Combo',               '小食拼盘',              'サイドコンボ',                 'Wings, Drumettes, Shrimp Rings, Tenders', 13900, 'combo', 7),
  ('chicken-tenders-4',    'side', '치킨텐더4조각',     'Chicken Tenders (4pcs)',   '炸鸡柳(4个)',            'チキンテンダー(4個)',           NULL, 5000,  'chicken',   8),
  ('shrimp-rings-8',       'side', '쉬림프링8조각',     'Shrimp Rings (8pcs)',      '虾环(8个)',              'エビリング(8個)',              NULL, 6000,  'seafood',   9),
  ('smoked-chicken-half',  'side', '훈제치킨반마리',    'Smoked Chicken (Half)',    '熏鸡(半只)',             '燻製チキン(半身)',             NULL, 6900,  'chicken',   10),
  ('smoked-chicken-whole', 'side', '훈제치킨한마리',    'Smoked Chicken (Whole)',   '熏鸡(整只)',             '燻製チキン(丸ごと)',            NULL, 12900, 'chicken',   11);

-- 5.7 Drinks (6)
INSERT INTO menu_items (id, category, name_ko, name_en, name_zh, name_ja, price, sort_order) VALUES
  ('coke-500',      'drink', '코카콜라500ml',      'Coca-Cola 500ml',       '可口可乐500ml',       'コカ・コーラ500ml',       2000, 1),
  ('coke-zero-500', 'drink', '코카콜라제로500ml',   'Coca-Cola Zero 500ml',  '零度可乐500ml',       'コカ・コーラゼロ500ml',    2000, 2),
  ('sprite-500',    'drink', '스프라이트500ml',     'Sprite 500ml',          '雪碧500ml',           'スプライト500ml',         2000, 3),
  ('coke-1250',     'drink', '코카콜라1.25L',      'Coca-Cola 1.25L',       '可口可乐1.25L',       'コカ・コーラ1.25L',       4000, 4),
  ('coke-zero-1250','drink', '코카콜라제로1.25L',   'Coca-Cola Zero 1.25L',  '零度可乐1.25L',       'コカ・コーラゼロ1.25L',    4000, 5),
  ('sprite-1500',   'drink', '스프라이트1.5L',     'Sprite 1.5L',           '雪碧1.5L',            'スプライト1.5L',          4000, 6);

-- 5.8 Sauces (5)
INSERT INTO menu_items (id, category, name_ko, name_en, name_zh, name_ja, price, sort_order) VALUES
  ('pickles',       'sauce', '피클',          'Pickles',           '泡菜',            'ピクルス',           500,  1),
  ('garlic-sauce',  'sauce', '갈릭소스',      'Garlic Sauce',      '蒜蓉酱',          'ガーリックソース',     300,  2),
  ('hot-sauce',     'sauce', '핫소스',        'Hot Sauce',         '辣酱',            'ホットソース',        100,  3),
  ('parmesan',      'sauce', '파마산치즈',    'Parmesan Cheese',   '帕尔马干酪粉',     'パルメザンチーズ',    300,  4),
  ('jalapeno',      'sauce', '할라피뇨',      'Jalapeño',          '墨西哥辣椒',       'ハラペーニョ',       700,  5);

-- 5.9 Admin Settings (default PIN)
INSERT INTO admin_settings (key, value) VALUES ('pin', '1234');

-- ============================================================
-- 6. VIEWS — Sales Summaries
-- ============================================================

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
-- Done! Schema + seed data applied.
-- ============================================================
