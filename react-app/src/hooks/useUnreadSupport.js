/* ============================================================
   useUnreadSupport — عدّاد الرسايل غير المقروءة للـ sidebar
   - في لوحة الأونر:   useUnreadSupport('student')  → رسايل الطلاب
   - في لوحة الطالب:   useUnreadSupport('owner')    → رسايل مس شيرهان
   الـ RLS بتخلّي كل واحد يشوف اللي يخصه بس
   ============================================================ */
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../services/supabase';

export function useUnreadSupport(fromRole, enabled = true) {
  const [count, setCount] = useState(0);

  const refresh = useCallback(async () => {
    const { count: c, error } = await supabase
      .from('support_messages')
      .select('id', { count: 'exact', head: true })
      .eq('sender_role', fromRole)
      .is('read_at', null);
    if (!error) setCount(c || 0);
  }, [fromRole]);

  useEffect(() => {
    if (!enabled) return undefined;
    refresh();

    const channel = supabase
      .channel(`bc-unread-${fromRole}-${Math.random().toString(36).slice(2, 8)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'support_messages' }, refresh)
      .subscribe();
    const timer = setInterval(refresh, 30000);

    return () => {
      clearInterval(timer);
      supabase.removeChannel(channel);
    };
  }, [enabled, fromRole, refresh]);

  return { count, refresh };
}