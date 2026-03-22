'use client';

import { useLocale } from 'next-intl';
import { useRouter, usePathname } from 'next/navigation';

const languages = [
  { code: 'en', flag: '🇺🇸', label: 'EN' },
  { code: 'zh', flag: '🇨🇳', label: '中文' },
  { code: 'ja', flag: '🇯🇵', label: '日本語' },
] as const;

export const LanguageSwitcher = () => {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const switchLocale = (newLocale: string) => {
    const segments = pathname.split('/');
    segments[1] = newLocale;
    router.push(segments.join('/'));
  };

  return (
    <div className="flex items-center gap-1">
      {languages.map((lang) => (
        <button
          key={lang.code}
          onClick={() => switchLocale(lang.code)}
          className={`text-sm px-2 py-1 rounded-md transition-colors ${
            locale === lang.code
              ? 'bg-pizza-red text-white'
              : 'text-gray-300 hover:text-white hover:bg-white/10'
          }`}
          aria-label={`Switch to ${lang.label}`}
        >
          <span className="mr-0.5">{lang.flag}</span>
          <span className="text-xs hidden sm:inline">{lang.label}</span>
        </button>
      ))}
    </div>
  );
};
