import { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';

function WhatsAppFloat() {
  const [whatsappNumber, setWhatsappNumber] = useState(null);

  useEffect(() => {
    async function loadNumber() {
      const { data } = await supabase
        .from('settings')
        .select('whatsapp_number')
        .eq('id', 1)
        .maybeSingle();
      if (data?.whatsapp_number) setWhatsappNumber(data.whatsapp_number);
    }
    loadNumber();
  }, []);

  function handleClick(e) {
    if (!whatsappNumber) {
      e.preventDefault();
      alert('⚠️ رقم واتساب لم يُضف بعد');
    }
  }

  return (
    <a
      href={whatsappNumber ? `https://wa.me/${whatsappNumber}` : '#'}
      className="wa-float"
      target="_blank"
      rel="noopener"
      title="واتساب"
      onClick={handleClick}
    >
      <svg viewBox="0 0 24 24">
        <path d="M12 2C6.5 2 2 6.5 2 12c0 1.9.5 3.6 1.4 5.1L2 22l5-1.3c1.4.8 3.1 1.3 5 1.3 5.5 0 10-4.5 10-10S17.5 2 12 2z"/>
      </svg>
    </a>
  );
}

export default WhatsAppFloat;