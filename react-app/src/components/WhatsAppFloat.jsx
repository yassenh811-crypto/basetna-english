/* ============================================================
   💬 WhatsAppFloat — زرار واتساب عائم
   - بيختفي لو الرقم لسه متحطش من الإعدادات
   - بيفتح الشات برسالة جاهزة
   ============================================================ */
import { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';

const MESSAGE = 'السلام عليكم، عندي استفسار عن بسّطنا الإنجليزي';

function WhatsAppFloat() {
  const [whatsappNumber, setWhatsappNumber] = useState(null);

  useEffect(() => {
    async function loadNumber() {
      const { data } = await supabase
        .from('settings')
        .select('whatsapp_number')
        .eq('id', 1)
        .maybeSingle();
      setWhatsappNumber(data?.whatsapp_number || null);
    }
    loadNumber();

    const channel = supabase
      .channel('settings-changes')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'settings' }, (payload) => {
        setWhatsappNumber(payload.new?.whatsapp_number || null);
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  if (!whatsappNumber) return null;

  return (
    <a
      href={`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(MESSAGE)}`}
      className="wa-float"
      target="_blank"
      rel="noopener noreferrer"
      title="كلمنا على واتساب"
      aria-label="كلمنا على واتساب"
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 2C6.5 2 2 6.5 2 12c0 1.9.5 3.6 1.4 5.1L2 22l5-1.3c1.4.8 3.1 1.3 5 1.3 5.5 0 10-4.5 10-10S17.5 2 12 2z" />
      </svg>
    </a>
  );
}

export default WhatsAppFloat;