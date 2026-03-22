'use client';

interface OrderFilterBarProps {
  activeFilter: string;
  onFilterChange: (filter: string) => void;
  counts: {
    all: number;
    active: number;
    completed: number;
    cancelled: number;
  };
}

const filters = [
  { key: 'all', label: '전체' },
  { key: 'active', label: '진행중', color: 'text-orange-600' },
  { key: 'completed', label: '완료', color: 'text-green-600' },
  { key: 'cancelled', label: '취소', color: 'text-gray-500' },
];

export const OrderFilterBar = ({ activeFilter, onFilterChange, counts }: OrderFilterBarProps) => {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {filters.map((f) => {
        const count = counts[f.key as keyof typeof counts];
        const isActive = activeFilter === f.key;
        return (
          <button
            key={f.key}
            onClick={() => onFilterChange(f.key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              isActive
                ? 'bg-pizza-dark text-white'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            {f.label}
            {count > 0 && (
              <span className={`text-xs ${isActive ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'} px-1.5 py-0.5 rounded-full`}>
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};
