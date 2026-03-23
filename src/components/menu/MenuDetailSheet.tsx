'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useTranslations, useLocale } from 'next-intl';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
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
      name: { en: item.name_en, zh: item.name_zh, ja: item.name_ja },
      size: hasSizes ? size : undefined,
      quantity,
      unitPrice,
      image_url: item.image_url,
    };
    addItem(cartItem);
    setAdded(true);
    setTimeout(() => {
      onClose();
      onAdded?.();
    }, 600);
  };

  return (
    <Sheet open={!!item} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="bottom" className="rounded-t-3xl max-h-[85vh] flex flex-col p-0">
        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-5 pt-5 pb-4">
          {/* Image — full width */}
          <div className="relative w-full h-52 bg-gradient-to-br from-orange-100 to-orange-50 rounded-2xl flex items-center justify-center mb-4 overflow-hidden -mx-1">
            {item.image_url ? (
              <Image src={item.image_url} alt={name} fill sizes="430px" className="object-cover" />
            ) : (
              <span className="text-7xl">
                {item.type === 'pizza' ? '🍕' : item.type === 'side' ? '🍗' : item.type === 'drink' ? '🥤' : '🫙'}
              </span>
            )}
            {item.badge && (
              <span className={`absolute top-3 left-3 px-2.5 py-1 rounded-full text-xs font-bold ${
                item.badge === 'popular' ? 'bg-pizza-red text-white' :
                item.badge === 'chefs_pick' ? 'bg-cheese-yellow text-pizza-dark' :
                'bg-pizza-dark text-white'
              }`}>
                {item.badge === 'popular' ? t('popular') :
                 item.badge === 'chefs_pick' ? t('chefs_pick') : t('signature')}
              </span>
            )}
          </div>

          {/* Name */}
          <SheetHeader>
            <SheetTitle className="text-xl font-bold text-pizza-dark">{name}</SheetTitle>
          </SheetHeader>
          {desc && <p className="text-sm text-gray-500 mt-1 leading-relaxed">{desc}</p>}

          {/* Size Selection */}
          {hasSizes && (
            <div className="flex gap-2 mt-5">
              <button
                data-testid="size-R"
                onClick={() => setSize('R')}
                aria-pressed={size === 'R'}
                className={`flex-1 py-3.5 rounded-xl text-sm font-medium border-2 transition-all ${
                  size === 'R'
                    ? 'border-pizza-red bg-pizza-red text-white shadow-md'
                    : 'border-gray-200 text-pizza-dark hover:border-pizza-red'
                }`}
              >
                Regular (12&quot;)
                <br />
                <span className="font-bold text-base">{formatPrice(item.price_R!)}</span>
              </button>
              <button
                data-testid="size-L"
                onClick={() => setSize('L')}
                aria-pressed={size === 'L'}
                className={`flex-1 py-3.5 rounded-xl text-sm font-medium border-2 transition-all ${
                  size === 'L'
                    ? 'border-pizza-red bg-pizza-red text-white shadow-md'
                    : 'border-gray-200 text-pizza-dark hover:border-pizza-red'
                }`}
              >
                Large (14&quot;)
                <br />
                <span className="font-bold text-base">{formatPrice(item.price_L!)}</span>
              </button>
            </div>
          )}

          {/* Single price */}
          {!hasSizes && (
            <p className="text-pizza-red font-bold text-2xl mt-4">{formatPrice(item.price || 0)}</p>
          )}

          {/* Quantity — larger touch targets */}
          <div className="flex items-center justify-center gap-5 mt-5">
            <button
              data-testid="qty-minus"
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              aria-label="Decrease quantity"
              className="w-12 h-12 rounded-full border-2 border-gray-200 flex items-center justify-center text-xl font-bold hover:border-pizza-red active:bg-pizza-red active:text-white transition-all"
            >
              −
            </button>
            <span className="text-2xl font-bold w-10 text-center">{quantity}</span>
            <button
              data-testid="qty-plus"
              onClick={() => setQuantity(quantity + 1)}
              aria-label="Increase quantity"
              className="w-12 h-12 rounded-full border-2 border-gray-200 flex items-center justify-center text-xl font-bold hover:border-pizza-red active:bg-pizza-red active:text-white transition-all"
            >
              +
            </button>
          </div>
        </div>

        {/* Fixed bottom Add to Cart — always visible */}
        <div className="px-4 pb-5 pt-3 border-t border-gray-100 bg-white">
          <button
            data-testid="add-to-cart"
            onClick={handleAdd}
            disabled={added}
            className={`w-full h-14 rounded-2xl text-lg font-bold transition-all active:scale-[0.98] ${
              added
                ? 'bg-success-green text-white'
                : 'bg-pizza-red hover:bg-red-700 text-white shadow-lg shadow-pizza-red/30'
            }`}
          >
            {added ? 'Added! ✓' : `${t('addToCart')} - ${formatPrice(totalPrice)}`}
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
};
