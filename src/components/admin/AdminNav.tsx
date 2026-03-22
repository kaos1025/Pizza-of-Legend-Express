'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ClipboardList, UtensilsCrossed, Truck } from 'lucide-react';

const tabs = [
  { href: '/admin', label: '주문관제', icon: ClipboardList, exact: true },
  { href: '/admin/menu', label: '메뉴관리', icon: UtensilsCrossed, exact: false },
  { href: '/admin/delivery', label: '배달관리', icon: Truck, exact: false },
];

export const AdminNav = () => {
  const pathname = usePathname();

  const isActive = (tab: typeof tabs[0]) => {
    if (tab.exact) return pathname === tab.href;
    return pathname.startsWith(tab.href);
  };

  return (
    <nav className="border-t border-gray-700">
      <div className="max-w-5xl mx-auto flex">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = isActive(tab);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-medium transition-colors ${
                active
                  ? 'text-white border-b-2 border-pizza-red'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
};
