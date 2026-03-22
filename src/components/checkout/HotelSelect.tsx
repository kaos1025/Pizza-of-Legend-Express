'use client';

import { useState, useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
    // Try fetching from Supabase API first (returns UUID ids)
    fetch('/api/hotels')
      .then((res) => res.json())
      .then((data) => {
        if (data.hotels && data.hotels.length > 0) {
          setHotels(data.hotels);
        } else {
          // Fallback to JSON data
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
        // Fallback to JSON data
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
      <Select value={value} onValueChange={(v) => { if (v) onChange(v); }}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder={t('hotelPlaceholder')} />
        </SelectTrigger>
        <SelectContent>
          {hotels.map((hotel) => (
            <SelectItem key={hotel.id} value={hotel.id}>
              {getName(hotel)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};
