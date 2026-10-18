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
  // public/_headers 는 Cloudflare 가 헤더 규칙으로 파싱만 하고 정적 자산으로 서빙하지 않는다.
  // precache 에 들어가면 설치 시 404 → Workbox rollback 이 나므로 제외한다.
  publicExcludes: ['!noprecache/**/*', '!_headers'],
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

// 배포 타겟. 'cloudflare' 는 npm run cf:* 스크립트(cross-env) 와 wrangler.jsonc vars 가 주입한다.
// Vercel / Docker 빌드에서는 비어 있다.
const isCloudflare = process.env.DEPLOY_TARGET === 'cloudflare';

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Docker 배포용 (deploy/Dockerfile → node server.js). OpenNext 도 내부적으로 standalone 출력을 사용한다.
  output: 'standalone',
  images: {
    // Cloudflare Workers 에는 sharp 기반 /_next/image 최적화 서버가 없다.
    // 메뉴 이미지는 Supabase Storage(VPS, imgproxy 포함) 원본을 그대로 쓰고,
    // 필요해지면 Cloudflare Images 바인딩(wrangler.jsonc 주석) 또는 Supabase render 엔드포인트용
    // 커스텀 loader 로 전환한다.
    unoptimized: isCloudflare,
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
