-- ============================================================
-- 🍕 Pizza of Legend Express — Supabase DB Schema
-- ============================================================
-- Project: 영종도 호텔 외국인 투숙객 전용 PWA 주문 시스템
-- Philosophy: "No Auth, No App, Just Pizza"
-- Created for: Claude Code 바이브코딩 프로토타입
-- ============================================================


-- ============================================================
-- 2. CORE TABLES
-- ============================================================

-- 호텔 목록 (배달 가능 호텔)
CREATE TABLE hotels (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name_ko TEXT NOT NULL,
  name_en TEXT NOT NULL,
  name_zh TEXT,
  name_ja TEXT,
  address TEXT,
  delivery_note TEXT,           -- 배달 포인트 메모 (로비, 정문 등)
  is_active BOOLEAN DEFAULT true,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 메뉴 아이템
CREATE TABLE menu_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  category menu_category NOT NULL,
  name_ko TEXT NOT NULL,
  name_en TEXT NOT NULL,
  name_zh TEXT,
  name_ja TEXT,
  description_ko TEXT,
  description_en TEXT,
  description_zh TEXT,
  description_ja TEXT,
  image_url TEXT,
  badge TEXT,                   -- 'popular', 'signature', 'chefs_pick', null
  is_half_half_available BOOLEAN DEFAULT false,  -- 반반 피자 조합 가능 여부
  is_active BOOLEAN DEFAULT true,
  is_sold_out BOOLEAN DEFAULT false,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 메뉴 가격 (사이즈별)
-- 피자: R/L 두 행, 사이드/음료/소스: 사이즈 NULL 단일 행
CREATE TABLE menu_prices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  menu_item_id UUID NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  size pizza_size,              -- NULL이면 단일 가격
  price INT NOT NULL,           -- 원 단위 (예: 22900)
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(menu_item_id, size)
);

-- 세트 메뉴 구성 정보
CREATE TABLE set_menu_components (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  set_menu_id UUID NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  component_type TEXT NOT NULL,  -- 'pizza', 'half_half', 'spaghetti', 'side', 'drink', 'sauce'
  component_label_en TEXT,       -- "Choose your pizza", "Choose a side"
  component_label_ko TEXT,
  is_choosable BOOLEAN DEFAULT false,  -- true: 고객이 선택 필요, false: 고정 포함
  fixed_item_id UUID REFERENCES menu_items(id),  -- 고정 포함일 때 해당 아이템
  choosable_category menu_category,  -- 선택 가능할 때 어떤 카테고리에서 고르는지
  quantity INT DEFAULT 1,
  sort_order INT DEFAULT 0
);

-- ============================================================
-- 3. ORDER TABLES
-- ============================================================

-- 주문
CREATE TABLE orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_number TEXT NOT NULL UNIQUE,  -- 표시용 주문번호 (예: POL-20260321-001)
  hotel_id UUID NOT NULL REFERENCES hotels(id),
  room_number TEXT NOT NULL,
  messenger_id TEXT,             -- WhatsApp/WeChat ID (선택)
  status order_status DEFAULT 'pending',
  payment_method payment_method, -- 배달 완료 시 기록
  total_amount INT NOT NULL,     -- 총 금액
  special_request TEXT,          -- 요청사항
  language TEXT DEFAULT 'en',    -- 주문 시 언어 (en/zh/ja)
  created_at TIMESTAMPTZ DEFAULT now(),
  confirmed_at TIMESTAMPTZ,
  delivering_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ
);

-- 주문 아이템
CREATE TABLE order_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  menu_item_id UUID NOT NULL REFERENCES menu_items(id),
  size pizza_size,
  quantity INT NOT NULL DEFAULT 1,
  unit_price INT NOT NULL,
  subtotal INT NOT NULL,
  -- 반반 피자인 경우
  half1_item_id UUID REFERENCES menu_items(id),  -- 반반 왼쪽
  half2_item_id UUID REFERENCES menu_items(id),  -- 반반 오른쪽
  -- 세트 메뉴인 경우 선택된 하위 아이템들
  set_selections JSONB,         -- [{component_type, selected_item_id, selected_item_name}]
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 4. ADMIN / SETTINGS
-- ============================================================

-- 가게 설정
CREATE TABLE store_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 일별 정산 요약 (자동 집계용)
CREATE TABLE daily_settlements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL UNIQUE,
  total_orders INT DEFAULT 0,
  total_cash INT DEFAULT 0,
  total_card INT DEFAULT 0,
  total_revenue INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 5. INDEXES
-- ============================================================

CREATE INDEX idx_menu_items_category ON menu_items(category);
CREATE INDEX idx_menu_items_active ON menu_items(is_active, is_sold_out);
CREATE INDEX idx_menu_prices_item ON menu_prices(menu_item_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created ON orders(created_at DESC);
CREATE INDEX idx_orders_hotel ON orders(hotel_id);
CREATE INDEX idx_order_items_order ON order_items(order_id);

-- ============================================================
-- 6. REALTIME (Supabase 실시간 구독용)
-- ============================================================

ALTER PUBLICATION supabase_realtime ADD TABLE orders;
ALTER PUBLICATION supabase_realtime ADD TABLE order_items;

-- ============================================================
-- 7. RLS (Row Level Security) - 프로토타입용 기본 정책
-- ============================================================

-- 프로토타입 단계에서는 anon 읽기 허용, 쓰기는 API를 통해서만
ALTER TABLE hotels ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- 공개 읽기 (메뉴, 호텔 목록)
CREATE POLICY "Public read hotels" ON hotels FOR SELECT USING (true);
CREATE POLICY "Public read menu_items" ON menu_items FOR SELECT USING (true);
CREATE POLICY "Public read menu_prices" ON menu_prices FOR SELECT USING (true);
CREATE POLICY "Public read set_components" ON set_menu_components FOR SELECT USING (true);

-- 주문 생성은 anon 허용 (No Auth 구조)
CREATE POLICY "Anon can create orders" ON orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Anon can create order_items" ON order_items FOR INSERT WITH CHECK (true);

-- 주문 조회 (자기 주문만 - order_number 기반)
CREATE POLICY "Read own order" ON orders FOR SELECT USING (true);
CREATE POLICY "Read own order_items" ON order_items FOR SELECT USING (true);

-- Admin 정책은 서비스 키 사용으로 RLS bypass 예정

-- ============================================================
-- 8. FUNCTIONS
-- ============================================================

-- 주문번호 자동 생성 함수
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TRIGGER AS $$
DECLARE
  today_count INT;
  today_str TEXT;
BEGIN
  today_str := TO_CHAR(NOW() AT TIME ZONE 'Asia/Seoul', 'YYYYMMDD');
  SELECT COUNT(*) + 1 INTO today_count
  FROM orders
  WHERE TO_CHAR(created_at AT TIME ZONE 'Asia/Seoul', 'YYYYMMDD') = today_str;
  NEW.order_number := 'POL-' || today_str || '-' || LPAD(today_count::TEXT, 3, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_order_number
  BEFORE INSERT ON orders
  FOR EACH ROW
  WHEN (NEW.order_number IS NULL)
  EXECUTE FUNCTION generate_order_number();

-- updated_at 자동 갱신
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_hotels_updated
  BEFORE UPDATE ON hotels FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trigger_menu_items_updated
  BEFORE UPDATE ON menu_items FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trigger_store_settings_updated
  BEFORE UPDATE ON store_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ============================================================
-- 9. SEED DATA — 호텔
-- ============================================================

INSERT INTO hotels (name_ko, name_en, name_zh, name_ja, delivery_note, sort_order) VALUES
  ('베스트웨스턴', 'Best Western', '最佳西方酒店', 'ベストウェスタン', '로비 입구에서 전화', 1),
  ('파라다이스시티', 'Paradise City', '天堂城', 'パラダイスシティ', '1층 로비 데스크 앞', 2),
  ('이에어', 'E-Air', 'E-Air酒店', 'Eエアー', '정문 앞', 3),
  ('네스트호텔', 'Nest Hotel', '巢酒店', 'ネストホテル', '로비', 4),
  ('골든튤립', 'Golden Tulip', '金色郁金香', 'ゴールデンチューリップ', '로비', 5);


-- ============================================================
-- 10. SEED DATA — 메뉴 아이템 + 가격
-- ============================================================

-- ========== 피자 (15종) ==========

-- 1. 치즈
INSERT INTO menu_items (id, category, name_ko, name_en, name_zh, name_ja, description_ko, description_en, description_zh, description_ja, badge, is_half_half_available, sort_order)
VALUES ('11111111-0001-0001-0001-000000000001', 'pizza', '치즈', 'Cheese', '芝士披萨', 'チーズ', '쫄깃한 도우와 신선한 치즈', 'Chewy dough with fresh cheese — Simple is best', '劲道面饼配新鲜芝士', 'もちもち生地と新鮮なチーズ', NULL, true, 1);
INSERT INTO menu_prices (menu_item_id, size, price) VALUES
  ('11111111-0001-0001-0001-000000000001', 'R', 19900),
  ('11111111-0001-0001-0001-000000000001', 'L', 23900);

-- 2. 꽃 페퍼로니
INSERT INTO menu_items (id, category, name_ko, name_en, name_zh, name_ja, description_ko, description_en, description_zh, description_ja, badge, is_half_half_available, sort_order)
VALUES ('11111111-0001-0001-0001-000000000002', 'pizza', '꽃 페퍼로니', 'Flower Pepperoni', '花式意大利辣香肠', 'フラワーペパロニ', '도우위에 페퍼로니 꽃이 핍니다~', 'Pepperoni blossoms on crispy dough', '面饼上盛开的意大利辣香肠花', 'ドウの上にペパロニの花が咲く', NULL, true, 2);
INSERT INTO menu_prices (menu_item_id, size, price) VALUES
  ('11111111-0001-0001-0001-000000000002', 'R', 20900),
  ('11111111-0001-0001-0001-000000000002', 'L', 24900);

-- 3. 슈퍼 콤비네이션
INSERT INTO menu_items (id, category, name_ko, name_en, name_zh, name_ja, description_ko, description_en, description_zh, description_ja, badge, is_half_half_available, sort_order)
VALUES ('11111111-0001-0001-0001-000000000003', 'pizza', '슈퍼 콤비네이션', 'Super Combination', '超级组合披萨', 'スーパーコンビネーション', '아삭아삭한 야채, 넉넉한 양의 고기로 기본에 충실한 피자', 'Crunchy veggies & generous meat — a classic done right', '爽脆蔬菜与丰富肉类的经典披萨', 'シャキシャキ野菜とたっぷり肉の定番ピザ', NULL, true, 3);
INSERT INTO menu_prices (menu_item_id, size, price) VALUES
  ('11111111-0001-0001-0001-000000000003', 'R', 20900),
  ('11111111-0001-0001-0001-000000000003', 'L', 24900);

-- 4. 더블 체다 베이컨
INSERT INTO menu_items (id, category, name_ko, name_en, name_zh, name_ja, description_ko, description_en, description_zh, description_ja, badge, is_half_half_available, sort_order)
VALUES ('11111111-0001-0001-0001-000000000004', 'pizza', '더블 체다 베이컨', 'Double Cheddar Bacon', '双重切达培根', 'ダブルチェダーベーコン', '빠삭 고소한 베이컨과 꾸덕한 체다 치즈', 'Crispy bacon & gooey cheddar cheese', '酥脆培根与浓郁切达芝士', 'カリカリベーコンと濃厚チェダーチーズ', NULL, true, 4);
INSERT INTO menu_prices (menu_item_id, size, price) VALUES
  ('11111111-0001-0001-0001-000000000004', 'R', 20900),
  ('11111111-0001-0001-0001-000000000004', 'L', 24900);

-- 5. 직화 불고기
INSERT INTO menu_items (id, category, name_ko, name_en, name_zh, name_ja, description_ko, description_en, description_zh, description_ja, badge, is_half_half_available, sort_order)
VALUES ('11111111-0001-0001-0001-000000000005', 'pizza', '직화 불고기', 'Bulgogi', '烤肉披萨', '直火プルコギ', '한국인이라면 싫어할 수 없는 단짠단짠 불고기', 'Korean-style sweet & savory flame-grilled beef', '韩式甜咸烤肉', '韓国式甘辛プルコギ', 'popular', true, 5);
INSERT INTO menu_prices (menu_item_id, size, price) VALUES
  ('11111111-0001-0001-0001-000000000005', 'R', 21900),
  ('11111111-0001-0001-0001-000000000005', 'L', 25900);

-- 6. 매콤 직화 불고기
INSERT INTO menu_items (id, category, name_ko, name_en, name_zh, name_ja, description_ko, description_en, description_zh, description_ja, badge, is_half_half_available, sort_order)
VALUES ('11111111-0001-0001-0001-000000000006', 'pizza', '매콤 직화 불고기', 'Spicy Bulgogi', '辣烤肉披萨', '辛口直火プルコギ', '한국식 매콤한 고추장 소스와 단짠단짠 불고기', 'Spicy Korean chili sauce meets flame-grilled beef', '韩式辣椒酱与烤肉', '韓国式コチュジャンソースとプルコギ', 'chefs_pick', true, 6);
INSERT INTO menu_prices (menu_item_id, size, price) VALUES
  ('11111111-0001-0001-0001-000000000006', 'R', 21900),
  ('11111111-0001-0001-0001-000000000006', 'L', 25900);

-- 7. 스윗 고구마
INSERT INTO menu_items (id, category, name_ko, name_en, name_zh, name_ja, description_ko, description_en, description_zh, description_ja, badge, is_half_half_available, sort_order)
VALUES ('11111111-0001-0001-0001-000000000007', 'pizza', '스윗 고구마', 'Sweet Potato', '红薯披萨', 'スイートポテト', '달콤한 고구마 무스와 진짜 Real 고구마로 찐 고구마맛 피자', 'Real sweet potato mousse — authentically sweet', '真正红薯慕斯制作的红薯味披萨', 'リアルさつまいもムースの本格さつまいもピザ', NULL, true, 7);
INSERT INTO menu_prices (menu_item_id, size, price) VALUES
  ('11111111-0001-0001-0001-000000000007', 'R', 21900),
  ('11111111-0001-0001-0001-000000000007', 'L', 25900);

-- 8. 베이컨 포테이토
INSERT INTO menu_items (id, category, name_ko, name_en, name_zh, name_ja, description_ko, description_en, description_zh, description_ja, badge, is_half_half_available, sort_order)
VALUES ('11111111-0001-0001-0001-000000000008', 'pizza', '베이컨 포테이토', 'Bacon Potato', '培根土豆披萨', 'ベーコンポテト', '빠삭한 베이컨, 포슬포슬한 감자, 꼬소한 마요네즈', 'Crispy bacon, fluffy potato & savory mayo', '酥脆培根、软糯土豆与香浓蛋黄酱', 'カリカリベーコン、ホクホクポテト、香ばしいマヨネーズ', NULL, true, 8);
INSERT INTO menu_prices (menu_item_id, size, price) VALUES
  ('11111111-0001-0001-0001-000000000008', 'R', 21900),
  ('11111111-0001-0001-0001-000000000008', 'L', 25900);

-- 9. 메가 포테이토
INSERT INTO menu_items (id, category, name_ko, name_en, name_zh, name_ja, description_ko, description_en, description_zh, description_ja, badge, is_half_half_available, sort_order)
VALUES ('11111111-0001-0001-0001-000000000009', 'pizza', '메가 포테이토', 'Mega Potato', '超级土豆披萨', 'メガポテト', '바삭한 베이컨과 풍부하고 다양한 모양의 감자로 귀여운 포테이토피자', 'Bacon & assorted potato shapes — irresistibly cute', '培根与各种形状土豆的可爱披萨', 'ベーコンと色々な形のポテトが可愛いピザ', NULL, true, 9);
INSERT INTO menu_prices (menu_item_id, size, price) VALUES
  ('11111111-0001-0001-0001-000000000009', 'R', 22900),
  ('11111111-0001-0001-0001-000000000009', 'L', 26900);

-- 10. 통 하와이안
INSERT INTO menu_items (id, category, name_ko, name_en, name_zh, name_ja, description_ko, description_en, description_zh, description_ja, badge, is_half_half_available, sort_order)
VALUES ('11111111-0001-0001-0001-000000000010', 'pizza', '통 하와이안', 'Hawaiian', '夏威夷披萨', 'ハワイアン', '통 파인애플이 올라간 단짠단짠 제대로인 피자', 'Whole pineapple chunks — sweet & savory perfection', '大块菠萝的完美甜咸搭配', 'パイナップルまるごとの甘じょっぱいピザ', NULL, true, 10);
INSERT INTO menu_prices (menu_item_id, size, price) VALUES
  ('11111111-0001-0001-0001-000000000010', 'R', 21900),
  ('11111111-0001-0001-0001-000000000010', 'L', 25900);

-- 11. 베이컨 쉬림프
INSERT INTO menu_items (id, category, name_ko, name_en, name_zh, name_ja, description_ko, description_en, description_zh, description_ja, badge, is_half_half_available, sort_order)
VALUES ('11111111-0001-0001-0001-000000000011', 'pizza', '베이컨 쉬림프', 'Bacon Shrimp', '培根虾仁披萨', 'ベーコンシュリンプ', '통통한 새우와 꼬소한 베이컨, 하트 감자로 귀욤귀욤한 피자', 'Plump shrimp, savory bacon & heart-shaped potatoes', '饱满虾仁与培根、心形土豆的可爱披萨', 'プリプリエビと香ばしいベーコン、ハート型ポテト', NULL, true, 11);
INSERT INTO menu_prices (menu_item_id, size, price) VALUES
  ('11111111-0001-0001-0001-000000000011', 'R', 22900),
  ('11111111-0001-0001-0001-000000000011', 'L', 26900);

-- 12. 핫치킨
INSERT INTO menu_items (id, category, name_ko, name_en, name_zh, name_ja, description_ko, description_en, description_zh, description_ja, badge, is_half_half_available, sort_order)
VALUES ('11111111-0001-0001-0001-000000000012', 'pizza', '핫치킨', 'Hot Chicken', '辣鸡肉披萨', 'ホットチキン', '깔끔한 매운맛의 핫치킨피자', 'Clean & spicy hot chicken pizza', '清爽辣味炸鸡披萨', 'すっきり辛いホットチキンピザ', NULL, true, 12);
INSERT INTO menu_prices (menu_item_id, size, price) VALUES
  ('11111111-0001-0001-0001-000000000012', 'R', 20900),
  ('11111111-0001-0001-0001-000000000012', 'L', 24900);

-- 13. 핫치킨 쉬림프
INSERT INTO menu_items (id, category, name_ko, name_en, name_zh, name_ja, description_ko, description_en, description_zh, description_ja, badge, is_half_half_available, sort_order)
VALUES ('11111111-0001-0001-0001-000000000013', 'pizza', '핫치킨 쉬림프', 'Hot Chicken Shrimp', '辣鸡虾仁披萨', 'ホットチキンシュリンプ', '통통한 새우와 매콤한 핫치킨', 'Plump shrimp & spicy hot chicken', '饱满虾仁与辣味炸鸡', 'プリプリエビと辛いホットチキン', NULL, true, 13);
INSERT INTO menu_prices (menu_item_id, size, price) VALUES
  ('11111111-0001-0001-0001-000000000013', 'R', 22900),
  ('11111111-0001-0001-0001-000000000013', 'L', 26900);

-- 14. 크림 불닭
INSERT INTO menu_items (id, category, name_ko, name_en, name_zh, name_ja, description_ko, description_en, description_zh, description_ja, badge, is_half_half_available, sort_order)
VALUES ('11111111-0001-0001-0001-000000000014', 'pizza', '크림 불닭', 'Cream Buldak', '奶油火鸡面披萨', 'クリームブルダック', '꾸덕 꼬소한 크림소스와 매콤한 핫치킨의 적절한 조화', 'Creamy sauce meets spicy hot chicken — perfect harmony', '浓郁奶油酱与辣味炸鸡的完美搭配', '濃厚クリームソースと辛いチキンの絶妙なハーモニー', NULL, true, 14);
INSERT INTO menu_prices (menu_item_id, size, price) VALUES
  ('11111111-0001-0001-0001-000000000014', 'R', 22900),
  ('11111111-0001-0001-0001-000000000014', 'L', 26900);

-- 15. 체다 불갈비
INSERT INTO menu_items (id, category, name_ko, name_en, name_zh, name_ja, description_ko, description_en, description_zh, description_ja, badge, is_half_half_available, sort_order)
VALUES ('11111111-0001-0001-0001-000000000015', 'pizza', '체다 불갈비', 'Cheddar Bulgalbi', '切达烤排骨披萨', 'チェダープルカルビ', '꾸덕꾸덕 체다치즈와 단짠단짠 불고기', 'Gooey cheddar cheese & sweet-savory grilled beef', '浓郁切达芝士与甜咸烤肉', '濃厚チェダーチーズと甘辛プルコギ', 'signature', true, 15);
INSERT INTO menu_prices (menu_item_id, size, price) VALUES
  ('11111111-0001-0001-0001-000000000015', 'R', 22900),
  ('11111111-0001-0001-0001-000000000015', 'L', 26900);


-- ========== 반반 피자 ==========

INSERT INTO menu_items (id, category, name_ko, name_en, name_zh, name_ja, description_ko, description_en, description_zh, description_ja, badge, sort_order)
VALUES ('22222222-0001-0001-0001-000000000001', 'half_half', '반반 피자', 'Half & Half', '半半披萨', 'ハーフ＆ハーフ', '입맛대로 두가지 맛 피자', 'Pick any 2 flavors you love', '随心选择两种口味', 'お好みの2つの味を選べる', 'popular', 1);
INSERT INTO menu_prices (menu_item_id, size, price) VALUES
  ('22222222-0001-0001-0001-000000000001', 'R', 22900),
  ('22222222-0001-0001-0001-000000000001', 'L', 26900);


-- ========== 세트 메뉴 ==========

-- 혼자 피자&사이드세트
INSERT INTO menu_items (id, category, name_ko, name_en, name_zh, name_ja, description_ko, description_en, description_zh, description_ja, badge, sort_order)
VALUES ('33333333-0001-0001-0001-000000000001', 'set_menu', '혼자 피자&사이드세트', 'Solo Pizza & Side Set', '一人份披萨套餐', 'おひとり様ピザ＆サイドセット', 'S사이즈 피자+사이드+콜라500ml+피클1', 'S-size pizza + side + Coke 500ml + pickle', 'S号披萨+小食+可乐500ml+泡菜', 'Sサイズピザ+サイド+コーラ500ml+ピクルス', 'popular', 1);
INSERT INTO menu_prices (menu_item_id, size, price) VALUES
  ('33333333-0001-0001-0001-000000000001', NULL, 18900);

-- 세트1
INSERT INTO menu_items (id, category, name_ko, name_en, name_zh, name_ja, description_ko, description_en, description_zh, description_ja, badge, sort_order)
VALUES ('33333333-0001-0001-0001-000000000002', 'set_menu', '세트1', 'Set 1', '套餐1', 'セット1', '피자+스파게티+콜라1.25L', 'Pizza + Spaghetti + Coke 1.25L', '披萨+意面+可乐1.25L', 'ピザ+スパゲティ+コーラ1.25L', NULL, 2);
INSERT INTO menu_prices (menu_item_id, size, price) VALUES
  ('33333333-0001-0001-0001-000000000002', 'R', 24900),
  ('33333333-0001-0001-0001-000000000002', 'L', 28900);

-- 세트2
INSERT INTO menu_items (id, category, name_ko, name_en, name_zh, name_ja, description_ko, description_en, description_zh, description_ja, badge, sort_order)
VALUES ('33333333-0001-0001-0001-000000000003', 'set_menu', '세트2', 'Set 2', '套餐2', 'セット2', '피자+사이드+콜라1.25L', 'Pizza + Side + Coke 1.25L', '披萨+小食+可乐1.25L', 'ピザ+サイド+コーラ1.25L', NULL, 3);
INSERT INTO menu_prices (menu_item_id, size, price) VALUES
  ('33333333-0001-0001-0001-000000000003', 'R', 24900),
  ('33333333-0001-0001-0001-000000000003', 'L', 28900);

-- 세트3
INSERT INTO menu_items (id, category, name_ko, name_en, name_zh, name_ja, description_ko, description_en, description_zh, description_ja, badge, sort_order)
VALUES ('33333333-0001-0001-0001-000000000004', 'set_menu', '세트3', 'Set 3', '套餐3', 'セット3', '반반피자+사이드+콜라1.25L', 'Half & Half + Side + Coke 1.25L', '半半披萨+小食+可乐1.25L', 'ハーフ＆ハーフ+サイド+コーラ1.25L', NULL, 4);
INSERT INTO menu_prices (menu_item_id, size, price) VALUES
  ('33333333-0001-0001-0001-000000000004', 'R', 26400),
  ('33333333-0001-0001-0001-000000000004', 'L', 30400);

-- 세트4
INSERT INTO menu_items (id, category, name_ko, name_en, name_zh, name_ja, description_ko, description_en, description_zh, description_ja, badge, sort_order)
VALUES ('33333333-0001-0001-0001-000000000005', 'set_menu', '세트4', 'Set 4', '套餐4', 'セット4', '피자+스파게티+사이드+콜라1.25L', 'Pizza + Spaghetti + Side + Coke 1.25L', '披萨+意面+小食+可乐1.25L', 'ピザ+スパゲティ+サイド+コーラ1.25L', NULL, 5);
INSERT INTO menu_prices (menu_item_id, size, price) VALUES
  ('33333333-0001-0001-0001-000000000005', 'R', 29900),
  ('33333333-0001-0001-0001-000000000005', 'L', 33900);

-- 두판 세트
INSERT INTO menu_items (id, category, name_ko, name_en, name_zh, name_ja, description_ko, description_en, description_zh, description_ja, badge, sort_order)
VALUES ('33333333-0001-0001-0001-000000000006', 'set_menu', '두판 세트', 'Double Pizza Set', '双份披萨套餐', 'ダブルピザセット', '1+1으로 푸짐하게', 'Two pizzas — double the happiness!', '1+1超满足双份披萨', '1+1でたっぷり楽しめる', NULL, 6);
INSERT INTO menu_prices (menu_item_id, size, price) VALUES
  ('33333333-0001-0001-0001-000000000006', 'R', 33900),
  ('33333333-0001-0001-0001-000000000006', 'L', 40900);


-- ========== 사이드 (11종) ==========

INSERT INTO menu_items (id, category, name_ko, name_en, name_zh, name_ja, description_ko, description_en, sort_order)
VALUES ('44444444-0001-0001-0001-000000000001', 'side', '미트 오븐 스파게티', 'Meat Oven Spaghetti', '肉酱焗意面', 'ミートオーブンスパゲティ', NULL, NULL, 1);
INSERT INTO menu_prices (menu_item_id, size, price) VALUES ('44444444-0001-0001-0001-000000000001', NULL, 6500);

INSERT INTO menu_items (id, category, name_ko, name_en, name_zh, name_ja, sort_order)
VALUES ('44444444-0001-0001-0001-000000000002', 'side', '까르보나라', 'Carbonara', '奶油培根意面', 'カルボナーラ', 2);
INSERT INTO menu_prices (menu_item_id, size, price) VALUES ('44444444-0001-0001-0001-000000000002', NULL, 7000);

INSERT INTO menu_items (id, category, name_ko, name_en, name_zh, name_ja, sort_order)
VALUES ('44444444-0001-0001-0001-000000000003', 'side', '크림불닭 스파게티', 'Cream Buldak Spaghetti', '奶油火鸡面意面', 'クリームブルダックスパゲティ', 3);
INSERT INTO menu_prices (menu_item_id, size, price) VALUES ('44444444-0001-0001-0001-000000000003', NULL, 7500);

INSERT INTO menu_items (id, category, name_ko, name_en, name_zh, name_ja, sort_order)
VALUES ('44444444-0001-0001-0001-000000000004', 'side', '불고기 스파게티', 'Bulgogi Spaghetti', '烤肉意面', 'プルコギスパゲティ', 4);
INSERT INTO menu_prices (menu_item_id, size, price) VALUES ('44444444-0001-0001-0001-000000000004', NULL, 7500);

INSERT INTO menu_items (id, category, name_ko, name_en, name_zh, name_ja, sort_order)
VALUES ('44444444-0001-0001-0001-000000000005', 'side', '버팔로윙 (5개)', 'Buffalo Wings (5pcs)', '水牛城鸡翅(5个)', 'バッファローウィング(5個)', 5);
INSERT INTO menu_prices (menu_item_id, size, price) VALUES ('44444444-0001-0001-0001-000000000005', NULL, 5900);

INSERT INTO menu_items (id, category, name_ko, name_en, name_zh, name_ja, sort_order)
VALUES ('44444444-0001-0001-0001-000000000006', 'side', '버팔로윙 (10개)', 'Buffalo Wings (10pcs)', '水牛城鸡翅(10个)', 'バッファローウィング(10個)', 6);
INSERT INTO menu_prices (menu_item_id, size, price) VALUES ('44444444-0001-0001-0001-000000000006', NULL, 10900);

INSERT INTO menu_items (id, category, name_ko, name_en, name_zh, name_ja, description_ko, description_en, sort_order)
VALUES ('44444444-0001-0001-0001-000000000007', 'side', '사이드콤보', 'Side Combo', '小食拼盘', 'サイドコンボ', '윙, 봉, 새우링, 텐더', 'Wings, Drumettes, Shrimp Rings, Tenders', 7);
INSERT INTO menu_prices (menu_item_id, size, price) VALUES ('44444444-0001-0001-0001-000000000007', NULL, 13900);

INSERT INTO menu_items (id, category, name_ko, name_en, name_zh, name_ja, sort_order)
VALUES ('44444444-0001-0001-0001-000000000008', 'side', '치킨텐더 (4개)', 'Chicken Tenders (4pcs)', '炸鸡柳(4个)', 'チキンテンダー(4個)', 8);
INSERT INTO menu_prices (menu_item_id, size, price) VALUES ('44444444-0001-0001-0001-000000000008', NULL, 5000);

INSERT INTO menu_items (id, category, name_ko, name_en, name_zh, name_ja, sort_order)
VALUES ('44444444-0001-0001-0001-000000000009', 'side', '새우링 (8개)', 'Shrimp Rings (8pcs)', '虾环(8个)', 'エビリング(8個)', 9);
INSERT INTO menu_prices (menu_item_id, size, price) VALUES ('44444444-0001-0001-0001-000000000009', NULL, 6000);

INSERT INTO menu_items (id, category, name_ko, name_en, name_zh, name_ja, sort_order)
VALUES ('44444444-0001-0001-0001-000000000010', 'side', '훈제치킨 (반마리)', 'Smoked Chicken (Half)', '熏鸡(半只)', '燻製チキン(半身)', 10);
INSERT INTO menu_prices (menu_item_id, size, price) VALUES ('44444444-0001-0001-0001-000000000010', NULL, 6900);

INSERT INTO menu_items (id, category, name_ko, name_en, name_zh, name_ja, sort_order)
VALUES ('44444444-0001-0001-0001-000000000011', 'side', '훈제치킨 (한마리)', 'Smoked Chicken (Whole)', '熏鸡(整只)', '燻製チキン(丸ごと)', 11);
INSERT INTO menu_prices (menu_item_id, size, price) VALUES ('44444444-0001-0001-0001-000000000011', NULL, 12900);


-- ========== 음료 (6종) ==========

INSERT INTO menu_items (id, category, name_ko, name_en, name_zh, name_ja, sort_order)
VALUES ('55555555-0001-0001-0001-000000000001', 'drink', '코카콜라 500ml', 'Coca-Cola 500ml', '可口可乐500ml', 'コカ・コーラ500ml', 1);
INSERT INTO menu_prices (menu_item_id, size, price) VALUES ('55555555-0001-0001-0001-000000000001', NULL, 2000);

INSERT INTO menu_items (id, category, name_ko, name_en, name_zh, name_ja, sort_order)
VALUES ('55555555-0001-0001-0001-000000000002', 'drink', '코카콜라 제로 500ml', 'Coca-Cola Zero 500ml', '零度可乐500ml', 'コカ・コーラゼロ500ml', 2);
INSERT INTO menu_prices (menu_item_id, size, price) VALUES ('55555555-0001-0001-0001-000000000002', NULL, 2000);

INSERT INTO menu_items (id, category, name_ko, name_en, name_zh, name_ja, sort_order)
VALUES ('55555555-0001-0001-0001-000000000003', 'drink', '스프라이트 500ml', 'Sprite 500ml', '雪碧500ml', 'スプライト500ml', 3);
INSERT INTO menu_prices (menu_item_id, size, price) VALUES ('55555555-0001-0001-0001-000000000003', NULL, 2000);

INSERT INTO menu_items (id, category, name_ko, name_en, name_zh, name_ja, sort_order)
VALUES ('55555555-0001-0001-0001-000000000004', 'drink', '코카콜라 1.25L', 'Coca-Cola 1.25L', '可口可乐1.25L', 'コカ・コーラ1.25L', 4);
INSERT INTO menu_prices (menu_item_id, size, price) VALUES ('55555555-0001-0001-0001-000000000004', NULL, 4000);

INSERT INTO menu_items (id, category, name_ko, name_en, name_zh, name_ja, sort_order)
VALUES ('55555555-0001-0001-0001-000000000005', 'drink', '코카콜라 제로 1.25L', 'Coca-Cola Zero 1.25L', '零度可乐1.25L', 'コカ・コーラゼロ1.25L', 5);
INSERT INTO menu_prices (menu_item_id, size, price) VALUES ('55555555-0001-0001-0001-000000000005', NULL, 4000);

INSERT INTO menu_items (id, category, name_ko, name_en, name_zh, name_ja, sort_order)
VALUES ('55555555-0001-0001-0001-000000000006', 'drink', '스프라이트 1.5L', 'Sprite 1.5L', '雪碧1.5L', 'スプライト1.5L', 6);
INSERT INTO menu_prices (menu_item_id, size, price) VALUES ('55555555-0001-0001-0001-000000000006', NULL, 4000);


-- ========== 소스/추가 (5종) ==========

INSERT INTO menu_items (id, category, name_ko, name_en, name_zh, name_ja, sort_order)
VALUES ('66666666-0001-0001-0001-000000000001', 'sauce', '피클', 'Pickles', '泡菜', 'ピクルス', 1);
INSERT INTO menu_prices (menu_item_id, size, price) VALUES ('66666666-0001-0001-0001-000000000001', NULL, 500);

INSERT INTO menu_items (id, category, name_ko, name_en, name_zh, name_ja, sort_order)
VALUES ('66666666-0001-0001-0001-000000000002', 'sauce', '갈릭소스', 'Garlic Sauce', '蒜蓉酱', 'ガーリックソース', 2);
INSERT INTO menu_prices (menu_item_id, size, price) VALUES ('66666666-0001-0001-0001-000000000002', NULL, 300);

INSERT INTO menu_items (id, category, name_ko, name_en, name_zh, name_ja, sort_order)
VALUES ('66666666-0001-0001-0001-000000000003', 'sauce', '핫소스', 'Hot Sauce', '辣酱', 'ホットソース', 3);
INSERT INTO menu_prices (menu_item_id, size, price) VALUES ('66666666-0001-0001-0001-000000000003', NULL, 100);

INSERT INTO menu_items (id, category, name_ko, name_en, name_zh, name_ja, sort_order)
VALUES ('66666666-0001-0001-0001-000000000004', 'sauce', '파마산치즈가루', 'Parmesan Cheese', '帕尔马干酪粉', 'パルメザンチーズ', 4);
INSERT INTO menu_prices (menu_item_id, size, price) VALUES ('66666666-0001-0001-0001-000000000004', NULL, 300);

INSERT INTO menu_items (id, category, name_ko, name_en, name_zh, name_ja, sort_order)
VALUES ('66666666-0001-0001-0001-000000000005', 'sauce', '할라피뇨', 'Jalapeño', '墨西哥辣椒', 'ハラペーニョ', 5);
INSERT INTO menu_prices (menu_item_id, size, price) VALUES ('66666666-0001-0001-0001-000000000005', NULL, 700);


-- ============================================================
-- 11. SEED DATA — 가게 기본 설정
-- ============================================================

INSERT INTO store_settings (key, value) VALUES
  ('store_info', '{"name_ko": "피자오브레전드", "name_en": "Pizza of Legend", "name_zh": "传奇披萨", "name_ja": "伝説のピザ", "phone": "", "address": ""}'),
  ('delivery_settings', '{"min_order_amount": 0, "delivery_fee": 0, "operating_hours": {"start": "11:00", "end": "22:00"}, "is_open": true}'),
  ('payment_notice', '{"en": "Pay to the staff at your door (Cash or Card)", "zh": "向送货员支付现金或卡", "ja": "到着時に配達員にお支払い"}');