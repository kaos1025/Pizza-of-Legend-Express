import type { OrderStatus } from '@/types/order';

interface StatusBadgeProps {
  status: OrderStatus;
}

const statusConfig: Record<OrderStatus, { label: string; color: string }> = {
  pending: { label: '대기중', color: 'bg-yellow-100 text-yellow-800' },
  confirmed: { label: '조리중', color: 'bg-blue-100 text-blue-800' },
  delivering: { label: '배달중', color: 'bg-orange-100 text-orange-800' },
  completed: { label: '완료', color: 'bg-green-100 text-green-800' },
  cancelled: { label: '취소됨', color: 'bg-gray-100 text-gray-600' },
};

export const StatusBadge = ({ status }: StatusBadgeProps) => {
  const config = statusConfig[status];
  return (
    <span className={`inline-flex ml-2 px-2 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
      {config.label}
    </span>
  );
};
