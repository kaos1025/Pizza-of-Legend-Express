'use client';

import { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';

interface DailySales {
  sale_date: string;
  order_count: number;
  total_sales: number;
  total_delivery_fee: number;
  cash_sales: number;
  card_sales: number;
  delivery_count: number;
  pickup_count: number;
}

interface CumulativeSales {
  total_orders: number;
  total_revenue: number;
  total_delivery_fees: number;
  total_cash: number;
  total_card: number;
  first_order_at: string | null;
  last_order_at: string | null;
}

const formatPrice = (amount: number) =>
  new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(amount);

const formatShortDate = (dateStr: string) => {
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()}`;
};

export const SalesDashboard = () => {
  const [daily, setDaily] = useState<DailySales[]>([]);
  const [cumulative, setCumulative] = useState<CumulativeSales | null>(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<7 | 30>(7);

  useEffect(() => {
    fetch('/api/admin/sales')
      .then((res) => res.json())
      .then((data) => {
        setDaily(data.daily || []);
        setCumulative(data.cumulative || null);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Today's stats from daily data
  const today = new Date().toISOString().slice(0, 10);
  const todayData = daily.find((d) => d.sale_date === today);

  // Chart data (reversed for ascending order, limited by range)
  const chartData = [...daily]
    .reverse()
    .slice(-range)
    .map((d) => ({
      date: formatShortDate(d.sale_date),
      cash: d.cash_sales || 0,
      card: d.card_sales || 0,
      orders: d.order_count || 0,
    }));

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-400">
        <div className="text-center">
          <span className="inline-block w-8 h-8 border-2 border-gray-300 border-t-pizza-red rounded-full animate-spin" />
          <p className="mt-2 text-sm">매출 데이터 로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">📊 매출 집계</h2>

      {/* Today's Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <p className="text-xs text-gray-500 mb-1">오늘 주문</p>
          <p className="text-2xl font-bold text-pizza-dark">{todayData?.order_count || 0}건</p>
          <p className="text-xs text-gray-400">
            배달 {todayData?.delivery_count || 0} / 픽업 {todayData?.pickup_count || 0}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <p className="text-xs text-gray-500 mb-1">오늘 매출</p>
          <p className="text-2xl font-bold text-green-700">{formatPrice(todayData?.total_sales || 0)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <p className="text-xs text-gray-500 mb-1">현금 / 카드</p>
          <p className="text-sm font-bold text-blue-700">{formatPrice(todayData?.cash_sales || 0)}</p>
          <p className="text-sm font-bold text-purple-700">{formatPrice(todayData?.card_sales || 0)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <p className="text-xs text-gray-500 mb-1">오늘 배달비</p>
          <p className="text-2xl font-bold text-orange-700">{formatPrice(todayData?.total_delivery_fee || 0)}</p>
        </div>
      </div>

      {/* Daily Sales Chart */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold">일별 매출</h3>
          <div className="flex gap-1">
            <button
              onClick={() => setRange(7)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                range === 7 ? 'bg-pizza-dark text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              7일
            </button>
            <button
              onClick={() => setRange(30)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                range === 30 ? 'bg-pizza-dark text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              30일
            </button>
          </div>
        </div>
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={(v) => `${(v / 10000).toFixed(0)}만`} tick={{ fontSize: 11 }} />
              <Tooltip
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                formatter={(value: any, name: any) => [
                  formatPrice(Number(value) || 0),
                  name === 'cash' ? '현금' : '카드',
                ]}
              />
              <Legend formatter={(value) => (value === 'cash' ? '현금' : '카드')} />
              <Bar dataKey="cash" stackId="a" fill="#3B82F6" name="cash" radius={[0, 0, 0, 0]} />
              <Bar dataKey="card" stackId="a" fill="#8B5CF6" name="card" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-[200px] text-gray-400 text-sm">
            데이터가 없습니다
          </div>
        )}
      </div>

      {/* Cumulative Summary */}
      {cumulative && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="font-bold mb-3">전체 누적 요약</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-500">총 주문 건수</p>
              <p className="font-bold text-lg">{cumulative.total_orders}건</p>
            </div>
            <div>
              <p className="text-gray-500">총 매출액</p>
              <p className="font-bold text-lg text-green-700">{formatPrice(cumulative.total_revenue || 0)}</p>
            </div>
            <div>
              <p className="text-gray-500">총 현금 매출</p>
              <p className="font-bold text-blue-700">{formatPrice(cumulative.total_cash || 0)}</p>
            </div>
            <div>
              <p className="text-gray-500">총 카드 매출</p>
              <p className="font-bold text-purple-700">{formatPrice(cumulative.total_card || 0)}</p>
            </div>
            <div>
              <p className="text-gray-500">총 배달비 수입</p>
              <p className="font-bold text-orange-700">{formatPrice(cumulative.total_delivery_fees || 0)}</p>
            </div>
            <div>
              <p className="text-gray-500">평균 주문 단가</p>
              <p className="font-bold">
                {cumulative.total_orders > 0
                  ? formatPrice(Math.round((cumulative.total_revenue || 0) / cumulative.total_orders))
                  : '₩0'}
              </p>
            </div>
            {cumulative.first_order_at && (
              <div className="col-span-2">
                <p className="text-gray-500">기간</p>
                <p className="font-medium">
                  {new Date(cumulative.first_order_at).toLocaleDateString('ko-KR')} ~ {cumulative.last_order_at ? new Date(cumulative.last_order_at).toLocaleDateString('ko-KR') : '현재'}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
