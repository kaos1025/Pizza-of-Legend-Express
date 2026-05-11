// ============================================================
// Pizza of Legend Express — send-order-push Edge Function
// ------------------------------------------------------------
// Trigger:
//   1) Database Webhook (orders INSERT) — production path
//   2) POST { test: true } — manual smoke test (호출 from
//      /api/admin/push/test 또는 직접 curl)
//
// Channels:
//   - Web Push (admin_push_subscriptions 전체)
//   - Telegram (TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID 설정 시)
//
// Auth:
//   Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>
//
// Env (Supabase Secrets):
//   - SUPABASE_URL                (auto-injected)
//   - SUPABASE_SERVICE_ROLE_KEY   (auto-injected)
//   - VAPID_PUBLIC_KEY
//   - VAPID_PRIVATE_KEY
//   - VAPID_SUBJECT
//   - TELEGRAM_BOT_TOKEN          (optional — 백업 채널)
//   - TELEGRAM_CHAT_ID            (optional — 백업 채널)
// ============================================================

import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import webpush from "npm:web-push@3.6.7";

// ------------------------------------------------------------
// Env & Clients
// ------------------------------------------------------------

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY") ?? "";
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY") ?? "";
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") ?? "mailto:admin@pizzalegend.kr";

const TG_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN") ?? "";
const TG_CHAT_ID = Deno.env.get("TELEGRAM_CHAT_ID") ?? "";
const TG_ENABLED = !!(TG_TOKEN && TG_CHAT_ID);

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("[send-order-push] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
}
if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
  console.error("[send-order-push] Missing VAPID_PUBLIC_KEY or VAPID_PRIVATE_KEY");
}
if (!TG_ENABLED) {
  console.log("[send-order-push] Telegram channel disabled (TELEGRAM_BOT_TOKEN/CHAT_ID not set)");
}

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

const supabase: SupabaseClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ------------------------------------------------------------
// Types
// ------------------------------------------------------------

interface DatabaseWebhookPayload {
  type: "INSERT" | "UPDATE" | "DELETE";
  table: string;
  schema: string;
  // deno-lint-ignore no-explicit-any
  record: Record<string, any>;
  // deno-lint-ignore no-explicit-any
  old_record: Record<string, any> | null;
}

interface NotificationPayload {
  title: string;
  body: string;
  tag: string;
  orderNumber?: string;
  url: string;
  requireInteraction: boolean;
}

interface BroadcastResult {
  total: number;
  sent: number;
  failed: number;
  deactivated: number;
}

interface TelegramResult {
  enabled: boolean;
  sent: boolean;
}

// ------------------------------------------------------------
// Entry
// ------------------------------------------------------------

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders() });
  }
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  const expected = `Bearer ${SERVICE_ROLE_KEY}`;
  if (!SERVICE_ROLE_KEY || authHeader !== expected) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON" }, 400);
  }

  // ---------- Test mode ----------
  // deno-lint-ignore no-explicit-any
  if ((body as any)?.test === true) {
    const notification: NotificationPayload = {
      title: "🧪 테스트 알림",
      body: "Push 알림이 정상 동작합니다. (Pizza of Legend Express)",
      tag: `test-${Date.now()}`,
      url: "/admin/orders",
      requireInteraction: false,
    };
    const telegramText = [
      "🧪 Telegram 연동 테스트",
      "",
      "Push + Telegram 양쪽 채널이 정상 동작합니다.",
      "(Pizza of Legend Express)",
    ].join("\n");

    const [pushResult, tgResult] = await Promise.all([
      broadcastPush(notification),
      sendTelegram(telegramText),
    ]);
    console.log(`[send-order-push] test mode push=${JSON.stringify(pushResult)} tg=${JSON.stringify(tgResult)}`);
    return jsonResponse({
      ok: true,
      mode: "test",
      ...pushResult,
      telegram: tgResult,
    });
  }

  // ---------- Database Webhook ----------
  const webhook = body as DatabaseWebhookPayload;
  if (webhook?.type !== "INSERT" || webhook?.table !== "orders" || !webhook?.record) {
    return jsonResponse({
      error: "Invalid webhook payload",
      hint: "expected { type: 'INSERT', table: 'orders', record: {...} }",
      received: { type: webhook?.type, table: webhook?.table },
    }, 400);
  }

  const built = await buildOrderNotifications(webhook.record);
  if (!built) {
    return jsonResponse({ error: "Failed to build notifications" }, 500);
  }

  const [pushResult, tgResult] = await Promise.all([
    broadcastPush(built.notification),
    sendTelegram(built.telegramText),
  ]);
  console.log(
    `[send-order-push] order=${webhook.record.order_number} push=${JSON.stringify(pushResult)} tg=${JSON.stringify(tgResult)}`,
  );
  return jsonResponse({
    ok: true,
    mode: "webhook",
    orderNumber: webhook.record.order_number,
    ...pushResult,
    telegram: tgResult,
  });
});

// ------------------------------------------------------------
// Build notifications (push + telegram) from new order record
// ------------------------------------------------------------

interface OrderNotifications {
  notification: NotificationPayload;
  telegramText: string;
}

// deno-lint-ignore no-explicit-any
async function buildOrderNotifications(order: Record<string, any>): Promise<OrderNotifications | null> {
  const orderId: string = order.id;
  const orderNumber: string = order.order_number ?? "";
  const orderType: "delivery" | "pickup" = order.order_type ?? "delivery";
  const totalAmount: number = order.total_amount ?? 0;
  const deliveryFee: number = order.delivery_fee ?? 0;
  const hotelId: string | null = order.hotel_id ?? null;
  const roomNumber: string | null = order.room_number ?? null;
  const messengerPlatform: string | null = order.messenger_platform ?? null;
  const messengerId: string | null = order.messenger_id ?? null;
  const specialRequest: string | null = order.special_request ?? null;

  if (!orderId) {
    console.error("[send-order-push] Missing order.id in record");
    return null;
  }

  let hotelName = "";
  if (hotelId) {
    const { data: hotel, error } = await supabase
      .from("hotels")
      .select("name_ko, name_en")
      .eq("id", hotelId)
      .maybeSingle();
    if (error) console.warn("[send-order-push] hotel fetch warn:", error.message);
    hotelName = hotel?.name_ko ?? hotel?.name_en ?? "";
  }

  const { data: items, error: itemsError } = await supabase
    .from("order_items")
    .select(`
      quantity,
      size,
      menu_item:menu_items!order_items_menu_item_id_fkey(name_ko),
      half1:menu_items!order_items_half1_item_id_fkey(name_ko),
      half2:menu_items!order_items_half2_item_id_fkey(name_ko)
    `)
    .eq("order_id", orderId);

  if (itemsError) console.warn("[send-order-push] order_items fetch warn:", itemsError.message);

  const itemSummary = buildItemSummary(items ?? []);

  // --------- Push notification ---------
  const typeLabel = orderType === "pickup" ? "[픽업]" : "[배달]";
  let locationLabel = "";
  if (orderType === "pickup") {
    locationLabel = "픽업 주문";
  } else if (hotelName && roomNumber) {
    locationLabel = `${hotelName} ${roomNumber}호`;
  } else if (hotelName) {
    locationLabel = hotelName;
  } else {
    locationLabel = "주문";
  }

  const notification: NotificationPayload = {
    title: `🍕 새 주문! ${typeLabel} ${locationLabel}`.trim(),
    body: `${itemSummary} / ₩${totalAmount.toLocaleString("ko-KR")}`,
    tag: `order-${orderNumber || orderId}`,
    orderNumber,
    url: "/admin/orders",
    requireInteraction: true,
  };

  // --------- Telegram text ---------
  const lines: string[] = [];
  lines.push("🍕 새 주문 도착!");
  lines.push("");
  lines.push(`타입: ${orderType === "pickup" ? "🏪 픽업" : "🛵 배달"}`);
  if (orderType === "delivery" && (hotelName || roomNumber)) {
    const loc = `${hotelName ?? ""}${roomNumber ? ` ${roomNumber}호` : ""}`.trim();
    if (loc) lines.push(`위치: ${loc}`);
  }
  lines.push(`메뉴: ${itemSummary}`);
  lines.push(`합계: ₩${totalAmount.toLocaleString("ko-KR")}`);
  if (orderType === "delivery" && deliveryFee > 0) {
    lines.push(`(배달료 ₩${deliveryFee.toLocaleString("ko-KR")} 포함)`);
  }
  if (messengerPlatform || messengerId) {
    const contact = `${messengerPlatform ?? ""} ${messengerId ?? ""}`.trim();
    if (contact) lines.push(`연락처: ${contact}`);
  }
  if (specialRequest) {
    lines.push(`요청사항: ${specialRequest}`);
  }
  lines.push("");
  lines.push(`주문번호: ${orderNumber}`);

  return { notification, telegramText: lines.join("\n") };
}

// deno-lint-ignore no-explicit-any
function buildItemSummary(items: any[]): string {
  if (!items || items.length === 0) return "주문 항목 없음";
  const first = items[0];
  const firstQty: number = first.quantity ?? 1;
  let firstName = "";
  if (first.half1?.name_ko && first.half2?.name_ko) {
    firstName = `반반(${first.half1.name_ko}/${first.half2.name_ko})`;
  } else if (first.menu_item?.name_ko) {
    firstName = first.menu_item.name_ko;
  } else {
    firstName = "주문";
  }
  if (first.size) firstName += ` ${first.size}`;
  if (firstQty > 1) firstName += ` x${firstQty}`;
  const totalItems = items.reduce((s, it) => s + (it.quantity ?? 1), 0);
  if (totalItems <= firstQty) return firstName;
  return `${firstName} 외 ${totalItems - firstQty}건`;
}

// ------------------------------------------------------------
// Telegram channel
// ------------------------------------------------------------

async function sendTelegram(text: string): Promise<TelegramResult> {
  if (!TG_ENABLED) return { enabled: false, sent: false };
  try {
    const res = await fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: TG_CHAT_ID,
        text,
        disable_notification: false,
      }),
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      console.error(`[Telegram] HTTP ${res.status}: ${errText}`);
      return { enabled: true, sent: false };
    }
    return { enabled: true, sent: true };
  } catch (err) {
    console.error("[Telegram] error:", err);
    return { enabled: true, sent: false };
  }
}

// ------------------------------------------------------------
// Broadcast push to all active admin subscriptions
// ------------------------------------------------------------

async function broadcastPush(notification: NotificationPayload): Promise<BroadcastResult> {
  const { data: subs, error } = await supabase
    .from("admin_push_subscriptions")
    .select("id, endpoint, p256dh, auth, failure_count, is_active")
    .eq("is_active", true);

  if (error) {
    console.error("[send-order-push] Failed to fetch subscriptions:", error);
    return { total: 0, sent: 0, failed: 0, deactivated: 0 };
  }
  if (!subs || subs.length === 0) {
    return { total: 0, sent: 0, failed: 0, deactivated: 0 };
  }

  const payloadStr = JSON.stringify(notification);
  const nowIso = new Date().toISOString();

  const results = await Promise.allSettled(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          payloadStr,
          { TTL: 60 * 60 * 24 },
        );
        await supabase
          .from("admin_push_subscriptions")
          .update({ failure_count: 0, last_success_at: nowIso })
          .eq("id", sub.id);
        return { ok: true, id: sub.id, deactivated: false };
      } catch (err) {
        // deno-lint-ignore no-explicit-any
        const e = err as any;
        const status: number = e?.statusCode ?? 0;
        const expired = status === 404 || status === 410;
        const newFailureCount = (sub.failure_count ?? 0) + 1;
        const shouldDeactivate = expired || newFailureCount >= 3;

        await supabase
          .from("admin_push_subscriptions")
          .update({
            failure_count: newFailureCount,
            last_failure_at: nowIso,
            is_active: shouldDeactivate ? false : sub.is_active,
          })
          .eq("id", sub.id);

        console.error(
          `[send-order-push] push failed id=${sub.id} status=${status} expired=${expired} ` +
            `failureCount=${newFailureCount} deactivated=${shouldDeactivate} body=${e?.body ?? ""}`,
        );
        return { ok: false, id: sub.id, deactivated: shouldDeactivate };
      }
    }),
  );

  let sent = 0, failed = 0, deactivated = 0;
  for (const r of results) {
    if (r.status === "fulfilled") {
      if (r.value.ok) sent++;
      else {
        failed++;
        if (r.value.deactivated) deactivated++;
      }
    } else {
      failed++;
      console.error("[send-order-push] unexpected rejection:", r.reason);
    }
  }
  return { total: subs.length, sent, failed, deactivated };
}

// ------------------------------------------------------------
// Helpers
// ------------------------------------------------------------

function corsHeaders(): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, content-type",
  };
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders() },
  });
}
