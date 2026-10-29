/* ============================================================
   usePendingPayments — عدد طلبات التحويل اللي لسه ماتراجعتش (عدّاد الأونر)
   ============================================================ */
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../services/supabase';

export function usePendingPayments(enabled = true) {
  const [count, setCount] = useState(0);

  const refresh = useCallback(async () => {
    const { count: c, error } = await supabase
      .from('payment_requests')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending');
    if (!error) setCount(c || 0);
  }, []);

  useEffect(() => {
    if (!enabled) return undefined;
    refresh();
    const channel = supabase
      .channel(`bc-pending-pay-${Math.random().toString(36).slice(2, 8)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payment_requests' }, refresh)
      .subscribe();
    const timer = setInterval(refresh, 30000);
    return () => {
      clearInterval(timer);
      supabase.removeChannel(channel);
    };
  }, [enabled, refresh]);

  return { count, refresh };
}