/* ============================================================
   📦 packages — دوال مساعدة للباقات والكوبونات
   ============================================================ */

/* كل مراحل الباقة (بيدعم الباقات القديمة اللي ليها مرحلة واحدة) */
export function packageLevelIds(pkg) {
  const ids = Array.isArray(pkg?.grade_level_ids) ? pkg.grade_level_ids.map(String) : [];
  if (ids.length) return ids;
  return pkg?.grade_level_id != null ? [String(pkg.grade_level_id)] : [];
}

/* تنضيف الكود: بدون مسافات + حروف كبيرة */
export function normalizeCoupon(code) {
  return String(code || '').trim().toUpperCase().replace(/\s+/g, '');
}

export const COUPON_RE = /^[\p{L}\p{N}_-]{3,30}$/u;

/* توليد كود عشوائي سهل القراية: BS-7K3Q9X */
export function generateCoupon() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  const arr = new Uint32Array(6);
  (globalThis.crypto || window.crypto).getRandomValues(arr);
  arr.forEach((n) => { s += chars[n % chars.length]; });
  return 'BS-' + s;
}