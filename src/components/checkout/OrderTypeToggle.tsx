'use client';

import { useTranslations } from 'next-intl';

interface OrderTypeToggleProps {
  value: 'delivery' | 'pickup';
  onChange: (type: 'delivery' | 'pickup') => void;
}

export const OrderTypeToggle = ({ value, onChange }: OrderTypeToggleProps) => {
  const t = useTranslations('checkout');

  return (
    <div className="flex bg-gray-100 rounded-xl p-1">
      <button
        type="button"
        onClick={() => onChange('delivery')}
        className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-semibold transition-all ${
          value === 'delivery'
            ? 'bg-white text-pizza-red shadow-sm'
            : 'text-gray-500 hover:text-gray-700'
        }`}
      >
        <span className="text-lg">🛵</span>
        {t('orderTypeDelivery')}
      </button>
      <button
        type="button"
        onClick={() => onChange('pickup')}
        className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-semibold transition-all ${
          value === 'pickup'
            ? 'bg-white text-pizza-red shadow-sm'
            : 'text-gray-500 hover:text-gray-700'
        }`}
      >
        <span className="text-lg">🏪</span>
        {t('orderTypePickup')}
      </button>
    </div>
  );
};
