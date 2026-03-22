'use client';

import { useState } from 'react';
import { StatusBadge } from './StatusBadge';
import { formatPrice } from '@/lib/utils';
import { getHotels } from '@/lib/menu-data';
import type { Order, OrderStatus } from '@/types/order';

interface OrderCardProps {
  order: Order;
  onStatusChanged: (updatedOrder: Order) => void;
}

const hotelMap: Record<string, string> = {};
// Build hotel name map
const hotels = getHotels();
hotels.forEach((h) => { hotelMap[h.id] = h.name_en; });

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

function getElapsedTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return '방금 전';
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  return `${hours}시간 ${minutes % 60}분 전`;
}

export const OrderCard = ({ order, onStatusChanged }: OrderCardProps) => {
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  const actions = statusActions[order.status] || [];
  const hotelName = hotelMap[order.hotel_id] || order.hotel_id;

  const handleStatusChange = async (nextStatus: OrderStatus, label: string) => {
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
        <div className="flex items-center gap-2">
          <span className="font-bold text-base">{order.order_number}</span>
          <StatusBadge status={order.status} />
        </div>
        <span className="text-xs text-gray-400">{getElapsedTime(order.created_at)}</span>
      </div>

      <div className="mb-3">
        <p className="font-medium text-sm">
          {hotelName} · <span className="text-pizza-red font-bold">{order.room_number}호</span>
        </p>
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
        <span className="font-bold text-pizza-red text-lg">{formatPrice(order.total_amount)}</span>
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
