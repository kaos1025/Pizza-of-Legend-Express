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
# SSH 키는 Windows OpenSSH(C:\Windows\System32\OpenSSH\ssh.exe)에만 등록돼 있다 — PowerShell 의 ssh 가 그것.
# Git Bash(Claude Code 의 ! 프롬프트 포함)는 Git 번들 ssh 가 먼저 잡혀 인증이 실패하므로 전체 경로로 호출한다:
#   /c/Windows/System32/OpenSSH/ssh.exe deploy@76.13.187.38
ssh deploy@76.13.187.38
cd /srv/pizza/supabase

sh run.sh status            # 상태
sh run.sh logs functions    # 특정 서비스 로그
sh run.sh restart <svc>     # 재시작
sh update.sh --dry-run      # 업데이트 미리보기 (백업 먼저!)
```

- **백업**: 매일 04:00 cron (`/etc/cron.d/pizza-backup` → `/srv/pizza/backup.sh`)
  → `/srv/pizza-backups/pizza-db-YYYYMMDD.dump`(pg_dump -Fc, `--schema=public --schema=storage`) + `pizza-storage-*.tar.gz`(`volumes/storage` 전체), 7일 보관.
  storage 스키마는 버킷·객체 메타데이터용 — 이게 없으면 tar 의 파일을 복원해도 Storage API 가 서비스하지 못한다 (2026-10-13 추가).
  - **검증**: `vps-backup-check.sh` 를 VPS 로 흘려보낸다.
    PowerShell: `Get-Content deploy/scripts/vps-backup-check.sh -Raw | ssh deploy@76.13.187.38 "tr -d '\r' | bash -s"`
    / Git Bash: `/c/Windows/System32/OpenSSH/ssh.exe deploy@76.13.187.38 "tr -d '\r' | bash -s" < deploy/scripts/vps-backup-check.sh`
    — 최신 dump 를 임시 DB 에 복원해 public 테이블과 storage.buckets/objects 의 행 수를 운영 DB 와 나란히 출력하고 임시 DB 를 지운다 (백업이 없으면 먼저 생성).
    임시 DB 엔 auth 스키마가 없어 정책 몇 개가 오류 나는 것은 정상이고, 행 수가 일치하면 통과.
  - **오프사이트 사본**: `deploy/scripts/pull-backup.ps1` — 최신 dump + storage tar 를 로컬 PC `F:\juji\pizza-backups` 로 scp.
    `-Register` 스위치로 실행하면 작업 스케줄러에 매일 09:00 작업(PizzaBackupPull)을 등록한다 (PC 가 꺼져 있었으면 다음 기회에 실행).
    실행: `powershell -NoProfile -ExecutionPolicy Bypass -File deploy/scripts/pull-backup.ps1` — PowerShell·Git Bash 어디서든 되며, 스크립트가 Windows OpenSSH 를 직접 호출한다.
  - **복구** (빈 스택 기준, 순서대로. 명령은 db 컨테이너 안에서: `docker compose exec -T db <명령> < 파일`):
    1. public: `pg_restore -U supabase_admin -d postgres --clean --if-exists --schema=public <dump>` — `--schema=public` 을 빼면 `--clean` 이 storage 스키마까지 지운다
    2. storage 메타: `pg_restore -U supabase_admin -d postgres --data-only -n storage -t buckets -t objects <dump>`
    3. 파일: `tar -xzf pizza-storage-YYYYMMDD.tar.gz -C /srv/pizza/supabase/volumes` 후 `sh run.sh restart storage`
    4. `deploy/sql/post-restore.sql` 실행 — publication(realtime)·extension(pg_net)은 스키마 단위 dump 에 안 담긴다
- **Studio**: `https://pizza-api.jullyssy.shop` 루트 (basic auth: `.env` 의 DASHBOARD_USERNAME/PASSWORD)
- **Edge Function 수정 시**: `volumes/functions/send-order-push/` 교체 후 `sh run.sh restart functions`
- **방화벽**: ufw — 22, 8443 만 오픈 (8443은 Cloudflare 경유 전용)

## 롤백 (비상)

1. Vercel env 3개를 기존 호스티드 값으로 되돌리고 Redeploy
2. 호스티드 Supabase 프로젝트 resume (pause 상태였다면)
3. VPS 전환 후 쌓인 주문(`orders`/`order_items`)은 수동 반영 필요

> 호스티드 프로젝트를 삭제한 뒤에는 이 롤백은 불가능하다. 그 이후의 복구 수단은 `/srv/pizza-backups` 또는 로컬 오프사이트 사본의 dump 를 `pg_restore` 하는 것뿐이다.

## 정리 일정

2026-10-12 결정: 사이트가 당분간 미사용 상태라 "안정 운영 2주" 대기 없이 바로 마무리한다.

- [ ] VPS 백업 복구 검증 (`vps-backup-check.sh`) + 오프사이트 사본 1회 확보 (`pull-backup.ps1`)
- [ ] `.env.local` 을 VPS 키로 교체 (`deploy/scripts/sync-env-local.ps1`) — 호스티드 pause 전에. 로컬 dev/E2E 가 아직 호스티드를 보고 있음
- [ ] 호스티드 Supabase: DB 비밀번호 리셋(채팅/스크립트에 노출됨) → pause → 프로젝트 삭제.
      유료 플랜이면 pause 만으로는 과금이 멈추지 않는다 — org 플랜을 Free 로 내리거나 구독을 취소할 것
- [x] Vercel 은 유지 (무료 플랜) — 삭제하지 말 것

## (참고) 앱까지 VPS 로 옮기고 싶어질 때

`deploy/Dockerfile`, `deploy/docker-compose.app.yml`, `deploy/Caddyfile`, `deploy/env.app.example` 은
앱을 VPS 에서 돌리는 시나리오용으로 남겨둔 것. 단 그 경우 도메인이 바뀌므로 QR 재배포·push 재구독 필요.
`deploy/sql/` 와 `deploy/scripts/migrate-storage.mjs` 는 호스티드→VPS 이전 당시 도구 (완료됨, 기록용).
`deploy/scripts/` 의 나머지(`pull-backup.ps1`, `vps-backup-check.sh`, `sync-env-local.ps1`)는 운영용이다.
