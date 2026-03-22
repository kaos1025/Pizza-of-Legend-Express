'use client';

import { useTranslations } from 'next-intl';
import { LanguageSwitcher } from './LanguageSwitcher';

export const Header = () => {
  const t = useTranslations('brand');

  return (
    <header className="sticky top-0 z-50 bg-pizza-dark text-white px-4 py-3 shadow-md">
      <div className="max-w-[430px] mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🍕</span>
          <div>
            <h1 className="text-lg font-bold leading-tight">{t('name')}</h1>
            <p className="text-xs text-gray-300">{t('tagline')}</p>
          </div>
        </div>
        <LanguageSwitcher />
      </div>
    </header>
  );
};
