/* ============================================================
   🎨 UIContext — إدارة حالة الواجهة (مع Dark Mode)
   ============================================================ */
import { createContext, useContext, useEffect, useState } from 'react';

const UIContext = createContext(null);

export function UIProvider({ children }) {
  const [lang, setLang] = useState(() => localStorage.getItem('basetna_lang') || 'ar');
  const [gender, setGender] = useState(() => localStorage.getItem('basetna_gender') || null);
  const [theme, setTheme] = useState(() => localStorage.getItem('basetna_theme') || 'light');
  const [showWelcome, setShowWelcome] = useState(false);
  const [showSupport, setShowSupport] = useState(false);
  const [supportType, setSupportType] = useState('support');

  useEffect(() => {
    const stored = localStorage.getItem('basetna_gender');
    if (!stored) setShowWelcome(true);
    else setGender(stored);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('basetna_theme', theme);
  }, [theme]);

  function toggleTheme() {
    setTheme(theme === 'light' ? 'dark' : 'light');
  }

  function toggleLanguage() {
    const newLang = lang === 'ar' ? 'en' : 'ar';
    setLang(newLang);
    localStorage.setItem('basetna_lang', newLang);
    document.documentElement.lang = newLang;
    document.documentElement.dir = newLang === 'ar' ? 'rtl' : 'ltr';
  }

  function pickGender(g) {
    setGender(g);
    localStorage.setItem('basetna_gender', g);
    document.cookie = `basetna_gender=${g}; max-age=31536000; path=/; SameSite=Lax`;
    setShowWelcome(false);
  }

  function openWelcomeAgain() {
    setShowWelcome(true);
  }

  function openSupport(type) {
    setSupportType(type);
    setShowSupport(true);
  }

  const value = {
    lang, toggleLanguage,
    theme, toggleTheme,
    gender, pickGender, openWelcomeAgain,
    showWelcome, setShowWelcome,
    showSupport, setShowSupport,
    supportType, openSupport,
  };

  return <UIContext.Provider value={value}>{children}</UIContext.Provider>;
}

export function useUI() {
  const ctx = useContext(UIContext);
  if (!ctx) throw new Error('useUI must be used inside UIProvider');
  return ctx;
}