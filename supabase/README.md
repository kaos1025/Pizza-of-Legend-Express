# supabase/ — 스키마와 Edge Function 소스

인프라(VPS self-hosted Supabase 의 운영·백업·롤백)는 `deploy/README.md` 참고.

| 경로 | 역할 |
|------|------|
| `schema_vps_snapshot.sql` | **실 운영 스키마의 진실 원천.** VPS DB 에서 뜬 `pg_dump --schema-only` 스냅샷 (2026-10-12) |
| `functions/send-order-push/` | Edge Function 소스. VPS `volumes/functions/` 에 복사해서 배포한다 (CLI deploy 아님) |
| `config.toml` | Supabase CLI 로컬 설정. 호스티드 프로젝트와는 더 이상 연결돼 있지 않다 |
| `archive/` | 호스티드 시절 SQL. 실 DB 와 계보가 달라 적용 금지 (기록용) |

## 스키마 변경 절차

1. VPS 에서 SQL 로 직접 변경한다 (Studio SQL Editor 또는 `docker exec ... psql`).
2. 변경 후 스냅샷을 다시 뜬다 (컨테이너 이름은 `docker ps` 로 확인):
   ```bash
   # VPS: /srv/pizza/supabase
   docker exec supabase-db pg_dump -U supabase_admin -d postgres --schema-only --schema=public \
     --no-owner --no-privileges > /tmp/schema_vps_snapshot.sql
   ```
3. 로컬로 가져와 `supabase/schema_vps_snapshot.sql` 을 교체한다. **커밋 전 반드시**:
   - `notify_send_order_push()` 함수 본문에 service role 키가 평문으로 들어간다.
     `grep -nE 'eyJ[A-Za-z0-9_-]{10,}'` 로 찾아 `__SERVICE_ROLE_KEY__` 로 치환할 것 (레포는 public).
   - PowerShell 리다이렉션으로 저장했다면 UTF-8 BOM 이 붙는다. 제거할 것 (psql 첫 줄 파싱이 깨진다).
4. 변경 내용을 `src/types/` 와 `src/lib/` 에 반영한다.

## 스냅샷으로 새 DB 를 만들 때

- 스냅샷은 `public` 스키마만 담는다. `auth`/`storage` 등 시스템 스키마는 self-hosted 스택이 만든다.
- 실행 전 `__SERVICE_ROLE_KEY__` 를 해당 환경의 SERVICE_ROLE_KEY 로 바꿔야 주문 알림 트리거가 동작한다.
- 데이터까지 필요하면 스냅샷이 아니라 `/srv/pizza-backups/` 의 `pg_dump -Fc` 백업을 `pg_restore` 한다.
