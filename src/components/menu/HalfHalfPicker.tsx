'use client';

import { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatPrice } from '@/lib/utils';
import { useCartStore } from '@/lib/store';
import { getPizzas, getHalfHalfConfig } from '@/lib/menu-data';
import type { Locale, Pizza, CartItem } from '@/types/menu';

export const HalfHalfPicker = () => {
  const t = useTranslations('halfHalf');
  const locale = useLocale() as Locale;
  const addItem = useCartStore((state) => state.addItem);
  const pizzas = getPizzas();
  const config = getHalfHalfConfig();

  const [leftPizzaId, setLeftPizzaId] = useState<string>('');
  const [rightPizzaId, setRightPizzaId] = useState<string>('');
  const [size, setSize] = useState<'R' | 'L'>('R');

  const leftPizza = pizzas.find((p) => p.id === leftPizzaId);
  const rightPizza = pizzas.find((p) => p.id === rightPizzaId);
  const price = size === 'R' ? config.price_R : config.price_L;

  const getLocaleName = (pizza: Pizza) => {
    const key = `name_${locale}` as keyof Pizza;
    return (pizza[key] as string) || pizza.name_en;
  };

  const handleAddToCart = () => {
    if (!leftPizza || !rightPizza) return;

    const item: CartItem = {
      id: `hh-${leftPizza.id}-${rightPizza.id}-${size}-${Date.now()}`,
      type: 'half_half',
      name: {
        en: `Half & Half: ${leftPizza.name_en} + ${rightPizza.name_en}`,
        zh: `半半披萨: ${leftPizza.name_zh} + ${rightPizza.name_zh}`,
        ja: `ハーフ＆ハーフ: ${leftPizza.name_ja} + ${rightPizza.name_ja}`,
      },
      size,
      quantity: 1,
      unitPrice: price,
      leftPizza,
      rightPizza,
    };
    addItem(item);
    setLeftPizzaId('');
    setRightPizzaId('');
  };

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
      <h2 className="text-xl font-bold text-pizza-dark mb-1">{t('title')}</h2>
      <p className="text-sm text-gray-500 mb-4">{t('description')}</p>

      {/* Visual half circle */}
      <div className="flex justify-center mb-4">
        <div className="w-48 h-48 rounded-full border-4 border-pizza-red flex overflow-hidden">
          <div className="w-1/2 bg-orange-100 flex items-center justify-center border-r-2 border-pizza-red">
            <span className="text-3xl">{leftPizza ? '🍕' : '?'}</span>
          </div>
          <div className="w-1/2 bg-orange-50 flex items-center justify-center">
            <span className="text-3xl">{rightPizza ? '🍕' : '?'}</span>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <label className="text-sm font-medium text-pizza-dark">{t('leftHalf')}</label>
          <Select value={leftPizzaId} onValueChange={(v) => { if (v) setLeftPizzaId(v); }}>
            <SelectTrigger className="mt-1">
              <SelectValue placeholder={t('selectPizza')} />
            </SelectTrigger>
            <SelectContent>
              {pizzas.filter((p) => p.half_half).map((pizza) => (
                <SelectItem key={pizza.id} value={pizza.id}>
                  {getLocaleName(pizza)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-sm font-medium text-pizza-dark">{t('rightHalf')}</label>
          <Select value={rightPizzaId} onValueChange={(v) => { if (v) setRightPizzaId(v); }}>
            <SelectTrigger className="mt-1">
              <SelectValue placeholder={t('selectPizza')} />
            </SelectTrigger>
            <SelectContent>
              {pizzas.filter((p) => p.half_half).map((pizza) => (
                <SelectItem key={pizza.id} value={pizza.id}>
                  {getLocaleName(pizza)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Size selection */}
        <div className="flex gap-2">
          <button
            onClick={() => setSize('R')}
            className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
              size === 'R'
                ? 'border-pizza-red bg-pizza-red text-white'
                : 'border-gray-200 text-pizza-dark hover:border-pizza-red'
            }`}
          >
            Regular (12&quot;) - {formatPrice(config.price_R)}
          </button>
          <button
            onClick={() => setSize('L')}
            className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
              size === 'L'
                ? 'border-pizza-red bg-pizza-red text-white'
                : 'border-gray-200 text-pizza-dark hover:border-pizza-red'
            }`}
          >
            Large (14&quot;) - {formatPrice(config.price_L)}
          </button>
        </div>

        <p className="text-xs text-gray-400 text-center">{t('fixedPrice')}</p>

        <Button
          onClick={handleAddToCart}
          disabled={!leftPizza || !rightPizza}
          className="w-full bg-pizza-red hover:bg-red-700 text-white font-semibold py-3 rounded-xl"
        >
          {t('title')} - {formatPrice(price)}
        </Button>
      </div>
    </div>
  );
};
