#!/bin/bash
# ==============================================
# Pizza of Legend Express — Claude Code Skills 설치 스크립트
# ==============================================
# 사용법: 프로젝트 루트에서 실행
#   bash setup-skills.sh
# ==============================================

set -e

if [ ! -f "package.json" ] || [ ! -f "CLAUDE.md" ]; then
  echo "❌ 에러: Pizza-of-Legend-Express 프로젝트 루트에서 실행해주세요."
  exit 1
fi

echo "🍕 Claude Code Skills 설치 시작..."

mkdir -p .claude/skills/{code-review,commit,test,pr}

# ─────────────────────────────────────────────
# 1. code-review SKILL.md
# ─────────────────────────────────────────────
cat > .claude/skills/code-review/SKILL.md << 'SKILL_EOF'
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
SKILL_EOF

echo "✅ code-review 스킬 생성"

# ─────────────────────────────────────────────
# 2. commit SKILL.md
# ─────────────────────────────────────────────
cat > .claude/skills/commit/SKILL.md << 'SKILL_EOF'
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
SKILL_EOF

echo "✅ commit 스킬 생성"

# ─────────────────────────────────────────────
# 3. test SKILL.md
# ─────────────────────────────────────────────
cat > .claude/skills/test/SKILL.md << 'SKILL_EOF'
---
name: test
description: Pizza of Legend Express 테스트 작성 및 실행. "테스트", "테스트 작성", "test", "테스트 돌려줘", "E2E 테스트" 등의 요청 시 자동 실행.
---

# Pizza of Legend Express 테스트 자동화

이 프로젝트는 **두 가지 테스트 레이어**를 사용한다:

| 레이어 | 도구 | 위치 | 용도 |
|--------|------|------|------|
| **E2E** | Playwright | `tests/e2e/` | 주문 플로우, UI 인터랙션, 다국어 |
| **Unit** | Vitest | `src/**/*.test.ts(x)` | 비즈니스 로직, 유틸, 가격 계산 |

## 1. E2E 테스트 (Playwright) — 이미 구축됨

### 기존 테스트

```
tests/e2e/
├── admin.spec.ts
├── cart.spec.ts
├── error-cases.spec.ts
├── full-order-flow.spec.ts
├── half-half.spec.ts
├── i18n.spec.ts
├── order-amount-and-hotels.spec.ts
├── price-validation.spec.ts
└── set-menu.spec.ts
```

### 실행

```bash
npm run test:e2e          # 전체
npm run test:e2e:ui       # UI 디버깅
npm run test:e2e:headed   # 브라우저 보이게
npx playwright test tests/e2e/cart.spec.ts  # 특정 파일
```

### E2E 작성 규칙

- 기본 locale은 `en`으로 테스트
- `data-testid` 속성 사용
- 호텔 Wi-Fi 환경 고려: `waitForTimeout` 적절히 사용
- 주문 플로우 테스트는 반드시 호텔 선택 + 룸넘버 입력 포함

### E2E 패턴 (기존 코드 참조)

```typescript
import { test, expect } from '@playwright/test';

test.describe('Cart', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/en');
    await page.evaluate(() => { localStorage.clear(); });
    await page.goto('/en');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);
  });

  test('피자 추가 시 장바구니 뱃지 업데이트', async ({ page }) => {
    await page.locator('[data-testid="tab-pizza"]').click();
    await page.waitForTimeout(800);
    await page.locator('[data-testid^="menu-card"]').first().click();
    await page.waitForTimeout(800);
    await page.locator('[data-testid="add-to-cart"]').click();
    await expect(page.locator('[data-testid="cart-badge"]')).toContainText('1');
  });
});
```

## 2. Unit 테스트 (Vitest) — 필요시 설치

```bash
npx vitest --version 2>/dev/null || echo "NO_VITEST"
```

설치 필요 시:

```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom
```

### Unit 테스트 우선순위

| 우선순위 | 대상 | 이유 |
|----------|------|------|
| 🔴 최우선 | `src/lib/rate-limit.ts` | 보안 핵심 |
| 🔴 최우선 | `src/lib/store.ts` (장바구니) | 가격 계산, 반반 피자 고정가 |
| 🔴 최우선 | `src/app/api/orders/route.ts` | 서버 가격 재계산 검증 |
| 🟡 중요 | `src/lib/menu-data.ts` | 메뉴 데이터 변환 |
| 🟡 중요 | `src/lib/utils.ts` | 유틸 함수 |

### Unit 패턴

```typescript
// src/lib/store.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { useCartStore } from './store'

describe('useCartStore', () => {
  beforeEach(() => { useCartStore.getState().clearCart() })

  it('반반 피자는 고정가 R=22900', () => {
    useCartStore.getState().addItem({
      id: 'hh-1', type: 'half_half',
      name: { en: 'Half&Half', zh: '半半', ja: 'ハーフ' },
      size: 'R', quantity: 1, unitPrice: 22900,
    })
    expect(useCartStore.getState().totalAmount).toBe(22900)
  })
})
```

```typescript
// src/lib/rate-limit.test.ts
import { describe, it, expect } from 'vitest'
import { checkRateLimit } from './rate-limit'

describe('checkRateLimit', () => {
  it('10건 초과 시 차단된다', () => {
    for (let i = 0; i < 10; i++) checkRateLimit('test-ip')
    expect(checkRateLimit('test-ip').allowed).toBe(false)
  })
})
```

## 주의사항

- Supabase는 항상 **모킹**
- 반반 피자 가격: 어떤 조합이든 R=22900, L=26900 고정인지 반드시 테스트
- i18n 테스트: 최소 en/zh/ja 3개 locale에서 주요 텍스트 노출 확인
- E2E는 `Mobile Safari` 프로젝트 설정 기준 (playwright.config.ts 참조)
SKILL_EOF

echo "✅ test 스킬 생성"

# ─────────────────────────────────────────────
# 4. pr SKILL.md
# ─────────────────────────────────────────────
cat > .claude/skills/pr/SKILL.md << 'SKILL_EOF'
---
name: pr
description: Pull Request를 생성합니다. "PR", "풀리퀘스트", "PR 만들어줘", "머지 요청", "pull request" 등의 요청 시 자동 실행.
---

# Pull Request 생성

## 실행 절차

### Step 1: 현재 상태 확인

```bash
git branch --show-current
git log main..HEAD --oneline
git diff main --name-only --stat
```

main 브랜치에서 직접 PR을 만들려고 하면 **중단**하고 피처 브랜치 생성을 제안하라.

### Step 2: 미커밋 변경사항이 있으면 먼저 commit 스킬을 실행

### Step 3: 원격 푸시

```bash
git push origin $(git branch --show-current)
```

### Step 4: PR 본문 생성

```markdown
## 📋 작업 요약
## 🔄 변경 내역
### 추가 / 수정 / 삭제
## 📁 변경 파일
| 파일 | 변경 내용 |
|------|-----------|
## 🧪 테스트
- [ ] TypeScript 타입 체크 통과
- [ ] ESLint 통과
- [ ] E2E 테스트 통과 (`npm run test:e2e`)
- [ ] 로컬 빌드 성공
- [ ] 모바일 Safari에서 수동 테스트
## 🌐 다국어 체크
- [ ] 새로 추가된 UI 텍스트가 messages/{en,zh,ja}.json에 모두 존재
- [ ] 하드코딩된 텍스트 없음
## 🏷️ 카테고리
- [ ] 🆕 새 기능 / 🐛 버그 수정 / ♻️ 리팩토링 / 💄 스타일 / 🌐 다국어 / 🗃️ DB / ⚙️ 설정
```

### Step 5: PR 타이틀

Conventional Commits: `<type>(<scope>): <한국어 설명>`

### Step 6: PR 생성

```bash
gh pr create --title "<타이틀>" --body "<본문>" --base main
```

gh CLI 없으면: `https://github.com/kaos1025/Pizza-of-Legend-Express/compare/main...<브랜치명>`

## 자동 경고 추가

- i18n 파일 변경 시: ⚠️ 다국어 파일 변경 — en/zh/ja 3개 모두 동기화 확인
- DB 스키마 변경 시: ⚠️ DB 마이그레이션 포함 — Supabase Dashboard SQL 실행 필요
- 주문 API 변경 시: ⚠️ 주문 로직 변경 — 가격 재계산, Rate Limiting 영향 확인
- 가격 관련 변경 시: ⚠️ 가격 로직 변경 — 반반 피자 고정가, 세트 가격 검증 필요
- PWA 관련 변경 시: ⚠️ PWA 설정 변경 — manifest.json, 캐싱 전략 확인
- .env 관련 변경 시: ⚠️ 환경변수 변경 — Vercel 환경변수 업데이트 필요
SKILL_EOF

echo "✅ pr 스킬 생성"

# ─────────────────────────────────────────────
# 5. settings.local.json 업데이트
# ─────────────────────────────────────────────
cat > .claude/settings.local.json << 'JSON_EOF'
{
  "permissions": {
    "allow": [
      "Bash(npm install:*)",
      "Bash(npm run:*)",
      "Bash(npx shadcn@latest:*)",
      "Bash(npx tsc:*)",
      "Bash(npx next:*)",
      "Bash(npx vitest:*)",
      "Bash(npx eslint:*)",
      "Bash(npx playwright:*)",
      "Bash(git:*)",
      "Bash(gh pr:*)",
      "Bash(gh auth:*)"
    ]
  }
}
JSON_EOF

echo "✅ settings.local.json 업데이트"

echo ""
echo "=========================================="
echo "🍕 Claude Code Skills 설치 완료!"
echo "=========================================="
echo ""
echo "생성된 스킬:"
echo "  📋 .claude/skills/code-review/SKILL.md  (i18n + No Auth 보안 + 반반 고정가)"
echo "  📦 .claude/skills/commit/SKILL.md       (i18n type 포함 Conventional Commits)"
echo "  🧪 .claude/skills/test/SKILL.md         (Playwright E2E + Vitest Unit)"
echo "  🔀 .claude/skills/pr/SKILL.md           (다국어/가격/보안 변경 경고)"
echo ""
echo "사용법 (Claude Code 터미널에서):"
echo '  > "코드 리뷰해줘"     → code-review 자동 실행'
echo '  > "커밋해줘"           → commit 자동 실행'
echo '  > "E2E 테스트 돌려줘"  → test 자동 실행'
echo '  > "PR 만들어줘"       → pr 자동 실행'
echo ""
echo "커밋하려면:"
echo "  git add -A && git commit -m 'chore: Claude Code Skills 세팅'"
echo "  git push origin main"
