'use client';

import { DeliveryOrderCard } from './DeliveryOrderCard';
import { getHotels } from '@/lib/menu-data';
import type { Order } from '@/types/order';

const hotelMap: Record<string, { name: string; note: string }> = {};
getHotels().forEach((h) => {
  hotelMap[h.id] = { name: h.name_en, note: h.delivery_note };
});

interface HotelDeliveryGroupProps {
  hotelId: string;
  orders: Order[];
  onComplete: (orderId: string, paymentMethod: 'cash' | 'card') => void;
}

export const HotelDeliveryGroup = ({ hotelId, orders, onComplete }: HotelDeliveryGroupProps) => {
  const hotel = hotelMap[hotelId] || { name: hotelId, note: '' };

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-base">🏨 {hotel.name}</h3>
          {hotel.note && (
            <p className="text-xs text-gray-400">{hotel.note}</p>
          )}
        </div>
        <span className="bg-orange-100 text-orange-700 text-xs font-bold px-2.5 py-1 rounded-full">
          {orders.length}건
        </span>
      </div>
      <div className="space-y-2">
        {orders.map((order) => (
          <DeliveryOrderCard key={order.id} order={order} onComplete={onComplete} />
        ))}
      </div>
    </section>
  );
};
