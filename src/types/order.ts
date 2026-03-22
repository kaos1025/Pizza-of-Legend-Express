import type { CartItem } from './menu';

export type OrderStatus = 'pending' | 'confirmed' | 'delivering' | 'completed' | 'cancelled';

export interface Order {
  id: string;
  /** Format: POL-YYYYMMDD-NNN */
  order_number: string;
  items: CartItem[];
  total_amount: number;
  hotel_id: string;
  room_number: string;
  messenger_id?: string;
  /** Singular — matches DB column `special_request` */
  special_request?: string;
  /** @deprecated Use special_request instead. Kept for mock fallback compatibility. */
  special_requests?: string;
  status: OrderStatus;
  payment_method?: 'cash' | 'card';
  language?: string;
  created_at: string;
  updated_at: string;
  confirmed_at?: string;
  delivering_at?: string;
  completed_at?: string;
  cancelled_at?: string;
}
