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
