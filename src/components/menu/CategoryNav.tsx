'use client';

import { useTranslations } from 'next-intl';

const categories = [
  { key: 'half_half', icon: '🍕' },
  { key: 'pizza', icon: '🍕' },
  { key: 'set_menu', icon: '🎁' },
  { key: 'side', icon: '🍗' },
  { key: 'drink', icon: '🥤' },
  { key: 'sauce', icon: '🫙' },
] as const;

interface CategoryNavProps {
  activeCategory: string;
  onCategoryChange: (category: string) => void;
}

export const CategoryNav = ({ activeCategory, onCategoryChange }: CategoryNavProps) => {
  const t = useTranslations('categories');

  return (
    <nav className="sticky top-[60px] z-40 bg-warm-white border-b border-gray-100">
      <div className="max-w-[430px] mx-auto overflow-x-auto scrollbar-hide">
        <div className="flex gap-1 px-3 py-2 min-w-max">
          {categories.map((cat) => (
            <button
              key={cat.key}
              onClick={() => onCategoryChange(cat.key)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                activeCategory === cat.key
                  ? 'bg-pizza-red text-white'
                  : 'bg-white text-pizza-dark hover:bg-gray-100 border border-gray-200'
              }`}
            >
              <span>{cat.icon}</span>
              <span>{t(cat.key)}</span>
            </button>
          ))}
        </div>
      </div>
    </nav>
  );
};
