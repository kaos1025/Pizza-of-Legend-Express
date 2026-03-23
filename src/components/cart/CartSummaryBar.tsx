'use client';

import { useState, useEffect, useRef } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import { ShoppingCart } from 'lucide-react';
import { useCartStore } from '@/lib/store';
import { formatPrice } from '@/lib/utils';

export const CartSummaryBar = () => {
  const t = useTranslations('cart');
  const locale = useLocale();
  const router = useRouter();
  const items = useCartStore((state) => state.items);
  const totalAmount = useCartStore((state) => state.totalAmount);
  const totalItems = useCartStore((state) => state.totalItems);
  const [bounce, setBounce] = useState(false);
  const prevItemsRef = useRef(totalItems);

  // Bounce animation when items change
  useEffect(() => {
    if (totalItems > prevItemsRef.current) {
      setBounce(true);
      setTimeout(() => setBounce(false), 500);
    }
    prevItemsRef.current = totalItems;
  }, [totalItems]);

  if (items.length === 0) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-[0_-4px_20px_rgba(0,0,0,0.1)]">
      <div className="max-w-[430px] mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`relative transition-transform ${bounce ? 'animate-bounce' : ''}`}>
            <ShoppingCart className="w-6 h-6 text-pizza-dark" aria-hidden="true" />
            <span
              className={`absolute -top-2 -right-2 bg-pizza-red text-white text-xs min-w-5 h-5 px-1 rounded-full flex items-center justify-center font-bold transition-transform ${
                bounce ? 'scale-125' : 'scale-100'
              }`}
              role="status"
              aria-live="polite"
              aria-label={`${totalItems} items in cart`}
            >
              {totalItems}
            </span>
          </div>
          <span className="font-bold text-lg text-pizza-dark">
            {formatPrice(totalAmount)}
          </span>
        </div>
        <button
          data-testid="view-cart"
          onClick={() => router.push(`/${locale}/cart`)}
          className="bg-pizza-red text-white h-12 px-7 rounded-full font-bold text-sm hover:bg-red-700 transition-colors active:scale-95 shadow-md shadow-pizza-red/20"
          aria-label={`${t('viewCart')} - ${totalItems} items, ${formatPrice(totalAmount)}`}
        >
          {t('viewCart')}
        </button>
      </div>
    </div>
  );
};
