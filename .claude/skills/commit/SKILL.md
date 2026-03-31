---
name: commit
description: 코드 변경사항을 검증하고 커밋/푸시합니다. "커밋", "커밋해줘", "푸시", "commit", "push", "변경사항 저장" 등의 요청 시 자동 실행.
---

# 스마트 커밋 & 푸시

## 실행 절차

### Step 1: Pre-commit 검증

아래 명령을 순서대로 실행하고, 하나라도 실패하면 **커밋하지 말고** 에러를 수정하라.

```bash
# 1. TypeScript 타입 체크
npx tsc --noEmit

# 2. ESLint 검사
npx next lint
```

### Step 2: 변경사항 분석

```bash
git diff --staged --name-only
git diff --name-only
git status --short
```

### Step 3: 커밋 메시지 생성

**Conventional Commits** 형식:

```
<type>(<scope>): <한국어 설명>

- 변경 내용 1
- 변경 내용 2
```

**type 규칙:**

| type | 용도 | 예시 |
|------|------|------|
| `feat` | 새 기능 | `feat(menu): 반반 피자 선택 UI 구현` |
| `fix` | 버그 수정 | `fix(cart): 세트메뉴 가격 합산 오류 수정` |
| `refactor` | 리팩토링 | `refactor(api): 주문 API 가격 재계산 로직 분리` |
| `style` | UI/스타일링 | `style(checkout): 결제안내 문구 강조 개선` |
| `chore` | 설정/의존성 | `chore: Playwright E2E 테스트 설정 추가` |
| `docs` | 문서 | `docs: CLAUDE.md 호텔 목록 업데이트` |
| `test` | 테스트 | `test(order): 주문 플로우 E2E 테스트 추가` |
| `i18n` | 다국어 | `i18n: 중국어 체크아웃 번역 추가` |

**scope 규칙 (이 프로젝트 전용):**

| scope | 해당 경로 |
|-------|-----------|
| `menu` | `src/components/menu/`, `src/app/[locale]/page.tsx` |
| `cart` | `src/components/cart/`, `src/app/[locale]/cart/`, `src/lib/store.ts` |
| `checkout` | `src/components/checkout/`, `src/app/[locale]/checkout/` |
| `order` | `src/app/api/orders/`, `src/app/[locale]/order/` |
| `admin` | `src/app/admin/`, `src/components/admin/`, `src/lib/admin/` |
| `delivery` | `src/app/admin/(dashboard)/delivery/`, `src/components/admin/Delivery*.tsx` |
| `i18n` | `src/messages/`, `src/i18n/`, `src/middleware.ts` |
| `api` | `src/app/api/` |
| `ui` | `src/components/ui/`, `src/components/layout/` |
| `db` | `supabase/`, `01_supabase_schema.sql` |
| `pwa` | `public/manifest.json`, `next.config.mjs` (PWA 관련) |

### Step 4: 커밋 실행

```bash
git add -A
git commit -m "<생성된 메시지>"
```

### Step 5: 푸시 (사용자가 "푸시"도 요청한 경우만)

```bash
git branch --show-current
git push origin <현재-브랜치>
```

## 주의사항

- `.env.local` 파일이 staged에 포함되면 **즉시 중단**하고 경고
- `console.log`가 남아있으면 커밋 전 알림
- 한 커밋에 관련 없는 변경이 섞여있으면 분리 커밋 제안
- 커밋 메시지는 반드시 **한국어**로 작성
- i18n 관련 커밋은 `i18n` type 사용 권장
