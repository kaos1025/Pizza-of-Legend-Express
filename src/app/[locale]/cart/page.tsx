'use client';

import { useTranslations, useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ShoppingCart } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { CartItem } from '@/components/cart/CartItem';
import { Button } from '@/components/ui/button';
import { useCartStore } from '@/lib/store';
import { formatPrice } from '@/lib/utils';

export default function CartPage() {
  const t = useTranslations('cart');
  const locale = useLocale();
  const router = useRouter();
  const items = useCartStore((state) => state.items);
  const totalAmount = useCartStore((state) => state.totalAmount);

  return (
    <div className="min-h-screen bg-warm-white">
      <Header />
      <main className="max-w-[430px] mx-auto px-4 py-4">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => router.back()} className="text-pizza-dark hover:text-pizza-red">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-xl font-bold text-pizza-dark">{t('title')}</h1>
        </div>

        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <ShoppingCart className="w-20 h-20 mb-4" />
            <p className="text-lg font-medium">{t('empty')}</p>
            <p className="text-sm mb-6">{t('emptyDesc')}</p>
            <Button
              onClick={() => router.push(`/${locale}`)}
              variant="outline"
              className="rounded-xl"
            >
              {t('continueShopping')}
            </Button>
          </div>
        ) : (
          <>
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              {items.map((item) => (
                <CartItem key={item.id} item={item} />
              ))}
            </div>

            <div className="mt-6 bg-white rounded-2xl p-4 shadow-sm">
              <div className="flex justify-between items-center mb-4">
                <span className="text-lg font-bold text-pizza-dark">{t('total')}</span>
                <span className="text-2xl font-bold text-pizza-red">{formatPrice(totalAmount)}</span>
              </div>
              <Button
                onClick={() => router.push(`/${locale}/checkout`)}
                className="w-full bg-pizza-red hover:bg-red-700 text-white font-semibold py-3 rounded-xl text-base"
              >
                {t('checkout')}
              </Button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
