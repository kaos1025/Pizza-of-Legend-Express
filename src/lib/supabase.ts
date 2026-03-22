import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Singleton client for general use
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Factory for creating browser clients (e.g., for Realtime subscriptions)
export const createBrowserClient = (): SupabaseClient | null => {
  if (!supabaseUrl || !supabaseAnonKey || supabaseUrl === 'https://your-project.supabase.co') {
    return null;
  }
  return createClient(supabaseUrl, supabaseAnonKey);
};

// Check if Supabase is configured with real credentials
export const isSupabaseConfigured = (): boolean => {
  return !!(
    supabaseUrl &&
    supabaseAnonKey &&
    supabaseUrl !== 'https://your-project.supabase.co' &&
    supabaseAnonKey !== 'your-anon-key'
  );
};
