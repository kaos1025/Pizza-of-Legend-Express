'use client';

import { useTranslations } from 'next-intl';
import { MapPin, ExternalLink } from 'lucide-react';
import Image from 'next/image';

// TODO: 업주에게 CU 베스트웨스턴 인천공항점 네이버 지도 공유 링크 확인 후 교체
const PICKUP_NAVER_MAP_URL = 'https://naver.me/FaOAGc1H';

export const PickupLocationCard = () => {
  const t = useTranslations('checkout');

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3">
      <div className="flex items-center gap-2">
        <MapPin className="w-5 h-5 text-blue-600" />
        <h3 className="font-semibold text-pizza-dark">{t('pickupTitle')}</h3>
      </div>

      <p className="text-sm text-gray-700">{t('pickupAddress')}</p>

      {/* Satellite map image — shared with Delivery mode */}
      <div className="rounded-lg overflow-hidden bg-gray-200">
        <Image
          src="/images/delivery-area-map.png"
          alt="Pickup location map"
          width={500}
          height={350}
          className="w-full h-auto object-cover"
          sizes="(max-width: 430px) 100vw, 400px"
        />
      </div>

      <p className="text-xs text-gray-600">{t('pickupMapCaption')}</p>

      <a
        href={PICKUP_NAVER_MAP_URL}
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
