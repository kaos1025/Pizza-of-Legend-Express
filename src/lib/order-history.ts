export interface SavedOrder {
  id: string;
  order_number: string;
  created_at: string;
}

const ORDER_HISTORY_KEY = 'pol_my_orders';

const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;

export function getOrderHistory(): SavedOrder[] {
  try {
    const all: SavedOrder[] = JSON.parse(localStorage.getItem(ORDER_HISTORY_KEY) || '[]');
    const cutoff = Date.now() - TWENTY_FOUR_HOURS;
    return all.filter((o) => new Date(o.created_at).getTime() > cutoff);
  } catch {
    return [];
  }
}
