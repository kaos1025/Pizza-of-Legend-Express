import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySessionToken, COOKIE_NAME } from '@/lib/admin/session';
import { createAdminClient, isSupabaseConnected } from '@/lib/supabase-admin';

const BUCKET = 'menu-images';

async function ensureBucket() {
  if (!isSupabaseConnected()) return false;
  const supabase = createAdminClient()!;

  // Check if bucket exists
  const { data: buckets } = await supabase.storage.listBuckets();
  const exists = buckets?.some((b) => b.name === BUCKET);

  if (!exists) {
    const { error } = await supabase.storage.createBucket(BUCKET, {
      public: true,
      fileSizeLimit: 5 * 1024 * 1024, // 5MB
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
    });
    if (error) {
      console.error('[Storage] Failed to create bucket:', error.message);
      return false;
    }
  }

  return true;
}

export async function POST(request: NextRequest) {
  const cookieStore = cookies();
  const session = cookieStore.get(COOKIE_NAME);
  if (!session || !verifySessionToken(session.value)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!isSupabaseConnected()) {
    return NextResponse.json(
      { error: 'Supabase not configured. Image upload requires Supabase Storage.' },
      { status: 503 }
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const menuItemId = formData.get('menu_item_id') as string | null;

    if (!file) {
      return NextResponse.json({ error: '파일이 없습니다.' }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: '허용되지 않는 파일 형식입니다. (JPG, PNG, WebP만 가능)' },
        { status: 400 }
      );
    }

    // Validate file size (5MB — client already compresses to ~800px WebP)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: '파일 크기가 5MB를 초과합니다.' },
        { status: 400 }
      );
    }

    // Ensure bucket exists
    const bucketReady = await ensureBucket();
    if (!bucketReady) {
      return NextResponse.json(
        { error: 'Storage 버킷 생성에 실패했습니다.' },
        { status: 500 }
      );
    }

    const supabase = createAdminClient()!;
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // File path: use menu_item_id if provided, otherwise timestamp
    const filename = menuItemId
      ? `${menuItemId}.webp`
      : `menu-${Date.now()}.webp`;

    // Upload with upsert (overwrite existing)
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(filename, buffer, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) {
      console.error('[Storage] Upload error:', uploadError.message);
      return NextResponse.json(
        { error: `업로드 실패: ${uploadError.message}` },
        { status: 500 }
      );
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(BUCKET)
      .getPublicUrl(filename);

    // If menu_item_id provided, update the menu_items table
    if (menuItemId) {
      await supabase
        .from('menu_items')
        .update({ image_url: publicUrl })
        .eq('id', menuItemId);
    }

    return NextResponse.json({ url: publicUrl });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[Storage] Error:', message);
    return NextResponse.json(
      { error: `업로드 중 오류: ${message}` },
      { status: 500 }
    );
  }
}
