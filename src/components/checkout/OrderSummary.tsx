'use client';

import { useTranslations, useLocale } from 'next-intl';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useCartStore } from '@/lib/store';
import { formatPrice } from '@/lib/utils';
import type { Locale } from '@/types/menu';

export const OrderSummary = () => {
  const t = useTranslations('checkout');
  const locale = useLocale() as Locale;
  const items = useCartStore((state) => state.items);
  const totalAmount = useCartStore((state) => state.totalAmount);

  return (
    <Accordion defaultValue={[0]}>
      <AccordionItem className="border rounded-xl bg-white">
        <AccordionTrigger className="px-4 py-3 hover:no-underline">
          <div className="flex justify-between w-full pr-2">
            <span className="font-bold text-pizza-dark">{t('orderSummary')}</span>
            <span className="text-pizza-red font-bold">{formatPrice(totalAmount)}</span>
          </div>
        </AccordionTrigger>
        <AccordionContent className="px-4 pb-4">
          <div className="space-y-2">
            {items.map((item) => {
              const name = item.name[locale] || item.name.en;
              return (
                <div key={item.id} className="flex justify-between text-sm">
                  <div className="flex-1">
                    <span>{name}</span>
                    {item.size && (
                      <span className="text-gray-400 ml-1">
                        ({item.size === 'R' ? 'Regular' : item.size === 'L' ? 'Large' : 'Small'})
                      </span>
                    )}
                    {item.quantity > 1 && (
                      <span className="text-gray-400"> ×{item.quantity}</span>
                    )}
                  </div>
                  <span className="font-medium">{formatPrice(item.unitPrice * item.quantity)}</span>
                </div>
              );
            })}
            <div className="border-t border-gray-100 pt-2 flex justify-between font-bold">
              <span>{t('total')}</span>
              <span className="text-pizza-red">{formatPrice(totalAmount)}</span>
            </div>
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
};
