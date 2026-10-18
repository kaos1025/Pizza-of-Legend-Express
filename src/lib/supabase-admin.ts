import { createClient, SupabaseClient } from '@supabase/supabase-js';

let adminClient: SupabaseClient | null = null;
let warnedMissingKey = false;

export const createAdminClient = (): SupabaseClient | null => {
  if (adminClient) return adminClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  if (!url || !key || url === 'https://your-project.supabase.co' || key === 'your-service-role-key') {
    // 운영에서 null 이면 admin API 전부가 mock(₩0, 빈 목록) 으로 조용히 떨어진다.
    // 화면만 봐서는 시크릿 누락을 알 수 없으므로 Workers 로그에 남긴다.
    if (process.env.NODE_ENV === 'production' && !warnedMissingKey) {
      warnedMissingKey = true;
      console.error('[supabase-admin] SUPABASE_SERVICE_ROLE_KEY 미설정 — admin API 가 mock 데이터로 동작 중');
    }
    return null;
  }

  adminClient = createClient(url, key, {
    auth: { persistSession: false },
  });

  return adminClient;
};

export const isSupabaseConnected = (): boolean => {
  return createAdminClient() !== null;
};
