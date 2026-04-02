'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createBrowserClient, isSupabaseConfigured } from '@/lib/supabase';
import { showOrderStatusNotification } from '@/lib/order-notifications';
import type { OrderStatus } from '@/types/order';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface OrderTrackingData {
  id: string;
  order_number: string;
  status: OrderStatus;
  total_amount: number;
  delivery_fee?: number;
  order_type?: string;
  hotel_id?: string;
  created_at: string;
  language?: string;
  items: Array<{
    name: Record<string, string>;
    size?: string;
    quantity: number;
    unitPrice: number;
    image_url?: string;
    leftPizza?: Record<string, string>;
    rightPizza?: Record<string, string>;
  }>;
}

interface UseOrderTrackingOptions {
  orderId: string;
  locale: string;
}

export function useOrderTracking({ orderId, locale }: UseOrderTrackingOptions) {
  const [order, setOrder] = useState<OrderTrackingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const retryCountRef = useRef(0);
  const prevStatusRef = useRef<OrderStatus | null>(null);

  const handleStatusChange = useCallback((newStatus: OrderStatus, orderData: OrderTrackingData | null) => {
    const prevStatus = prevStatusRef.current;
    prevStatusRef.current = newStatus;

    // Only notify on actual transitions (not initial load)
    if (prevStatus && prevStatus !== newStatus) {
      const lang = orderData?.language || locale;
      const orderNumber = orderData?.order_number || '';
      showOrderStatusNotification(newStatus, orderNumber, lang);
    }
  }, [locale]);

  useEffect(() => {
    if (!orderId) return;

    let cancelled = false;

    // Initial fetch with retry for race condition (order may not exist yet)
    const fetchOrder = async () => {
      try {
        const res = await fetch(`/api/orders?id=${orderId}`);
        if (res.ok) {
          const data = await res.json();
          if (!cancelled) {
            setOrder(data);
            // Set initial status without triggering notification
            if (prevStatusRef.current === null) {
              prevStatusRef.current = data.status;
            } else if (prevStatusRef.current !== data.status) {
              handleStatusChange(data.status, data);
            }
            retryCountRef.current = 0;
          }
        } else if (res.status === 404 && retryCountRef.current < 3) {
          // Order may not be committed yet — retry after a short delay
          retryCountRef.current += 1;
          setTimeout(() => {
            if (!cancelled) fetchOrder();
          }, 1000);
          return; // Don't set loading=false yet
        }
      } catch {
        // Retry on next poll
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchOrder();

    // Try Supabase Realtime subscription
    if (isSupabaseConfigured()) {
      const client = createBrowserClient();
      if (client) {
        const channel = client
          .channel(`order-${orderId}`)
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'orders',
              filter: `id=eq.${orderId}`,
            },
            (payload) => {
              const newData = payload.new as Record<string, unknown>;
              const newStatus = newData.status as OrderStatus;
              setOrder((prev) => {
                if (!prev) return prev;
                const updated = { ...prev, status: newStatus };
                handleStatusChange(newStatus, updated);
                return updated;
              });
            }
          )
          .subscribe((status) => {
            setIsConnected(status === 'SUBSCRIBED');
          });

        channelRef.current = channel;

        return () => {
          cancelled = true;
          client.removeChannel(channel);
        };
      }
    }

    // Fallback: poll every 5 seconds
    const interval = setInterval(fetchOrder, 5000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [orderId, handleStatusChange]);

  return { order, loading, isConnected };
}
