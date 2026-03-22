'use client';

import type { Order } from '@/types/order';

interface SettlementSummaryProps {
  orders: Order[];
}

export const SettlementSummary = ({ orders }: SettlementSummaryProps) => {
  const formatPrice = (amount: number) =>
    new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(amount);

  const completedOrders = orders.filter((o) => o.status === 'completed');
  const cashOrders = completedOrders.filter((o) => o.payment_method === 'cash');
  const cardOrders = completedOrders.filter((o) => o.payment_method === 'card');

  const totalRevenue = completedOrders.reduce((sum, o) => sum + o.total_amount, 0);
  const cashRevenue = cashOrders.reduce((sum, o) => sum + o.total_amount, 0);
  const cardRevenue = cardOrders.reduce((sum, o) => sum + o.total_amount, 0);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <h3 className="font-bold text-lg mb-3">📊 오늘의 정산</h3>
      <div className="grid grid-cols-3 gap-3">
        <div className="text-center p-3 bg-green-50 rounded-lg">
          <p className="text-xs text-gray-500">총 매출</p>
          <p className="font-bold text-lg text-green-700">{formatPrice(totalRevenue)}</p>
          <p className="text-xs text-gray-400">{completedOrders.length}건</p>
        </div>
        <div className="text-center p-3 bg-blue-50 rounded-lg">
          <p className="text-xs text-gray-500">현금</p>
          <p className="font-bold text-lg text-blue-700">{formatPrice(cashRevenue)}</p>
          <p className="text-xs text-gray-400">{cashOrders.length}건</p>
        </div>
        <div className="text-center p-3 bg-purple-50 rounded-lg">
          <p className="text-xs text-gray-500">카드</p>
          <p className="font-bold text-lg text-purple-700">{formatPrice(cardRevenue)}</p>
          <p className="text-xs text-gray-400">{cardOrders.length}건</p>
        </div>
      </div>
    </div>
  );
};
