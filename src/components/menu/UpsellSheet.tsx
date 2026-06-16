'use client';

import { useState, useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Check, ShoppingCart, ChevronRight } from 'lucide-react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { useCartStore } from '@/lib/store';
import { formatPrice } from '@/lib/utils';
import { getSides, getDrinks, getSauces, fetchSides, fetchDrinks, fetchSauces } from '@/lib/menu-data';
import type { Locale, CartItem } from '@/types/menu';

// Max cross-sell items to show. Drink-focused now that sides may be empty.
const MAX_RECOMMENDED = 4;

interface UpsellSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onBrowseSides: () => void;
}

export const UpsellSheet = ({ isOpen, onClose, onBrowseSides }: UpsellSheetProps) => {
  const t = useTranslations('upsell');
  const locale = useLocale() as Locale;
  const router = useRouter();
  const addItem = useCartStore((state) => state.addItem);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [allItems, setAllItems] = useState<any[]>([]);

  useEffect(() => {
    // Tag each item with its source type so recommendations work regardless of
    // the id scheme (static JSON uses slugs, Supabase uses UUIDs).
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tag = (arr: any[], type: 'side' | 'drink' | 'sauce') =>
      arr.map((it) => ({ ...it, _type: type }));

    // Start with sync JSON, upgrade to Supabase
    setAllItems([...tag(getSides(), 'side'), ...tag(getDrinks(), 'drink'), ...tag(getSauces(), 'sauce')]);

    Promise.all([fetchSides(), fetchDrinks(), fetchSauces()]).then(([s, d, sc]) => {
      setAllItems([...tag(s, 'side'), ...tag(d, 'drink'), ...tag(sc, 'sauce')]);
    });
  }, []);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const getType = (item: any): 'side' | 'drink' | 'sauce' => item._type || 'side';

  // Drink-focused cross-sell: drinks first, then sauces, then anything else.
  const recommended = [...allItems]
    .filter((item) => getType(item) === 'drink' || getType(item) === 'sauce')
    .sort((a, b) => (getType(a) === 'drink' ? 0 : 1) - (getType(b) === 'drink' ? 0 : 1))
    .slice(0, MAX_RECOMMENDED);

  // Whether any side-type item exists at all (sides may be removed by owner).
  const hasSides = allItems.some((item) => getType(item) === 'side');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const getName = (item: any) => item[`name_${locale}`] || item.name_en;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const getEmoji = (item: any) => {
    const type = getType(item);
    if (type === 'drink') return '🥤';
    if (type === 'sauce') return '🧄';
    return '🍗';
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleAddItem = (item: any) => {
    const type = getType(item);
    const cartItem: CartItem = {
      id: `${type}-${item.id}-${Date.now()}`,
      type,
      name: {
        en: item.name_en,
        zh: item.name_zh,
        ja: item.name_ja,
      },
      quantity: 1,
      unitPrice: item.price,
      image_url: item.image_url,
    };
    addItem(cartItem);
    setAddedIds((prev) => new Set(prev).add(item.id));
  };

  // Reset added state when sheet closes
  useEffect(() => {
    if (!isOpen) setAddedIds(new Set());
  }, [isOpen]);

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="bottom" className="rounded-t-3xl" style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 16px), 16px)' }}>
        <div className="px-5 pt-5 pb-6">
          {/* Added confirmation */}
          <div className="flex items-center justify-center gap-2 mb-5">
            <div className="w-8 h-8 rounded-full bg-success-green flex items-center justify-center">
              <Check className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold text-success-green">{t('added')}</span>
          </div>

          {/* Title — only when there's something to cross-sell */}
          {recommended.length > 0 && (
            <h3 className="text-base font-semibold text-gray-800 mb-4">{t('title')}</h3>
          )}

          {/* Recommended items horizontal scroll */}
          {recommended.length > 0 && (
          <div className="flex gap-3 overflow-x-auto pb-5 -mx-1 px-1 scrollbar-hide">
            {recommended.map((item) => {
              const isAdded = addedIds.has(item!.id);
              return (
                <div
                  key={item!.id}
                  className="flex-shrink-0 w-36 bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden"
                >
                  <div className="relative h-24 bg-gradient-to-br from-orange-50 to-orange-100 flex items-center justify-center overflow-hidden">
                    {item!.image_url ? (
                      <Image
                        src={item!.image_url}
                        alt={getName(item)}
                        fill
                        sizes="144px"
                        className="object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <span className="text-4xl">{getEmoji(item)}</span>
                    )}
                  </div>
                  <div className="p-2.5">
                    <p className="text-xs font-medium text-pizza-dark truncate">{getName(item)}</p>
                    <p className="text-sm font-bold text-pizza-red mt-0.5">{formatPrice(item!.price)}</p>
                    <button
                      onClick={() => handleAddItem(item)}
                      disabled={isAdded}
                      className={`w-full mt-2 text-xs font-semibold py-1.5 rounded-lg transition-all active:scale-95 ${
                        isAdded
                          ? 'bg-success-green text-white'
                          : 'bg-pizza-red text-white hover:bg-red-700'
                      }`}
                    >
                      {isAdded ? '✓ Added' : `+ ${t('addItem')}`}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          )}

          {/* Action buttons — vertical, Go to Cart first */}
          <div className="flex flex-col gap-3">
            <button
              onClick={() => {
                onClose();
                router.push(`/${locale}/cart`);
              }}
              className="w-full flex items-center justify-center gap-1.5 bg-pizza-dark text-white text-base font-semibold py-3.5 rounded-xl hover:bg-gray-800 transition-colors"
            >
              <ShoppingCart className="w-4 h-4" />
              {t('goToCart')}
            </button>
            {hasSides && (
              <button
                onClick={() => {
                  onClose();
                  onBrowseSides();
                }}
                className="w-full flex items-center justify-center gap-1 border border-gray-300 text-gray-700 text-base font-medium py-3 rounded-xl hover:bg-gray-50 transition-colors"
              >
                {t('browseSides')}
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
