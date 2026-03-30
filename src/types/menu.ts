export type Locale = 'en' | 'zh' | 'ja';

// --- Multilingual field types ---

export interface MultilingualName {
  name_en: string;
  name_zh: string;
  name_ja: string;
}

export interface MultilingualDesc {
  desc_en?: string;
  desc_zh?: string;
  desc_ja?: string;
}

export interface MultilingualLabel {
  label_en: string;
  label_zh: string;
  label_ja: string;
}

// --- Brand ---

export interface Brand {
  name_ko: string;
  name_en: string;
  name_zh: string;
  name_ja: string;
  tagline_en: string;
  tagline_zh: string;
  tagline_ja: string;
}

// --- Payment Notice ---

export interface PaymentNotice {
  en: string;
  zh: string;
  ja: string;
}

// --- Sizes ---

export interface SizeInfo {
  label_en: string;
  label_zh: string;
  label_ja: string;
}

export interface Sizes {
  R: SizeInfo;
  L: SizeInfo;
  S: SizeInfo;
}

// --- Hotel ---

export interface Hotel {
  id: string;
  name_en: string;
  name_zh: string;
  name_ja: string;
  delivery_note: string;
  delivery_type: 'door_to_door' | 'lobby_only';
  lobby_notice_en?: string;
  lobby_notice_ko?: string;
  lobby_notice_zh?: string;
  lobby_notice_ja?: string;
  code?: string;
}

// --- Category ---

export interface Category {
  key: string;
  label_en: string;
  label_zh: string;
  label_ja: string;
  icon: string;
}

// --- Half & Half Config ---

export interface HalfHalfConfig {
  name_en: string;
  name_zh: string;
  name_ja: string;
  description_en: string;
  description_zh: string;
  description_ja: string;
  price_R: number;
  price_L: number;
  available_pizzas: string;
  badge: string | null;
}

// --- Pizza ---

export interface Pizza {
  id: string;
  name_ko: string;
  name_en: string;
  name_zh: string;
  name_ja: string;
  desc_en: string;
  desc_zh: string;
  desc_ja: string;
  price_R: number;
  price_L: number;
  badge: string | null;
  half_half: boolean;
  image_url?: string;
}

// --- Set Menu ---

export interface SetMenu {
  id: string;
  name_en: string;
  name_zh: string;
  name_ja: string;
  desc_en: string;
  desc_zh: string;
  desc_ja: string;
  /** Fixed price for single-size sets (e.g., solo set) */
  price?: number;
  /** Regular size price for sized sets */
  price_R?: number;
  /** Large size price for sized sets */
  price_L?: number;
  sizes?: null;
  badge?: string | null;
  components: string[];
  image_url?: string;
}

// --- Side ---

export interface Side {
  id: string;
  name_en: string;
  name_zh: string;
  name_ja: string;
  price: number;
  sub_category: string;
  desc_en?: string;
  image_url?: string;
}

// --- Drink ---

export interface Drink {
  id: string;
  name_en: string;
  name_zh: string;
  name_ja: string;
  price: number;
  image_url?: string;
}

// --- Sauce ---

export interface Sauce {
  id: string;
  name_en: string;
  name_zh: string;
  name_ja: string;
  price: number;
  image_url?: string;
}

// --- Full Menu Data ---

export interface MenuData {
  brand: Brand;
  payment_notice: PaymentNotice;
  sizes: Sizes;
  hotels: Hotel[];
  categories: Category[];
  half_half: HalfHalfConfig;
  pizzas: Pizza[];
  set_menus: SetMenu[];
  sides: Side[];
  drinks: Drink[];
  sauces: Sauce[];
}

// --- Cart Item ---

export type CartItemType = 'pizza' | 'half_half' | 'set_menu' | 'side' | 'drink' | 'sauce';

export interface CartItem {
  id: string;
  type: CartItemType;
  name: Record<Locale, string>;
  size?: 'R' | 'L' | 'S';
  quantity: number;
  unitPrice: number;
  image_url?: string;
  /** For half_half: left pizza selection */
  leftPizza?: Pizza;
  /** For half_half: right pizza selection */
  rightPizza?: Pizza;
  /** For set menus: the set menu ID */
  setMenuId?: string;
  /** For set menus: user-selected components */
  selectedComponents?: {
    pizza?: Pizza;
    pizza2?: Pizza; // for double set
    spaghetti?: Side;
    side?: Side;
    leftPizza?: Pizza;
    rightPizza?: Pizza;
  };
}
