'use client';

import { useState, useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { getHotels } from '@/lib/menu-data';
import { AlertTriangle } from 'lucide-react';
import type { Hotel, Locale } from '@/types/menu';

interface HotelSelectProps {
  value: string;
  onChange: (value: string) => void;
  onHotelChange?: (hotel: Hotel | null) => void;
}

export const HotelSelect = ({ value, onChange, onHotelChange }: HotelSelectProps) => {
  const t = useTranslations('checkout');
  const locale = useLocale() as Locale;
  const [hotels, setHotels] = useState<Hotel[]>([]);

  useEffect(() => {
    fetch('/api/hotels')
      .then((res) => res.json())
      .then((data) => {
        if (data.hotels && data.hotels.length > 0) {
          setHotels(data.hotels);
        } else {
          setHotels(getHotels());
        }
      })
      .catch(() => {
        setHotels(getHotels());
      });
  }, []);

  // Notify parent when selected hotel changes
  useEffect(() => {
    if (onHotelChange) {
      const selected = hotels.find((h) => h.id === value) || null;
      onHotelChange(selected);
    }
  }, [value, hotels, onHotelChange]);

  const getName = (hotel: Hotel) => {
    if (locale === 'zh') return hotel.name_zh || hotel.name_en;
    if (locale === 'ja') return hotel.name_ja || hotel.name_en;
    return hotel.name_en;
  };

  const selectedHotel = hotels.find((h) => h.id === value);
  const isLobbyOnly = selectedHotel?.delivery_type === 'lobby_only';

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-pizza-dark mb-1">
        {t('hotelLabel')}
      </label>
      <select
        data-testid="hotel-select"
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

      {isLobbyOnly && (
        <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5 text-red-500" />
          <span>{t('lobbyOnlyWarning')}</span>
        </div>
      )}
    </div>
  );
};
