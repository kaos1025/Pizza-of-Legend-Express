'use client';

import { useLocale } from 'next-intl';
import { Minus, Plus, Trash2 } from 'lucide-react';
import { useCartStore } from '@/lib/store';
import { formatPrice } from '@/lib/utils';
import type { CartItem as CartItemType } from '@/types/menu';
import type { Locale } from '@/types/menu';

interface CartItemProps {
  item: CartItemType;
}

export const CartItem = ({ item }: CartItemProps) => {
  const locale = useLocale() as Locale;
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const removeItem = useCartStore((state) => state.removeItem);

  const name = item.name[locale] || item.name.en;
  const sizeLabel = item.size === 'R' ? 'Regular' : item.size === 'L' ? 'Large' : item.size === 'S' ? 'Small' : '';

  return (
    <div className="flex items-start gap-3 py-3 border-b border-gray-100">
      <div className="w-12 h-12 rounded-lg bg-orange-100 flex items-center justify-center flex-shrink-0">
        <span className="text-2xl">
          {item.type === 'pizza' || item.type === 'half_half' ? '🍕' :
           item.type === 'set_menu' ? '🎁' :
           item.type === 'side' ? '🍗' :
           item.type === 'drink' ? '🥤' : '🫙'}
        </span>
      </div>

      <div className="flex-1 min-w-0">
        <h4 className="font-medium text-sm text-pizza-dark truncate">{name}</h4>
        {sizeLabel && <p className="text-xs text-gray-400">{sizeLabel}</p>}
        {item.type === 'set_menu' && item.selectedComponents && (
          <p className="text-xs text-gray-400 mt-0.5">
            {item.selectedComponents.pizza && `🍕 ${item.selectedComponents.pizza[`name_${locale}` as keyof typeof item.selectedComponents.pizza] || item.selectedComponents.pizza.name_en}`}
            {item.selectedComponents.spaghetti && ` + 🍝 ${item.selectedComponents.spaghetti[`name_${locale}` as keyof typeof item.selectedComponents.spaghetti] || item.selectedComponents.spaghetti.name_en}`}
            {item.selectedComponents.side && ` + 🍗 ${item.selectedComponents.side[`name_${locale}` as keyof typeof item.selectedComponents.side] || item.selectedComponents.side.name_en}`}
          </p>
        )}

        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (item.quantity <= 1) removeItem(item.id);
                else updateQuantity(item.id, item.quantity - 1);
              }}
              className="w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center hover:border-pizza-red transition-colors"
            >
              <Minus className="w-3 h-3" />
            </button>
            <span className="text-sm font-medium w-6 text-center">{item.quantity}</span>
            <button
              onClick={() => updateQuantity(item.id, item.quantity + 1)}
              className="w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center hover:border-pizza-red transition-colors"
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm text-pizza-dark">
              {formatPrice(item.unitPrice * item.quantity)}
            </span>
            <button
              onClick={() => removeItem(item.id)}
              className="text-gray-300 hover:text-red-500 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
