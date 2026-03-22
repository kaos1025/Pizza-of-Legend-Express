'use client';

import { useState, useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import Image from 'next/image';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { formatPrice } from '@/lib/utils';
import { useCartStore } from '@/lib/store';
import { getPizzas, getHalfHalfConfig, fetchPizzas } from '@/lib/menu-data';
import type { Locale, Pizza, CartItem } from '@/types/menu';

type PickingSide = 'left' | 'right' | null;

interface HalfHalfPickerProps {
  onAddedToCart?: () => void;
}

export const HalfHalfPicker = ({ onAddedToCart }: HalfHalfPickerProps) => {
  const t = useTranslations('halfHalf');
  const locale = useLocale() as Locale;
  const addItem = useCartStore((state) => state.addItem);
  const [pizzas, setPizzas] = useState(getPizzas());
  const config = getHalfHalfConfig();

  useEffect(() => {
    fetchPizzas().then(setPizzas);
  }, []);

  const [leftPizzaId, setLeftPizzaId] = useState<string>('');
  const [rightPizzaId, setRightPizzaId] = useState<string>('');
  const [size, setSize] = useState<'R' | 'L'>('R');
  const [pickingSide, setPickingSide] = useState<PickingSide>(null);

  const leftPizza = pizzas.find((p) => p.id === leftPizzaId);
  const rightPizza = pizzas.find((p) => p.id === rightPizzaId);
  const price = size === 'R' ? config.price_R : config.price_L;

  const getLocaleName = (pizza: Pizza) => {
    const key = `name_${locale}` as keyof Pizza;
    return (pizza[key] as string) || pizza.name_en;
  };

  const handleSelectPizza = (pizzaId: string) => {
    if (pickingSide === 'left') {
      setLeftPizzaId(pizzaId);
    } else if (pickingSide === 'right') {
      setRightPizzaId(pizzaId);
    }
    setPickingSide(null);
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
      image_url: leftPizza.image_url,
      leftPizza,
      rightPizza,
    };
    addItem(item);
    setLeftPizzaId('');
    setRightPizzaId('');
    onAddedToCart?.();
  };

  const availablePizzas = pizzas.filter((p) => p.half_half);
  const currentSelectedId = pickingSide === 'left' ? leftPizzaId : rightPizzaId;

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
      <h2 className="text-xl font-bold text-pizza-dark mb-1">{t('title')}</h2>
      <p className="text-sm text-gray-500 mb-4">{t('description')}</p>

      {/* Visual half circle */}
      <div className="flex justify-center mb-4">
        <div className="w-52 h-52 rounded-full border-4 border-pizza-red flex overflow-hidden shadow-lg">
          {/* Left half */}
          <button
            data-testid="half-left"
            onClick={() => setPickingSide('left')}
            className="relative w-1/2 bg-orange-100 flex items-center justify-center border-r-2 border-pizza-red overflow-hidden group hover:brightness-90 transition-all"
          >
            {leftPizza?.image_url ? (
              <Image src={leftPizza.image_url} alt={getLocaleName(leftPizza)} fill className="object-cover" sizes="104px" />
            ) : (
              <span className="text-4xl text-gray-300 group-hover:scale-110 transition-transform">
                {leftPizza ? '🍕' : '?'}
              </span>
            )}
            {!leftPizza && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/5">
                <span className="text-xs font-medium text-gray-400 bg-white/80 px-2 py-0.5 rounded-full">Tap</span>
              </div>
            )}
          </button>

          {/* Right half */}
          <button
            data-testid="half-right"
            onClick={() => setPickingSide('right')}
            className="relative w-1/2 bg-orange-50 flex items-center justify-center overflow-hidden group hover:brightness-90 transition-all"
          >
            {rightPizza?.image_url ? (
              <Image src={rightPizza.image_url} alt={getLocaleName(rightPizza)} fill className="object-cover" sizes="104px" />
            ) : (
              <span className="text-4xl text-gray-300 group-hover:scale-110 transition-transform">
                {rightPizza ? '🍕' : '?'}
              </span>
            )}
            {!rightPizza && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/5">
                <span className="text-xs font-medium text-gray-400 bg-white/80 px-2 py-0.5 rounded-full">Tap</span>
              </div>
            )}
          </button>
        </div>
      </div>

      {/* Selected pizza names */}
      <div className="flex justify-center gap-4 mb-4 text-center">
        <button
          data-testid="half-left-label"
          onClick={() => setPickingSide('left')}
          className={`flex-1 py-2 px-2 rounded-xl text-sm transition-colors ${
            leftPizza ? 'bg-orange-50 text-pizza-dark font-medium' : 'bg-gray-50 text-gray-400'
          }`}
        >
          <span className="block text-[10px] uppercase tracking-wide text-gray-400 mb-0.5">{t('leftHalf')}</span>
          {leftPizza ? getLocaleName(leftPizza) : t('selectPizza')}
        </button>
        <button
          data-testid="half-right-label"
          onClick={() => setPickingSide('right')}
          className={`flex-1 py-2 px-2 rounded-xl text-sm transition-colors ${
            rightPizza ? 'bg-orange-50 text-pizza-dark font-medium' : 'bg-gray-50 text-gray-400'
          }`}
        >
          <span className="block text-[10px] uppercase tracking-wide text-gray-400 mb-0.5">{t('rightHalf')}</span>
          {rightPizza ? getLocaleName(rightPizza) : t('selectPizza')}
        </button>
      </div>

      {/* Size selection */}
      <div className="flex gap-2 mb-2">
        <button
          data-testid="hh-size-R"
          onClick={() => setSize('R')}
          aria-pressed={size === 'R'}
          className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
            size === 'R'
              ? 'border-pizza-red bg-pizza-red text-white'
              : 'border-gray-200 text-pizza-dark hover:border-pizza-red'
          }`}
        >
          Regular (12&quot;) - {formatPrice(config.price_R)}
        </button>
        <button
          data-testid="hh-size-L"
          onClick={() => setSize('L')}
          aria-pressed={size === 'L'}
          className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
            size === 'L'
              ? 'border-pizza-red bg-pizza-red text-white'
              : 'border-gray-200 text-pizza-dark hover:border-pizza-red'
          }`}
        >
          Large (14&quot;) - {formatPrice(config.price_L)}
        </button>
      </div>

      <p className="text-xs text-gray-400 text-center mb-3">{t('fixedPrice')}</p>

      <Button
        data-testid="hh-add-to-cart"
        onClick={handleAddToCart}
        disabled={!leftPizza || !rightPizza}
        className="w-full bg-pizza-red hover:bg-red-700 text-white font-semibold py-3 rounded-xl disabled:opacity-40"
      >
        {t('title')} - {formatPrice(price)}
      </Button>

      {/* Pizza Selection Bottom Sheet */}
      <Sheet open={pickingSide !== null} onOpenChange={(open) => { if (!open) setPickingSide(null); }}>
        <SheetContent side="bottom" className="rounded-t-3xl max-h-[75vh]">
          <div className="py-3">
            {/* Header */}
            <div className="mb-3">
              <h3 className="text-lg font-bold text-pizza-dark">
                {pickingSide === 'left' ? t('leftHalf') : t('rightHalf')}
              </h3>
            </div>

            {/* Pizza Grid */}
            <div className="grid grid-cols-2 gap-2.5 overflow-y-auto max-h-[55vh] pb-4">
              {availablePizzas.map((pizza) => {
                const isSelected = pizza.id === currentSelectedId;
                return (
                  <button
                    key={pizza.id}
                    onClick={() => handleSelectPizza(pizza.id)}
                    className={`relative rounded-xl overflow-hidden border-2 transition-all active:scale-95 ${
                      isSelected
                        ? 'border-pizza-red shadow-md'
                        : 'border-gray-100 hover:border-gray-300'
                    }`}
                  >
                    {/* Thumbnail */}
                    <div className="relative w-full aspect-square bg-gradient-to-br from-orange-50 to-orange-100">
                      {pizza.image_url ? (
                        <Image
                          src={pizza.image_url}
                          alt={getLocaleName(pizza)}
                          fill
                          sizes="(max-width: 430px) 50vw, 200px"
                          className="object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full">
                          <span className="text-4xl">🍕</span>
                        </div>
                      )}
                      {/* Check overlay */}
                      {isSelected && (
                        <div className="absolute inset-0 bg-pizza-red/20 flex items-center justify-center">
                          <div className="w-8 h-8 rounded-full bg-pizza-red flex items-center justify-center">
                            <Check className="w-5 h-5 text-white" />
                          </div>
                        </div>
                      )}
                      {/* Badge */}
                      {pizza.badge && (
                        <span className={`absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                          pizza.badge === 'popular' ? 'bg-pizza-red text-white' :
                          pizza.badge === 'chefs_pick' ? 'bg-cheese-yellow text-pizza-dark' :
                          'bg-pizza-dark text-white'
                        }`}>
                          {pizza.badge === 'popular' ? '🔥' : pizza.badge === 'chefs_pick' ? '👨‍🍳' : '⭐'}
                        </span>
                      )}
                    </div>
                    {/* Name */}
                    <div className="px-2 py-1.5">
                      <p className="text-xs font-medium text-pizza-dark truncate">
                        {getLocaleName(pizza)}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};
