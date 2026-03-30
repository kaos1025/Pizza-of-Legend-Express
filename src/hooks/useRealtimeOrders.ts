'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createBrowserClient, isSupabaseConfigured } from '@/lib/supabase';
import type { Order } from '@/types/order';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface UseRealtimeOrdersOptions {
  initialOrders: Order[];
  onNewOrder?: (order: Order) => void;
  pollingInterval?: number;
}

export function useRealtimeOrders({
  initialOrders,
  onNewOrder,
  pollingInterval = 10000,
}: UseRealtimeOrdersOptions) {
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [isConnected, setIsConnected] = useState(false);
  const previousOrderIdsRef = useRef<Set<string>>(new Set(initialOrders.map(o => o.id)));
  const channelRef = useRef<RealtimeChannel | null>(null);
  const isInitialLoadDoneRef = useRef(false);
  // Always use latest callback without re-creating fetchOrders / re-subscribing
  const onNewOrderRef = useRef(onNewOrder);
  onNewOrderRef.current = onNewOrder;

  const fetchOrders = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/orders');
      if (!res.ok) return;
      const data = await res.json();
      const fetchedOrders: Order[] = data.orders || [];

      if (!isInitialLoadDoneRef.current) {
        // First fetch: populate known IDs without triggering notifications
        isInitialLoadDoneRef.current = true;
      } else {
        // Subsequent fetches: detect new pending orders
        for (const order of fetchedOrders) {
          if (!previousOrderIdsRef.current.has(order.id) && order.status === 'pending' && onNewOrderRef.current) {
            onNewOrderRef.current(order);
          }
        }
      }
      previousOrderIdsRef.current = new Set(fetchedOrders.map(o => o.id));
      setOrders(fetchedOrders);
      setIsConnected(true);
    } catch {
      setIsConnected(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();

    // Always poll as safety net (even with Realtime)
    const interval = setInterval(fetchOrders, pollingInterval);

    // Try Supabase Realtime for faster detection
    if (isSupabaseConfigured()) {
      const client = createBrowserClient();
      if (client) {
        const channel = client
          .channel('admin-orders')
          .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'orders' },
            () => {
              fetchOrders();
            }
          )
          .on(
            'postgres_changes',
            { event: 'UPDATE', schema: 'public', table: 'orders' },
            () => {
              fetchOrders();
            }
          )
          .subscribe((status) => {
            setIsConnected(status === 'SUBSCRIBED');
          });

        channelRef.current = channel;

        return () => {
          clearInterval(interval);
          client.removeChannel(channel);
        };
      }
    }

    return () => clearInterval(interval);
  }, [fetchOrders, pollingInterval]);

  const updateOrder = useCallback((updatedOrder: Order) => {
    setOrders(prev => prev.map(o => o.id === updatedOrder.id ? updatedOrder : o));
  }, []);

  return { orders, isConnected, updateOrder, refetch: fetchOrders };
}
