'use client';

import { useTranslations, useLocale } from 'next-intl';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Check, ChefHat, Truck, Package, Loader2 } from 'lucide-react';
import { useOrderTracking } from '@/hooks/useOrderTracking';
import { formatPrice } from '@/lib/utils';
import type { OrderStatus } from '@/types/order';

const steps: { status: OrderStatus; icon: React.ReactNode }[] = [
  { status: 'pending', icon: <Package className="w-5 h-5" /> },
  { status: 'confirmed', icon: <ChefHat className="w-5 h-5" /> },
  { status: 'delivering', icon: <Truck className="w-5 h-5" /> },
  { status: 'completed', icon: <Check className="w-5 h-5" /> },
];

export default function OrderTrackingPage() {
  const t = useTranslations('order');
  const locale = useLocale();
  const router = useRouter();
  const params = useParams();
  const orderId = params.id as string;

  const { order, loading, isConnected } = useOrderTracking({ orderId });

  const currentStatus = order?.status || 'pending';
  const currentStepIndex = steps.findIndex((s) => s.status === currentStatus);

  if (loading) {
    return (
      <div className="min-h-screen bg-warm-white">
        <Header />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-pizza-red" />
        </div>
      </div>
    );
  }

  if (currentStatus === 'cancelled') {
    return (
      <div className="min-h-screen bg-warm-white">
        <Header />
        <main className="max-w-[430px] mx-auto px-4 py-6 text-center">
          <span className="text-5xl mb-3 block">❌</span>
          <h1 className="text-xl font-bold text-pizza-dark">Order Cancelled</h1>
          <p className="text-gray-500 mt-2">{order?.order_number}</p>
          <Button
            onClick={() => router.push(`/${locale}`)}
            variant="outline"
            className="mt-6 rounded-xl"
          >
            {t('backToMenu')}
          </Button>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-warm-white">
      <Header />
      <main className="max-w-[430px] mx-auto px-4 py-6">
        <div className="text-center mb-8">
          <span className="text-5xl mb-3 block">
            {currentStatus === 'completed' ? '🎉' : '🍕'}
          </span>
          <h1 className="text-2xl font-bold text-pizza-dark">{t('thankYou')}</h1>
          <p className="text-sm text-gray-500 mt-1">{t('estimatedTime')}</p>
        </div>

        {/* Order Number */}
        <div className="bg-white rounded-2xl p-4 shadow-sm text-center mb-6">
          <p className="text-sm text-gray-500">{t('orderNumber')}</p>
          <p className="text-2xl font-bold text-pizza-dark mt-1">{order?.order_number || orderId}</p>
          {!isConnected && (
            <p className="text-xs text-gray-400 mt-1">Auto-refreshing...</p>
          )}
        </div>

        {/* Status Stepper */}
        <div className="bg-white rounded-2xl p-6 shadow-sm mb-6">
          <div className="relative">
            {steps.map((step, index) => {
              const isActive = index <= currentStepIndex;
              const isCurrent = index === currentStepIndex;
              return (
                <div key={step.status} className="flex items-start mb-6 last:mb-0">
                  <div className="relative flex flex-col items-center mr-4">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        isActive
                          ? isCurrent
                            ? 'bg-pizza-red text-white animate-pulse'
                            : 'bg-success-green text-white'
                          : 'bg-gray-200 text-gray-400'
                      }`}
                    >
                      {step.icon}
                    </div>
                    {index < steps.length - 1 && (
                      <div
                        className={`w-0.5 h-8 mt-1 ${
                          index < currentStepIndex ? 'bg-success-green' : 'bg-gray-200'
                        }`}
                      />
                    )}
                  </div>
                  <div className="pt-2">
                    <p
                      className={`font-medium ${
                        isActive ? 'text-pizza-dark' : 'text-gray-400'
                      }`}
                    >
                      {t(`status.${step.status}`)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Order Details */}
        {order?.items && order.items.length > 0 && (
          <div className="bg-white rounded-2xl p-4 shadow-sm mb-6">
            <h3 className="font-bold text-pizza-dark mb-2">{t('orderDetails')}</h3>
            <div className="space-y-2 text-sm text-gray-600">
              {order.items.map((item, i) => (
                <div key={i} className="flex items-center gap-2.5">
                  <div className="relative w-9 h-9 rounded-lg bg-orange-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                    {item.image_url ? (
                      <Image src={item.image_url} alt="" fill sizes="36px" className="object-cover" />
                    ) : (
                      <span className="text-base">🍕</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="truncate block">
                      {item.name[locale as keyof typeof item.name] || item.name.en}
                    </span>
                    {item.size && <span className="text-xs text-gray-400">{item.size}</span>}
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {item.quantity > 1 && <span className="text-xs text-gray-400">×{item.quantity}</span>}
                    <span className="font-medium">{formatPrice(item.unitPrice * item.quantity)}</span>
                  </div>
                </div>
              ))}
              <div className="border-t pt-1 mt-1 font-bold flex justify-between">
                <span>Total</span>
                <span className="text-pizza-red">{formatPrice(order.total_amount)}</span>
              </div>
            </div>
          </div>
        )}

        <Button
          onClick={() => router.push(`/${locale}`)}
          variant="outline"
          className="w-full rounded-xl"
        >
          {t('backToMenu')}
        </Button>
      </main>
    </div>
  );
}
