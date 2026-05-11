'use client';

import { useEffect } from 'react';

// next-pwa 5.x 의 자동 register 는 Pages Router 가정으로
// 만들어져 App Router 에서는 동작이 일관적이지 않다.
// → next.config.mjs 에서 register: false 로 두고 여기서 명시 등록.
//
// dev 에서는 NEXT_PUBLIC_ENABLE_PWA_DEV=1 일 때만 등록한다.
// (sw.js 자체는 next-pwa 가 빌드한 산출물을 그대로 사용)
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator)) return;

    const isProd = process.env.NODE_ENV === 'production';
    const isDevEnabled = process.env.NEXT_PUBLIC_ENABLE_PWA_DEV === '1';
    if (!isProd && !isDevEnabled) return;

    const register = () => {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .then((reg) => {
          // eslint-disable-next-line no-console
          console.log('[SW] registered:', reg.scope);
        })
        .catch((err) => {
          // eslint-disable-next-line no-console
          console.error('[SW] register failed:', err);
        });
    };

    if (document.readyState === 'complete') {
      register();
    } else {
      window.addEventListener('load', register, { once: true });
      return () => window.removeEventListener('load', register);
    }
  }, []);

  return null;
}
