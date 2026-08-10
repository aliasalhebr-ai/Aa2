import { supabase } from '@/lib/supabase';
import type { Notification } from '@/types';

export async function getNotifications(): Promise<Notification[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw error;
  return (data ?? []) as Notification[];
}

export async function getUnreadCount(): Promise<number> {
  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('is_read', false);
  if (error) throw error;
  return count ?? 0;
}

export async function markAsRead(id: string): Promise<void> {
  await supabase.from('notifications').update({ is_read: true }).eq('id', id);
}

export async function markAllAsRead(): Promise<void> {
  await supabase.from('notifications').update({ is_read: true }).eq('is_read', false);
}

export async function createNotification(
  userId: string,
  type: string,
  title: string,
  body?: string,
  linkType?: string,
  linkId?: string,
): Promise<void> {
  await supabase.from('notifications').insert({
    user_id: userId,
    type,
    title,
    body: body ?? null,
    link_type: linkType ?? null,
    link_id: linkId ?? null,
  });
}
