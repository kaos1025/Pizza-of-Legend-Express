import { NextRequest, NextResponse } from 'next/server';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const includeInactive = request.nextUrl.searchParams.get('all') === 'true';

    if (isSupabaseConfigured()) {
      let query = supabase
        .from('hotels')
        .select('id, name_ko, name_en, name_zh, name_ja, delivery_note, delivery_type, code, lobby_notice_en, lobby_notice_ko, lobby_notice_zh, lobby_notice_ja, is_active');

      if (!includeInactive) {
        query = query.eq('is_active', true);
      }

      const { data, error } = await query.order('sort_order');

      if (error) throw error;

      return NextResponse.json({ hotels: data }, {
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        },
      });
    }

    return NextResponse.json({ hotels: [] });
  } catch {
    return NextResponse.json({ error: 'Failed to load hotels' }, { status: 500 });
  }
}
