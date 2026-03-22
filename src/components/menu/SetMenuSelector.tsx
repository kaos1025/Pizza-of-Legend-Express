'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useTranslations, useLocale } from 'next-intl';
import { Check, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatPrice } from '@/lib/utils';
import { useCartStore } from '@/lib/store';
import { getPizzas, getSides, fetchPizzas, fetchSides } from '@/lib/menu-data';
import type { Locale, SetMenu, Pizza, Side, CartItem } from '@/types/menu';

interface SetMenuSelectorProps {
  setMenu: SetMenu;
  onClose: () => void;
}

interface StepConfig {
  key: string;
  title: string;
  type: 'size' | 'pizza' | 'spaghetti' | 'side';
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getName = (item: any, locale: string) =>
  item[`name_${locale}`] || item.name_en;

export const SetMenuSelector = ({ setMenu, onClose }: SetMenuSelectorProps) => {
  const t = useTranslations('setMenu');
  const locale = useLocale() as Locale;
  const addItem = useCartStore((state) => state.addItem);

  const [pizzas, setPizzas] = useState(getPizzas());
  const [sides, setSides] = useState(getSides());

  useEffect(() => {
    fetchPizzas().then(setPizzas);
    fetchSides().then(setSides);
  }, []);

  const spaghettis = sides.filter((s) => s.sub_category === 'spaghetti');
  const nonSpaghettiSides = sides.filter((s) => s.sub_category !== 'spaghetti');

  // State
  const [step, setStep] = useState(0);
  const [size, setSize] = useState<'R' | 'L'>('R');
  const [selectedPizza, setSelectedPizza] = useState<Pizza | null>(null);
  const [selectedPizza2, setSelectedPizza2] = useState<Pizza | null>(null);
  const [leftHalf, setLeftHalf] = useState<Pizza | null>(null);
  const [rightHalf, setRightHalf] = useState<Pizza | null>(null);
  const [selectedSpaghetti, setSelectedSpaghetti] = useState<Side | null>(null);
  const [selectedSide, setSelectedSide] = useState<Side | null>(null);

  // Build steps based on set menu ID
  const buildSteps = (): StepConfig[] => {
    const steps: StepConfig[] = [];
    const id = setMenu.id;

    if (id === 'solo-set') {
      steps.push({ key: 'pizza', title: t('choosePizza'), type: 'pizza' });
      steps.push({ key: 'side', title: t('chooseSide'), type: 'side' });
    } else if (id === 'set-1') {
      steps.push({ key: 'size', title: t('chooseSize'), type: 'size' });
      steps.push({ key: 'pizza', title: t('choosePizza'), type: 'pizza' });
      steps.push({ key: 'spaghetti', title: t('chooseSpaghetti'), type: 'spaghetti' });
    } else if (id === 'set-2') {
      steps.push({ key: 'size', title: t('chooseSize'), type: 'size' });
      steps.push({ key: 'pizza', title: t('choosePizza'), type: 'pizza' });
      steps.push({ key: 'side', title: t('chooseSide'), type: 'side' });
    } else if (id === 'set-3') {
      steps.push({ key: 'size', title: t('chooseSize'), type: 'size' });
      steps.push({ key: 'leftHalf', title: t('chooseLeftHalf'), type: 'pizza' });
      steps.push({ key: 'rightHalf', title: t('chooseRightHalf'), type: 'pizza' });
      steps.push({ key: 'side', title: t('chooseSide'), type: 'side' });
    } else if (id === 'set-4') {
      steps.push({ key: 'size', title: t('chooseSize'), type: 'size' });
      steps.push({ key: 'pizza', title: t('choosePizza'), type: 'pizza' });
      steps.push({ key: 'spaghetti', title: t('chooseSpaghetti'), type: 'spaghetti' });
      steps.push({ key: 'side', title: t('chooseSide'), type: 'side' });
    } else if (id === 'double-set') {
      steps.push({ key: 'size', title: t('chooseSize'), type: 'size' });
      steps.push({ key: 'pizza', title: t('choosePizza'), type: 'pizza' });
      steps.push({ key: 'pizza2', title: t('choosePizza2'), type: 'pizza' });
    }
    return steps;
  };

  const steps = buildSteps();
  const totalSteps = steps.length + 1; // +1 for confirm
  const currentStep = steps[step];
  const isConfirmStep = step >= steps.length;

  const price = setMenu.price || (size === 'R' ? (setMenu.price_R || 0) : (setMenu.price_L || 0));

  // Auto-included items text
  const getIncludedText = () => {
    const items: string[] = [];
    const id = setMenu.id;
    if (id === 'solo-set') {
      items.push(`🥤 ${t('coke500')}`);
      items.push(`🥒 ${t('pickle')}`);
    } else if (['set-1', 'set-2', 'set-3', 'set-4'].includes(id)) {
      items.push(`🥤 ${t('coke125')}`);
    }
    return items;
  };

  const handleSelect = (stepKey: string, item: Pizza | Side) => {
    switch (stepKey) {
      case 'pizza': setSelectedPizza(item as Pizza); break;
      case 'pizza2': setSelectedPizza2(item as Pizza); break;
      case 'leftHalf': setLeftHalf(item as Pizza); break;
      case 'rightHalf': setRightHalf(item as Pizza); break;
      case 'spaghetti': setSelectedSpaghetti(item as Side); break;
      case 'side': setSelectedSide(item as Side); break;
    }
    setStep(step + 1);
  };

  const handleAddToCart = () => {
    const cartItem: CartItem = {
      id: `set-${setMenu.id}-${Date.now()}`,
      type: 'set_menu',
      name: {
        en: setMenu.name_en,
        zh: setMenu.name_zh,
        ja: setMenu.name_ja,
      },
      size: setMenu.price ? undefined : size,
      quantity: 1,
      unitPrice: price,
      setMenuId: setMenu.id,
      selectedComponents: {
        pizza: selectedPizza || undefined,
        pizza2: selectedPizza2 || undefined,
        spaghetti: selectedSpaghetti || undefined,
        side: selectedSide || undefined,
        leftPizza: leftHalf || undefined,
        rightPizza: rightHalf || undefined,
      },
    };
    addItem(cartItem);
    onClose();
  };

  // Get items for current step
  const getStepItems = (): (Pizza | Side)[] => {
    if (!currentStep) return [];
    if (currentStep.type === 'pizza') return pizzas;
    if (currentStep.type === 'spaghetti') return spaghettis;
    if (currentStep.type === 'side') return nonSpaghettiSides;
    return [];
  };

  // Get selected item for a step key
  const getSelectedForKey = (key: string): Pizza | Side | null => {
    switch (key) {
      case 'pizza': return selectedPizza;
      case 'pizza2': return selectedPizza2;
      case 'leftHalf': return leftHalf;
      case 'rightHalf': return rightHalf;
      case 'spaghetti': return selectedSpaghetti;
      case 'side': return selectedSide;
      default: return null;
    }
  };

  return (
    <div className="py-2">
      {/* Header */}
      <div className="flex items-center gap-3 mb-3">
        {step > 0 && (
          <button onClick={() => setStep(step - 1)} className="p-1 text-gray-400 hover:text-pizza-dark">
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}
        <div className="flex-1">
          <h3 className="text-lg font-bold text-pizza-dark">{getName(setMenu, locale)}</h3>
          <p className="text-sm text-pizza-red font-bold">{formatPrice(price)}</p>
        </div>
      </div>

      {/* Step indicator */}
      <div className="flex gap-1 mb-4">
        {Array.from({ length: totalSteps }).map((_, i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-colors ${
              i < step ? 'bg-success-green' : i === step ? 'bg-pizza-red' : 'bg-gray-200'
            }`}
          />
        ))}
      </div>

      {/* Step title */}
      {!isConfirmStep && currentStep && (
        <p className="text-sm font-medium text-gray-600 mb-3">
          {t('step')} {step + 1}/{steps.length} — {currentStep.title}
        </p>
      )}

      {/* Size selection step */}
      {!isConfirmStep && currentStep?.type === 'size' && (
        <div className="space-y-2">
          <button
            onClick={() => { setSize('R'); setStep(step + 1); }}
            className="w-full p-4 rounded-xl border-2 border-gray-200 hover:border-pizza-red text-left transition-colors flex justify-between items-center"
          >
            <div>
              <span className="font-bold text-pizza-dark">Regular (12&quot;)</span>
              <p className="text-xs text-gray-400 mt-0.5">{getName(setMenu, locale)}</p>
            </div>
            <span className="text-pizza-red font-bold text-lg">{formatPrice(setMenu.price_R || 0)}</span>
          </button>
          <button
            onClick={() => { setSize('L'); setStep(step + 1); }}
            className="w-full p-4 rounded-xl border-2 border-gray-200 hover:border-pizza-red text-left transition-colors flex justify-between items-center"
          >
            <div>
              <span className="font-bold text-pizza-dark">Large (14&quot;)</span>
              <p className="text-xs text-gray-400 mt-0.5">{getName(setMenu, locale)}</p>
            </div>
            <span className="text-pizza-red font-bold text-lg">{formatPrice(setMenu.price_L || 0)}</span>
          </button>
        </div>
      )}

      {/* Item selection steps (pizza/spaghetti/side) — 2-column image grid */}
      {!isConfirmStep && currentStep?.type !== 'size' && (
        <div className="grid grid-cols-2 gap-2.5 max-h-[50vh] overflow-y-auto pb-2">
          {getStepItems().map((item) => {
            const selected = getSelectedForKey(currentStep!.key);
            const isSelected = selected?.id === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleSelect(currentStep!.key, item)}
                className={`relative rounded-xl overflow-hidden border-2 transition-all active:scale-95 ${
                  isSelected ? 'border-pizza-red shadow-md' : 'border-gray-100 hover:border-gray-300'
                }`}
              >
                <div className="relative w-full aspect-square bg-gradient-to-br from-orange-50 to-orange-100">
                  {(item as Pizza).image_url ? (
                    <Image
                      src={(item as Pizza).image_url!}
                      alt={getName(item, locale)}
                      fill
                      sizes="(max-width: 430px) 50vw, 200px"
                      className="object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <span className="text-4xl">
                        {currentStep!.type === 'pizza' ? '🍕' :
                         currentStep!.type === 'spaghetti' ? '🍝' : '🍗'}
                      </span>
                    </div>
                  )}
                  {isSelected && (
                    <div className="absolute inset-0 bg-pizza-red/20 flex items-center justify-center">
                      <div className="w-8 h-8 rounded-full bg-pizza-red flex items-center justify-center">
                        <Check className="w-5 h-5 text-white" />
                      </div>
                    </div>
                  )}
                  {(item as Pizza).badge && (
                    <span className={`absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                      (item as Pizza).badge === 'popular' ? 'bg-pizza-red text-white' :
                      (item as Pizza).badge === 'chefs_pick' ? 'bg-cheese-yellow text-pizza-dark' :
                      'bg-pizza-dark text-white'
                    }`}>
                      {(item as Pizza).badge === 'popular' ? '🔥' :
                       (item as Pizza).badge === 'chefs_pick' ? '👨‍🍳' : '⭐'}
                    </span>
                  )}
                </div>
                <div className="px-2 py-1.5">
                  <p className="text-xs font-medium text-pizza-dark truncate">{getName(item, locale)}</p>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Confirm step */}
      {isConfirmStep && (
        <div className="space-y-4">
          <p className="text-sm font-medium text-gray-600 mb-1">{t('yourSet')}</p>

          {/* Summary cards */}
          <div className="space-y-2">
            {selectedPizza && (
              <SummaryRow emoji="🍕" label={getName(selectedPizza, locale)} imageUrl={selectedPizza.image_url} />
            )}
            {leftHalf && rightHalf && (
              <SummaryRow
                emoji="🍕"
                label={`${getName(leftHalf, locale)} + ${getName(rightHalf, locale)}`}
                imageUrl={leftHalf.image_url}
              />
            )}
            {selectedPizza2 && (
              <SummaryRow emoji="🍕" label={getName(selectedPizza2, locale)} imageUrl={selectedPizza2.image_url} />
            )}
            {selectedSpaghetti && (
              <SummaryRow emoji="🍝" label={getName(selectedSpaghetti, locale)} />
            )}
            {selectedSide && (
              <SummaryRow emoji="🍗" label={getName(selectedSide, locale)} />
            )}

            {/* Auto-included items */}
            {getIncludedText().map((text, i) => (
              <div key={i} className="flex items-center gap-2 px-3 py-2 bg-green-50 rounded-lg">
                <span className="text-xs text-green-600 font-medium">{t('includes')}</span>
                <span className="text-sm text-green-700">{text}</span>
              </div>
            ))}
          </div>

          {/* Total + Add button */}
          <div className="border-t border-gray-100 pt-3">
            <div className="flex justify-between items-center mb-3">
              <span className="font-bold text-pizza-dark">Total</span>
              <span className="text-xl font-bold text-pizza-red">{formatPrice(price)}</span>
            </div>
            <Button
              onClick={handleAddToCart}
              className="w-full bg-pizza-red hover:bg-red-700 text-white font-semibold py-3 rounded-xl text-base"
            >
              {t('addToCart')} - {formatPrice(price)}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

// Summary row component
function SummaryRow({ emoji, label, imageUrl }: { emoji: string; label: string; imageUrl?: string }) {
  return (
    <div className="flex items-center gap-3 px-3 py-2 bg-gray-50 rounded-lg">
      <div className="relative w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center overflow-hidden flex-shrink-0">
        {imageUrl ? (
          <Image src={imageUrl} alt="" fill className="object-cover" sizes="40px" />
        ) : (
          <span className="text-lg">{emoji}</span>
        )}
      </div>
      <span className="text-sm font-medium text-pizza-dark">{label}</span>
    </div>
  );
}
