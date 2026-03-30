'use client';

interface CategoryTabsProps {
  activeCategory: string;
  onCategoryChange: (category: string) => void;
}

const categories = [
  { key: 'pizza', label: '피자', icon: '🍕' },
  // { key: 'set_menu', label: '세트메뉴', icon: '🎁' },  // Disabled per client feedback
  { key: 'side', label: '사이드', icon: '🍗' },
  { key: 'drink', label: '음료', icon: '🥤' },
  { key: 'sauce', label: '소스', icon: '🫙' },
];

export const CategoryTabs = ({ activeCategory, onCategoryChange }: CategoryTabsProps) => {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {categories.map((cat) => (
        <button
          key={cat.key}
          onClick={() => onCategoryChange(cat.key)}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
            activeCategory === cat.key
              ? 'bg-pizza-dark text-white'
              : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
          }`}
        >
          <span>{cat.icon}</span>
          {cat.label}
        </button>
      ))}
    </div>
  );
};
