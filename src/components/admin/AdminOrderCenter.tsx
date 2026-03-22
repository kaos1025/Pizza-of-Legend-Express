'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRealtimeOrders } from '@/hooks/useRealtimeOrders';
import { requestNotificationPermission, notifyNewOrder, getNotificationPermission } from '@/lib/admin/notifications';
import { OrderCard } from './OrderCard';
import { OrderFilterBar } from './OrderFilterBar';
import { SettlementSummary } from './SettlementSummary';
import type { Order } from '@/types/order';
import { Bell, Wifi, WifiOff } from 'lucide-react';

export const AdminOrderCenter = () => {
  const [filter, setFilter] = useState('all');
  const [notifPermission, setNotifPermission] = useState<string>('default');
  const [hotelMap, setHotelMap] = useState<Record<string, string>>({});

  useEffect(() => {
    fetch('/api/hotels')
      .then((res) => res.json())
      .then((data) => {
        const map: Record<string, string> = {};
        (data.hotels || []).forEach((h: { id: string; name_en: string }) => {
          map[h.id] = h.name_en;
        });
        setHotelMap(map);
      })
      .catch(() => {});
  }, []);

  const handleNewOrder = useCallback((order: Order) => {
    const hotelName = hotelMap[order.hotel_id] || order.hotel_id;
    notifyNewOrder(order.order_number, hotelName, order.room_number);
  }, [hotelMap]);

  const { orders, isConnected, updateOrder } = useRealtimeOrders({
    initialOrders: [],
    onNewOrder: handleNewOrder,
  });

  useEffect(() => {
    setNotifPermission(getNotificationPermission());
  }, []);

  const handleEnableNotifications = async () => {
    const perm = await requestNotificationPermission();
    setNotifPermission(perm);
  };

  // Filter orders
  const filteredOrders = orders.filter((o) => {
    if (filter === 'active') return ['pending', 'confirmed', 'delivering'].includes(o.status);
    if (filter === 'completed') return o.status === 'completed';
    if (filter === 'cancelled') return o.status === 'cancelled';
    return true;
  });

  // Counts
  const counts = {
    all: orders.length,
    active: orders.filter(o => ['pending', 'confirmed', 'delivering'].includes(o.status)).length,
    completed: orders.filter(o => o.status === 'completed').length,
    cancelled: orders.filter(o => o.status === 'cancelled').length,
  };

  // Group by status for display
  const pendingOrders = filteredOrders.filter(o => o.status === 'pending');
  const activeOrders = filteredOrders.filter(o => ['confirmed', 'delivering'].includes(o.status));
  const doneOrders = filteredOrders.filter(o => ['completed', 'cancelled'].includes(o.status));

  return (
    <div className="space-y-4">
      {/* Status bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isConnected ? (
            <span className="flex items-center gap-1 text-xs text-green-600">
              <Wifi className="w-3 h-3" /> 연결됨
            </span>
          ) : (
            <span className="flex items-center gap-1 text-xs text-gray-400">
              <WifiOff className="w-3 h-3" /> 폴링 모드
            </span>
          )}
        </div>
        {notifPermission !== 'granted' && notifPermission !== 'unsupported' && (
          <button
            onClick={handleEnableNotifications}
            className="flex items-center gap-1 text-xs text-pizza-red bg-red-50 px-3 py-1.5 rounded-full hover:bg-red-100"
          >
            <Bell className="w-3 h-3" />
            알림 활성화
          </button>
        )}
      </div>

      {/* Settlement */}
      <SettlementSummary orders={orders} />

      {/* Filter */}
      <OrderFilterBar activeFilter={filter} onFilterChange={setFilter} counts={counts} />

      {/* Orders */}
      {pendingOrders.length > 0 && (
        <section>
          <h2 className="font-bold text-base mb-2">신규 주문 ({pendingOrders.length})</h2>
          <div className="space-y-3">
            {pendingOrders.map((order) => (
              <OrderCard key={order.id} order={order} onStatusChanged={updateOrder} hotelMap={hotelMap} />
            ))}
          </div>
        </section>
      )}

      {activeOrders.length > 0 && (
        <section>
          <h2 className="font-bold text-base mb-2">진행중 ({activeOrders.length})</h2>
          <div className="space-y-3">
            {activeOrders.map((order) => (
              <OrderCard key={order.id} order={order} onStatusChanged={updateOrder} hotelMap={hotelMap} />
            ))}
          </div>
        </section>
      )}

      {doneOrders.length > 0 && (
        <section>
          <h2 className="font-bold text-base mb-2">처리 완료 ({doneOrders.length})</h2>
          <div className="space-y-3">
            {doneOrders.map((order) => (
              <OrderCard key={order.id} order={order} onStatusChanged={updateOrder} hotelMap={hotelMap} />
            ))}
          </div>
        </section>
      )}

      {orders.length === 0 && (
        <div className="text-center py-20 text-gray-400">
          <p className="text-5xl mb-4">📋</p>
          <p className="font-medium text-lg">아직 주문이 없습니다</p>
          <p className="text-sm mt-1">고객이 주문하면 여기에 실시간으로 표시됩니다</p>
        </div>
      )}
    </div>
  );
};
