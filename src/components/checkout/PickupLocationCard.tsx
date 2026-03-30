'use client';

import { useTranslations } from 'next-intl';
import { MapPin, ExternalLink } from 'lucide-react';
import Image from 'next/image';

export const PickupLocationCard = () => {
  const t = useTranslations('checkout');

  // Placeholder URL — replace with actual Naver Map URL from business owner
  const naverMapUrl = 'https://map.naver.com';

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3">
      <div className="flex items-center gap-2">
        <MapPin className="w-5 h-5 text-blue-600" />
        <h3 className="font-semibold text-pizza-dark">{t('pickupTitle')}</h3>
      </div>

      <p className="text-sm text-gray-700">{t('pickupAddress')}</p>

      {/* Satellite map image — manually placed at /public/images/pickup-map.png */}
      <div className="relative w-full h-40 rounded-lg overflow-hidden bg-gray-200">
        <Image
          src="/images/pickup-map.png"
          alt="Pickup location map"
          fill
          className="object-cover"
          unoptimized
        />
      </div>

      <a
        href={naverMapUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-2 w-full py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm font-medium transition-colors"
      >
        <ExternalLink className="w-4 h-4" />
        {t('pickupMapButton')}
      </a>
    </div>
  );
};
