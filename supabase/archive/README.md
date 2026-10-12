# archive — 호스티드 Supabase 시절 SQL (기록용, 적용 금지)

2026-10-12 VPS self-hosted 전환 이전에 쓰던 파일들이다. **실 운영 DB 와 계보가 다르다.**
실 DB 에는 `menu_prices`, `store_settings`, `set_menu_components`, `daily_settlements`, sales 뷰가 있고
`menu_categories` 등은 없다. 새 환경에 이 파일들을 순서대로 실행해도 운영 스키마가 나오지 않는다.

현재 스키마의 진실 원천은 상위 폴더의 `schema_vps_snapshot.sql` 이다 (`supabase/README.md` 참고).

| 파일 | 당시 용도 |
|------|-----------|
| `schema.sql` | 초기 스키마 (마지막 수정 2026-03-31) |
| `migration_guesthouse_split.sql` | 게스트하우스 4개 동 분리 |
| `migration_feedback_update.sql` | 클라이언트 피드백 반영 |
| `migration_admin_push_subscriptions.sql` | 관리자 Web Push 구독 테이블 |
| `migration_telegram_notifications_config.sql` | 텔레그램 알림 설정 |
| `migration_business_hours_and_size.sql` | 영업시간 차단 + 피자 L 단일 사이즈 |
| `storage-policies.sql` | 구 `storage.policies` 테이블 기반 정책. 현 Storage 는 `storage.objects` RLS 를 쓴다 |
