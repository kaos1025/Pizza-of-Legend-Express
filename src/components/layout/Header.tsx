'use client';

import { useState, useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { ClipboardList } from 'lucide-react';
import { LanguageSwitcher } from './LanguageSwitcher';

interface SavedOrder {
  id: string;
  order_number: string;
  created_at: string;
}

export const Header = () => {
  const t = useTranslations('brand');
  const locale = useLocale();
  const router = useRouter();
  const [lastOrder, setLastOrder] = useState<SavedOrder | null>(null);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('pol_my_orders') || '[]');
      if (saved.length > 0) {
        setLastOrder(saved[0]);
      }
    } catch { /* ignore */ }
  }, []);

  return (
    <header className="sticky top-0 z-50 bg-pizza-dark text-white px-4 py-3 shadow-md">
      <div className="max-w-[430px] mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Image
            src="/images/logo.jpg"
            alt="Pizza of Legend"
            width={40}
            height={40}
            className="rounded-lg object-contain"
            priority
          />
          <div>
            <h1 className="text-lg font-bold leading-tight">{t('name')}</h1>
            <p className="text-xs text-gray-300">{t('tagline')}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {lastOrder && (
            <button
              onClick={() => router.push(`/${locale}/order/${lastOrder.id}`)}
              className="flex items-center gap-1 text-xs bg-white/10 hover:bg-white/20 px-2.5 py-1.5 rounded-lg transition-colors"
              aria-label="View my order"
            >
              <ClipboardList className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{lastOrder.order_number}</span>
              <span className="sm:hidden">Order</span>
            </button>
          )}
          <LanguageSwitcher />
        </div>
      </div>
    </header>
  );
};
