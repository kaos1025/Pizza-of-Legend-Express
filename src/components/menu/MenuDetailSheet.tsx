'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useTranslations, useLocale } from 'next-intl';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { formatPrice } from '@/lib/utils';
import { useCartStore } from '@/lib/store';
import type { Locale, CartItem } from '@/types/menu';

export interface DetailItem {
  id: string;
  type: 'pizza' | 'side' | 'drink' | 'sauce';
  name_en: string;
  name_zh: string;
  name_ja: string;
  desc_en?: string;
  desc_zh?: string;
  desc_ja?: string;
  description_en?: string;
  description_zh?: string;
  description_ja?: string;
  price?: number;
  price_R?: number;
  price_L?: number;
  image_url?: string;
  badge?: string | null;
}

interface MenuDetailSheetProps {
  item: DetailItem | null;
  onClose: () => void;
  onAdded?: () => void;
}

export const MenuDetailSheet = ({ item, onClose, onAdded }: MenuDetailSheetProps) => {
  const t = useTranslations('menu');
  const locale = useLocale() as Locale;
  const addItem = useCartStore((state) => state.addItem);

  const [size, setSize] = useState<'R' | 'L'>('R');
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  // Reset state when item changes
  useEffect(() => {
    setSize('R');
    setQuantity(1);
    setAdded(false);
  }, [item?.id]);

  if (!item) return null;

  const name = item[`name_${locale}` as keyof DetailItem] as string || item.name_en;
  const desc = (item[`desc_${locale}` as keyof DetailItem] as string)
    || (item[`description_${locale}` as keyof DetailItem] as string)
    || item.desc_en || item.description_en || '';

  const hasSizes = !!(item.price_R && item.price_L);
  const unitPrice = hasSizes
    ? (size === 'R' ? item.price_R! : item.price_L!)
    : (item.price || 0);
  const totalPrice = unitPrice * quantity;

  const handleAdd = () => {
    const cartItem: CartItem = {
      id: `${item.type}-${item.id}-${hasSizes ? size : 'one'}-${Date.now()}`,
      type: item.type,
      name: {
        en: item.name_en,
        zh: item.name_zh,
        ja: item.name_ja,
      },
      size: hasSizes ? size : undefined,
      quantity,
      unitPrice,
      image_url: item.image_url,
    };
    addItem(cartItem);
    setAdded(true);

    // Auto-close after brief "Added!" flash
    setTimeout(() => {
      onClose();
      onAdded?.();
    }, 600);
  };

  return (
    <Sheet open={!!item} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="bottom" className="rounded-t-3xl">
        <div className="py-4">
          {/* Image */}
          <div className="relative w-full h-48 bg-gradient-to-br from-orange-100 to-orange-50 rounded-2xl flex items-center justify-center mb-4 overflow-hidden">
            {item.image_url ? (
              <Image
                src={item.image_url}
                alt={name}
                fill
                sizes="430px"
                className="object-cover"
              />
            ) : (
              <span className="text-7xl">
                {item.type === 'pizza' ? '🍕' :
                 item.type === 'side' ? '🍗' :
                 item.type === 'drink' ? '🥤' : '🫙'}
              </span>
            )}
            {item.badge && (
              <span className={`absolute top-3 left-3 px-2.5 py-1 rounded-full text-xs font-bold ${
                item.badge === 'popular' ? 'bg-pizza-red text-white' :
                item.badge === 'chefs_pick' ? 'bg-cheese-yellow text-pizza-dark' :
                'bg-pizza-dark text-white'
              }`}>
                {item.badge === 'popular' ? t('popular') :
                 item.badge === 'chefs_pick' ? t('chefs_pick') :
                 t('signature')}
              </span>
            )}
          </div>

          {/* Name & Description */}
          <SheetHeader>
            <SheetTitle className="text-xl text-pizza-dark">{name}</SheetTitle>
          </SheetHeader>
          {desc && <p className="text-sm text-gray-500 mt-1">{desc}</p>}

          {/* Size Selection (only for pizza/set_menu with R/L) */}
          {hasSizes && (
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => setSize('R')}
                aria-pressed={size === 'R'}
                className={`flex-1 py-3 rounded-xl text-sm font-medium border transition-colors ${
                  size === 'R'
                    ? 'border-pizza-red bg-pizza-red text-white'
                    : 'border-gray-200 text-pizza-dark hover:border-pizza-red'
                }`}
              >
                Regular (12&quot;)
                <br />
                <span className="font-bold">{formatPrice(item.price_R!)}</span>
              </button>
              <button
                onClick={() => setSize('L')}
                aria-pressed={size === 'L'}
                className={`flex-1 py-3 rounded-xl text-sm font-medium border transition-colors ${
                  size === 'L'
                    ? 'border-pizza-red bg-pizza-red text-white'
                    : 'border-gray-200 text-pizza-dark hover:border-pizza-red'
                }`}
              >
                Large (14&quot;)
                <br />
                <span className="font-bold">{formatPrice(item.price_L!)}</span>
              </button>
            </div>
          )}

          {/* Single price display (for items without sizes) */}
          {!hasSizes && (
            <p className="text-pizza-red font-bold text-xl mt-3">{formatPrice(item.price || 0)}</p>
          )}

          {/* Quantity */}
          <div className="flex items-center justify-center gap-4 mt-4">
            <button
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              aria-label="Decrease quantity"
              className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center text-lg font-bold hover:border-pizza-red transition-colors"
            >
              −
            </button>
            <span className="text-xl font-bold w-8 text-center">{quantity}</span>
            <button
              onClick={() => setQuantity(quantity + 1)}
              aria-label="Increase quantity"
              className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center text-lg font-bold hover:border-pizza-red transition-colors"
            >
              +
            </button>
          </div>

          {/* Add to Cart */}
          <Button
            onClick={handleAdd}
            disabled={added}
            className={`w-full mt-4 font-semibold py-3 rounded-xl text-base transition-all ${
              added
                ? 'bg-success-green hover:bg-success-green text-white'
                : 'bg-pizza-red hover:bg-red-700 text-white'
            }`}
          >
            {added ? 'Added! ✓' : `${t('addToCart')} - ${formatPrice(totalPrice)}`}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};
