'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { AdminNav } from './AdminNav';

interface AdminShellProps {
  children: React.ReactNode;
}

export const AdminShell = ({ children }: AdminShellProps) => {
  const [isOpen, setIsOpen] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    const fetchState = async () => {
      try {
        const res = await fetch('/api/store/business-hours');
        if (!res.ok) return;
        const data = (await res.json()) as { state?: { isOpen?: boolean } };
        if (!cancelled && typeof data.state?.isOpen === 'boolean') {
          setIsOpen(data.state.isOpen);
        }
      } catch {
        // 표시기는 비필수 — 실패 시 무시
      }
    };
    void fetchState();
    const id = setInterval(fetchState, 60_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-black text-white sticky top-0 z-50 shadow-md">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Image src="/images/logo.jpg" alt="Pizza of Legend" width={36} height={36} className="rounded-lg object-contain" />
            <h1 className="text-lg font-bold">피자오브레전드</h1>
          </div>
          <div className="flex items-center gap-3">
            {isOpen !== null && (
              <span
                className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  isOpen ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'
                }`}
              >
                {isOpen ? '🟢 영업중' : '🔴 마감'}
              </span>
            )}
            <span className="text-xs text-gray-400">
              {new Date().toLocaleDateString('ko-KR')}
            </span>
            <button
              onClick={async () => {
                await fetch('/api/admin/auth', { method: 'DELETE' });
                window.location.href = '/admin/login';
              }}
              className="text-xs text-gray-400 hover:text-white transition-colors px-2 py-1 rounded"
            >
              로그아웃
            </button>
          </div>
        </div>
        <AdminNav />
      </header>
      <main className="max-w-5xl mx-auto px-4 py-4">
        {children}
      </main>
    </div>
  );
};
