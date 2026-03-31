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
