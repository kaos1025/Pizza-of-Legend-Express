'use client';

import { useTranslations, useLocale } from 'next-intl';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getHotels } from '@/lib/menu-data';
import type { Locale } from '@/types/menu';

interface HotelSelectProps {
  value: string;
  onChange: (value: string) => void;
}

export const HotelSelect = ({ value, onChange }: HotelSelectProps) => {
  const t = useTranslations('checkout');
  const locale = useLocale() as Locale;
  const hotels = getHotels();

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
          {hotels.map((hotel) => {
            const name = hotel[`name_${locale}` as keyof typeof hotel] as string || hotel.name_en;
            return (
              <SelectItem key={hotel.id} value={hotel.id}>
                {name}
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
    </div>
  );
};
