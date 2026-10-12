# 인프라 구성 — Vercel(앱) + VPS self-hosted Supabase

> 2026-10-12 전환 완료. 비용 문제로 호스티드 Supabase 를 접고 DB/Realtime/Storage/Edge Function 을
> VPS(Hostinger, 쿠알라룸푸르, Ubuntu 24.04, RAM 8GB)의 self-hosted Supabase 로 이전했다.
> **앱은 Vercel 에 그대로** 둔다 — 도메인(pizza-of-legend-express.vercel.app)이 유지되어
> 호텔 QR·관리자 push 구독·PWA 설치가 전부 보존되기 때문.

## 아키텍처

```
[고객/관리자]
  ├─ https://pizza-of-legend-express.vercel.app   (Next.js, Vercel, 함수 리전 sin1)
  └─ https://pizza-api.jullyssy.shop              (Supabase API: REST/Realtime/Storage/Functions)
        │  Cloudflare (Proxied A → 76.13.187.38, Origin Rule 443→8443, SSL Full)
        ▼
┌────────────── VPS 76.13.187.38 ──────────────┐
│ pizza-edge   caddy:2, :8443, tls internal     │
│    └→ api-gw (Envoy) :8000(127.0.0.1:8010)    │
│         ├ rest(PostgREST) ├ realtime          │
│         ├ storage(+imgproxy) ├ auth ├ studio  │
│         └ functions(send-order-push)          │
│ db (Postgres 17.6) — 트리거/웹훅 포함          │
│ supavisor 127.0.0.1:5432/6543                 │
└───────────────────────────────────────────────┘
```

- 설치 위치: `/srv/pizza/supabase` (upstream `supabase/docker` **self-hosted/v0.8.2** 기반, `setup.sh`로 부트스트랩)
- 오버레이: `docker-compose.pizza.yml` (게이트웨이·pooler 루프백 바인딩, pizza-edge, functions 시크릿 주입)
- `.env` 에 모든 시크릿 (JWT legacy 키 사용 — 앱/함수 인증은 legacy `ANON_KEY`/`SERVICE_ROLE_KEY`)
- **jullyssy-* 스택/호스트 Caddy(80/443)와 완전 분리** — 피자는 8443만 사용, 그쪽 인프라 건드리지 말 것

## Vercel 쪽 설정

| 항목 | 값 |
|------|-----|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://pizza-api.jullyssy.shop` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | VPS `.env` 의 `ANON_KEY` (legacy JWT) |
| `SUPABASE_SERVICE_ROLE_KEY` | VPS `.env` 의 `SERVICE_ROLE_KEY` (legacy JWT) |
| 함수 리전 | `sin1` (VPS 와 인접) |
| VAPID/ADMIN/TELEGRAM env | 기존 값 유지 |

`next.config.mjs` 가 `NEXT_PUBLIC_SUPABASE_URL` 호스트를 `next/image` 허용 목록에 자동 추가하므로
이미지 도메인 설정은 env 만 바꾸면 따라온다.

## 이전 과정에서 확정된 사실 (중요)

1. **레포의 `supabase/schema.sql`·migration 파일은 실 운영 스키마와 다른 계보** (실 DB엔 `menu_prices`,
   `store_settings`, `set_menu_components`, `daily_settlements`, sales 뷰가 있고 `menu_categories` 등은 없음).
   실제 스키마 스냅샷: **`supabase/schema_vps_snapshot.sql`** (2026-10-12 기준, 이게 진실).
2. 주문 알림: `orders` AFTER INSERT 트리거 `trg_send_order_push` → pg_net →
   `http://api-gw:8000/functions/v1/send-order-push` (내부 경로, Cloudflare 무관).
   호스티드 시절 대시보드 웹훅(`notify-admin-on-new-order`)은 중복이라 **제거함**.
3. 영업시간 차단: `trg_check_business_hours` (BEFORE INSERT) — 덤프로 함께 이전됨.
   데이터 복원 시엔 트리거 때문에 `pg_dump --disable-triggers` + `supabase_admin` 권한 필요.
4. Web Push: VAPID 키·앱 도메인이 유지되어 **기존 관리자 구독 5건 그대로 유효** (이전 후 실발송 검증 완료).
5. pizza-edge Caddyfile 에 `auto_https off` 금지 — `tls internal` 발급까지 꺼져서 TLS 핸드셰이크가 죽는다.
6. 비밀번호에 `@` 등 특수문자가 있으면 연결 URL 대신 `PGPASSWORD` + `-h/-U/-d` 파라미터 사용.

## 운영

```bash
ssh deploy@76.13.187.38
cd /srv/pizza/supabase

sh run.sh status            # 상태
sh run.sh logs functions    # 특정 서비스 로그
sh run.sh restart <svc>     # 재시작
sh update.sh --dry-run      # 업데이트 미리보기 (백업 먼저!)
```

- **백업**: 매일 04:00 cron (`/etc/cron.d/pizza-backup` → `/srv/pizza/backup.sh`)
  → `/srv/pizza-backups/pizza-db-YYYYMMDD.dump`(pg_dump -Fc) + `pizza-storage-*.tar.gz`, 7일 보관.
  주기적으로 VPS 외부로도 복사할 것. 복구: `pg_restore -U supabase_admin -d postgres --clean <dump>`
- **Studio**: `https://pizza-api.jullyssy.shop` 루트 (basic auth: `.env` 의 DASHBOARD_USERNAME/PASSWORD)
- **Edge Function 수정 시**: `volumes/functions/send-order-push/` 교체 후 `sh run.sh restart functions`
- **방화벽**: ufw — 22, 8443 만 오픈 (8443은 Cloudflare 경유 전용)

## 롤백 (비상)

1. Vercel env 3개를 기존 호스티드 값으로 되돌리고 Redeploy
2. 호스티드 Supabase 프로젝트 resume (pause 상태였다면)
3. VPS 전환 후 쌓인 주문(`orders`/`order_items`)은 수동 반영 필요

## 정리 일정

- [ ] 안정 운영 2주 확인 후 호스티드 Supabase 프로젝트 삭제 (그 전까지 pause)
- [ ] 호스티드 DB 비밀번호가 채팅/스크립트에 노출됐으므로 pause 전 리셋 권장
- [x] Vercel 은 유지 (무료 플랜) — 삭제하지 말 것

## (참고) 앱까지 VPS 로 옮기고 싶어질 때

`deploy/Dockerfile`, `deploy/docker-compose.app.yml`, `deploy/Caddyfile`, `deploy/env.app.example` 은
앱을 VPS 에서 돌리는 시나리오용으로 남겨둔 것. 단 그 경우 도메인이 바뀌므로 QR 재배포·push 재구독 필요.
`deploy/sql/`, `deploy/scripts/` 는 호스티드→VPS 이전 당시 사용한 도구 (완료됨, 기록용).
