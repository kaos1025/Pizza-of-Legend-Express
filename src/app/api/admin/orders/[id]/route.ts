import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySessionToken, COOKIE_NAME } from '@/lib/admin/session';
import { updateOrderStatus } from '@/lib/admin/orders';
import type { OrderStatus } from '@/types/order';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // Verify admin session
  const cookieStore = cookies();
  const session = cookieStore.get(COOKIE_NAME);
  if (!session || !verifySessionToken(session.value)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { status, payment_method } = await request.json();

    if (!status) {
      return NextResponse.json({ error: 'Status is required' }, { status: 400 });
    }

    const updated = await updateOrderStatus(
      params.id,
      status as OrderStatus,
      payment_method
    );

    if (!updated) {
      return NextResponse.json(
        { error: 'Order not found or invalid status transition' },
        { status: 400 }
      );
    }

    return NextResponse.json({ order: updated });
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
