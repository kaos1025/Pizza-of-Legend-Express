# VPS 이전 런북 — Supabase(호스티드) + Vercel → VPS 올인원

> 작성: 2026-10-12. 대상: Docker 가능 / RAM 4GB+ VPS.
> 방식: **self-hosted Supabase** (코드 변경 최소화 — Realtime·Storage·트리거·Edge Function 전부 유지)

## 아키텍처 (이전 후)

```
[고객/관리자 브라우저]
   │ https://APP_DOMAIN  ────────────┐
   │ https://API_DOMAIN (REST/WS)    │
   ▼                                 ▼
┌─────────────────── VPS ─────────────────────┐
│  Caddy (80/443, TLS 자동)                    │
│   ├─ APP_DOMAIN → app:3000 (Next.js)        │
│   └─ API_DOMAIN → supabase-kong:8000        │
│                     ├─ rest (PostgREST)      │
│                     ├─ realtime (WebSocket)  │
│                     ├─ storage (menu-images) │
│                     ├─ functions (send-order-push)
│                     └─ studio (관리 대시보드) │
│  Postgres (db 컨테이너, 트리거/웹훅 포함)      │
└─────────────────────────────────────────────┘
```

- 도메인 2개 필요: 앱용(`APP_DOMAIN`) + Supabase API용(`API_DOMAIN`, 보통 `api.` 서브도메인)
- **앱 도메인은 기존과 동일하게 유지**할 것 — PWA 설치·Web Push 구독이 도메인에 묶여 있어서 도메인이 바뀌면 전부 무효가 된다.

## 0. 사전 준비 체크리스트

- [ ] VPS: Docker + Docker Compose v2 설치, 방화벽은 22/80/443만 오픈
- [ ] swap 2GB 설정 권장 (Next 빌드 + Supabase 스택 동시 가동 시 메모리 피크 대비)
- [ ] DNS: `APP_DOMAIN`, `API_DOMAIN` A 레코드 → VPS IP. **전환 1~2일 전 TTL을 300초로 낮춰둘 것**
- [ ] 기존 Supabase에서 챙겨둘 것:
  - DB 연결 문자열 (Dashboard → Connect → **Session pooler**, IPv4용)
  - `SUPABASE_SERVICE_ROLE_KEY` (sb_secret_*)
  - Edge Function 시크릿: `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` / `VAPID_SUBJECT`, `TELEGRAM_BOT_TOKEN`
  - ⚠️ **VAPID 키는 반드시 동일한 값을 그대로 이전** — 새로 만들면 기존 관리자 push 구독 전부 무효
- [ ] 전환 작업은 주문 없는 시간대(영업 시작 12:00 이전 오전)에

## 1. Self-hosted Supabase 설치

```bash
# VPS 에서
git clone --depth 1 https://github.com/supabase/supabase /opt/supabase-src
mkdir -p /opt/supabase-docker
cp -r /opt/supabase-src/docker/* /opt/supabase-docker/
cp /opt/supabase-src/docker/.env.example /opt/supabase-docker/.env
cd /opt/supabase-docker
```

`.env` 필수 수정:

| 변수 | 값 |
|------|-----|
| `POSTGRES_PASSWORD` | 강한 랜덤값 |
| `JWT_SECRET` | 40자+ 랜덤값 |
| `ANON_KEY` / `SERVICE_ROLE_KEY` | **JWT_SECRET 으로 생성한 JWT** — 공식 문서의 API 키 생성기 사용: https://supabase.com/docs/guides/self-hosting/docker#generate-api-keys |
| `DASHBOARD_USERNAME` / `DASHBOARD_PASSWORD` | Studio 접속용 (API_DOMAIN 루트가 Studio) |
| `SITE_URL` | `https://APP_DOMAIN` |
| `API_EXTERNAL_URL` | `https://API_DOMAIN` |
| `SUPABASE_PUBLIC_URL` | `https://API_DOMAIN` |

참고:
- self-hosted 는 새 키 포맷(sb_publishable/sb_secret)이 아니라 **JWT 기반 legacy 키**를 쓴다. `supabase-js` 는 어느 쪽이든 동일하게 동작하고, Edge Function 의 수동 Bearer 비교도 그대로 동작한다.
- Auth(이메일/SMTP) 설정은 이 프로젝트가 No Auth 라 무시해도 된다.
- Kong 호스트 포트(8000/8443)는 Caddy 가 컨테이너 네트워크로 직접 붙으므로 외부 노출 불필요 → `docker-compose.yml` 의 kong ports 를 `127.0.0.1:8000:8000` 으로 제한하거나 방화벽으로 차단.
- (선택, RAM 절약) `analytics`·`vector` 서비스는 Studio 로그 뷰어용이라 중지해도 운영에 지장 없음. `imgproxy` 도 앱이 next/image 로 최적화하므로 중지 가능.

Edge Function 환경 주입 — 레포의 `deploy/supabase-docker-compose.override.yml` 를 복사:

```bash
cp <repo>/deploy/supabase-docker-compose.override.yml /opt/supabase-docker/docker-compose.override.yml
# .env 에 추가: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT, TELEGRAM_BOT_TOKEN(선택), TELEGRAM_CHAT_ID(선택)
```

Edge Function 소스 복사:

```bash
cp -r <repo>/supabase/functions/send-order-push /opt/supabase-docker/volumes/functions/
```

기동:

```bash
docker compose pull
docker compose up -d
docker compose ps   # 전부 healthy 확인
```

## 2. DB 스키마 + 데이터 이전

**스키마는 레포 SQL 을 진실 원천으로 새로 구성**하고, 데이터만 기존 프로젝트에서 복사한다 (dump 전체 복원보다 충돌이 적고 깔끔).

### 2-1. 스키마 구성 (레포 SQL 순서대로)

```bash
cd /opt/supabase-docker
docker compose exec -T db psql -U postgres -d postgres -v ON_ERROR_STOP=1 < <repo>/supabase/schema.sql
docker compose exec -T db psql -U postgres -d postgres -v ON_ERROR_STOP=1 < <repo>/supabase/migration_guesthouse_split.sql
docker compose exec -T db psql -U postgres -d postgres -v ON_ERROR_STOP=1 < <repo>/supabase/migration_feedback_update.sql
docker compose exec -T db psql -U postgres -d postgres -v ON_ERROR_STOP=1 < <repo>/supabase/migration_admin_push_subscriptions.sql
docker compose exec -T db psql -U postgres -d postgres -v ON_ERROR_STOP=1 < <repo>/supabase/migration_telegram_notifications_config.sql
docker compose exec -T db psql -U postgres -d postgres -v ON_ERROR_STOP=1 < <repo>/supabase/migration_business_hours_and_size.sql
docker compose exec -T db psql -U postgres -d postgres -v ON_ERROR_STOP=1 < <repo>/supabase/storage-policies.sql
```

> 마이그레이션 실행 순서는 파일 작성 순서 기준. 이미 `schema.sql` 에 반영된 내용과 겹치면 해당 파일은 건너뛴다 (레포 히스토리 확인).

### 2-2. 데이터 복사 (기존 → 신규)

로컬 PC 또는 VPS 에서 (pg_dump 16+ 필요):

```bash
# 기존 호스티드에서 데이터만 dump (연결 문자열은 Session pooler 용)
pg_dump "postgresql://postgres.<ref>:<pw>@<pooler-host>:5432/postgres" \
  --data-only --schema=public \
  --no-owner --no-privileges \
  -f data.sql
```

⚠️ **복원 전 `data.sql` 맨 위에 다음 한 줄을 추가**할 것:

```sql
SET session_replication_role = replica;
```

이유: `check_business_hours` 트리거(BEFORE INSERT on orders)가 살아 있으면 **영업시간 외에 복원을 돌릴 때 기존 주문 INSERT 가 전부 차단**된다. `replica` 모드는 복원 세션에서만 트리거를 끈다.

```bash
docker compose exec -T db psql -U postgres -d postgres -v ON_ERROR_STOP=1 < data.sql
```

### 2-3. 복원 후처리

```bash
docker compose exec -T db psql -U postgres -d postgres < <repo>/deploy/sql/post-restore.sql
```

(Realtime publication 등록 + pg_net 설치 + 트리거 존재 검증)

### 2-4. 주문 알림 웹훅 트리거

`deploy/sql/webhook-send-order-push.sql` 에서 `__API_DOMAIN__`, `__SERVICE_ROLE_KEY__` 치환 후:

```bash
docker compose exec -T db psql -U postgres -d postgres -v ON_ERROR_STOP=1 < webhook-send-order-push.sql
```

(호스티드 Dashboard 의 "Database Webhooks" 를 pg_net 트리거로 대체한 것)

## 3. Storage 이전 (메뉴 이미지)

로컬 PC(레포 루트)에서:

```powershell
$env:OLD_SUPABASE_URL="https://<ref>.supabase.co"
$env:OLD_SERVICE_ROLE_KEY="sb_secret_..."
$env:NEW_SUPABASE_URL="https://API_DOMAIN"
$env:NEW_SERVICE_ROLE_KEY="<self-hosted SERVICE_ROLE_KEY>"
node deploy/scripts/migrate-storage.mjs
```

그다음 DB 의 이미지 URL 교정 — `deploy/sql/fix-image-urls.sql` 치환 후 실행.

## 4. Edge Function 동작 확인

```bash
curl -X POST https://API_DOMAIN/functions/v1/send-order-push \
  -H "Authorization: Bearer <self-hosted SERVICE_ROLE_KEY>" \
  -H "Content-Type: application/json" \
  -d '{"test":true}'
```

관리자 기기에 push + (설정 시) 텔레그램 수신 확인. 실패 시: `docker compose logs functions`

> 레포 `supabase/config.toml` 의 `verify_jwt=false` 는 호스티드/CLI 용 설정. self-hosted 에서는 override 파일의 `VERIFY_JWT: "false"` 가 같은 역할을 한다.

## 5. 앱 배포

```bash
# VPS 에서
git clone <repo-url> /opt/pizza && cd /opt/pizza
cp deploy/env.app.example deploy/.env.app
# 값 채우기 (env.app.example 의 주석 참고)

# supabase compose 네트워크 이름 확인 — 다르면 deploy/docker-compose.app.yml 의
# networks.supabase.name 수정 (기본: <디렉토리명>_default)
docker network ls | grep supabase

docker compose -f deploy/docker-compose.app.yml --env-file deploy/.env.app up -d --build
```

- `NEXT_PUBLIC_*` 값을 바꾸면 **이미지 재빌드 필요** (빌드 시점에 번들에 인라인됨): `up -d --build`
- Caddy 가 TLS 를 자동 발급하므로 DNS 가 VPS 를 가리킨 뒤에 기동해야 발급이 성공한다.

## 6. DNS 전환 + 검증

API_DOMAIN 은 신규 레코드라 먼저 연결해 검증하고, APP_DOMAIN 만 마지막에 Vercel → VPS 로 전환.

체크리스트 (전환 직후 실제 기기로):

- [ ] 메뉴 로드 (REST) + 메뉴 이미지 표시 (Storage URL 교정 확인)
- [ ] 주문 생성 → 주문번호 `POL-YYYYMMDD-NNN` 발급
- [ ] 관리자 관제센터에 신규 주문 **실시간** 표시 (Realtime)
- [ ] 관리자 Web Push + 텔레그램 알림 수신 (웹훅 트리거)
- [ ] 고객 주문추적 화면에서 상태 변경 실시간 반영
- [ ] 영업시간 외 주문 시 409 + 장바구니 보존 (`check_business_hours`)
- [ ] 관리자 메뉴 이미지 업로드 (Storage 쓰기)
- [ ] PWA 설치 유지 / sw.js 정상 등록 (브라우저 DevTools → Application)
- [ ] 임시휴무(manual_closed) 토글 동작

## 7. 운영: 백업

호스티드 시절의 자동 백업이 사라지므로 **cron 백업 필수**:

```bash
# /etc/cron.d/pizza-backup — 매일 04:00, 7일 보관
0 4 * * * root docker exec supabase-db pg_dump -U postgres -Fc postgres > /backups/pizza-$(date +\%Y\%m\%d).dump && find /backups -name "pizza-*.dump" -mtime +7 -delete
```

- `/backups` 는 VPS 외부(로컬 PC rclone/rsync, 오브젝트 스토리지 등)로도 주기 복사 권장
- 이미지 원본: `/opt/supabase-docker/volumes/storage` 디렉토리도 백업 대상에 포함
- 복구 리허설을 최소 1회 해볼 것: `pg_restore -U postgres -d postgres --clean <dump>`

## 8. 정리 & 롤백

**정리** (안정 확인 후):
- 기존 Supabase 프로젝트: 바로 삭제하지 말고 **2주간 pause** → 문제 없으면 삭제
- Vercel 프로젝트: 도메인 연결 해제 후 삭제

**롤백** (전환 당일 문제 발생 시):
1. APP_DOMAIN DNS 를 Vercel 로 복귀
2. 기존 Supabase 프로젝트 resume (pause 상태였다면)
3. ⚠️ 전환 후 VPS 에 쌓인 주문은 기존 DB 에 없다 — `orders`/`order_items` 를 수동 반영
