'use client';

import { formatPrice } from '@/lib/utils';
import type { Order } from '@/types/order';

interface DailySettlementTableProps {
  hotelMap?: Record<string, string>;
  orders: Order[];
}

export const DailySettlementTable = ({ orders, hotelMap = {} }: DailySettlementTableProps) => {
  const completedOrders = orders
    .filter((o) => o.status === 'completed')
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());

  const totalCash = completedOrders
    .filter((o) => o.payment_method === 'cash')
    .reduce((s, o) => s + o.total_amount, 0);
  const totalCard = completedOrders
    .filter((o) => o.payment_method === 'card')
    .reduce((s, o) => s + o.total_amount, 0);
  const totalDeliveryFee = completedOrders.reduce((s, o) => s + (o.delivery_fee || 0), 0);
  const grandTotal = totalCash + totalCard;

  if (completedOrders.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400">
        <p>오늘 완료된 배달이 없습니다</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100">
        <h3 className="font-bold text-sm">📊 오늘 정산</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-gray-500 text-xs">
              <th className="text-left px-4 py-2">주문번호</th>
              <th className="text-center px-4 py-2">유형</th>
              <th className="text-left px-4 py-2">호텔</th>
              <th className="text-left px-4 py-2">호수</th>
              <th className="text-right px-4 py-2">금액</th>
              <th className="text-right px-4 py-2">배달비</th>
              <th className="text-center px-4 py-2">결제</th>
              <th className="text-right px-4 py-2">시각</th>
            </tr>
          </thead>
          <tbody>
            {completedOrders.map((order) => (
              <tr key={order.id} className="border-t border-gray-50 hover:bg-gray-50">
                <td className="px-4 py-2 font-mono text-xs">{order.order_number}</td>
                <td className="px-4 py-2 text-center">
                  <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                    order.order_type === 'pickup'
                      ? 'bg-purple-100 text-purple-700'
                      : 'bg-blue-100 text-blue-700'
                  }`}>
                    {order.order_type === 'pickup' ? '픽업' : '배달'}
                  </span>
                </td>
                <td className="px-4 py-2">
                  {order.order_type === 'pickup' ? '-' : (hotelMap[order.hotel_id] || order.hotel_id)}
                </td>
                <td className="px-4 py-2">
                  {order.order_type === 'pickup' ? '-' : `${order.room_number}호`}
                </td>
                <td className="px-4 py-2 text-right font-medium">{formatPrice(order.total_amount)}</td>
                <td className="px-4 py-2 text-right text-gray-500">
                  {order.delivery_fee ? formatPrice(order.delivery_fee) : '-'}
                </td>
                <td className="px-4 py-2 text-center">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    order.payment_method === 'cash'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-blue-100 text-blue-700'
                  }`}>
                    {order.payment_method === 'cash' ? '현금' : '카드'}
                  </span>
                </td>
                <td className="px-4 py-2 text-right text-gray-400 text-xs">
                  {new Date(order.updated_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-gray-200 font-bold text-sm">
              <td colSpan={4} className="px-4 py-3">합계</td>
              <td className="px-4 py-3 text-right text-pizza-red">{formatPrice(grandTotal)}</td>
              <td className="px-4 py-3 text-right text-orange-700">{formatPrice(totalDeliveryFee)}</td>
              <td colSpan={2} className="px-4 py-3 text-center text-xs font-normal text-gray-500">
                현금 {formatPrice(totalCash)} / 카드 {formatPrice(totalCard)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};
