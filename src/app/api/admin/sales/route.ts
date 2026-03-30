import { NextResponse } from 'next/server';
import { createAdminClient, isSupabaseConnected } from '@/lib/supabase-admin';

export async function GET() {
  try {
    if (!isSupabaseConnected()) {
      // Mock fallback
      return NextResponse.json({
        daily: [],
        cumulative: {
          total_orders: 0,
          total_revenue: 0,
          total_delivery_fees: 0,
          total_cash: 0,
          total_card: 0,
          first_order_at: null,
          last_order_at: null,
        },
      });
    }

    const supabase = createAdminClient()!;

    // Fetch daily sales
    const { data: daily, error: dailyError } = await supabase
      .from('daily_sales_summary')
      .select('*')
      .order('sale_date', { ascending: false })
      .limit(30);

    if (dailyError) throw dailyError;

    // Fetch cumulative summary
    const { data: cumulative, error: cumulativeError } = await supabase
      .from('cumulative_sales_summary')
      .select('*')
      .single();

    if (cumulativeError && cumulativeError.code !== 'PGRST116') throw cumulativeError;

    return NextResponse.json({
      daily: daily || [],
      cumulative: cumulative || {
        total_orders: 0,
        total_revenue: 0,
        total_delivery_fees: 0,
        total_cash: 0,
        total_card: 0,
        first_order_at: null,
        last_order_at: null,
      },
    });
  } catch (err) {
    console.error('[GET /api/admin/sales] Error:', err);
    return NextResponse.json({ error: 'Failed to fetch sales data' }, { status: 500 });
  }
}
