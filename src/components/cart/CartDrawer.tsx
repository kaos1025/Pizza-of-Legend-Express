'use client';

import { useTranslations, useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import { ShoppingCart } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { useCartStore } from '@/lib/store';
import { formatPrice } from '@/lib/utils';
import { CartItem } from './CartItem';

interface CartDrawerProps {
  children?: React.ReactNode;
}

export const CartDrawer = ({ children }: CartDrawerProps) => {
  const t = useTranslations('cart');
  const locale = useLocale();
  const router = useRouter();
  const items = useCartStore((state) => state.items);
  const totalAmount = useCartStore((state) => state.totalAmount);

  return (
    <Sheet>
      <SheetTrigger>
        {children || (
          <button className="relative">
            <ShoppingCart className="w-6 h-6" />
          </button>
        )}
      </SheetTrigger>
      <SheetContent side="bottom" className="h-[80vh] rounded-t-3xl">
        <SheetHeader>
          <SheetTitle className="text-pizza-dark">{t('title')}</SheetTitle>
        </SheetHeader>

        <div className="flex flex-col h-full">
          {items.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
              <ShoppingCart className="w-16 h-16 mb-4" />
              <p className="text-lg font-medium">{t('empty')}</p>
              <p className="text-sm">{t('emptyDesc')}</p>
            </div>
          ) : (
            <>
              <div className="flex-1 overflow-y-auto py-4">
                {items.map((item) => (
                  <CartItem key={item.id} item={item} />
                ))}
              </div>

              <div className="border-t border-gray-200 pt-4 pb-6 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-bold text-pizza-dark">{t('total')}</span>
                  <span className="text-xl font-bold text-pizza-red">{formatPrice(totalAmount)}</span>
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
        </div>
      </SheetContent>
    </Sheet>
  );
};
