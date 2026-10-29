/* ============================================================
   usePaymentSettings — بيانات التحويل اللي الأونر كاتبها في الإعدادات
   ============================================================ */
import { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';

export function usePaymentSettings() {
  const [state, setState] = useState({ number: '', holder: '', note: '', loading: true });

  useEffect(() => {
    let alive = true;
    supabase
      .from('settings')
      .select('*')
      .eq('id', 1)
      .maybeSingle()
      .then(({ data }) => {
        if (!alive) return;
        setState({
          number: (data && data.transfer_number) || '',
          holder: (data && data.transfer_name) || '',
          note: (data && data.transfer_note) || '',
          loading: false,
        });
      });
    return () => {
      alive = false;
    };
  }, []);

  return state;
}