import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, isSupabaseConnected } from '@/lib/supabase-admin';
import { createOrder, getOrderById, getOrderByNumber } from '@/lib/admin/orders';
import { checkRateLimit } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  try {
    // Get client IP for rate limiting
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || request.headers.get('x-real-ip')
      || 'unknown';

    // Rate limit check
    const rateLimit = checkRateLimit(ip);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many orders. Please try again later.' },
        {
          status: 429,
          headers: {
            'Retry-After': String(rateLimit.retryAfter || 300),
            'X-RateLimit-Remaining': '0',
          },
        }
      );
    }

    const body = await request.json();
    const { items, hotel_id, room_number, messenger_id, messenger_platform, special_request, special_requests, total_amount, delivery_fee, order_type, language, _hp } = body;

    // Honeypot check
    if (_hp) {
      // Bot detected — silently return fake success
      return NextResponse.json({ id: 'fake', order_number: 'POL-00000000-000' }, { status: 201 });
    }

    // Validate required fields
    const isDelivery = order_type !== 'pickup';
    if (!items?.length) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    if (isDelivery && (!hotel_id || !room_number)) {
      return NextResponse.json({ error: 'Missing required fields for delivery' }, { status: 400 });
    }

    // Validate room number (only for delivery)
    if (isDelivery && !/^\d{1,4}$/.test(room_number)) {
      return NextResponse.json({ error: 'Invalid room number' }, { status: 400 });
    }

    // Accept both singular and plural field names for backward compat
    const specialRequest = special_request || special_requests;

    // Server-side price validation
    let serverTotal = total_amount; // Default to client total for mock mode
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let resolvedItems: any[] = items;

    if (isSupabaseConnected()) {
      const supabase = createAdminClient()!;
      serverTotal = 0;
      resolvedItems = [];

      for (const item of items) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const resolvedItem: any = { ...item };

        if (item.type === 'half_half') {
          // Half & half: look up price from menu_prices for the half_half menu item
          // The half_half item has a known UUID prefix pattern, or we find it by category
          let halfHalfPrice = 0;
          const size = item.size || 'R';

          // Try by menu_item_id if provided
          if (item.menu_item_id || item.menuItemId) {
            const menuItemId = item.menu_item_id || item.menuItemId;
            const { data: priceRow } = await supabase
              .from('menu_prices')
              .select('price')
              .eq('menu_item_id', menuItemId)
              .eq('size', size)
              .single();
            if (priceRow) halfHalfPrice = priceRow.price;
          }

          // Fallback: find menu_item with category = 'half_half'
          if (!halfHalfPrice) {
            const { data: halfMenuItem } = await supabase
              .from('menu_items')
              .select('id')
              .eq('category', 'half_half')
              .limit(1)
              .single();

            if (halfMenuItem) {
              resolvedItem.menu_item_id = halfMenuItem.id;
              const { data: priceRow } = await supabase
                .from('menu_prices')
                .select('price')
                .eq('menu_item_id', halfMenuItem.id)
                .eq('size', size)
                .single();
              if (priceRow) halfHalfPrice = priceRow.price;
            }
          }

          // Resolve half pizza UUIDs
          if (item.leftPizza) {
            resolvedItem.half1_item_id = await resolveMenuItemId(supabase, item.leftPizza);
          }
          if (item.rightPizza) {
            resolvedItem.half2_item_id = await resolveMenuItemId(supabase, item.rightPizza);
          }

          serverTotal += halfHalfPrice * item.quantity;

        } else if (item.type === 'set_menu') {
          // Set menu: look up price from menu_prices by size
          const menuItemId = await resolveMenuItemId(supabase, item);
          if (menuItemId) {
            resolvedItem.menu_item_id = menuItemId;
            const size = item.size || null;
            let priceQuery = supabase
              .from('menu_prices')
              .select('price')
              .eq('menu_item_id', menuItemId);

            if (size) {
              priceQuery = priceQuery.eq('size', size);
            } else {
              priceQuery = priceQuery.is('size', null);
            }

            const { data: priceRow } = await priceQuery.single();
            if (priceRow) {
              serverTotal += priceRow.price * item.quantity;
            }
          }

        } else if (item.type === 'pizza') {
          // Pizza: look up price from menu_prices with size
          const menuItemId = await resolveMenuItemId(supabase, item);
          if (menuItemId) {
            resolvedItem.menu_item_id = menuItemId;
            const size = item.size || 'R';
            const { data: priceRow } = await supabase
              .from('menu_prices')
              .select('price')
              .eq('menu_item_id', menuItemId)
              .eq('size', size)
              .single();
            if (priceRow) {
              serverTotal += priceRow.price * item.quantity;
            }
          }

        } else {
          // Side, drink, sauce — single price (size IS NULL)
          const menuItemId = await resolveMenuItemId(supabase, item);
          if (menuItemId) {
            resolvedItem.menu_item_id = menuItemId;
            const { data: priceRow } = await supabase
              .from('menu_prices')
              .select('price')
              .eq('menu_item_id', menuItemId)
              .is('size', null)
              .single();
            if (priceRow) {
              serverTotal += priceRow.price * item.quantity;
            }
          }
        }

        resolvedItems.push(resolvedItem);
      }
    }

    // Add delivery fee to server total
    const finalDeliveryFee = isDelivery ? (delivery_fee || 1000) : 0;

    const order = await createOrder({
      items: resolvedItems,
      hotel_id: isDelivery ? hotel_id : undefined,
      room_number: isDelivery ? room_number : undefined,
      messenger_id: messenger_id || undefined,
      messenger_platform: messenger_platform || undefined,
      special_request: specialRequest || undefined,
      total_amount: serverTotal,
      delivery_fee: finalDeliveryFee,
      order_type: order_type || 'delivery',
      language: language || 'en',
    });

    return NextResponse.json(
      { id: order.id, order_number: order.order_number },
      {
        status: 201,
        headers: {
          'X-RateLimit-Remaining': String(rateLimit.remaining),
        },
      }
    );
  } catch (err) {
    console.error('[POST /api/orders] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * Resolve a cart item to a menu_item UUID.
 * Strategy:
 * 1. If item already has a valid UUID in menu_item_id or menuItemId, use it
 * 2. Otherwise, try to look up by name_en match
 * 3. If nothing found, log a warning and return null
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function resolveMenuItemId(supabase: any, item: any): Promise<string | null> {
  // Already a UUID
  const directId = item.menu_item_id || item.menuItemId;
  if (directId && isUUID(directId)) {
    return directId;
  }

  // Try matching by name_en
  const nameEn = item.name?.en || item.name_en;
  if (nameEn) {
    const { data } = await supabase
      .from('menu_items')
      .select('id')
      .eq('name_en', nameEn)
      .limit(1)
      .single();
    if (data) return data.id;
  }

  // Try extracting a meaningful identifier from the cart item id
  // Cart IDs look like "pizza-bulgogi-R-1711234567" — extract the name part
  const cartId = item.id || '';
  const parts = cartId.split('-');
  if (parts.length >= 2) {
    // Try matching with a LIKE query on name_en
    const namePart = parts.slice(1, -2).join(' '); // skip type prefix and size/timestamp suffix
    if (namePart) {
      const { data } = await supabase
        .from('menu_items')
        .select('id')
        .ilike('name_en', `%${namePart}%`)
        .limit(1)
        .single();
      if (data) return data.id;
    }
  }

  console.warn(`[resolveMenuItemId] Could not resolve menu_item_id for item:`, {
    id: item.id,
    name: item.name,
    type: item.type,
  });
  return null;
}

function isUUID(str: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const orderId = searchParams.get('id');
  const orderNumber = searchParams.get('order_number');

  try {
    let order = null;
    if (orderNumber) {
      order = await getOrderByNumber(orderNumber);
    } else if (orderId) {
      order = await getOrderById(orderId);
    }

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }
    return NextResponse.json(order);
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
