/* ============================================================
   🎟️ useCouponPackages — فتح الباقات المخفية بالكوبون
   ============================================================ */
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../services/supabase';

const KEY = 'pkg_coupon';

export function useCouponPackages() {
  const [unlocked, setUnlocked] = useState([]);
  const [activeCode, setActiveCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  const redeem = useCallback(async (raw, silent = false) => {
    const code = String(raw || '').trim();
    if (!code) {
      if (!silent) setMessage({ text: '', type: '' });
      return false;
    }
    setLoading(true);
    if (!silent) setMessage({ text: '', type: '' });

    const { data, error } = await supabase.rpc('redeem_coupon', { p_code: code });
    setLoading(false);

    if (error) {
      if (!silent) setMessage({ text: 'حصلت مشكلة، جرّب تاني', type: 'error' });
      return false;
    }
    if (!data || data.length === 0) {
      if (!silent) setMessage({ text: 'الكوبون ده غير صحيح أو منتهي', type: 'error' });
      try { sessionStorage.removeItem(KEY); } catch {}
      return false;
    }

    setUnlocked(data);
    setActiveCode(code.toUpperCase());
    try { sessionStorage.setItem(KEY, code); } catch {}
    if (!silent) {
      setMessage({
        text: data.length === 1 ? `✅ اتفتحت لك باقة: ${data[0].name_ar}` : `✅ اتفتحت لك ${data.length} باقات`,
        type: 'ok',
      });
    }
    return true;
  }, []);

  const clear = useCallback(() => {
    setUnlocked([]);
    setActiveCode('');
    setMessage({ text: '', type: '' });
    try { sessionStorage.removeItem(KEY); } catch {}
  }, []);

  /* لو الصفحة اتعملها ريفرش، نرجّع الكوبون اللي كان مفعّل */
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(KEY);
      if (saved) redeem(saved, true);
    } catch {}
  }, [redeem]);

  return { unlocked, activeCode, loading, message, redeem, clear };
}