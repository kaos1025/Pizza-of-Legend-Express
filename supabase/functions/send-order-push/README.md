# send-order-push Edge Function

신규 주문(`orders` INSERT)을 감지하면 활성 Admin 디바이스 전체에 Web Push 알림을 발사합니다.

> 2026-10-12 부터 VPS self-hosted Supabase 에서 돌아간다. 배포·시크릿·로그 모두 CLI 가 아니라 VPS 에서 다룬다.
> 인프라 전반은 `deploy/README.md` 참고.

## 호출 경로

1. **Production**: `orders` AFTER INSERT 트리거 `trg_send_order_push` → `notify_send_order_push()` → pg_net
   → `http://api-gw:8000/functions/v1/send-order-push` (VPS 내부 경로, Cloudflare 를 거치지 않음)
2. **테스트**: `POST { "test": true }` (Next.js `/api/admin/push/test` 또는 직접 curl)

트리거 함수가 `apikey` + `Authorization: Bearer <SERVICE_ROLE_KEY>` 헤더를 직접 넣는다.
함수 내부에서는 이 헤더가 `Bearer ${SERVICE_ROLE_KEY}` 와 정확히 일치하는지 검증한다 (게이트웨이 JWT 검증은 꺼져 있음).
트리거 정의는 `supabase/schema_vps_snapshot.sql` 참고. 호스티드 시절의 Dashboard Database Webhook 은 제거됐다.

## 알림 채널

| 채널 | 조건 | 트리거 |
|---|---|---|
| Web Push (admin 디바이스) | `admin_push_subscriptions.is_active = true` 행 존재 | 항상 |
| Telegram 봇 | `TELEGRAM_BOT_TOKEN` + `TELEGRAM_CHAT_ID` 설정 시 | 항상 (Push 와 병렬) |

Telegram 미설정 시 silent skip — Push 만 동작. 함수 응답의 `telegram` 필드로 발사 결과 확인 가능.

## 배포 (VPS)

```bash
# 로컬에서 소스 복사
scp -r supabase/functions/send-order-push deploy@76.13.187.38:/srv/pizza/supabase/volumes/functions/

# VPS 에서 재시작
ssh deploy@76.13.187.38 'cd /srv/pizza/supabase && sh run.sh restart functions'
```

## 환경변수 (VPS `/srv/pizza/supabase/.env`)

| 변수 | 비고 |
|---|---|
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | 스택이 자동 주입 |
| `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` | 앱(Vercel)과 **동일한 값**이어야 기존 구독이 유효하다 |
| `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` | 선택. 비우면 텔레그램 silent skip |

`.env` 수정 후 `sh run.sh restart functions` 로 반영한다 (`docker-compose.pizza.yml` 이 functions 컨테이너에 주입).

## 단독 테스트 (curl)

```bash
SERVICE_ROLE_KEY="<VPS .env 의 SERVICE_ROLE_KEY>"

curl -X POST \
  "https://pizza-api.jullyssy.shop/functions/v1/send-order-push" \
  -H "Authorization: Bearer ${SERVICE_ROLE_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"test": true}'
```

응답 예시:

```json
{
  "ok": true,
  "mode": "test",
  "total": 1, "sent": 1, "failed": 0, "deactivated": 0,
  "telegram": { "enabled": true, "sent": true }
}
```

- `telegram.enabled = false` → 환경변수 미설정 (정상, 비활성 상태)
- `telegram.enabled = true && sent = false` → 발사 시도했으나 실패 (BOT_TOKEN/CHAT_ID 오류 가능)

## Telegram 봇 설정 (선택)

### 1. BotFather 로 봇 생성

1. 텔레그램 앱에서 **@BotFather** 검색 → 1:1 대화 시작
2. `/newbot` 명령 → 봇 이름(예: `Pizza of Legend 알림`) → username(예: `pol_express_notify_bot`, **반드시 `bot` 으로 끝나야 함**)
3. BotFather 가 출력한 **HTTP API token** 복사 (형식: `1234567890:ABC...`) — 이게 `TELEGRAM_BOT_TOKEN`

### 2. 자기 chat_id 확인

1. 텔레그램에서 방금 만든 봇 검색 → 대화 시작 → **Start** 버튼 누르고 아무 메시지("hi") 전송
2. 다음 URL 을 브라우저나 curl 로 열기 (TOKEN 자리에 위에서 받은 토큰):
   ```
   https://api.telegram.org/bot<TOKEN>/getUpdates
   ```
3. JSON 응답에서 `"chat":{"id":<숫자>,...}` 의 숫자 = `TELEGRAM_CHAT_ID`

### 3. VPS `.env` 에 등록 + 재시작

```bash
# VPS: /srv/pizza/supabase/.env 에 추가
TELEGRAM_BOT_TOKEN=<위에서 받은 토큰>
TELEGRAM_CHAT_ID=<위에서 받은 숫자>

# 반영
sh run.sh restart functions
```

### 4. 검증

Admin 페이지의 **🧪 테스트 알림 보내기** 누르거나 위 curl 호출 → 봇에서 "🧪 Telegram 연동 테스트" 메시지 수신 확인.

### 끄고 싶다면

`.env` 에서 두 변수를 지우거나 비운 뒤 `sh run.sh restart functions`.

## 실패 처리 로직

| 상태 | 동작 |
|---|---|
| HTTP 410 / 404 (Gone) | `is_active = false` (subscription 만료) |
| 기타 실패 | `failure_count + 1`, **3회 연속 실패 시** 비활성화 |
| 성공 | `failure_count = 0`, `last_success_at = now()` |

## 로그 확인

```bash
ssh deploy@76.13.187.38 'cd /srv/pizza/supabase && sh run.sh logs functions'
```

검색어 예: `[send-order-push] order=` / `push failed`
