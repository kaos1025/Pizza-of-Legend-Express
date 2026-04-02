export interface SavedOrder {
  id: string;
  order_number: string;
  created_at: string;
}

const ORDER_HISTORY_KEY = 'pol_my_orders';

export function getOrderHistory(): SavedOrder[] {
  try {
    return JSON.parse(localStorage.getItem(ORDER_HISTORY_KEY) || '[]');
  } catch {
    return [];
  }
}
