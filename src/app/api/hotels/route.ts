import { NextResponse } from 'next/server';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

export async function GET() {
  try {
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from('hotels')
        .select('id, name_ko, name_en, name_zh, name_ja, delivery_note')
        .eq('is_active', true)
        .order('sort_order');

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
