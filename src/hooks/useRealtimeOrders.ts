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
  pollingInterval = 3000,
}: UseRealtimeOrdersOptions) {
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [isConnected, setIsConnected] = useState(false);
  const previousOrderIdsRef = useRef<Set<string>>(new Set(initialOrders.map(o => o.id)));
  const channelRef = useRef<RealtimeChannel | null>(null);
  // Always use latest callback without re-creating fetchOrders / re-subscribing
  const onNewOrderRef = useRef(onNewOrder);
  onNewOrderRef.current = onNewOrder;

  const fetchOrders = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/orders');
      if (!res.ok) return;
      const data = await res.json();
      const fetchedOrders: Order[] = data.orders || [];

      // Detect new orders
      for (const order of fetchedOrders) {
        if (!previousOrderIdsRef.current.has(order.id) && onNewOrderRef.current) {
          onNewOrderRef.current(order);
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

    // Try Supabase Realtime
    if (isSupabaseConfigured()) {
      const client = createBrowserClient();
      if (client) {
        const channel = client
          .channel('admin-orders')
          .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'orders' },
            () => {
              // Refetch to get full order with items
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
          client.removeChannel(channel);
        };
      }
    }

    // Fallback: polling
    const interval = setInterval(fetchOrders, pollingInterval);
    return () => clearInterval(interval);
  }, [fetchOrders, pollingInterval]);

  const updateOrder = useCallback((updatedOrder: Order) => {
    setOrders(prev => prev.map(o => o.id === updatedOrder.id ? updatedOrder : o));
  }, []);

  return { orders, isConnected, updateOrder, refetch: fetchOrders };
}
