'use client';

import Image from 'next/image';
import { useTranslations } from 'next-intl';

export const DeliveryAreaMap = () => {
  const t = useTranslations('checkout');

  return (
    <div className="rounded-lg border border-gray-200 overflow-hidden bg-white">
      <div className="p-3 pb-2">
        <p className="text-sm font-medium text-gray-700 flex items-center gap-1">
          🗺️ {t('deliveryAreaTitle')}
        </p>
      </div>
      <div className="relative w-full">
        <Image
          src="/images/delivery-area-map.png"
          alt="Delivery area map showing hotel locations"
          width={500}
          height={350}
          className="w-full h-auto object-cover"
          sizes="(max-width: 430px) 100vw, 400px"
        />
      </div>
      <div className="p-3 pt-2">
        <p className="text-xs text-gray-500">
          {t('deliveryAreaCaption')}
        </p>
      </div>
    </div>
  );
};
