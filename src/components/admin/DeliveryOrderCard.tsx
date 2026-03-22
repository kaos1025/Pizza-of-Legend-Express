'use client';

import { useState } from 'react';
import { formatPrice } from '@/lib/utils';
import type { Order } from '@/types/order';

interface DeliveryOrderCardProps {
  order: Order;
  onComplete: (orderId: string, paymentMethod: 'cash' | 'card') => void;
}

function getElapsedTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return '방금';
  if (minutes < 60) return `${minutes}분`;
  const hours = Math.floor(minutes / 60);
  return `${hours}시간 ${minutes % 60}분`;
}

export const DeliveryOrderCard = ({ order, onComplete }: DeliveryOrderCardProps) => {
  const [loading, setLoading] = useState<string | null>(null);

  const handleComplete = async (method: 'cash' | 'card') => {
    setLoading(method);
    try {
      const res = await fetch(`/api/admin/orders/${order.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'completed', payment_method: method }),
      });
      if (res.ok) {
        onComplete(order.id, method);
      }
    } catch {
      // Will update on next poll
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div>
          <span className="text-2xl font-bold text-pizza-dark">{order.room_number}호</span>
          <span className="text-sm text-gray-400 ml-2">{order.order_number}</span>
        </div>
        <span className="text-xs text-orange-500 font-medium bg-orange-50 px-2 py-1 rounded-full">
          배달중 {getElapsedTime(order.updated_at)}
        </span>
      </div>

      <div className="text-sm text-gray-600 space-y-0.5 mb-4">
        {order.items.map((item, i) => (
          <span key={i} className="inline-block mr-2">
            {item.name.en}{item.size && ` (${item.size})`} ×{item.quantity}
            {i < order.items.length - 1 && ','}
          </span>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <span className="font-bold text-pizza-red text-xl">{formatPrice(order.total_amount)}</span>
        <div className="flex gap-2">
          <button
            onClick={() => handleComplete('cash')}
            disabled={loading !== null}
            className="bg-green-500 hover:bg-green-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm transition-colors disabled:opacity-50 min-w-[90px]"
          >
            {loading === 'cash' ? (
              <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              '💵 현금'
            )}
          </button>
          <button
            onClick={() => handleComplete('card')}
            disabled={loading !== null}
            className="bg-blue-500 hover:bg-blue-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm transition-colors disabled:opacity-50 min-w-[90px]"
          >
            {loading === 'card' ? (
              <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              '💳 카드'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
