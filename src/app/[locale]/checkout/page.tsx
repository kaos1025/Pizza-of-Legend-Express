'use client';

import { useState, useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { HotelSelect } from '@/components/checkout/HotelSelect';
import { OrderSummary } from '@/components/checkout/OrderSummary';
import { PaymentNotice } from '@/components/checkout/PaymentNotice';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useCartStore } from '@/lib/store';
import { formatPrice } from '@/lib/utils';

export default function CheckoutPage() {
  const t = useTranslations('checkout');
  const locale = useLocale();
  const router = useRouter();
  const items = useCartStore((state) => state.items);
  const totalAmount = useCartStore((state) => state.totalAmount);
  const clearCart = useCartStore((state) => state.clearCart);

  const [hotelId, setHotelId] = useState('');

  // Pre-select hotel from QR code URL parameter (stored in localStorage on landing)
  useEffect(() => {
    const stored = localStorage.getItem('pol_preselected_hotel');
    if (stored && !hotelId) {
      setHotelId(stored);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [roomNumber, setRoomNumber] = useState('');
  const [messengerId, setMessengerId] = useState('');
  const [specialRequests, setSpecialRequests] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Honeypot field for bot prevention
  const [honeypot, setHoneypot] = useState('');

  const isValid = hotelId && roomNumber && /^\d{1,4}$/.test(roomNumber) && items.length > 0;

  const handlePlaceOrder = async () => {
    if (!isValid || honeypot) return;
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items,
          hotel_id: hotelId,
          room_number: roomNumber,
          messenger_id: messengerId || undefined,
          special_requests: specialRequests || undefined,
          total_amount: totalAmount,
          _hp: honeypot,
        }),
      });

      if (!response.ok) throw new Error('Order failed');

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
    } catch {
      alert('Failed to place order. Please try again.');
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

        {/* Order Summary */}
        <OrderSummary />

        {/* Delivery Info */}
        <div className="bg-white rounded-2xl p-4 shadow-sm space-y-4">
          <HotelSelect value={hotelId} onChange={setHotelId} />

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

          <div>
            <label className="block text-sm font-medium text-pizza-dark mb-1">
              {t('messengerLabel')}
            </label>
            <Input
              type="text"
              value={messengerId}
              onChange={(e) => setMessengerId(e.target.value)}
              placeholder={t('messengerPlaceholder')}
              className="rounded-xl"
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
          <div className="flex justify-between items-center mb-3">
            <span className="font-bold text-pizza-dark">{t('total')}</span>
            <span className="text-xl font-bold text-pizza-red">{formatPrice(totalAmount)}</span>
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
