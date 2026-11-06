/* ============================================================
   📞 phone.js — أدوات التعامل مع أرقام الواتساب
   ============================================================ */

export function toWhatsAppNumber(phone) {
  if (!phone) return '';
  let cleaned = String(phone).replace(/\D/g, ''); 
  if (cleaned.startsWith('00')) cleaned = cleaned.slice(2);
  if (cleaned.startsWith('0')) cleaned = '20' + cleaned.slice(1); 
  if (!cleaned.startsWith('20') && cleaned.length === 10) cleaned = '20' + cleaned;
  return cleaned;
}

export function whatsappLink(phone, message = '') {
  const num = toWhatsAppNumber(phone);
  if (!num) return '#';
  const text = message ? `?text=${encodeURIComponent(message)}` : '';
  return `https://wa.me/${num}${text}`;
}