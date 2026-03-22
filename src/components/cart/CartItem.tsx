'use client';

import Image from 'next/image';
import { useLocale } from 'next-intl';
import { Minus, Plus, Trash2 } from 'lucide-react';
import { useCartStore } from '@/lib/store';
import { formatPrice } from '@/lib/utils';
import type { CartItem as CartItemType, Locale } from '@/types/menu';

interface CartItemProps {
  item: CartItemType;
}

const typeEmoji: Record<string, string> = {
  pizza: '🍕',
  half_half: '🍕',
  set_menu: '🎁',
  side: '🍗',
  drink: '🥤',
  sauce: '🫙',
};

export const CartItem = ({ item }: CartItemProps) => {
  const locale = useLocale() as Locale;
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const removeItem = useCartStore((state) => state.removeItem);

  const name = item.name[locale] || item.name.en;
  const sizeLabel = item.size === 'R' ? 'Regular' : item.size === 'L' ? 'Large' : item.size === 'S' ? 'Small' : '';

  // For half_half, show left pizza image; for set_menu, show selected pizza image
  const imageUrl = item.image_url
    || item.leftPizza?.image_url
    || item.selectedComponents?.pizza?.image_url
    || undefined;

  const isHalfHalf = item.type === 'half_half';

  return (
    <div className="flex items-start gap-3 py-3 border-b border-gray-100">
      {/* Thumbnail */}
      <div className="relative w-14 h-14 rounded-xl bg-orange-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
        {imageUrl ? (
          <>
            <Image
              src={imageUrl}
              alt=""
              fill
              sizes="56px"
              className="object-cover"
            />
            {isHalfHalf && (
              <div className="absolute bottom-0 right-0 bg-pizza-red text-white text-[9px] font-bold px-1 py-0.5 rounded-tl-md">
                ½+½
              </div>
            )}
          </>
        ) : (
          <span className="text-2xl">{typeEmoji[item.type] || '🍕'}</span>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <h4 className="font-medium text-sm text-pizza-dark truncate">{name}</h4>
        {sizeLabel && <p className="text-xs text-gray-400">{sizeLabel}</p>}

        {/* Half-half sub-text */}
        {isHalfHalf && item.leftPizza && item.rightPizza && (
          <p className="text-xs text-gray-400 mt-0.5">
            {(item.leftPizza[`name_${locale}` as keyof typeof item.leftPizza] as string) || item.leftPizza.name_en}
            {' + '}
            {(item.rightPizza[`name_${locale}` as keyof typeof item.rightPizza] as string) || item.rightPizza.name_en}
          </p>
        )}

        {/* Set menu sub-text */}
        {item.type === 'set_menu' && item.selectedComponents && (
          <p className="text-xs text-gray-400 mt-0.5">
            {item.selectedComponents.pizza && (
              <span>🍕 {(item.selectedComponents.pizza[`name_${locale}` as keyof typeof item.selectedComponents.pizza] as string) || item.selectedComponents.pizza.name_en}</span>
            )}
            {item.selectedComponents.leftPizza && item.selectedComponents.rightPizza && (
              <span>🍕 {(item.selectedComponents.leftPizza[`name_${locale}` as keyof typeof item.selectedComponents.leftPizza] as string) || item.selectedComponents.leftPizza.name_en} + {(item.selectedComponents.rightPizza[`name_${locale}` as keyof typeof item.selectedComponents.rightPizza] as string) || item.selectedComponents.rightPizza.name_en}</span>
            )}
            {item.selectedComponents.spaghetti && (
              <span> + 🍝 {(item.selectedComponents.spaghetti[`name_${locale}` as keyof typeof item.selectedComponents.spaghetti] as string) || item.selectedComponents.spaghetti.name_en}</span>
            )}
            {item.selectedComponents.side && (
              <span> + 🍗 {(item.selectedComponents.side[`name_${locale}` as keyof typeof item.selectedComponents.side] as string) || item.selectedComponents.side.name_en}</span>
            )}
          </p>
        )}

        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (item.quantity <= 1) removeItem(item.id);
                else updateQuantity(item.id, item.quantity - 1);
              }}
              aria-label="Decrease quantity"
              className="w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center hover:border-pizza-red transition-colors"
            >
              <Minus className="w-3 h-3" />
            </button>
            <span className="text-sm font-medium w-6 text-center">{item.quantity}</span>
            <button
              onClick={() => updateQuantity(item.id, item.quantity + 1)}
              aria-label="Increase quantity"
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
              aria-label="Remove item"
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
