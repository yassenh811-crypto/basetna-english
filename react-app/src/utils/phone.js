/* ============================================================
   📞 phone.js — أدوات التعامل مع أرقام الواتساب
   ============================================================ */

/**
 * تحويل أي رقم لصيغة دولية تصلح لواتساب (بدون + وبدون مسافات)
 * مثال: 01012345678 -> 201012345678
 */
export function toWhatsAppNumber(phone) {
  if (!phone) return '';
  let cleaned = String(phone).replace(/\D/g, ''); // شيل أي حاجة مش رقم
  if (cleaned.startsWith('00')) cleaned = cleaned.slice(2);
  if (cleaned.startsWith('0')) cleaned = '20' + cleaned.slice(1); // كود مصر 20
  if (!cleaned.startsWith('20') && cleaned.length === 10) cleaned = '20' + cleaned;
  return cleaned;
}

/**
 * عمل لينك واتساب جاهز مع رسالة
 * مثال: whatsappLink('01012345678', 'أهلاً') -> https://wa.me/201012345678?text=...
 */
export function whatsappLink(phone, message = '') {
  const num = toWhatsAppNumber(phone);
  if (!num) return '#';
  const text = message ? `?text=${encodeURIComponent(message)}` : '';
  return `https://wa.me/${num}${text}`;
}