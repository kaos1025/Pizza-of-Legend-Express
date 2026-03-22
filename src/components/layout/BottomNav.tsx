'use client';

import { useTranslations } from 'next-intl';
import { useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import { ShoppingCart } from 'lucide-react';
import { useCartStore } from '@/lib/store';
import { formatPrice } from '@/lib/utils';

export const BottomNav = () => {
  const t = useTranslations('cart');
  const locale = useLocale();
  const router = useRouter();
  const items = useCartStore((state) => state.items);
  const totalAmount = useCartStore((state) => state.totalAmount);
  const totalItems = useCartStore((state) => state.totalItems);

  if (items.length === 0) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-[0_-2px_10px_rgba(0,0,0,0.1)]">
      <div className="max-w-[430px] mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <ShoppingCart className="w-6 h-6 text-pizza-dark" />
            <span className="absolute -top-2 -right-2 bg-pizza-red text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">
              {totalItems}
            </span>
          </div>
          <span className="font-bold text-lg text-pizza-dark">
            {formatPrice(totalAmount)}
          </span>
        </div>
        <button
          onClick={() => router.push(`/${locale}/cart`)}
          className="bg-pizza-red text-white px-6 py-2.5 rounded-full font-semibold text-sm hover:bg-red-700 transition-colors active:scale-95"
        >
          {t('viewCart')}
        </button>
      </div>
    </div>
  );
};
