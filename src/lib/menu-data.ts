/**
 * Menu data access layer.
 * Provides both sync (JSON fallback) and async (Supabase) functions.
 * Async functions attempt Supabase first, falling back to static JSON.
 */

import type {
  MenuData,
  Pizza,
  Side,
  Drink,
  Sauce,
  SetMenu,
  Hotel,
  HalfHalfConfig,
  Category,
  Locale,
} from '@/types/menu';

import { supabase, isSupabaseConfigured } from './supabase';

import menuDataJson from '../../02_menu_data.json';

const menuData = menuDataJson as MenuData;

// =============================================
// Sync functions (static JSON, backward compat)
// =============================================

/** Get the full menu data object */
export const getMenuData = (): MenuData => {
  return menuData;
};

/** Get all pizzas */
export const getPizzas = (): Pizza[] => {
  return menuData.pizzas;
};

/** Get all sides */
export const getSides = (): Side[] => {
  return menuData.sides;
};

/** Get all drinks */
export const getDrinks = (): Drink[] => {
  return menuData.drinks;
};

/** Get all sauces */
export const getSauces = (): Sauce[] => {
  return menuData.sauces;
};

/** Get all set menus */
export const getSetMenus = (): SetMenu[] => {
  return menuData.set_menus;
};

/** Get all hotels */
export const getHotels = (): Hotel[] => {
  return menuData.hotels;
};

/** Get half & half configuration */
export const getHalfHalfConfig = (): HalfHalfConfig => {
  return menuData.half_half;
};

/** Get menu categories */
export const getCategories = (): Category[] => {
  return menuData.categories;
};

// =============================================
// Async functions (Supabase with JSON fallback)
// =============================================

/** Fetch pizzas from Supabase, falling back to static JSON */
export async function fetchPizzas(): Promise<Pizza[]> {
  if (!isSupabaseConfigured()) return getPizzas();

  const { data, error } = await supabase
    .from('menu_items')
    .select('*, menu_prices(*)')
    .eq('category', 'pizza')
    .eq('is_active', true)
    .eq('is_sold_out', false)
    .order('sort_order');

  if (error || !data) return getPizzas();

  return data.map((row) => {
    const prices: Array<{ size: string | null; price: number }> = row.menu_prices || [];
    return {
      id: row.id,
      name_ko: row.name_ko || '',
      name_en: row.name_en || '',
      name_zh: row.name_zh || '',
      name_ja: row.name_ja || '',
      desc_en: row.description_en || '',
      desc_zh: row.description_zh || '',
      desc_ja: row.description_ja || '',
      price_R: prices.find((p) => p.size === 'R')?.price || 0,
      price_L: prices.find((p) => p.size === 'L')?.price || 0,
      badge: row.badge || null,
      half_half: row.is_half_half_available || false,
      image_url: row.image_url || undefined,
    };
  });
}

/** Fetch sides from Supabase, falling back to static JSON */
export async function fetchSides(): Promise<Side[]> {
  if (!isSupabaseConfigured()) return getSides();

  const { data, error } = await supabase
    .from('menu_items')
    .select('*, menu_prices(*)')
    .eq('category', 'side')
    .eq('is_active', true)
    .eq('is_sold_out', false)
    .order('sort_order');

  if (error || !data) return getSides();

  return data.map((row) => {
    const prices: Array<{ size: string | null; price: number }> = row.menu_prices || [];
    return {
      id: row.id,
      name_en: row.name_en || '',
      name_zh: row.name_zh || '',
      name_ja: row.name_ja || '',
      price: prices.find((p) => p.size === null)?.price || 0,
      sub_category: '', // Not stored in DB; components can ignore
      desc_en: row.description_en || undefined,
      image_url: row.image_url || undefined,
    };
  });
}

/** Fetch drinks from Supabase, falling back to static JSON */
export async function fetchDrinks(): Promise<Drink[]> {
  if (!isSupabaseConfigured()) return getDrinks();

  const { data, error } = await supabase
    .from('menu_items')
    .select('*, menu_prices(*)')
    .eq('category', 'drink')
    .eq('is_active', true)
    .eq('is_sold_out', false)
    .order('sort_order');

  if (error || !data) return getDrinks();

  return data.map((row) => {
    const prices: Array<{ size: string | null; price: number }> = row.menu_prices || [];
    return {
      id: row.id,
      name_en: row.name_en || '',
      name_zh: row.name_zh || '',
      name_ja: row.name_ja || '',
      price: prices.find((p) => p.size === null)?.price || 0,
      image_url: row.image_url || undefined,
    };
  });
}

/** Fetch sauces from Supabase, falling back to static JSON */
export async function fetchSauces(): Promise<Sauce[]> {
  if (!isSupabaseConfigured()) return getSauces();

  const { data, error } = await supabase
    .from('menu_items')
    .select('*, menu_prices(*)')
    .eq('category', 'sauce')
    .eq('is_active', true)
    .eq('is_sold_out', false)
    .order('sort_order');

  if (error || !data) return getSauces();

  return data.map((row) => {
    const prices: Array<{ size: string | null; price: number }> = row.menu_prices || [];
    return {
      id: row.id,
      name_en: row.name_en || '',
      name_zh: row.name_zh || '',
      name_ja: row.name_ja || '',
      price: prices.find((p) => p.size === null)?.price || 0,
      image_url: row.image_url || undefined,
    };
  });
}

/** Fetch set menus from Supabase, falling back to static JSON */
export async function fetchSetMenus(): Promise<SetMenu[]> {
  if (!isSupabaseConfigured()) return getSetMenus();

  const { data, error } = await supabase
    .from('menu_items')
    .select('*, menu_prices(*)')
    .eq('category', 'set_menu')
    .eq('is_active', true)
    .eq('is_sold_out', false)
    .order('sort_order');

  if (error || !data) return getSetMenus();

  return data.map((row) => {
    const prices: Array<{ size: string | null; price: number }> = row.menu_prices || [];
    const singlePrice = prices.find((p) => p.size === null)?.price;
    const rPrice = prices.find((p) => p.size === 'R')?.price;
    const lPrice = prices.find((p) => p.size === 'L')?.price;

    return {
      id: row.id,
      name_en: row.name_en || '',
      name_zh: row.name_zh || '',
      name_ja: row.name_ja || '',
      desc_en: row.description_en || '',
      desc_zh: row.description_zh || '',
      desc_ja: row.description_ja || '',
      price: singlePrice,
      price_R: rPrice,
      price_L: lPrice,
      badge: row.badge || null,
      components: [], // Components loaded separately from set_menu_components
      image_url: row.image_url || undefined,
    };
  });
}

/** Fetch hotels from Supabase, falling back to static JSON */
export async function fetchHotels(): Promise<Hotel[]> {
  if (!isSupabaseConfigured()) return getHotels();

  const { data, error } = await supabase
    .from('hotels')
    .select('*')
    .eq('is_active', true)
    .order('sort_order');

  if (error || !data) return getHotels();

  return data.map((row) => ({
    id: row.id,
    name_en: row.name_en || '',
    name_zh: row.name_zh || '',
    name_ja: row.name_ja || '',
    delivery_note: row.delivery_note || '',
  }));
}

/** Fetch half & half configuration from Supabase, falling back to static JSON */
export async function fetchHalfHalfConfig(): Promise<HalfHalfConfig> {
  if (!isSupabaseConfigured()) return getHalfHalfConfig();

  const { data, error } = await supabase
    .from('menu_items')
    .select('*, menu_prices(*)')
    .eq('category', 'half_half')
    .single();

  if (error || !data) return getHalfHalfConfig();

  const prices: Array<{ size: string | null; price: number }> = data.menu_prices || [];
  return {
    name_en: data.name_en || '',
    name_zh: data.name_zh || '',
    name_ja: data.name_ja || '',
    description_en: data.description_en || '',
    description_zh: data.description_zh || '',
    description_ja: data.description_ja || '',
    price_R: prices.find((p) => p.size === 'R')?.price || 22900,
    price_L: prices.find((p) => p.size === 'L')?.price || 26900,
    available_pizzas: 'all',
    badge: data.badge || 'popular',
  };
}

// =============================================
// Localization Helpers
// =============================================

/**
 * Get a localized name from an item that has name_en, name_zh, name_ja fields.
 * Falls back to English if the requested locale is not available.
 */
export const getLocalizedName = (
  item: { name_en: string; name_zh: string; name_ja: string },
  locale: Locale
): string => {
  const key = `name_${locale}` as const;
  return item[key] || item.name_en;
};

/**
 * Get a localized description from an item that has optional desc_en, desc_zh, desc_ja fields.
 * Falls back to English if the requested locale is not available.
 * Returns empty string if no description exists.
 */
export const getLocalizedDesc = (
  item: { desc_en?: string; desc_zh?: string; desc_ja?: string },
  locale: Locale
): string => {
  const key = `desc_${locale}` as const;
  return item[key] || item.desc_en || '';
};

/**
 * Format a price in Korean Won with comma separators.
 * Example: 22900 => "₩22,900"
 */
export const formatPrice = (amount: number): string => {
  return new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency: 'KRW',
  }).format(amount);
};
