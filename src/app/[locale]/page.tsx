'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { Header } from '@/components/layout/Header';
import { CategoryNav } from '@/components/menu/CategoryNav';
import { MenuCard } from '@/components/menu/MenuCard';
import { HalfHalfPicker } from '@/components/menu/HalfHalfPicker';
import { SetMenuSelector } from '@/components/menu/SetMenuSelector';
import { CartSummaryBar } from '@/components/cart/CartSummaryBar';
import { UpsellSheet } from '@/components/menu/UpsellSheet';
import { useCartStore } from '@/lib/store';
import { formatPrice } from '@/lib/utils';
import { getPizzas, getSides, getDrinks, getSauces, getSetMenus } from '@/lib/menu-data';
import type { Locale, Pizza, SetMenu, CartItem } from '@/types/menu';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';

const HotelParamCapture = () => {
  const searchParams = useSearchParams();
  const preselectedHotel = searchParams.get('hotel');

  useEffect(() => {
    if (preselectedHotel) {
      localStorage.setItem('pol_preselected_hotel', preselectedHotel);
    }
  }, [preselectedHotel]);

  return null;
};

export default function HomePage() {
  const t = useTranslations();
  const locale = useLocale() as Locale;
  const addItem = useCartStore((state) => state.addItem);

  const [activeCategory, setActiveCategory] = useState('half_half');
  const [selectedPizza, setSelectedPizza] = useState<Pizza | null>(null);
  const [selectedSetMenu, setSelectedSetMenu] = useState<SetMenu | null>(null);
  const [selectedSize, setSelectedSize] = useState<'R' | 'L'>('R');
  const [quantity, setQuantity] = useState(1);
  const [showUpsell, setShowUpsell] = useState(false);

  const pizzas = getPizzas();
  const sides = getSides();
  const drinks = getDrinks();
  const sauces = getSauces();
  const setMenus = getSetMenus();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const getName = (item: any) => item[`name_${locale}`] || item.name_en;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const getDesc = (item: any) => item[`desc_${locale}`] || item.desc_en || '';

  const handleAddPizzaToCart = () => {
    if (!selectedPizza) return;
    const price = selectedSize === 'R' ? selectedPizza.price_R : selectedPizza.price_L;
    const item: CartItem = {
      id: `pizza-${selectedPizza.id}-${selectedSize}-${Date.now()}`,
      type: 'pizza',
      name: {
        en: selectedPizza.name_en,
        zh: selectedPizza.name_zh,
        ja: selectedPizza.name_ja,
      },
      size: selectedSize,
      quantity,
      unitPrice: price,
    };
    addItem(item);
    setSelectedPizza(null);
    setQuantity(1);
    setShowUpsell(true);
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleAddSimpleItem = (item: any, type: 'side' | 'drink' | 'sauce') => {
    const cartItem: CartItem = {
      id: `${type}-${item.id}-${Date.now()}`,
      type,
      name: {
        en: item.name_en,
        zh: item.name_zh,
        ja: item.name_ja,
      },
      quantity: 1,
      unitPrice: item.price,
    };
    addItem(cartItem);
  };

  return (
    <div className="min-h-screen bg-warm-white pb-20">
      <Suspense fallback={null}>
        <HotelParamCapture />
      </Suspense>
      <Header />
      <CategoryNav activeCategory={activeCategory} onCategoryChange={setActiveCategory} />

      <main className="max-w-[430px] mx-auto px-4 py-4">
        {/* Half & Half Section */}
        {activeCategory === 'half_half' && (
          <div className="space-y-4">
            <HalfHalfPicker />
          </div>
        )}

        {/* Pizzas Section */}
        {activeCategory === 'pizza' && (
          <div className="space-y-3">
            {pizzas.map((pizza) => (
              <MenuCard
                key={pizza.id}
                id={pizza.id}
                name={pizza as unknown as Record<string, string>}
                description={pizza as unknown as Record<string, string>}
                priceR={pizza.price_R}
                priceL={pizza.price_L}
                badge={pizza.badge}
                onClick={() => setSelectedPizza(pizza)}
              />
            ))}
          </div>
        )}

        {/* Set Menus Section */}
        {activeCategory === 'set_menu' && (
          <div className="space-y-3">
            {setMenus.map((setMenu) => (
              <MenuCard
                key={setMenu.id}
                id={setMenu.id}
                name={setMenu as unknown as Record<string, string>}
                description={setMenu as unknown as Record<string, string>}
                price={setMenu.price}
                priceR={setMenu.price_R}
                priceL={setMenu.price_L}
                badge={setMenu.badge}
                onClick={() => setSelectedSetMenu(setMenu)}
              />
            ))}
          </div>
        )}

        {/* Sides Section */}
        {activeCategory === 'side' && (
          <div className="space-y-3">
            {sides.map((side) => (
              <MenuCard
                key={side.id}
                id={side.id}
                name={side as unknown as Record<string, string>}
                price={side.price}
                onClick={() => handleAddSimpleItem(side, 'side')}
              />
            ))}
          </div>
        )}

        {/* Drinks Section */}
        {activeCategory === 'drink' && (
          <div className="space-y-3">
            {drinks.map((drink) => (
              <MenuCard
                key={drink.id}
                id={drink.id}
                name={drink as unknown as Record<string, string>}
                price={drink.price}
                onClick={() => handleAddSimpleItem(drink, 'drink')}
              />
            ))}
          </div>
        )}

        {/* Sauces Section */}
        {activeCategory === 'sauce' && (
          <div className="space-y-3">
            {sauces.map((sauce) => (
              <MenuCard
                key={sauce.id}
                id={sauce.id}
                name={sauce as unknown as Record<string, string>}
                price={sauce.price}
                onClick={() => handleAddSimpleItem(sauce, 'sauce')}
              />
            ))}
          </div>
        )}
      </main>

      {/* Pizza Detail Sheet */}
      <Sheet open={!!selectedPizza} onOpenChange={(open) => !open && setSelectedPizza(null)}>
        <SheetContent side="bottom" className="rounded-t-3xl">
          {selectedPizza && (
            <div className="py-4">
              <div className="w-full h-48 bg-gradient-to-br from-orange-100 to-orange-50 rounded-2xl flex items-center justify-center mb-4">
                <span className="text-7xl">🍕</span>
              </div>
              <SheetHeader>
                <SheetTitle className="text-xl text-pizza-dark">{getName(selectedPizza)}</SheetTitle>
              </SheetHeader>
              <p className="text-sm text-gray-500 mt-1">{getDesc(selectedPizza)}</p>

              {/* Size Selection */}
              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => setSelectedSize('R')}
                  aria-label="Regular 12 inch"
                  aria-pressed={selectedSize === 'R'}
                  className={`flex-1 py-3 rounded-xl text-sm font-medium border transition-colors ${
                    selectedSize === 'R'
                      ? 'border-pizza-red bg-pizza-red text-white'
                      : 'border-gray-200 text-pizza-dark hover:border-pizza-red'
                  }`}
                >
                  Regular (12&quot;)
                  <br />
                  <span className="font-bold">{formatPrice(selectedPizza.price_R)}</span>
                </button>
                <button
                  onClick={() => setSelectedSize('L')}
                  aria-label="Large 14 inch"
                  aria-pressed={selectedSize === 'L'}
                  className={`flex-1 py-3 rounded-xl text-sm font-medium border transition-colors ${
                    selectedSize === 'L'
                      ? 'border-pizza-red bg-pizza-red text-white'
                      : 'border-gray-200 text-pizza-dark hover:border-pizza-red'
                  }`}
                >
                  Large (14&quot;)
                  <br />
                  <span className="font-bold">{formatPrice(selectedPizza.price_L)}</span>
                </button>
              </div>

              {/* Quantity */}
              <div className="flex items-center justify-center gap-4 mt-4">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  aria-label="Decrease quantity"
                  className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center text-lg font-bold hover:border-pizza-red"
                >
                  −
                </button>
                <span className="text-xl font-bold w-8 text-center">{quantity}</span>
                <button
                  onClick={() => setQuantity(quantity + 1)}
                  aria-label="Increase quantity"
                  className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center text-lg font-bold hover:border-pizza-red"
                >
                  +
                </button>
              </div>

              <Button
                onClick={handleAddPizzaToCart}
                className="w-full mt-4 bg-pizza-red hover:bg-red-700 text-white font-semibold py-3 rounded-xl text-base"
              >
                {t('menu.addToCart')} - {formatPrice(
                  (selectedSize === 'R' ? selectedPizza.price_R : selectedPizza.price_L) * quantity
                )}
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Set Menu Selector Sheet */}
      <Sheet open={!!selectedSetMenu} onOpenChange={(open) => !open && setSelectedSetMenu(null)}>
        <SheetContent side="bottom" className="rounded-t-3xl max-h-[80vh] overflow-y-auto">
          {selectedSetMenu && (
            <SetMenuSelector setMenu={selectedSetMenu} onClose={() => setSelectedSetMenu(null)} />
          )}
        </SheetContent>
      </Sheet>

      {/* Upsell Sheet — shown after adding pizza to cart */}
      <UpsellSheet
        isOpen={showUpsell}
        onClose={() => setShowUpsell(false)}
        onBrowseSides={() => setActiveCategory('side')}
      />

      <CartSummaryBar />
    </div>
  );
}
