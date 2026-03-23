'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
// next-intl hooks not directly used here but needed for child components
import { Header } from '@/components/layout/Header';
import { CategoryNav } from '@/components/menu/CategoryNav';
import { MenuCard } from '@/components/menu/MenuCard';
import { HalfHalfPicker } from '@/components/menu/HalfHalfPicker';
import { SetMenuSelector } from '@/components/menu/SetMenuSelector';
import { MenuDetailSheet, type DetailItem } from '@/components/menu/MenuDetailSheet';
import { CartSummaryBar } from '@/components/cart/CartSummaryBar';
import { UpsellSheet } from '@/components/menu/UpsellSheet';
import { getPizzas, getSides, getDrinks, getSauces, getSetMenus, fetchPizzas, fetchSides, fetchDrinks, fetchSauces, fetchSetMenus } from '@/lib/menu-data';
import type { Pizza, Side, Drink, Sauce, SetMenu } from '@/types/menu';
import { Sheet, SheetContent } from '@/components/ui/sheet';

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
  const [activeCategory, setActiveCategory] = useState('half_half');
  const [selectedItem, setSelectedItem] = useState<DetailItem | null>(null);
  const [selectedSetMenu, setSelectedSetMenu] = useState<SetMenu | null>(null);
  const [showUpsell, setShowUpsell] = useState(false);

  // Menu data — start with sync JSON, then upgrade to Supabase
  const [pizzas, setPizzas] = useState<Pizza[]>(getPizzas());
  const [sides, setSides] = useState<Side[]>(getSides());
  const [drinks, setDrinks] = useState<Drink[]>(getDrinks());
  const [sauces, setSauces] = useState<Sauce[]>(getSauces());
  const [setMenus, setSetMenus] = useState<SetMenu[]>(getSetMenus());

  useEffect(() => {
    fetchPizzas().then(setPizzas);
    fetchSides().then(setSides);
    fetchDrinks().then(setDrinks);
    fetchSauces().then(setSauces);
    fetchSetMenus().then(setSetMenus);
  }, []);

  // Convert any menu item to DetailItem for the shared sheet
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const toDetailItem = (item: any, type: DetailItem['type']): DetailItem => ({
    id: item.id,
    type,
    name_en: item.name_en,
    name_zh: item.name_zh || '',
    name_ja: item.name_ja || '',
    desc_en: item.desc_en,
    desc_zh: item.desc_zh,
    desc_ja: item.desc_ja,
    description_en: item.description_en,
    description_zh: item.description_zh,
    description_ja: item.description_ja,
    price: item.price,
    price_R: item.price_R,
    price_L: item.price_L,
    image_url: item.image_url,
    badge: item.badge,
  });

  // Whether the selected item is a pizza (for upsell trigger)
  const isPizzaType = selectedItem?.type === 'pizza';

  const handleItemAdded = () => {
    if (isPizzaType) {
      setShowUpsell(true);
    }
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
            <HalfHalfPicker onAddedToCart={() => setShowUpsell(true)} />
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
                imageUrl={pizza.image_url}
                onClick={() => setSelectedItem(toDetailItem(pizza, 'pizza'))}
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
                imageUrl={setMenu.image_url}
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
                imageUrl={side.image_url}
                onClick={() => setSelectedItem(toDetailItem(side, 'side'))}
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
                imageUrl={drink.image_url}
                onClick={() => setSelectedItem(toDetailItem(drink, 'drink'))}
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
                imageUrl={sauce.image_url}
                onClick={() => setSelectedItem(toDetailItem(sauce, 'sauce'))}
              />
            ))}
          </div>
        )}
      </main>

      {/* Shared Detail Sheet — for pizza, side, drink, sauce */}
      <MenuDetailSheet
        item={selectedItem}
        onClose={() => setSelectedItem(null)}
        onAdded={handleItemAdded}
      />

      {/* Set Menu Selector Sheet */}
      <Sheet open={!!selectedSetMenu} onOpenChange={(open) => !open && setSelectedSetMenu(null)}>
        <SheetContent side="bottom" className="rounded-t-3xl max-h-[85vh] overflow-y-auto" style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 16px), 16px)' }}>
          {selectedSetMenu && (
            <SetMenuSelector setMenu={selectedSetMenu} onClose={() => setSelectedSetMenu(null)} />
          )}
        </SheetContent>
      </Sheet>

      {/* Upsell Sheet — shown after adding pizza/half-half to cart */}
      <UpsellSheet
        isOpen={showUpsell}
        onClose={() => setShowUpsell(false)}
        onBrowseSides={() => setActiveCategory('side')}
      />

      <CartSummaryBar />
    </div>
  );
}
