'use client';

import { useState, useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { getHotels } from '@/lib/menu-data';
import type { Locale } from '@/types/menu';

interface HotelSelectProps {
  value: string;
  onChange: (value: string) => void;
}

interface HotelOption {
  id: string;
  name_en: string;
  name_zh: string;
  name_ja: string;
}

export const HotelSelect = ({ value, onChange }: HotelSelectProps) => {
  const t = useTranslations('checkout');
  const locale = useLocale() as Locale;
  const [hotels, setHotels] = useState<HotelOption[]>([]);

  useEffect(() => {
    fetch('/api/hotels')
      .then((res) => res.json())
      .then((data) => {
        if (data.hotels && data.hotels.length > 0) {
          setHotels(data.hotels);
        } else {
          const jsonHotels = getHotels();
          setHotels(jsonHotels.map((h) => ({
            id: h.id,
            name_en: h.name_en,
            name_zh: h.name_zh || '',
            name_ja: h.name_ja || '',
          })));
        }
      })
      .catch(() => {
        const jsonHotels = getHotels();
        setHotels(jsonHotels.map((h) => ({
          id: h.id,
          name_en: h.name_en,
          name_zh: h.name_zh || '',
          name_ja: h.name_ja || '',
        })));
      });
  }, []);

  const getName = (hotel: HotelOption) => {
    if (locale === 'zh') return hotel.name_zh || hotel.name_en;
    if (locale === 'ja') return hotel.name_ja || hotel.name_en;
    return hotel.name_en;
  };

  return (
    <div>
      <label className="block text-sm font-medium text-pizza-dark mb-1">
        {t('hotelLabel')}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm text-pizza-dark focus:border-pizza-red focus:ring-2 focus:ring-pizza-red/20 outline-none"
      >
        <option value="" disabled>
          {t('hotelPlaceholder')}
        </option>
        {hotels.map((hotel) => (
          <option key={hotel.id} value={hotel.id}>
            {getName(hotel)}
          </option>
        ))}
      </select>
    </div>
  );
};
