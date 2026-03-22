import { createClient, SupabaseClient } from '@supabase/supabase-js';

let adminClient: SupabaseClient | null = null;

export const createAdminClient = (): SupabaseClient | null => {
  if (adminClient) return adminClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  if (!url || !key || url === 'https://your-project.supabase.co' || key === 'your-service-role-key') {
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
