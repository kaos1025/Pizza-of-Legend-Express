'use client';

import { useState } from 'react';
import { StatusBadge } from './StatusBadge';
import { formatPrice } from '@/lib/utils';
import { notifyDeliveryCompleted } from '@/lib/admin/notifications';
import { Copy, Check } from 'lucide-react';
import type { Order, OrderStatus } from '@/types/order';

interface OrderCardProps {
  order: Order;
  onStatusChanged: (updatedOrder: Order) => void;
  hotelMap?: Record<string, string>;
  hotelKoMap?: Record<string, string>;
  hotelDeliveryTypeMap?: Record<string, string>;
}

const statusActions: Record<OrderStatus, { label: string; next: OrderStatus; variant: string }[]> = {
  pending: [
    { label: '주문 확인', next: 'confirmed', variant: 'bg-blue-500 hover:bg-blue-600' },
    { label: '취소', next: 'cancelled', variant: 'bg-gray-400 hover:bg-gray-500' },
  ],
  confirmed: [
    { label: '배달 출발', next: 'delivering', variant: 'bg-orange-500 hover:bg-orange-600' },
    { label: '취소', next: 'cancelled', variant: 'bg-gray-400 hover:bg-gray-500' },
  ],
  delivering: [
    { label: '완료 (현금)', next: 'completed', variant: 'bg-green-500 hover:bg-green-600' },
    { label: '완료 (카드)', next: 'completed', variant: 'bg-green-600 hover:bg-green-700' },
    { label: '취소', next: 'cancelled', variant: 'bg-gray-400 hover:bg-gray-500' },
  ],
  completed: [],
  cancelled: [],
};

const MESSENGER_ICONS: Record<string, string> = {
  whatsapp: '💬',
  wechat: '💬',
  line: '💬',
  kakaotalk: '💬',
};

function getElapsedTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return '방금 전';
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  return `${hours}시간 ${minutes % 60}분 전`;
}

export const OrderCard = ({ order, onStatusChanged, hotelMap = {}, hotelKoMap = {}, hotelDeliveryTypeMap = {} }: OrderCardProps) => {
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [copiedMessenger, setCopiedMessenger] = useState(false);

  const actions = statusActions[order.status] || [];
  const hotelName = hotelMap[order.hotel_id] || order.hotel_id;
  const isPickup = order.order_type === 'pickup';
  const isLobbyOnly = hotelDeliveryTypeMap[order.hotel_id] === 'lobby_only';

  const handleCopyMessenger = () => {
    if (order.messenger_id) {
      navigator.clipboard.writeText(order.messenger_id).catch(() => {});
      setCopiedMessenger(true);
      setTimeout(() => setCopiedMessenger(false), 2000);
    }
  };

  const handleStatusChange = async (nextStatus: OrderStatus, label: string) => {
    // Confirmation dialog for lobby_only delivery start
    if (nextStatus === 'delivering' && isLobbyOnly) {
      const confirmed = window.confirm('이 호텔은 로비 픽업입니다. 고객에게 로비 하차 알림이 전송됩니다.');
      if (!confirmed) return;
    }

    setLoadingAction(label);
    try {
      const paymentMethod = label.includes('현금') ? 'cash' : label.includes('카드') ? 'card' : undefined;
      const res = await fetch(`/api/admin/orders/${order.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus, payment_method: paymentMethod }),
      });
      if (res.ok) {
        const { order: updated } = await res.json();
        onStatusChanged(updated);

        // TTS for delivery completion
        if (nextStatus === 'completed' && paymentMethod) {
          const hotelNameKo = hotelKoMap[order.hotel_id] || hotelMap[order.hotel_id] || order.hotel_id;
          notifyDeliveryCompleted(hotelNameKo, order.room_number, paymentMethod);
        }
      }
    } catch {
      // Silently fail — will be updated on next poll
    } finally {
      setLoadingAction(null);
    }
  };

  return (
    <div className={`bg-white rounded-xl border p-4 shadow-sm ${
      order.status === 'pending' ? 'border-pizza-red border-l-4' : 'border-gray-200'
    }`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-bold text-base">{order.order_number}</span>
          <StatusBadge status={order.status} />
          {/* Order type badge */}
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
            isPickup
              ? 'bg-purple-100 text-purple-700'
              : 'bg-blue-100 text-blue-700'
          }`}>
            {isPickup ? '🏪 픽업' : '🛵 배달'}
          </span>
          {/* Lobby only badge */}
          {!isPickup && isLobbyOnly && (
            <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-red-100 text-red-700">
              🔴 로비
            </span>
          )}
        </div>
        <span className="text-xs text-gray-400">{getElapsedTime(order.created_at)}</span>
      </div>

      <div className="mb-3 space-y-1">
        {isPickup ? (
          <p className="font-medium text-sm text-purple-700">픽업 주문</p>
        ) : (
          <p className="font-medium text-sm">
            {hotelName} · <span className="text-pizza-red font-bold">{order.room_number}호</span>
          </p>
        )}

        {/* Messenger info */}
        {order.messenger_id && (
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <span>{MESSENGER_ICONS[order.messenger_platform || ''] || '💬'}</span>
            <span className="capitalize">{order.messenger_platform || 'Messenger'}</span>
            <button
              onClick={handleCopyMessenger}
              className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-gray-100 hover:bg-gray-200 transition-colors"
              title="복사"
            >
              <span className="font-mono text-gray-700">{order.messenger_id}</span>
              {copiedMessenger ? (
                <Check className="w-3 h-3 text-green-500" />
              ) : (
                <Copy className="w-3 h-3 text-gray-400" />
              )}
            </button>
          </div>
        )}
      </div>

      <div className="text-sm text-gray-600 space-y-0.5 mb-3">
        {order.items.map((item, i) => (
          <p key={i}>
            {item.name.en} {item.size && `(${item.size})`} x{item.quantity}
          </p>
        ))}
        {(order.special_request || order.special_requests) && (
          <p className="text-orange-600 mt-1">{order.special_request || order.special_requests}</p>
        )}
      </div>

      <div className="flex items-center justify-between">
        <div>
          <span className="font-bold text-pizza-red text-lg">{formatPrice(order.total_amount)}</span>
          {order.delivery_fee > 0 && (
            <span className="text-xs text-gray-400 ml-1.5">(배달비 {formatPrice(order.delivery_fee)})</span>
          )}
        </div>
        <div className="flex gap-2">
          {actions.map((action) => (
            <button
              key={action.label}
              onClick={() => handleStatusChange(action.next, action.label)}
              disabled={loadingAction !== null}
              className={`${action.variant} text-white text-xs px-3 py-1.5 rounded-lg font-medium transition-all disabled:opacity-50`}
            >
              {loadingAction === action.label ? (
                <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                action.label
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
