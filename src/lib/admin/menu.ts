import menuDataJson from '@/../02_menu_data.json';
import { createAdminClient, isSupabaseConnected } from '@/lib/supabase-admin';

export interface MenuItem {
  id: string;  // UUID
  category: string;
  name_ko: string;
  name_en: string;
  name_zh: string;
  name_ja: string;
  description_en?: string;
  description_zh?: string;
  description_ja?: string;
  description_ko?: string;
  image_url?: string;
  badge?: string | null;
  is_half_half_available?: boolean;
  is_active: boolean;
  is_sold_out: boolean;
  sort_order: number;
  // Prices from menu_prices join
  price?: number;      // single price (for sides, drinks, sauces)
  price_R?: number;    // R size price
  price_L?: number;    // L size price
}

// Initialize mock store from JSON data
function initMenuItems(): MenuItem[] {
  const items: MenuItem[] = [];
  let sortOrder = 0;

  // Pizzas
  for (const pizza of menuDataJson.pizzas) {
    items.push({
      id: pizza.id,
      category: 'pizza',
      name_ko: pizza.name_ko,
      name_en: pizza.name_en,
      name_zh: pizza.name_zh,
      name_ja: pizza.name_ja,
      description_en: pizza.desc_en,
      description_zh: pizza.desc_zh,
      description_ja: pizza.desc_ja,
      price_R: pizza.price_R,
      price_L: pizza.price_L,
      badge: pizza.badge,
      is_half_half_available: pizza.half_half,
      is_sold_out: false,
      is_active: true,
      sort_order: sortOrder++,
    });
  }

  // Set menus
  for (const set of menuDataJson.set_menus) {
    items.push({
      id: set.id,
      category: 'set_menu',
      name_ko: set.name_en, // No Korean name in data, use English as placeholder
      name_en: set.name_en,
      name_zh: set.name_zh,
      name_ja: set.name_ja,
      description_en: set.desc_en,
      description_zh: set.desc_zh,
      description_ja: set.desc_ja,
      price: (set as Record<string, unknown>).price as number | undefined,
      price_R: (set as Record<string, unknown>).price_R as number | undefined,
      price_L: (set as Record<string, unknown>).price_L as number | undefined,
      badge: ((set as Record<string, unknown>).badge as string) || null,
      is_sold_out: false,
      is_active: true,
      sort_order: sortOrder++,
    });
  }

  // Sides
  for (const side of menuDataJson.sides) {
    items.push({
      id: side.id,
      category: 'side',
      name_ko: side.name_en, // placeholder
      name_en: side.name_en,
      name_zh: side.name_zh,
      name_ja: side.name_ja,
      description_en: (side as Record<string, unknown>).desc_en as string | undefined,
      price: side.price,
      is_sold_out: false,
      is_active: true,
      sort_order: sortOrder++,
    });
  }

  // Drinks
  for (const drink of menuDataJson.drinks) {
    items.push({
      id: drink.id,
      category: 'drink',
      name_ko: drink.name_en,
      name_en: drink.name_en,
      name_zh: drink.name_zh,
      name_ja: drink.name_ja,
      price: drink.price,
      is_sold_out: false,
      is_active: true,
      sort_order: sortOrder++,
    });
  }

  // Sauces
  for (const sauce of menuDataJson.sauces) {
    items.push({
      id: sauce.id,
      category: 'sauce',
      name_ko: sauce.name_en,
      name_en: sauce.name_en,
      name_zh: sauce.name_zh,
      name_ja: sauce.name_ja,
      price: sauce.price,
      is_sold_out: false,
      is_active: true,
      sort_order: sortOrder++,
    });
  }

  return items;
}

// eslint-disable-next-line prefer-const
let menuItems: MenuItem[] = initMenuItems();

// Transform Supabase row (with joined menu_prices) to MenuItem type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function transformDbMenuItem(row: Record<string, any>): MenuItem {
  const prices: Array<{ size: string | null; price: number }> = row.menu_prices || [];
  const rPrice = prices.find((p) => p.size === 'R')?.price;
  const lPrice = prices.find((p) => p.size === 'L')?.price;
  const singlePrice = prices.find((p) => p.size === null)?.price;

  return {
    id: row.id,
    category: row.category,
    name_ko: row.name_ko || '',
    name_en: row.name_en || '',
    name_zh: row.name_zh || '',
    name_ja: row.name_ja || '',
    description_en: row.description_en || undefined,
    description_zh: row.description_zh || undefined,
    description_ja: row.description_ja || undefined,
    description_ko: row.description_ko || undefined,
    image_url: row.image_url || undefined,
    badge: row.badge || null,
    is_half_half_available: row.is_half_half_available || false,
    is_active: row.is_active ?? true,
    is_sold_out: row.is_sold_out ?? false,
    sort_order: row.sort_order ?? 0,
    price: singlePrice,
    price_R: rPrice,
    price_L: lPrice,
  };
}

export async function getMenuItems(category?: string): Promise<MenuItem[]> {
  if (isSupabaseConnected()) {
    const supabase = createAdminClient()!;
    let query = supabase
      .from('menu_items')
      .select('*, menu_prices(*)')
      .eq('is_active', true)
      .order('sort_order');

    if (category) {
      query = query.eq('category', category);
    }

    const { data, error } = await query;
    if (error) throw error;

    return (data || []).map(transformDbMenuItem);
  }

  // Mock fallback
  let items = menuItems.filter((i) => i.is_active);
  if (category) {
    items = items.filter((i) => i.category === category);
  }
  return items.sort((a, b) => a.sort_order - b.sort_order);
}

export async function getMenuItem(id: string): Promise<MenuItem | null> {
  if (isSupabaseConnected()) {
    const supabase = createAdminClient()!;
    const { data, error } = await supabase
      .from('menu_items')
      .select('*, menu_prices(*)')
      .eq('id', id)
      .single();

    if (error || !data) return null;
    return transformDbMenuItem(data);
  }

  // Mock fallback
  return menuItems.find((i) => i.id === id) || null;
}

export async function createMenuItem(
  data: Omit<MenuItem, 'sort_order' | 'is_sold_out' | 'is_active'>
): Promise<MenuItem> {
  if (isSupabaseConnected()) {
    const supabase = createAdminClient()!;

    // Get max sort_order for the category
    const { data: maxRow } = await supabase
      .from('menu_items')
      .select('sort_order')
      .eq('category', data.category)
      .order('sort_order', { ascending: false })
      .limit(1)
      .single();

    const nextSort = (maxRow?.sort_order ?? -1) + 1;

    // Separate price fields from menu_items fields
    const { price, price_R, price_L, ...menuItemFields } = data;

    const { data: created, error } = await supabase
      .from('menu_items')
      .insert({
        ...menuItemFields,
        is_sold_out: false,
        is_active: true,
        sort_order: nextSort,
      })
      .select()
      .single();

    if (error) throw error;

    // Insert prices into menu_prices
    const priceRows: Array<{ menu_item_id: string; size: string | null; price: number }> = [];
    if (price_R != null) {
      priceRows.push({ menu_item_id: created.id, size: 'R', price: price_R });
    }
    if (price_L != null) {
      priceRows.push({ menu_item_id: created.id, size: 'L', price: price_L });
    }
    if (price != null) {
      priceRows.push({ menu_item_id: created.id, size: null as unknown as string, price });
    }

    if (priceRows.length > 0) {
      const { error: priceError } = await supabase.from('menu_prices').insert(priceRows);
      if (priceError) throw priceError;
    }

    // Re-fetch with prices joined
    const { data: fullItem } = await supabase
      .from('menu_items')
      .select('*, menu_prices(*)')
      .eq('id', created.id)
      .single();

    return transformDbMenuItem(fullItem || created);
  }

  // Mock fallback
  const maxSort = Math.max(
    0,
    ...menuItems.filter((i) => i.category === data.category).map((i) => i.sort_order)
  );
  const item: MenuItem = {
    ...data,
    is_sold_out: false,
    is_active: true,
    sort_order: maxSort + 1,
  };
  menuItems.push(item);
  return item;
}

export async function updateMenuItem(
  id: string,
  data: Partial<MenuItem>
): Promise<MenuItem | null> {
  if (isSupabaseConnected()) {
    const supabase = createAdminClient()!;

    // Separate price fields from menu_items fields
    const { price, price_R, price_L, ...menuItemFields } = data;

    // Update menu_items (only if there are non-price fields)
    const menuFieldKeys = Object.keys(menuItemFields);
    if (menuFieldKeys.length > 0) {
      const { error } = await supabase
        .from('menu_items')
        .update(menuItemFields)
        .eq('id', id);

      if (error) return null;
    }

    // Update prices via upsert if any price fields provided
    if (price !== undefined || price_R !== undefined || price_L !== undefined) {
      if (price_R !== undefined) {
        await supabase
          .from('menu_prices')
          .upsert(
            { menu_item_id: id, size: 'R', price: price_R },
            { onConflict: 'menu_item_id,size' }
          );
      }
      if (price_L !== undefined) {
        await supabase
          .from('menu_prices')
          .upsert(
            { menu_item_id: id, size: 'L', price: price_L },
            { onConflict: 'menu_item_id,size' }
          );
      }
      if (price !== undefined) {
        // Single-price items have size = null
        // We need to delete existing null-size row and insert new one
        await supabase
          .from('menu_prices')
          .delete()
          .eq('menu_item_id', id)
          .is('size', null);

        if (price != null) {
          await supabase
            .from('menu_prices')
            .insert({ menu_item_id: id, size: null as unknown as string, price });
        }
      }
    }

    // Re-fetch with prices joined
    const { data: updated, error: fetchError } = await supabase
      .from('menu_items')
      .select('*, menu_prices(*)')
      .eq('id', id)
      .single();

    if (fetchError || !updated) return null;
    return transformDbMenuItem(updated);
  }

  // Mock fallback
  const index = menuItems.findIndex((i) => i.id === id);
  if (index === -1) return null;
  menuItems[index] = { ...menuItems[index], ...data };
  return menuItems[index];
}

export async function deleteMenuItem(id: string): Promise<boolean> {
  if (isSupabaseConnected()) {
    const supabase = createAdminClient()!;
    const { error } = await supabase
      .from('menu_items')
      .update({ is_active: false })
      .eq('id', id);

    if (error) throw error;
    return true;
  }

  // Mock fallback
  const index = menuItems.findIndex((i) => i.id === id);
  if (index === -1) return false;
  menuItems[index].is_active = false;
  return true;
}

export async function toggleSoldOut(id: string): Promise<MenuItem | null> {
  if (isSupabaseConnected()) {
    const supabase = createAdminClient()!;

    // Get current state
    const { data: current } = await supabase
      .from('menu_items')
      .select('is_sold_out')
      .eq('id', id)
      .single();

    if (!current) return null;

    const { error } = await supabase
      .from('menu_items')
      .update({ is_sold_out: !current.is_sold_out })
      .eq('id', id);

    if (error) return null;

    // Re-fetch with prices joined
    const { data: updated } = await supabase
      .from('menu_items')
      .select('*, menu_prices(*)')
      .eq('id', id)
      .single();

    if (!updated) return null;
    return transformDbMenuItem(updated);
  }

  // Mock fallback
  const index = menuItems.findIndex((i) => i.id === id);
  if (index === -1) return null;
  menuItems[index].is_sold_out = !menuItems[index].is_sold_out;
  return menuItems[index];
}

export async function reorderMenuItems(category: string, orderedIds: string[]): Promise<void> {
  if (isSupabaseConnected()) {
    const supabase = createAdminClient()!;

    // Update sort_order for each item
    const updates = orderedIds.map((id, index) =>
      supabase
        .from('menu_items')
        .update({ sort_order: index })
        .eq('id', id)
        .eq('category', category)
    );

    await Promise.all(updates);
    return;
  }

  // Mock fallback
  orderedIds.forEach((id, index) => {
    const item = menuItems.find((i) => i.id === id && i.category === category);
    if (item) item.sort_order = index;
  });
}
