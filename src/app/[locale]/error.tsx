'use client';

import { useTranslations } from 'next-intl';

export default function LocaleError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations('common');

  return (
    <div className="min-h-screen bg-warm-white flex items-center justify-center px-4">
      <div className="text-center max-w-sm">
        <span className="text-6xl block mb-4">😵</span>
        <h2 className="text-xl font-bold text-pizza-dark mb-2">{t('error')}</h2>
        <p className="text-gray-500 text-sm mb-6">
          Something went wrong. Please try again.
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={reset}
            className="bg-pizza-red text-white px-6 py-2.5 rounded-full font-semibold text-sm hover:bg-red-700"
          >
            {t('retry')}
          </button>
        </div>
      </div>
    </div>
  );
}
