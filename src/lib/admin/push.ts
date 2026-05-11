import { createAdminClient } from '@/lib/supabase-admin';

// ============================================================
// admin_push_subscriptions — server-side DB ops
// ============================================================

export interface AdminPushSubscriptionRow {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  user_agent: string | null;
  device_label: string | null;
  is_active: boolean;
  failure_count: number;
  last_success_at: string | null;
  last_failure_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface UpsertSubscriptionInput {
  endpoint: string;
  p256dh: string;
  auth: string;
  userAgent: string | null;
  deviceLabel: string | null;
}

export async function upsertPushSubscription(
  input: UpsertSubscriptionInput,
): Promise<AdminPushSubscriptionRow | null> {
  const supabase = createAdminClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('admin_push_subscriptions')
    .upsert(
      {
        endpoint: input.endpoint,
        p256dh: input.p256dh,
        auth: input.auth,
        user_agent: input.userAgent,
        device_label: input.deviceLabel,
        is_active: true,
        failure_count: 0,
      },
      { onConflict: 'endpoint' },
    )
    .select('*')
    .single();

  if (error) throw new Error(error.message);
  return data as AdminPushSubscriptionRow;
}

export async function deactivatePushSubscription(endpoint: string): Promise<boolean> {
  const supabase = createAdminClient();
  if (!supabase) return false;

  const { error } = await supabase
    .from('admin_push_subscriptions')
    .update({ is_active: false })
    .eq('endpoint', endpoint);

  if (error) throw new Error(error.message);
  return true;
}

export async function deletePushSubscription(endpoint: string): Promise<boolean> {
  const supabase = createAdminClient();
  if (!supabase) return false;

  const { error } = await supabase
    .from('admin_push_subscriptions')
    .delete()
    .eq('endpoint', endpoint);

  if (error) throw new Error(error.message);
  return true;
}

export async function listPushSubscriptions(): Promise<AdminPushSubscriptionRow[]> {
  const supabase = createAdminClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('admin_push_subscriptions')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as AdminPushSubscriptionRow[];
}

// endpoint 의 마지막 12자만 노출하기 위한 마스킹
export function maskEndpoint(endpoint: string): string {
  if (!endpoint) return '';
  if (endpoint.length <= 12) return endpoint;
  return `…${endpoint.slice(-12)}`;
}
