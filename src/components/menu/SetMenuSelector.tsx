'use client';

import { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Button } from '@/components/ui/button';
import { formatPrice } from '@/lib/utils';
import { useCartStore } from '@/lib/store';
import { getPizzas, getSides } from '@/lib/menu-data';
import type { Locale, SetMenu, Pizza, Side, CartItem } from '@/types/menu';

interface SetMenuSelectorProps {
  setMenu: SetMenu;
  onClose: () => void;
}

export const SetMenuSelector = ({ setMenu, onClose }: SetMenuSelectorProps) => {
  const t = useTranslations('setMenu');
  const locale = useLocale() as Locale;
  const addItem = useCartStore((state) => state.addItem);
  const pizzas = getPizzas();
  const sides = getSides();

  const [step, setStep] = useState(0);
  const [selectedPizza, setSelectedPizza] = useState<Pizza | null>(null);
  const [selectedPizza2, setSelectedPizza2] = useState<Pizza | null>(null);
  const [selectedSpaghetti, setSelectedSpaghetti] = useState<Side | null>(null);
  const [selectedSide, setSelectedSide] = useState<Side | null>(null);
  const [size, setSize] = useState<'R' | 'L'>('R');

  const spaghettis = sides.filter((s) => s.sub_category === 'spaghetti');
  const nonSpaghettiSides = sides.filter((s) => s.sub_category !== 'spaghetti');

  const components = setMenu.components;
  const needsPizza = components.includes('pizza_choose') || components.includes('pizza_S');
  const needsSpaghetti = components.includes('spaghetti_choose');
  const needsSide = components.includes('side_choose');
  const needsPizza2 = components.filter((c) => c === 'pizza_choose').length > 1;
  const hasSizes = 'price_R' in setMenu;

  const getName = (item: { name_en: string; name_zh: string; name_ja: string }) => {
    const key = `name_${locale}` as keyof typeof item;
    return (item[key] as string) || item.name_en;
  };

  const getDesc = () => {
    const key = `desc_${locale}` as keyof SetMenu;
    return (setMenu[key] as string) || setMenu.desc_en;
  };

  const price = setMenu.price || (size === 'R' ? setMenu.price_R : setMenu.price_L) || 0;

  const steps: { label: string; type: string }[] = [];
  if (hasSizes) steps.push({ label: 'Size', type: 'size' });
  if (needsPizza) steps.push({ label: t('step1'), type: 'pizza' });
  if (needsPizza2) steps.push({ label: 'Choose 2nd Pizza', type: 'pizza2' });
  if (needsSpaghetti) steps.push({ label: t('step2spaghetti'), type: 'spaghetti' });
  if (needsSide) steps.push({ label: t('step2side'), type: 'side' });

  const currentStep = steps[step];
  const isLastStep = step >= steps.length;

  const handleAddToCart = () => {
    const item: CartItem = {
      id: `set-${setMenu.id}-${Date.now()}`,
      type: 'set_menu',
      name: {
        en: setMenu.name_en,
        zh: setMenu.name_zh,
        ja: setMenu.name_ja,
      },
      size: hasSizes ? size : undefined,
      quantity: 1,
      unitPrice: price,
      setMenuId: setMenu.id,
      selectedComponents: {
        pizza: selectedPizza || undefined,
        pizza2: selectedPizza2 || undefined,
        spaghetti: selectedSpaghetti || undefined,
        side: selectedSide || undefined,
      },
    };
    addItem(item);
    onClose();
  };

  return (
    <div className="bg-white rounded-2xl p-4">
      <h3 className="text-lg font-bold text-pizza-dark">{getName(setMenu)}</h3>
      <p className="text-sm text-gray-500 mb-3">{getDesc()}</p>
      <p className="text-pizza-red font-bold text-lg mb-4">{formatPrice(price)}</p>

      {/* Step indicator */}
      <div className="flex gap-1 mb-4">
        {steps.map((s, i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full ${
              i <= step ? 'bg-pizza-red' : 'bg-gray-200'
            }`}
          />
        ))}
      </div>

      {!isLastStep && currentStep?.type === 'size' && (
        <div className="space-y-2">
          <button
            onClick={() => { setSize('R'); setStep(step + 1); }}
            className={`w-full p-3 rounded-xl border text-left ${
              size === 'R' ? 'border-pizza-red bg-red-50' : 'border-gray-200'
            }`}
          >
            <span className="font-medium">Regular (12&quot;)</span>
            <span className="text-pizza-red ml-2">{formatPrice(setMenu.price_R || 0)}</span>
          </button>
          <button
            onClick={() => { setSize('L'); setStep(step + 1); }}
            className={`w-full p-3 rounded-xl border text-left ${
              size === 'L' ? 'border-pizza-red bg-red-50' : 'border-gray-200'
            }`}
          >
            <span className="font-medium">Large (14&quot;)</span>
            <span className="text-pizza-red ml-2">{formatPrice(setMenu.price_L || 0)}</span>
          </button>
        </div>
      )}

      {!isLastStep && (currentStep?.type === 'pizza' || currentStep?.type === 'pizza2') && (
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {pizzas.map((pizza) => (
            <button
              key={pizza.id}
              onClick={() => {
                if (currentStep.type === 'pizza2') setSelectedPizza2(pizza);
                else setSelectedPizza(pizza);
                setStep(step + 1);
              }}
              className="w-full p-3 rounded-xl border border-gray-200 text-left hover:border-pizza-red transition-colors"
            >
              <span className="font-medium">{getName(pizza)}</span>
            </button>
          ))}
        </div>
      )}

      {!isLastStep && currentStep?.type === 'spaghetti' && (
        <div className="space-y-2">
          {spaghettis.map((item) => (
            <button
              key={item.id}
              onClick={() => { setSelectedSpaghetti(item); setStep(step + 1); }}
              className="w-full p-3 rounded-xl border border-gray-200 text-left hover:border-pizza-red transition-colors"
            >
              <span className="font-medium">{getName(item)}</span>
            </button>
          ))}
        </div>
      )}

      {!isLastStep && currentStep?.type === 'side' && (
        <div className="space-y-2">
          {nonSpaghettiSides.map((item) => (
            <button
              key={item.id}
              onClick={() => { setSelectedSide(item); setStep(step + 1); }}
              className="w-full p-3 rounded-xl border border-gray-200 text-left hover:border-pizza-red transition-colors"
            >
              <span className="font-medium">{getName(item)}</span>
            </button>
          ))}
        </div>
      )}

      {isLastStep && (
        <div className="space-y-3">
          <p className="text-sm text-gray-500">
            {selectedPizza && `🍕 ${getName(selectedPizza)}`}
            {selectedPizza2 && ` + 🍕 ${getName(selectedPizza2)}`}
            {selectedSpaghetti && ` + 🍝 ${getName(selectedSpaghetti)}`}
            {selectedSide && ` + 🍗 ${getName(selectedSide)}`}
          </p>
          <Button
            onClick={handleAddToCart}
            className="w-full bg-pizza-red hover:bg-red-700 text-white font-semibold py-3 rounded-xl"
          >
            {t('step3')} - {formatPrice(price)}
          </Button>
        </div>
      )}

      {step > 0 && !isLastStep && (
        <button
          onClick={() => setStep(step - 1)}
          className="mt-3 text-sm text-gray-400 hover:text-gray-600"
        >
          ← Back
        </button>
      )}
    </div>
  );
};
