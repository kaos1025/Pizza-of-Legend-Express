'use client';

import { AdminNav } from './AdminNav';

interface AdminShellProps {
  children: React.ReactNode;
}

export const AdminShell = ({ children }: AdminShellProps) => {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-pizza-dark text-white sticky top-0 z-50 shadow-md">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">🍕</span>
            <h1 className="text-lg font-bold">피자오브레전드</h1>
          </div>
          <div className="flex items-center gap-3">
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
