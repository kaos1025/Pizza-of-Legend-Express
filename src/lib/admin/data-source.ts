import { isSupabaseConnected } from '@/lib/supabase-admin';

export const useSupabase = (): boolean => {
  return isSupabaseConnected();
};
