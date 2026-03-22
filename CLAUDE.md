# CLAUDE.md — Pizza of Legend Express

## 프로젝트 개요

"Pizza of Legend Express"는 영종도 호텔 외국인 투숙객을 위한 모바일 최적화 PWA 피자 주문 시스템이다.
핵심 철학: **"No Auth, No App, Just Pizza"** — 회원가입 없이, 앱 설치 없이, QR 스캔만으로 주문.

- 브랜드: 피자오브레전드 (Pizza of Legend)
- 타겟: 영종도 호텔(베스트웨스턴, 파라다이스시티 등) 외국인 투숙객
- 결제: 대면 결제 (Cash or Card Payment on Delivery)
- 다국어: EN / 中文 / 日本語
- 플랫폼: 모바일 최적화 PWA (반응형 웹)

---

## Tech Stack

- **Framework**: Next.js 14 (App Router, TypeScript)
- **Styling**: Tailwind CSS + shadcn/ui
- **i18n**: next-intl (en, zh, ja)
- **State**: Zustand (장바구니, UI 상태)
- **DB**: Supabase (Postgres + Realtime + Storage)
- **PWA**: next-pwa
- **Deploy**: Vercel

---

## 폴더 구조

```
src/
├── app/
│   ├── [locale]/           # 다국어 라우트 (en/zh/ja)
│   │   ├── page.tsx        # 랜딩 + 메뉴보드
│   │   ├── cart/           # 장바구니
│   │   ├── checkout/       # 체크아웃
│   │   └── order/[id]/     # 주문 추적
│   ├── admin/              # 관리자 (locale 미적용)
│   │   ├── page.tsx        # 주문 관제센터
│   │   ├── menu/           # 메뉴 CMS
│   │   └── delivery/       # 배달 대시보드
│   └── api/orders/         # 주문 API
├── components/
│   ├── menu/               # MenuCard, HalfHalfPicker, SetMenuSelector
│   ├── cart/               # CartDrawer, CartItem, CartSummaryBar
│   ├── checkout/           # HotelSelect, OrderSummary, PaymentNotice
│   ├── admin/              # OrderCard, StatusBadge, SettlementSummary
│   ├── layout/             # Header, LanguageSwitcher, BottomNav
│   └── ui/                 # shadcn/ui 컴포넌트
├── lib/
│   ├── supabase.ts         # Supabase 클라이언트
│   ├── store.ts            # Zustand 스토어
│   ├── menu-data.ts        # 메뉴 데이터 fetch 추상화
│   └── utils.ts            # 유틸리티 함수
├── messages/               # i18n 번역 파일
│   ├── en.json
│   ├── zh.json
│   └── ja.json
└── types/
    ├── menu.ts
    └── order.ts
```

---

## 디자인 시스템

### 컬러
- Primary: `#D4371C` (피자 레드 — CTA, 브랜드)
- Secondary: `#1A1A1A` (다크 — 텍스트, 헤더)
- Accent: `#F5A623` (치즈 옐로 — 하이라이트, 뱃지)
- Background: `#FFF8F0` (웜 화이트 — 전체 배경)
- Success: `#2D8B4E` (배달 완료, 상태 표시)

### 레이아웃 원칙
- **모바일 퍼스트** (기준: 430px, 호텔 객실에서 스마트폰 사용)
- 메뉴 카드: 1컬럼 풀 너비
- 하단 고정 바: 장바구니 요약 + CTA 상시 노출
- 터치 타겟: 최소 44x44px
- 이미지 중심 UI (텍스트보다 사진/아이콘 우선 — 언어 장벽 최소화)

### 폰트
- 영문: Inter
- 한국어 fallback: Pretendard

---

## 핵심 비즈니스 규칙

### 메뉴 구조
- 피자: 15종, R(12인치)/L(14인치) 2사이즈
- 반반 피자: 15종 중 자유 조합, 조합 상관없이 고정가 (R: ₩22,900 / L: ₩26,900)
- 세트 메뉴: 6종 (혼자세트, 세트1~4, 두판세트)
- 사이드: 11종 (스파게티 4종 + 치킨/새우 등 7종)
- 음료: 6종, 소스: 5종

### 세트 메뉴 구성
- 혼자세트: S사이즈 피자+사이드+콜라500ml+피클 = ₩18,900 (단일가)
- 세트1: 피자+스파게티+콜라1.25L = R ₩24,900 / L ₩28,900
- 세트2: 피자+사이드+콜라1.25L = R ₩24,900 / L ₩28,900
- 세트3: 반반피자+사이드+콜라1.25L = R ₩26,400 / L ₩30,400
- 세트4: 피자+스파게티+사이드+콜라1.25L = R ₩29,900 / L ₩33,900
- 두판세트: 피자 2판 = R ₩33,900 / L ₩40,900

### 주문 플로우
1. QR 스캔 → 랜딩 (언어 자동감지 or 선택)
2. 메뉴 탐색 → 장바구니 담기
3. 체크아웃: 호텔 선택 + 호수 입력 + (선택) 메신저 ID
4. 주문 접수 → 주문번호 발급 (POL-YYYYMMDD-NNN)
5. 실시간 상태 추적: Pending → Cooking → On the Way → Delivered

### 결제
- 대면 결제만 지원 (Cash or Card at Door)
- 온라인 결제 없음
- "Pay to the staff at your door" 문구를 체크아웃에서 가장 크게 노출

### Admin 주문 상태 관리
- Pending → [Confirm] → Confirmed (고객에게 "Cooking" 표시)
- Confirmed → [Start Delivery] → Delivering (고객에게 "On the Way" 표시)
- Delivering → [Completed - Cash] 또는 [Completed - Card] → Completed
- 어떤 단계에서든 [Cancel] 가능

---

## 코딩 컨벤션

### 일반
- TypeScript strict 모드 사용
- 컴포넌트는 함수형 + Arrow Function으로 작성
- 파일명: PascalCase (컴포넌트), camelCase (유틸), kebab-case (라우트)
- 절대 경로 import 사용 (`@/components/...`, `@/lib/...`)
- console.log는 개발 중에만, 커밋 전에 제거

### React / Next.js
- 서버 컴포넌트 우선, 클라이언트 컴포넌트는 최소화
- `'use client'`는 필요한 컴포넌트에만 명시
- 이미지는 `next/image` 사용
- 동적 데이터는 서버 액션 또는 API Route 사용
- 에러 처리: try-catch + 사용자 친화적 에러 메시지 (다국어)

### Supabase
- 클라이언트: `lib/supabase.ts`에서 싱글턴으로 관리
- anon key (클라이언트용)와 service role key (Admin API용) 분리
- 쿼리는 lib/ 폴더에 함수로 추상화 (컴포넌트에서 직접 쿼리 금지)
- Realtime 구독은 useEffect cleanup으로 반드시 해제

### 다국어 (i18n)
- 모든 사용자 노출 텍스트는 반드시 next-intl로 처리
- 하드코딩 금지 (한국어/영어 직접 입력 금지)
- 메뉴명, 설명은 DB에서 locale에 맞춰 반환
- UI 텍스트는 messages/*.json에서 관리

### 가격 표시
- 원화 기준, 천 단위 콤마: `₩22,900`
- `Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' })` 사용
- 가격 계산은 항상 정수(원 단위)로 처리 (소수점 금지)

---

## 보안 규칙 (No Auth 구조)

- 가격 검증: 클라이언트 전송 가격을 신뢰하지 않음 → 서버에서 DB 가격으로 재계산
- Rate Limiting: IP당 5분에 3건 주문 제한
- 입력 검증: room_number는 숫자만, 4자리 이내
- Honeypot 필드: 봇 방지용 숨김 필드
- Admin: 프로토타입은 PIN 4자리, 추후 Supabase Auth로 전환

---

## 호텔 목록 (배달 가능)

| 호텔 | 영문 | 배달 메모 |
|------|------|----------|
| 베스트웨스턴 | Best Western | 로비 입구에서 전화 |
| 파라다이스시티 | Paradise City | 1층 로비 데스크 앞 |
| 이에어 | E-Air | 정문 앞 |
| 네스트호텔 | Nest Hotel | 로비 |
| 골든튤립 | Golden Tulip | 로비 |

---

## 다국어 핵심 문구

| 구분 | EN | ZH | JA |
|------|----|----|-----|
| 브랜드 | Pizza of Legend | 传奇披萨 | 伝説のピザ |
| 결제안내 | Pay to the staff at your door | 向送货员支付现金或卡 | 到着時に配達員にお支払い |
| 반반피자 | Half & Half (2 flavors) | 半半披萨 (两种口味) | ハーフ＆ハーフ (2つの味) |

---

## 개발 명령어

```bash
# 개발 서버
npm run dev

# 빌드
npm run build

# 린트
npm run lint

# Supabase 스키마 적용
# Supabase Dashboard > SQL Editor에서 01_supabase_schema.sql 실행
```

---

## 환경변수 (.env.local)

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

---

## 주의사항

- 이 프로젝트의 타겟은 **외국인**이다. UI 텍스트를 한국어로 하드코딩하지 말 것.
- 호텔 Wi-Fi 환경을 고려하여 **번들 사이즈 최소화**, 이미지 최적화 필수.
- "대면 결제" 안내가 체크아웃의 **최우선 시각 요소**여야 한다.
- 반반 피자는 조합 상관없이 **고정 가격**이다. 개별 피자 가격으로 계산하지 말 것.
- Admin 화면은 **한국어 전용**으로 개발해도 무방하다 (업주용).
- 프로토타입 단계에서는 메뉴 이미지를 플레이스홀더로 처리해도 된다.