'use client';

import { useState, useEffect, useRef } from 'react';
import { createBrowserClient, isSupabaseConfigured } from '@/lib/supabase';
import type { OrderStatus } from '@/types/order';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface OrderTrackingData {
  id: string;
  order_number: string;
  status: OrderStatus;
  total_amount: number;
  created_at: string;
  items: Array<{
    name: Record<string, string>;
    size?: string;
    quantity: number;
    unitPrice: number;
    image_url?: string;
  }>;
}

interface UseOrderTrackingOptions {
  orderId: string;
}

export function useOrderTracking({ orderId }: UseOrderTrackingOptions) {
  const [order, setOrder] = useState<OrderTrackingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const retryCountRef = useRef(0);

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
              setOrder((prev) => {
                if (!prev) return prev;
                return {
                  ...prev,
                  status: newData.status as OrderStatus,
                };
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
  }, [orderId]);

  return { order, loading, isConnected };
}
