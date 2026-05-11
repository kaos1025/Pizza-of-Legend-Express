# send-order-push Edge Function

신규 주문(`orders` INSERT)을 감지하면 활성 Admin 디바이스 전체에 Web Push 알림을 발사합니다.

## 호출 경로

1. **Production**: Supabase Database Webhook → 본 함수
2. **테스트**: `POST { "test": true }` (Next.js `/api/admin/push/test` 또는 직접 curl)

## 알림 채널

| 채널 | 조건 | 트리거 |
|---|---|---|
| Web Push (admin 디바이스) | `admin_push_subscriptions.is_active = true` 행 존재 | 항상 |
| Telegram 봇 | `TELEGRAM_BOT_TOKEN` + `TELEGRAM_CHAT_ID` Secrets 설정 시 | 항상 (Push 와 병렬) |

Telegram secrets 미설정 시 silent skip — Push 만 동작. 함수 응답의 `telegram` 필드로 발사 결과 확인 가능.

## 배포

```bash
# 함수 배포
supabase functions deploy send-order-push

# Secrets 등록 (최초 1회)
supabase secrets set VAPID_PUBLIC_KEY="<.env.local 의 NEXT_PUBLIC_VAPID_PUBLIC_KEY>"
supabase secrets set VAPID_PRIVATE_KEY="<.env.local 의 VAPID_PRIVATE_KEY>"
supabase secrets set VAPID_SUBJECT="<.env.local 의 VAPID_SUBJECT>"
```

> `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` 는 Supabase 가 자동 주입합니다.

## Database Webhook 설정

Supabase Dashboard → Database → Webhooks → "Create a new hook"

| 항목 | 값 |
|---|---|
| Name | `notify-admin-on-new-order` |
| Table | `orders` |
| Events | ✅ `Insert` (나머지 OFF) |
| Type | `Supabase Edge Functions` |
| Edge Function | `send-order-push` |
| HTTP Method | `POST` |
| HTTP Headers | `Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>` + `Content-Type: application/json` |
| HTTP Params | (비움) |

> ⚠ `supabase/config.toml` 에서 `verify_jwt = false` 로 게이트웨이 검증을 끄고 있어,
> Webhook 이 직접 `Authorization` 헤더를 명시적으로 보내야 한다.
> (게이트웨이의 자동 JWT 첨부는 새 API 키 포맷 `sb_secret_*` 와 호환되지 않음.)
> 함수 내부에서는 이 헤더가 `Bearer ${SERVICE_ROLE_KEY}` 와 정확히 일치하는지 검증한다.

## 단독 테스트 (curl)

```bash
# .env.local 또는 Supabase Dashboard에서 service_role 키 확인
SERVICE_ROLE_KEY="<your service role key>"
PROJECT_REF="sdvcaisxutdnagncxcgd"

curl -X POST \
  "https://${PROJECT_REF}.supabase.co/functions/v1/send-order-push" \
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

- `telegram.enabled = false` → Secrets 미설정 (정상, 비활성 상태)
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

### 3. Secrets 등록 + 재배포

```bash
supabase secrets set TELEGRAM_BOT_TOKEN="<위에서 받은 토큰>"
supabase secrets set TELEGRAM_CHAT_ID="<위에서 받은 숫자>"
supabase functions deploy send-order-push
```

### 4. 검증

Admin 페이지의 **🧪 테스트 알림 보내기** 누르거나 위 curl 호출 → 봇에서 "🧪 Telegram 연동 테스트" 메시지 수신 확인.

### 끄고 싶다면

```bash
supabase secrets unset TELEGRAM_BOT_TOKEN
supabase secrets unset TELEGRAM_CHAT_ID
supabase functions deploy send-order-push
```

## 실패 처리 로직

| 상태 | 동작 |
|---|---|
| HTTP 410 / 404 (Gone) | `is_active = false` (subscription 만료) |
| 기타 실패 | `failure_count + 1`, **3회 연속 실패 시** 비활성화 |
| 성공 | `failure_count = 0`, `last_success_at = now()` |

## 로그 확인

Supabase Dashboard → Edge Functions → `send-order-push` → Logs.

검색어 예: `[send-order-push] order=` / `push failed`
