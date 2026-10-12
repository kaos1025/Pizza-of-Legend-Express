import createNextIntlPlugin from 'next-intl/plugin';
import withPWAInit from 'next-pwa';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

// next-pwa 5.x — outermost wrap.
// dev 에서는 기본 비활성. push 알림 테스트가 필요하면
// NEXT_PUBLIC_ENABLE_PWA_DEV=1 로 일시 활성화.
const withPWA = withPWAInit({
  dest: 'public',
  // next-pwa 5.x 의 자동 register 는 App Router 와 궁합이 일관되지 않다.
  // → false 로 두고 src/components/pwa/ServiceWorkerRegister.tsx 에서 명시 등록.
  register: false,
  skipWaiting: true,
  scope: '/',
  sw: 'sw.js',
  // App Router 빌드 산출물 중 일부는 Vercel 에서 정적 자산으로 배포되지 않아
  // precache 시 404 → Workbox 설치 rollback 발생. SW 활성화를 막아 push subscription
  // 까지 깨지므로 precache 대상에서 제외한다.
  buildExcludes: [
    /app-build-manifest\.json$/,
    /middleware-manifest\.json$/,
  ],
  disable:
    process.env.NODE_ENV === 'development' &&
    process.env.NEXT_PUBLIC_ENABLE_PWA_DEV !== '1',
});

// self-hosted Supabase(VPS) 도메인도 next/image 허용 대상에 포함.
// NEXT_PUBLIC_SUPABASE_URL 은 빌드 시점에 결정되므로 여기서 hostname 을 파생한다.
const supabaseHost = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').hostname;
  } catch {
    return null;
  }
})();

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Docker 배포용 (deploy/Dockerfile → node server.js)
  output: 'standalone',
  images: {
    formats: ['image/webp', 'image/avif'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
      ...(supabaseHost && !supabaseHost.endsWith('.supabase.co')
        ? [
            {
              protocol: 'https',
              hostname: supabaseHost,
              pathname: '/storage/v1/object/public/**',
            },
          ]
        : []),
    ],
  },
};

export default withPWA(withNextIntl(nextConfig));
