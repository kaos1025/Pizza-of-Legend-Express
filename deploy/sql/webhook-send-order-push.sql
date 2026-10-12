-- ============================================================
-- orders INSERT → send-order-push Edge Function 호출 트리거
--
-- 호스티드 Supabase 에서는 Dashboard 의 "Database Webhooks" UI 로
-- 만들었던 것을 self-hosted 에서는 pg_net 트리거로 직접 만든다.
--
-- 실행 전 치환할 것:
--   __API_DOMAIN__        → 예: api.pizzalegend.example.com
--   __SERVICE_ROLE_KEY__  → supabase-docker/.env 의 SERVICE_ROLE_KEY
--
-- 사전 조건: CREATE EXTENSION pg_net (post-restore.sql 에서 수행)
-- ============================================================

CREATE OR REPLACE FUNCTION public.notify_send_order_push()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- 비동기 HTTP POST — 주문 INSERT 를 블로킹하지 않는다.
  -- payload 형식은 Supabase Database Webhook 과 동일하게 맞춘다
  -- (Edge Function 이 type/table/record 를 검사함).
  PERFORM net.http_post(
    url := 'https://__API_DOMAIN__/functions/v1/send-order-push',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer __SERVICE_ROLE_KEY__'
    ),
    body := jsonb_build_object(
      'type', 'INSERT',
      'table', 'orders',
      'schema', 'public',
      'record', to_jsonb(NEW)
    )
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_send_order_push ON public.orders;
CREATE TRIGGER trg_send_order_push
  AFTER INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_send_order_push();
