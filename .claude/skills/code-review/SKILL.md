---
name: code-review
description: Pizza of Legend Express 코드 리뷰. "코드 리뷰", "리뷰해줘", "코드 검토", "review", "이거 괜찮아?" 등의 요청 시 자동 실행.
---

# Pizza of Legend Express 코드 리뷰

## 실행 절차

1. 변경된 파일 목록 확인: `git diff --name-only HEAD~1` 또는 `git diff --staged --name-only`
2. 각 파일을 아래 체크리스트 기준으로 검사
3. 결과를 정해진 출력 형식으로 보고

## 체크리스트

### 🚨 CRITICAL (반드시 수정)

- **i18n**: 사용자 노출 텍스트가 하드코딩되어 있지 않은가? (반드시 next-intl `useTranslations` 사용)
- **i18n**: 메뉴명/설명에 Locale별 필드(name_en, name_zh, name_ja)를 올바르게 참조하는가?
- **보안**: Supabase service_role_key가 클라이언트 코드에 노출되지 않았는가?
- **보안**: 주문 API에서 클라이언트 전송 가격을 신뢰하지 않고 서버에서 DB 가격으로 재계산하는가?
- **보안**: Rate Limiting(`lib/rate-limit.ts`)이 주문 API에 적용되어 있는가?
- **보안**: Honeypot 필드가 체크아웃 폼에 포함되어 있는가?
- **가격**: 반반 피자는 조합 상관없이 고정가(R:₩22,900/L:₩26,900)로 계산되는가? 개별 피자 가격으로 계산하면 CRITICAL.
- **타입 안전**: `as any`, `@ts-ignore`를 사용하지 않았는가?
- **환경변수**: API Key, Secret이 하드코딩되지 않았는가?

### ⚠️ MAJOR (권장 수정)

- **Supabase 분리**: 클라이언트(`supabase.ts`) vs Admin(`supabase-admin.ts`) 올바른 것을 사용하는가?
- **서버/클라이언트 분리**: `"use client"` 없이 훅을 사용하거나, 불필요하게 선언하지 않았는가?
- **에러 처리**: API Route에 try-catch가 있고 다국어 에러 메시지를 반환하는가?
- **금액 처리**: 가격이 정수(원 단위)로 처리되는가? (소수점 금지)
- **Realtime**: Supabase Realtime 구독이 useEffect cleanup으로 반드시 해제되는가?
- **이미지**: `next/image`를 사용하는가? 호텔 Wi-Fi 고려 이미지 최적화가 되어있는가?
- **쿼리 추상화**: 컴포넌트에서 Supabase 직접 쿼리 없이 `lib/` 함수를 사용하는가?
- **N+1 쿼리**: Supabase select에서 관계 데이터를 join으로 한 번에 가져오는가?

### 📝 MINOR (선택 개선)

- **네이밍**: 컴포넌트 PascalCase, 유틸 camelCase, 라우트 kebab-case
- **Import**: `@/` alias 사용
- **컴포넌트 크기**: 200줄 이하
- **접근성**: 터치 타겟 최소 44x44px, img에 alt
- **모바일 퍼스트**: Tailwind 클래스가 모바일 기준으로 작성
- **console.log**: 커밋 전 제거

### 🍕 비즈니스 로직

- **주문 상태**: 전이가 올바른가? (pending→confirmed→delivering→completed, 어디서든→cancelled)
- **주문번호**: POL-YYYYMMDD-NNN 포맷을 따르는가?
- **세트 메뉴**: 구성 요소(피자+사이드+음료 등)가 올바르게 조합되는가?
- **호텔**: hotel_id가 허용된 호텔 목록에 있는가?
- **room_number**: 숫자만, 4자리 이내 검증이 있는가?
- **Admin**: 한국어 전용 OK, 하지만 고객 노출 데이터(주문 내역 등)는 다국어 유지

## 출력 형식

```
## 🔍 코드 리뷰 결과

### 🚨 Critical
- [파일:라인] 이슈 설명 → 수정 제안

### ⚠️ Major
- [파일:라인] 이슈 설명 → 수정 제안

### 📝 Minor
- [파일:라인] 이슈 설명

### ✅ 잘된 점
- 칭찬

### 📊 요약
| 등급 | 개수 |
|------|------|
| Critical | N |
| Major | N |
| Minor | N |
| **판정** | 통과 / 조건부 통과 / 재검토 필요 |
```

## 판정 기준

- Critical 1개 이상 → **재검토 필요**
- Major 3개 이상 → **조건부 통과**
- 그 외 → **통과**
