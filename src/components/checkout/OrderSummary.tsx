'use client';

import Image from 'next/image';
import { useTranslations, useLocale } from 'next-intl';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useCartStore } from '@/lib/store';
import { formatPrice } from '@/lib/utils';
import type { Locale } from '@/types/menu';

const typeEmoji: Record<string, string> = {
  pizza: '🍕', half_half: '🍕', set_menu: '🎁',
  side: '🍗', drink: '🥤', sauce: '🫙',
};

interface OrderSummaryProps {
  deliveryFee?: number;
}

export const OrderSummary = ({ deliveryFee = 0 }: OrderSummaryProps) => {
  const t = useTranslations('checkout');
  const locale = useLocale() as Locale;
  const items = useCartStore((state) => state.items);
  const totalAmount = useCartStore((state) => state.totalAmount);
  const grandTotal = totalAmount + deliveryFee;

  return (
    <Accordion defaultValue={[0]}>
      <AccordionItem className="border rounded-xl bg-white">
        <AccordionTrigger className="px-4 py-3 hover:no-underline">
          <div className="flex justify-between w-full pr-2">
            <span className="font-bold text-pizza-dark">{t('orderSummary')}</span>
            <span className="text-pizza-red font-bold">{formatPrice(grandTotal)}</span>
          </div>
        </AccordionTrigger>
        <AccordionContent className="px-4 pb-4">
          <div className="space-y-2">
            {items.map((item) => {
              const name = item.name[locale] || item.name.en;
              const imgUrl = item.image_url || item.leftPizza?.image_url || item.selectedComponents?.pizza?.image_url;
              return (
                <div key={item.id} className="flex items-center gap-2.5 text-sm">
                  <div className="relative w-9 h-9 rounded-lg bg-orange-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                    {imgUrl ? (
                      <Image src={imgUrl} alt="" fill sizes="36px" className="object-cover" />
                    ) : (
                      <span className="text-base">{typeEmoji[item.type] || '🍕'}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="truncate block">{name}</span>
                    {item.size && (
                      <span className="text-gray-400 text-xs">
                        {item.size === 'R' ? 'Regular' : item.size === 'L' ? 'Large' : 'Small'}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {item.quantity > 1 && (
                      <span className="text-gray-400 text-xs">×{item.quantity}</span>
                    )}
                    <span className="font-medium">{formatPrice(item.unitPrice * item.quantity)}</span>
                  </div>
                </div>
              );
            })}
            <div className="border-t border-gray-100 pt-2 space-y-1">
              <div className="flex justify-between text-sm text-gray-600">
                <span>{t('subtotal')}</span>
                <span>{formatPrice(totalAmount)}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-600">
                <span>{t('deliveryFee')}</span>
                <span>{deliveryFee > 0 ? formatPrice(deliveryFee) : t('deliveryFeeFree')}</span>
              </div>
              <div className="flex justify-between font-bold pt-1">
                <span>{t('total')}</span>
                <span className="text-pizza-red">{formatPrice(grandTotal)}</span>
              </div>
            </div>
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
};
