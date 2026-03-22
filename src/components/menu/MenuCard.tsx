'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useLocale } from 'next-intl';
import { formatPrice } from '@/lib/utils';
import type { Locale } from '@/types/menu';

interface MenuCardProps {
  id?: string;
  name: Record<string, string>;
  description?: Record<string, string>;
  price?: number;
  priceR?: number;
  priceL?: number;
  badge?: string | null;
  imageUrl?: string;
  onClick: () => void;
}

const badgeColors: Record<string, string> = {
  popular: 'bg-pizza-red text-white',
  chefs_pick: 'bg-cheese-yellow text-pizza-dark',
  signature: 'bg-pizza-dark text-white',
};

const badgeLabels: Record<string, Record<string, string>> = {
  popular: { en: 'Popular', zh: '人气', ja: '人気' },
  chefs_pick: { en: "Chef's Pick", zh: '主厨推荐', ja: 'シェフのおすすめ' },
  signature: { en: 'Signature', zh: '招牌', ja: 'シグネチャー' },
};

export const MenuCard = ({
  name,
  description,
  price,
  priceR,
  priceL,
  badge,
  imageUrl,
  onClick,
}: MenuCardProps) => {
  const locale = useLocale() as Locale;
  const [imgError, setImgError] = useState(false);
  const localeName = name[`name_${locale}`] || name.name_en;
  const localeDesc = description
    ? description[`desc_${locale}`] || description[`description_${locale}`] || description.desc_en || description.description_en
    : undefined;

  const displayPrice = price
    ? formatPrice(price)
    : priceR && priceL
    ? `${formatPrice(priceR)} / ${formatPrice(priceL)}`
    : '';

  const hasImage = imageUrl && !imgError;

  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } }}
      aria-label={localeName}
      className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden cursor-pointer hover:shadow-md transition-shadow active:scale-[0.98]"
    >
      {/* Image */}
      <div className="relative w-full h-44 bg-gradient-to-br from-orange-100 to-orange-50 flex items-center justify-center overflow-hidden">
        {hasImage ? (
          <Image
            src={imageUrl}
            alt={localeName || ''}
            fill
            sizes="(max-width: 430px) 100vw, 430px"
            className="object-cover"
            loading="lazy"
            onError={() => setImgError(true)}
          />
        ) : (
          <span className="text-6xl">🍕</span>
        )}
        {badge && badgeLabels[badge] && (
          <span
            className={`absolute top-2 left-2 px-2 py-0.5 rounded-full text-xs font-bold z-10 ${
              badgeColors[badge] || 'bg-gray-500 text-white'
            }`}
          >
            {badgeLabels[badge][locale] || badgeLabels[badge].en}
          </span>
        )}
      </div>

      <div className="p-3">
        <h3 className="font-bold text-pizza-dark text-base">{localeName}</h3>
        {localeDesc && (
          <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">{localeDesc}</p>
        )}
        <p className="text-pizza-red font-bold text-base mt-2">{displayPrice}</p>
      </div>
    </div>
  );
};
