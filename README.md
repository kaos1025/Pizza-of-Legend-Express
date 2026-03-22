# 🍕 Pizza of Legend Express

영종도 호텔 외국인 투숙객을 위한 모바일 최적화 PWA 피자 주문 시스템.
**"No Auth, No App, Just Pizza"** — QR 스캔만으로 주문.

## Tech Stack

- **Framework**: Next.js 14 (App Router, TypeScript)
- **Styling**: Tailwind CSS + shadcn/ui
- **i18n**: next-intl (EN / 中文 / 日本語)
- **State**: Zustand (장바구니)
- **DB**: Supabase (Postgres + Realtime)
- **Deploy**: Vercel

## 시작하기

### 1. 설치

```bash
npm install
```

### 2. 환경변수 설정

`.env.local` 파일 생성:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
ADMIN_PIN=1234
ADMIN_SESSION_SECRET=your-random-secret-key
```

### 3. Supabase 설정

1. [Supabase Dashboard](https://supabase.com/dashboard)에서 프로젝트 생성
2. SQL Editor에서 `01_supabase_schema.sql` 실행
3. `.env.local`에 URL과 키 입력

### 4. 개발 서버

```bash
npm run dev
```

http://localhost:3000 접속

## 주요 URL 구조

| URL | 설명 |
|-----|------|
| `/en` | 영문 메뉴 (기본) |
| `/zh` | 중국어 메뉴 |
| `/ja` | 일본어 메뉴 |
| `/en?hotel=HOTEL_ID` | 호텔별 QR 코드 랜딩 |
| `/admin` | 관리자 로그인 (PIN: 1234) |
| `/admin` | 주문 관제센터 |
| `/admin/menu` | 메뉴 CMS |
| `/admin/delivery` | 배달 대시보드 |

## 호텔별 QR 코드

각 호텔에 고유 QR 코드를 배치하여 호텔이 자동 선택되도록:

| 호텔 | QR URL |
|------|--------|
| Best Western | `https://your-domain.vercel.app/en?hotel=HOTEL_UUID` |
| Paradise City | `https://your-domain.vercel.app/en?hotel=HOTEL_UUID` |
| E-Air | `https://your-domain.vercel.app/en?hotel=HOTEL_UUID` |
| Nest Hotel | `https://your-domain.vercel.app/en?hotel=HOTEL_UUID` |
| Golden Tulip | `https://your-domain.vercel.app/en?hotel=HOTEL_UUID` |

> 호텔 UUID는 Supabase Dashboard > Table Editor > hotels에서 확인

## 배포 (Vercel)

### 1. Vercel 프로젝트 생성

```bash
npx vercel
```

### 2. 환경변수 설정

Vercel Dashboard > Settings > Environment Variables에서:

| Variable | Value |
|----------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key |
| `ADMIN_PIN` | Admin PIN (기본: 1234) |
| `ADMIN_SESSION_SECRET` | 랜덤 시크릿 키 |

### 3. 배포

```bash
npx vercel --prod
```

## 프로젝트 구조

```
src/
├── app/
│   ├── [locale]/        # 다국어 라우트 (en/zh/ja)
│   │   ├── page.tsx     # 메뉴보드
│   │   ├── cart/        # 장바구니
│   │   ├── checkout/    # 체크아웃
│   │   └── order/[id]/  # 주문 추적
│   ├── admin/           # 관리자 (한국어)
│   │   ├── login/       # PIN 인증
│   │   └── (dashboard)/ # 관제센터, 메뉴CMS, 배달
│   └── api/             # API 라우트
├── components/          # UI 컴포넌트
├── lib/                 # 유틸리티, Supabase, Store
├── hooks/               # Custom hooks (Realtime)
├── messages/            # i18n 번역 (en/zh/ja)
└── types/               # TypeScript 타입
```

## 보안

- **No Auth 구조**: 회원가입 없이 주문 가능
- **가격 검증**: 서버에서 DB 가격으로 재계산 (클라이언트 조작 방지)
- **Rate Limiting**: IP당 5분에 3건 제한
- **Honeypot**: 봇 방지용 숨김 필드
- **Admin**: PIN 4자리 + HttpOnly 쿠키 세션

## 라이선스

Private — Pizza of Legend
