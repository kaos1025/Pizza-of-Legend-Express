'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { HotelSelect } from '@/components/checkout/HotelSelect';
import { OrderSummary } from '@/components/checkout/OrderSummary';
import { PaymentNotice } from '@/components/checkout/PaymentNotice';
import { OrderTypeToggle } from '@/components/checkout/OrderTypeToggle';
import { PickupLocationCard } from '@/components/checkout/PickupLocationCard';
import { DeliveryAreaMap } from '@/components/checkout/DeliveryAreaMap';
import { MessengerInput } from '@/components/checkout/MessengerInput';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useCartStore } from '@/lib/store';
import { formatPrice } from '@/lib/utils';
import type { Hotel, Locale } from '@/types/menu';

// Default messenger by locale
const DEFAULT_MESSENGER: Record<string, string> = {
  en: 'whatsapp',
  zh: 'wechat',
  ja: 'line',
};

export default function CheckoutPage() {
  const t = useTranslations('checkout');
  const locale = useLocale() as Locale;
  const router = useRouter();
  const items = useCartStore((state) => state.items);
  const totalAmount = useCartStore((state) => state.totalAmount);
  const clearCart = useCartStore((state) => state.clearCart);

  const [orderType, setOrderType] = useState<'delivery' | 'pickup'>('delivery');
  const [hotelId, setHotelId] = useState('');
  const [, setSelectedHotel] = useState<Hotel | null>(null);

  // Pre-select hotel from QR code URL parameter (stored in localStorage on landing)
  useEffect(() => {
    const stored = localStorage.getItem('pol_preselected_hotel');
    if (stored && !hotelId) {
      setHotelId(stored);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [roomNumber, setRoomNumber] = useState('');
  const [messengerPlatform, setMessengerPlatform] = useState(DEFAULT_MESSENGER[locale] || 'kakaotalk');
  const [messengerId, setMessengerId] = useState('');
  const [specialRequests, setSpecialRequests] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Honeypot field for bot prevention
  const [honeypot, setHoneypot] = useState('');

  const deliveryFee = orderType === 'delivery' ? 1000 : 0;
  const grandTotal = totalAmount + deliveryFee;

  const isDelivery = orderType === 'delivery';
  const isValid = isDelivery
    ? (hotelId && roomNumber && /^\d{1,4}$/.test(roomNumber) && messengerPlatform && messengerId.trim() && items.length > 0)
    : (messengerPlatform && messengerId.trim() && items.length > 0);

  const handleHotelChange = useCallback((hotel: Hotel | null) => {
    setSelectedHotel(hotel);
  }, []);

  const handlePlaceOrder = async () => {
    if (!isValid || honeypot) return;
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items,
          hotel_id: isDelivery ? hotelId : null,
          room_number: isDelivery ? roomNumber : null,
          messenger_id: messengerId.trim(),
          messenger_platform: messengerPlatform,
          special_requests: specialRequests || undefined,
          total_amount: grandTotal,
          delivery_fee: deliveryFee,
          order_type: orderType,
          language: locale,
          _hp: honeypot,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        const errMsg = typeof errData.details === 'string' ? errData.details
          : typeof errData.error === 'string' ? errData.error
          : JSON.stringify(errData);
        throw new Error(errMsg || 'Order failed');
      }

      const order = await response.json();

      // Save order to localStorage for "My Orders" access
      try {
        const savedOrders = JSON.parse(localStorage.getItem('pol_my_orders') || '[]');
        savedOrders.unshift({ id: order.id, order_number: order.order_number, created_at: new Date().toISOString() });
        // Keep last 20 orders
        localStorage.setItem('pol_my_orders', JSON.stringify(savedOrders.slice(0, 20)));
      } catch { /* ignore */ }

      clearCart();
      router.push(`/${locale}/order/${order.id}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      console.error('Order error:', msg);
      alert(`Failed to place order: ${msg}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-warm-white">
      <Header />
      <main className="max-w-[430px] mx-auto px-4 py-4 space-y-4">
        <div className="flex items-center gap-3 mb-2">
          <button onClick={() => router.back()} className="text-pizza-dark hover:text-pizza-red">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-xl font-bold text-pizza-dark">{t('title')}</h1>
        </div>

        {/* Payment Notice - MOST PROMINENT */}
        <PaymentNotice />

        {/* Order Summary with delivery fee */}
        <OrderSummary deliveryFee={deliveryFee} />

        {/* Delivery / Pickup Toggle */}
        <OrderTypeToggle value={orderType} onChange={setOrderType} />

        {/* Delivery Info or Pickup Info */}
        <div className="bg-white rounded-2xl p-4 shadow-sm space-y-4">
          {isDelivery ? (
            <>
              <HotelSelect value={hotelId} onChange={setHotelId} onHotelChange={handleHotelChange} />

              <DeliveryAreaMap />

              <div>
                <label className="block text-sm font-medium text-pizza-dark mb-1">
                  {t('roomLabel')}
                </label>
                <Input
                  data-testid="room-number"
                  type="text"
                  value={roomNumber}
                  onChange={(e) => setRoomNumber(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  placeholder={t('roomPlaceholder')}
                  className="rounded-xl"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={4}
                />
              </div>
            </>
          ) : (
            <PickupLocationCard />
          )}

          {/* Messenger Contact — required for both modes */}
          <div className="border-t border-gray-100 pt-4">
            <MessengerInput
              platform={messengerPlatform}
              onPlatformChange={setMessengerPlatform}
              messengerId={messengerId}
              onMessengerIdChange={setMessengerId}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-pizza-dark mb-1">
              {t('specialLabel')}
            </label>
            <Textarea
              value={specialRequests}
              onChange={(e) => setSpecialRequests(e.target.value)}
              placeholder={t('specialPlaceholder')}
              className="rounded-xl resize-none"
              rows={2}
            />
          </div>

          {/* Honeypot - hidden from users */}
          <div className="absolute left-[-9999px]" aria-hidden="true">
            <input
              type="text"
              value={honeypot}
              onChange={(e) => setHoneypot(e.target.value)}
              tabIndex={-1}
              autoComplete="off"
            />
          </div>
        </div>

        {/* Place Order */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <div className="flex justify-between items-center mb-1">
            <span className="text-sm text-gray-500">{t('subtotal')}</span>
            <span className="text-sm text-gray-500">{formatPrice(totalAmount)}</span>
          </div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-gray-500">{t('deliveryFee')}</span>
            <span className="text-sm text-gray-500">
              {deliveryFee > 0 ? formatPrice(deliveryFee) : t('deliveryFeeFree')}
            </span>
          </div>
          <div className="flex justify-between items-center mb-3 border-t border-gray-100 pt-2">
            <span className="font-bold text-pizza-dark">{t('total')}</span>
            <span className="text-xl font-bold text-pizza-red">{formatPrice(grandTotal)}</span>
          </div>
          <Button
            data-testid="place-order"
            onClick={handlePlaceOrder}
            disabled={!isValid || isSubmitting}
            className="w-full bg-pizza-red hover:bg-red-700 disabled:bg-gray-300 text-white font-semibold py-3 rounded-xl text-base"
          >
            {isSubmitting ? '...' : t('placeOrder')}
          </Button>
        </div>
      </main>
    </div>
  );
}
