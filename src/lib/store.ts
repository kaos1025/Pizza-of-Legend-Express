'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CartItem } from '@/types/menu';

interface CartState {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  totalAmount: number;
  totalItems: number;
}

const computeTotals = (items: CartItem[]) => ({
  totalAmount: items.reduce((total, item) => total + item.unitPrice * item.quantity, 0),
  totalItems: items.reduce((total, item) => total + item.quantity, 0),
});

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      totalAmount: 0,
      totalItems: 0,

      addItem: (item: CartItem) => {
        set((state) => {
          const existingIndex = state.items.findIndex(
            (existing) =>
              existing.id === item.id &&
              existing.type === item.type &&
              existing.size === item.size
          );

          let newItems: CartItem[];
          if (existingIndex !== -1 && item.type !== 'half_half' && item.type !== 'set_menu') {
            newItems = [...state.items];
            newItems[existingIndex] = {
              ...newItems[existingIndex],
              quantity: newItems[existingIndex].quantity + item.quantity,
            };
          } else {
            newItems = [...state.items, item];
          }

          return { items: newItems, ...computeTotals(newItems) };
        });
      },

      removeItem: (id: string) => {
        set((state) => {
          const newItems = state.items.filter((item) => item.id !== id);
          return { items: newItems, ...computeTotals(newItems) };
        });
      },

      updateQuantity: (id: string, quantity: number) => {
        set((state) => {
          const newItems = quantity <= 0
            ? state.items.filter((item) => item.id !== id)
            : state.items.map((item) =>
                item.id === id ? { ...item, quantity } : item
              );
          return { items: newItems, ...computeTotals(newItems) };
        });
      },

      clearCart: () => {
        set({ items: [], totalAmount: 0, totalItems: 0 });
      },
    }),
    {
      name: 'pol-cart-storage',
    }
  )
);
