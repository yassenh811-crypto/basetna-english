/* ============================================================
   🎨 UIContext — إدارة حالة الواجهة (مع Dark Mode)
   ============================================================ */
import { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';

const UIContext = createContext(null);

/* قراءة/كتابة آمنة (بعض المتصفحات بتمنع localStorage في الوضع الخاص) */
const read = (k, fallback = null) => {
  try { return localStorage.getItem(k) || fallback; } catch (e) { return fallback; }
};
const write = (k, v) => {
  try { localStorage.setItem(k, v); } catch (e) {}
};

/* أول مرة: نتبع إعداد الجهاز (فاتح/غامق) */
const systemTheme = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';

export function UIProvider({ children }) {
  const [lang, setLang] = useState(() => read('basetna_lang', 'ar'));
  const [gender, setGender] = useState(() => read('basetna_gender'));
  const [theme, setTheme] = useState(() => read('basetna_theme') || systemTheme());
  const [showWelcome, setShowWelcome] = useState(() => !read('basetna_gender'));
  const [showSupport, setShowSupport] = useState(false);
  const [supportType, setSupportType] = useState('support');

  /* الثيم */
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    write('basetna_theme', theme);
  }, [theme]);

  /* اللغة والاتجاه (كانوا بيتظبطوا بس عند الضغط على الزرار — دلوقتي بيتظبطوا من أول تحميل) */
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    write('basetna_lang', lang);
  }, [lang]);

  const toggleTheme = useCallback(() => setTheme((t) => (t === 'light' ? 'dark' : 'light')), []);
  const toggleLanguage = useCallback(() => setLang((l) => (l === 'ar' ? 'en' : 'ar')), []);

  const pickGender = useCallback((g) => {
    setGender(g);
    write('basetna_gender', g);
    try {
      document.cookie = `basetna_gender=${g}; max-age=31536000; path=/; SameSite=Lax`;
    } catch (e) {}
    setShowWelcome(false);
  }, []);

  const openWelcomeAgain = useCallback(() => setShowWelcome(true), []);

  const openSupport = useCallback((type) => {
    setSupportType(type);
    setShowSupport(true);
  }, []);

  const value = useMemo(
    () => ({
      lang, toggleLanguage,
      theme, toggleTheme,
      gender, pickGender, openWelcomeAgain,
      showWelcome, setShowWelcome,
      showSupport, setShowSupport,
      supportType, openSupport,
    }),
    [lang, theme, gender, showWelcome, showSupport, supportType,
     toggleLanguage, toggleTheme, pickGender, openWelcomeAgain, openSupport]
  );

  return <UIContext.Provider value={value}>{children}</UIContext.Provider>;
}

export function useUI() {
  const ctx = useContext(UIContext);
  if (!ctx) throw new Error('useUI must be used inside UIProvider');
  return ctx;
}