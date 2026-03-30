'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRealtimeOrders } from '@/hooks/useRealtimeOrders';
import {
  requestNotificationPermission,
  notifyNewOrder,
  getNotificationPermission,
  getTtsSettings,
  saveTtsSettings,
  type TtsSettings,
} from '@/lib/admin/notifications';
import { OrderCard } from './OrderCard';
import { OrderFilterBar } from './OrderFilterBar';
import { SettlementSummary } from './SettlementSummary';
import type { Order } from '@/types/order';
import { Bell, Wifi, WifiOff, Volume2, VolumeX } from 'lucide-react';

export const AdminOrderCenter = () => {
  const [filter, setFilter] = useState('all');
  const [notifPermission, setNotifPermission] = useState<string>('default');
  const [hotelMap, setHotelMap] = useState<Record<string, string>>({});
  const [hotelKoMap, setHotelKoMap] = useState<Record<string, string>>({});
  const [hotelDeliveryTypeMap, setHotelDeliveryTypeMap] = useState<Record<string, string>>({});
  const [ttsSettings, setTtsSettings] = useState<TtsSettings>({ enabled: true, volume: 1.0 });

  useEffect(() => {
    setTtsSettings(getTtsSettings());
  }, []);

  useEffect(() => {
    fetch('/api/hotels')
      .then((res) => res.json())
      .then((data) => {
        const map: Record<string, string> = {};
        const koMap: Record<string, string> = {};
        const dtMap: Record<string, string> = {};
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (data.hotels || []).forEach((h: any) => {
          map[h.id] = h.name_en;
          koMap[h.id] = h.name_ko || h.name_en;
          dtMap[h.id] = h.delivery_type || 'door_to_door';
        });
        setHotelMap(map);
        setHotelKoMap(koMap);
        setHotelDeliveryTypeMap(dtMap);
      })
      .catch(() => {});
  }, []);

  const handleNewOrder = useCallback((order: Order) => {
    // Only notify for genuinely new pending orders
    if (order.status !== 'pending') return;
    const hotelNameKo = hotelKoMap[order.hotel_id] || hotelMap[order.hotel_id] || order.hotel_id;
    notifyNewOrder(order.order_number, hotelNameKo, order.room_number, order.order_type);
  }, [hotelMap, hotelKoMap]);

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

  const handleToggleTts = () => {
    const next = { ...ttsSettings, enabled: !ttsSettings.enabled };
    setTtsSettings(next);
    saveTtsSettings(next);
  };

  const handleTtsVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = { ...ttsSettings, volume: parseFloat(e.target.value) };
    setTtsSettings(next);
    saveTtsSettings(next);
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
      <div className="flex items-center justify-between flex-wrap gap-2">
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
        <div className="flex items-center gap-2">
          {/* TTS toggle */}
          <button
            onClick={handleToggleTts}
            className={`flex items-center gap-1 text-xs px-3 py-1.5 rounded-full transition-colors ${
              ttsSettings.enabled
                ? 'text-green-700 bg-green-50 hover:bg-green-100'
                : 'text-gray-400 bg-gray-50 hover:bg-gray-100'
            }`}
            title={ttsSettings.enabled ? '음성 알림 끄기' : '음성 알림 켜기'}
          >
            {ttsSettings.enabled ? <Volume2 className="w-3 h-3" /> : <VolumeX className="w-3 h-3" />}
            음성 {ttsSettings.enabled ? 'ON' : 'OFF'}
          </button>
          {ttsSettings.enabled && (
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={ttsSettings.volume}
              onChange={handleTtsVolumeChange}
              className="w-16 h-1 accent-green-600"
              title={`볼륨: ${Math.round(ttsSettings.volume * 100)}%`}
            />
          )}
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
              <OrderCard key={order.id} order={order} onStatusChanged={updateOrder} hotelMap={hotelMap} hotelKoMap={hotelKoMap} hotelDeliveryTypeMap={hotelDeliveryTypeMap} />
            ))}
          </div>
        </section>
      )}

      {activeOrders.length > 0 && (
        <section>
          <h2 className="font-bold text-base mb-2">진행중 ({activeOrders.length})</h2>
          <div className="space-y-3">
            {activeOrders.map((order) => (
              <OrderCard key={order.id} order={order} onStatusChanged={updateOrder} hotelMap={hotelMap} hotelKoMap={hotelKoMap} hotelDeliveryTypeMap={hotelDeliveryTypeMap} />
            ))}
          </div>
        </section>
      )}

      {doneOrders.length > 0 && (
        <section>
          <h2 className="font-bold text-base mb-2">처리 완료 ({doneOrders.length})</h2>
          <div className="space-y-3">
            {doneOrders.map((order) => (
              <OrderCard key={order.id} order={order} onStatusChanged={updateOrder} hotelMap={hotelMap} hotelKoMap={hotelKoMap} hotelDeliveryTypeMap={hotelDeliveryTypeMap} />
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
