/* ============================================================
   useUnreadNotifications — عدد الإشعارات الجديدة (الجرس 🔔 في الـ sidebar)
   - في لوحة الأونر:  useUnreadNotifications('admin')
   - في لوحة الطالب:  useUnreadNotifications('user')
   الـ RLS بتخلّي كل واحد يشوف إشعاراته بس
   ============================================================ */
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../services/supabase';

export function useUnreadNotifications(audience, enabled = true) {
  const [count, setCount] = useState(0);

  const refresh = useCallback(async () => {
    const { count: c, error } = await supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('audience', audience)
      .is('read_at', null);
    if (!error) setCount(c || 0);
  }, [audience]);

  useEffect(() => {
    if (!enabled) return undefined;
    refresh();
    const channel = supabase
      .channel(`bc-notif-count-${audience}-${Math.random().toString(36).slice(2, 8)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, refresh)
      .subscribe();
    const timer = setInterval(refresh, 30000);
    return () => {
      clearInterval(timer);
      supabase.removeChannel(channel);
    };
  }, [enabled, audience, refresh]);

  return { count, refresh };
}