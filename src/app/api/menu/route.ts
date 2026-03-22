import { NextRequest, NextResponse } from 'next/server';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category');

  try {
    if (isSupabaseConfigured()) {
      let query = supabase
        .from('menu_items')
        .select('*, menu_prices(*)')
        .eq('is_active', true)
        .eq('is_sold_out', false)
        .order('sort_order');

      if (category) {
        query = query.eq('category', category);
      }

      const { data, error } = await query;
      if (error) throw error;

      return NextResponse.json({ items: data }, {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
        },
      });
    }

    // Fallback: return empty (client uses JSON)
    return NextResponse.json({ items: [] });
  } catch {
    return NextResponse.json({ error: 'Failed to load menu' }, { status: 500 });
  }
}
