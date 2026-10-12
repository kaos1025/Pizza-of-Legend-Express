--
-- PostgreSQL database dump
--

\restrict C2hVuXHlqZbxkVyBI2OtgXBkWvlgPIPMocGu4fUbz6QIEbBkzBmV8WBIUkqMCJx

-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA public;


--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS 'standard public schema';


--
-- Name: menu_category; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.menu_category AS ENUM (
    'pizza',
    'half_half',
    'set_menu',
    'side',
    'drink',
    'sauce'
);


--
-- Name: order_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.order_status AS ENUM (
    'pending',
    'confirmed',
    'delivering',
    'completed',
    'cancelled'
);


--
-- Name: payment_method; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.payment_method AS ENUM (
    'cash',
    'card'
);


--
-- Name: pizza_size; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.pizza_size AS ENUM (
    'S',
    'R',
    'L'
);


--
-- Name: check_business_hours(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_business_hours() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_settings  JSONB;
  v_enabled   BOOLEAN;
  v_manual    BOOLEAN;
  v_open      TIME;
  v_close     TIME;
  v_now       TIME;
  v_is_open   BOOLEAN;
BEGIN
  SELECT value INTO v_settings
  FROM store_settings
  WHERE key = 'business_hours';

  -- 설정 없으면 통과
  IF v_settings IS NULL THEN
    RETURN NEW;
  END IF;

  v_enabled := COALESCE((v_settings->>'enabled')::boolean, true);
  IF NOT v_enabled THEN
    RETURN NEW;
  END IF;

  v_manual := COALESCE((v_settings->>'manual_closed')::boolean, false);
  IF v_manual THEN
    RAISE EXCEPTION 'STORE_CLOSED_MANUAL';
  END IF;

  v_now   := (now() AT TIME ZONE 'Asia/Seoul')::time;
  v_open  := (v_settings->>'open')::time;
  v_close := (v_settings->>'close')::time;   -- '24:00' 도 유효

  IF v_close > v_open THEN
    v_is_open := (v_now >= v_open AND v_now < v_close);
  ELSE
    -- 자정 횡단 (예: 18:00~02:00)
    v_is_open := (v_now >= v_open OR v_now < v_close);
  END IF;

  IF NOT v_is_open THEN
    RAISE EXCEPTION 'STORE_CLOSED';
  END IF;

  RETURN NEW;
END;
$$;


--
-- Name: generate_order_number(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_order_number() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  today_count INT;
  today_str TEXT;
BEGIN
  today_str := TO_CHAR(NOW() AT TIME ZONE 'Asia/Seoul', 'YYYYMMDD');
  SELECT COUNT(*) + 1 INTO today_count
  FROM orders
  WHERE TO_CHAR(created_at AT TIME ZONE 'Asia/Seoul', 'YYYYMMDD') = today_str;
  NEW.order_number := 'POL-' || today_str || '-' || LPAD(today_count::TEXT, 3, '0');
  RETURN NEW;
END;
$$;


--
-- Name: notify_send_order_push(); Type: FUNCTION; Schema: public; Owner: -
--

-- NOTE: service role 키는 레포 커밋용으로 __SERVICE_ROLE_KEY__ 로 치환됨.
--       복원 시 VPS /srv/pizza/supabase/.env 의 SERVICE_ROLE_KEY 로 교체할 것.
CREATE FUNCTION public.notify_send_order_push() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  PERFORM net.http_post(
    url := 'http://api-gw:8000/functions/v1/send-order-push',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', '__SERVICE_ROLE_KEY__',
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


--
-- Name: update_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: admin_push_subscriptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admin_push_subscriptions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    endpoint text NOT NULL,
    p256dh text NOT NULL,
    auth text NOT NULL,
    user_agent text,
    device_label text,
    is_active boolean DEFAULT true NOT NULL,
    failure_count integer DEFAULT 0 NOT NULL,
    last_success_at timestamp with time zone,
    last_failure_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE admin_push_subscriptions; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.admin_push_subscriptions IS 'Admin 디바이스의 Web Push subscription 저장. 만료/실패 시 is_active=false 로 soft delete';


--
-- Name: COLUMN admin_push_subscriptions.endpoint; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.admin_push_subscriptions.endpoint IS 'Push service 가 발급한 unique endpoint URL (FCM, APNs 등)';


--
-- Name: COLUMN admin_push_subscriptions.device_label; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.admin_push_subscriptions.device_label IS 'Admin 이 설정 화면에서 직접 입력하는 디바이스 별명 (예: "사장님 iPhone")';


--
-- Name: COLUMN admin_push_subscriptions.failure_count; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.admin_push_subscriptions.failure_count IS '연속 실패 카운트. 3회 이상 시 자동 비활성화';


--
-- Name: orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.orders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_number text NOT NULL,
    hotel_id uuid,
    room_number text,
    messenger_id text,
    status public.order_status DEFAULT 'pending'::public.order_status,
    payment_method public.payment_method,
    total_amount integer NOT NULL,
    special_request text,
    language text DEFAULT 'en'::text,
    created_at timestamp with time zone DEFAULT now(),
    confirmed_at timestamp with time zone,
    delivering_at timestamp with time zone,
    completed_at timestamp with time zone,
    cancelled_at timestamp with time zone,
    order_type text DEFAULT 'delivery'::text NOT NULL,
    delivery_fee integer DEFAULT 0 NOT NULL,
    messenger_platform text,
    CONSTRAINT orders_messenger_platform_check CHECK ((messenger_platform = ANY (ARRAY['whatsapp'::text, 'wechat'::text, 'line'::text, 'kakaotalk'::text]))),
    CONSTRAINT orders_order_type_check CHECK ((order_type = ANY (ARRAY['delivery'::text, 'pickup'::text])))
);


--
-- Name: cumulative_sales_summary; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.cumulative_sales_summary AS
 SELECT count(*) AS total_orders,
    sum(total_amount) AS total_revenue,
    sum(delivery_fee) AS total_delivery_fees,
    sum(
        CASE
            WHEN (payment_method = 'cash'::public.payment_method) THEN total_amount
            ELSE 0
        END) AS total_cash,
    sum(
        CASE
            WHEN (payment_method = 'card'::public.payment_method) THEN total_amount
            ELSE 0
        END) AS total_card,
    min(created_at) AS first_order_at,
    max(created_at) AS last_order_at
   FROM public.orders
  WHERE (status = 'completed'::public.order_status);


--
-- Name: daily_sales_summary; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.daily_sales_summary AS
 SELECT date((created_at AT TIME ZONE 'Asia/Seoul'::text)) AS sale_date,
    count(*) AS order_count,
    sum(total_amount) AS total_sales,
    sum(delivery_fee) AS total_delivery_fee,
    sum(
        CASE
            WHEN (payment_method = 'cash'::public.payment_method) THEN total_amount
            ELSE 0
        END) AS cash_sales,
    sum(
        CASE
            WHEN (payment_method = 'card'::public.payment_method) THEN total_amount
            ELSE 0
        END) AS card_sales,
    count(
        CASE
            WHEN (order_type = 'delivery'::text) THEN 1
            ELSE NULL::integer
        END) AS delivery_count,
    count(
        CASE
            WHEN (order_type = 'pickup'::text) THEN 1
            ELSE NULL::integer
        END) AS pickup_count
   FROM public.orders
  WHERE (status = 'completed'::public.order_status)
  GROUP BY (date((created_at AT TIME ZONE 'Asia/Seoul'::text)));


--
-- Name: daily_settlements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.daily_settlements (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    date date NOT NULL,
    total_orders integer DEFAULT 0,
    total_cash integer DEFAULT 0,
    total_card integer DEFAULT 0,
    total_revenue integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: hotels; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.hotels (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name_ko text NOT NULL,
    name_en text NOT NULL,
    name_zh text,
    name_ja text,
    address text,
    delivery_note text,
    is_active boolean DEFAULT true,
    sort_order integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    delivery_type text DEFAULT 'door_to_door'::text NOT NULL,
    code text,
    lobby_notice_en text,
    lobby_notice_ko text,
    lobby_notice_zh text,
    lobby_notice_ja text
);


--
-- Name: menu_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.menu_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    category public.menu_category NOT NULL,
    name_ko text NOT NULL,
    name_en text NOT NULL,
    name_zh text,
    name_ja text,
    description_ko text,
    description_en text,
    description_zh text,
    description_ja text,
    image_url text,
    badge text,
    is_half_half_available boolean DEFAULT false,
    is_active boolean DEFAULT true,
    is_sold_out boolean DEFAULT false,
    sort_order integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: menu_prices; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.menu_prices (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    menu_item_id uuid NOT NULL,
    size public.pizza_size,
    price integer NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: order_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.order_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_id uuid NOT NULL,
    menu_item_id uuid NOT NULL,
    size public.pizza_size,
    quantity integer DEFAULT 1 NOT NULL,
    unit_price integer NOT NULL,
    subtotal integer NOT NULL,
    half1_item_id uuid,
    half2_item_id uuid,
    set_selections jsonb,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: set_menu_components; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.set_menu_components (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    set_menu_id uuid NOT NULL,
    component_type text NOT NULL,
    component_label_en text,
    component_label_ko text,
    is_choosable boolean DEFAULT false,
    fixed_item_id uuid,
    choosable_category public.menu_category,
    quantity integer DEFAULT 1,
    sort_order integer DEFAULT 0
);


--
-- Name: store_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.store_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    key text NOT NULL,
    value jsonb NOT NULL,
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: admin_push_subscriptions admin_push_subscriptions_endpoint_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_push_subscriptions
    ADD CONSTRAINT admin_push_subscriptions_endpoint_key UNIQUE (endpoint);


--
-- Name: admin_push_subscriptions admin_push_subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_push_subscriptions
    ADD CONSTRAINT admin_push_subscriptions_pkey PRIMARY KEY (id);


--
-- Name: daily_settlements daily_settlements_date_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_settlements
    ADD CONSTRAINT daily_settlements_date_key UNIQUE (date);


--
-- Name: daily_settlements daily_settlements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_settlements
    ADD CONSTRAINT daily_settlements_pkey PRIMARY KEY (id);


--
-- Name: hotels hotels_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hotels
    ADD CONSTRAINT hotels_pkey PRIMARY KEY (id);


--
-- Name: menu_items menu_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.menu_items
    ADD CONSTRAINT menu_items_pkey PRIMARY KEY (id);


--
-- Name: menu_prices menu_prices_menu_item_id_size_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.menu_prices
    ADD CONSTRAINT menu_prices_menu_item_id_size_key UNIQUE (menu_item_id, size);


--
-- Name: menu_prices menu_prices_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.menu_prices
    ADD CONSTRAINT menu_prices_pkey PRIMARY KEY (id);


--
-- Name: order_items order_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_pkey PRIMARY KEY (id);


--
-- Name: orders orders_order_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_order_number_key UNIQUE (order_number);


--
-- Name: orders orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_pkey PRIMARY KEY (id);


--
-- Name: set_menu_components set_menu_components_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.set_menu_components
    ADD CONSTRAINT set_menu_components_pkey PRIMARY KEY (id);


--
-- Name: store_settings store_settings_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.store_settings
    ADD CONSTRAINT store_settings_key_key UNIQUE (key);


--
-- Name: store_settings store_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.store_settings
    ADD CONSTRAINT store_settings_pkey PRIMARY KEY (id);


--
-- Name: idx_admin_push_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_admin_push_active ON public.admin_push_subscriptions USING btree (is_active) WHERE (is_active = true);


--
-- Name: idx_menu_items_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_menu_items_active ON public.menu_items USING btree (is_active, is_sold_out);


--
-- Name: idx_menu_items_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_menu_items_category ON public.menu_items USING btree (category);


--
-- Name: idx_menu_prices_item; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_menu_prices_item ON public.menu_prices USING btree (menu_item_id);


--
-- Name: idx_order_items_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_order_items_order ON public.order_items USING btree (order_id);


--
-- Name: idx_orders_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_created ON public.orders USING btree (created_at DESC);


--
-- Name: idx_orders_hotel; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_hotel ON public.orders USING btree (hotel_id);


--
-- Name: idx_orders_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_status ON public.orders USING btree (status);


--
-- Name: admin_push_subscriptions trg_admin_push_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_admin_push_updated BEFORE UPDATE ON public.admin_push_subscriptions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: orders trg_check_business_hours; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_check_business_hours BEFORE INSERT ON public.orders FOR EACH ROW EXECUTE FUNCTION public.check_business_hours();


--
-- Name: orders trg_send_order_push; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_send_order_push AFTER INSERT ON public.orders FOR EACH ROW EXECUTE FUNCTION public.notify_send_order_push();


--
-- Name: orders trigger_order_number; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_order_number BEFORE INSERT ON public.orders FOR EACH ROW WHEN ((new.order_number IS NULL)) EXECUTE FUNCTION public.generate_order_number();


--
-- Name: store_settings trigger_store_settings_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_store_settings_updated BEFORE UPDATE ON public.store_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: menu_prices menu_prices_menu_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.menu_prices
    ADD CONSTRAINT menu_prices_menu_item_id_fkey FOREIGN KEY (menu_item_id) REFERENCES public.menu_items(id) ON DELETE CASCADE;


--
-- Name: order_items order_items_half1_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_half1_item_id_fkey FOREIGN KEY (half1_item_id) REFERENCES public.menu_items(id);


--
-- Name: order_items order_items_half2_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_half2_item_id_fkey FOREIGN KEY (half2_item_id) REFERENCES public.menu_items(id);


--
-- Name: order_items order_items_menu_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_menu_item_id_fkey FOREIGN KEY (menu_item_id) REFERENCES public.menu_items(id);


--
-- Name: order_items order_items_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- Name: orders orders_hotel_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_hotel_id_fkey FOREIGN KEY (hotel_id) REFERENCES public.hotels(id);


--
-- Name: set_menu_components set_menu_components_fixed_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.set_menu_components
    ADD CONSTRAINT set_menu_components_fixed_item_id_fkey FOREIGN KEY (fixed_item_id) REFERENCES public.menu_items(id);


--
-- Name: set_menu_components set_menu_components_set_menu_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.set_menu_components
    ADD CONSTRAINT set_menu_components_set_menu_id_fkey FOREIGN KEY (set_menu_id) REFERENCES public.menu_items(id) ON DELETE CASCADE;


--
-- Name: order_items Anon can create order_items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anon can create order_items" ON public.order_items FOR INSERT WITH CHECK (true);


--
-- Name: orders Anon can create orders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anon can create orders" ON public.orders FOR INSERT WITH CHECK (true);


--
-- Name: daily_settlements Public read daily_settlements; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public read daily_settlements" ON public.daily_settlements FOR SELECT USING (true);


--
-- Name: hotels Public read hotels; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public read hotels" ON public.hotels FOR SELECT USING (true);


--
-- Name: menu_items Public read menu_items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public read menu_items" ON public.menu_items FOR SELECT USING (true);


--
-- Name: menu_prices Public read menu_prices; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public read menu_prices" ON public.menu_prices FOR SELECT USING (true);


--
-- Name: set_menu_components Public read set_components; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public read set_components" ON public.set_menu_components FOR SELECT USING (true);


--
-- Name: store_settings Public read store_settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public read store_settings" ON public.store_settings FOR SELECT USING (true);


--
-- Name: orders Read order by id; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Read order by id" ON public.orders FOR SELECT USING (true);


--
-- Name: order_items Read order items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Read order items" ON public.order_items FOR SELECT USING (true);


--
-- Name: admin_push_subscriptions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.admin_push_subscriptions ENABLE ROW LEVEL SECURITY;

--
-- Name: daily_settlements; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.daily_settlements ENABLE ROW LEVEL SECURITY;

--
-- Name: hotels; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.hotels ENABLE ROW LEVEL SECURITY;

--
-- Name: menu_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;

--
-- Name: menu_prices; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.menu_prices ENABLE ROW LEVEL SECURITY;

--
-- Name: order_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

--
-- Name: orders; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

--
-- Name: admin_push_subscriptions service_role_only; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY service_role_only ON public.admin_push_subscriptions USING ((auth.role() = 'service_role'::text)) WITH CHECK ((auth.role() = 'service_role'::text));


--
-- Name: set_menu_components; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.set_menu_components ENABLE ROW LEVEL SECURITY;

--
-- Name: store_settings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--

\unrestrict C2hVuXHlqZbxkVyBI2OtgXBkWvlgPIPMocGu4fUbz6QIEbBkzBmV8WBIUkqMCJx

