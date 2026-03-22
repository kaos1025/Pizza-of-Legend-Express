'use client';

import { useTranslations } from 'next-intl';

export const PaymentNotice = () => {
  const t = useTranslations('checkout');

  return (
    <div role="alert" className="bg-cheese-yellow/20 border-2 border-cheese-yellow rounded-2xl p-5 text-center">
      <span className="text-3xl mb-2 block">💰</span>
      <p className="text-lg font-bold text-pizza-dark leading-snug">
        {t('paymentNotice')}
      </p>
    </div>
  );
};
