/* ============================================================
   🌍 useT — دالة الترجمة
   const { t, field, lang } = useT();
   t('welcome', { name: 'سارة' })      → نص من الـ translations
   field(level, 'name')                 → name_en لو إنجليزي (وإلا name_ar)
   ============================================================ */
import { useCallback } from 'react';
import { useUI } from '../context/UIContext';
import { translations } from './translations';

export function useT() {
  const { lang } = useUI();
  const dict = translations[lang] || translations.ar;

  const t = useCallback(
    (key, vars = {}) => {
      const str = dict[key] ?? translations.ar[key] ?? key;
      return str.replace(/\{(\w+)\}/g, (_, k) => (vars[k] ?? ''));
    },
    [dict]
  );

  /* حقول الداتابيز: <base>_ar / <base>_en مع fallback للتاني لو الأول فاضي */
  const field = useCallback(
    (obj, base) => {
      if (!obj) return '';
      const ar = obj[`${base}_ar`];
      const en = obj[`${base}_en`];
      return lang === 'en' ? en || ar || '' : ar || en || '';
    },
    [lang]
  );

  return { t, field, lang, isRTL: lang === 'ar' };
}