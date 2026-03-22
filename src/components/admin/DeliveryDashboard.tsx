'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRealtimeOrders } from '@/hooks/useRealtimeOrders';
import { HotelDeliveryGroup } from './HotelDeliveryGroup';
import { DailySettlementTable } from './DailySettlementTable';
import { Truck } from 'lucide-react';
import type { Order } from '@/types/order';

export const DeliveryDashboard = () => {
  const { orders, updateOrder } = useRealtimeOrders({
    initialOrders: [],
  });

  const [hotelMap, setHotelMap] = useState<Record<string, { name: string; note: string }>>({});
  const [hotelNameMap, setHotelNameMap] = useState<Record<string, string>>({});

  useEffect(() => {
    fetch('/api/hotels')
      .then((res) => res.json())
      .then((data) => {
        const map: Record<string, { name: string; note: string }> = {};
        const nameMap: Record<string, string> = {};
        (data.hotels || []).forEach((h: { id: string; name_en: string; delivery_note?: string }) => {
          map[h.id] = { name: h.name_en, note: h.delivery_note || '' };
          nameMap[h.id] = h.name_en;
        });
        setHotelMap(map);
        setHotelNameMap(nameMap);
      })
      .catch(() => {});
  }, []);

  const deliveringOrders = orders.filter((o) => o.status === 'delivering');

  // Group by hotel
  const hotelGroups: Record<string, Order[]> = {};
  deliveringOrders.forEach((order) => {
    if (!hotelGroups[order.hotel_id]) hotelGroups[order.hotel_id] = [];
    hotelGroups[order.hotel_id].push(order);
  });

  const handleComplete = useCallback((orderId: string, paymentMethod: 'cash' | 'card') => {
    const order = orders.find((o) => o.id === orderId);
    if (order) {
      updateOrder({
        ...order,
        status: 'completed',
        payment_method: paymentMethod,
        updated_at: new Date().toISOString(),
      });
    }
  }, [orders, updateOrder]);

  return (
    <div className="space-y-6">
      {/* Active deliveries header */}
      <div className="flex items-center gap-2">
        <Truck className="w-5 h-5 text-orange-500" />
        <h2 className="font-bold text-lg">배달 중</h2>
        <span className="bg-orange-100 text-orange-700 text-sm font-bold px-2.5 py-0.5 rounded-full">
          {deliveringOrders.length}건
        </span>
      </div>

      {/* Hotel groups */}
      {Object.keys(hotelGroups).length > 0 ? (
        <div className="space-y-6">
          {Object.entries(hotelGroups).map(([hotelId, hotelOrders]) => (
            <HotelDeliveryGroup
              key={hotelId}
              hotelId={hotelId}
              orders={hotelOrders}
              onComplete={handleComplete}
              hotelMap={hotelMap}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-gray-400">
          <Truck className="w-16 h-16 mx-auto mb-4 opacity-30" />
          <p className="font-medium">현재 배달 중인 주문이 없습니다</p>
        </div>
      )}

      {/* Daily settlement */}
      <DailySettlementTable orders={orders} hotelMap={hotelNameMap} />
    </div>
  );
};
