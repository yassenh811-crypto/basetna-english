/* ============================================================
   🤖 AIChatContext — إدارة حالة المساعد الذكي
   ============================================================ */
import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from './AuthContext';

const AIChatContext = createContext(null);

const API_URL = import.meta.env.VITE_AI_API_URL || 'https://basetna-english.vercel.app';
const LS_HISTORY = 'basetna_ai_chat';
const HISTORY_LIMIT = 10;
const TIMEOUT_MS = 45000;

const UI_CONFIG = {
  assistantName: 'مساعد بسّطنا 🤖',
  greeting: 'أهلاً! 👋 أنا مساعد «بسّطنا الإنجليزي».\nاسألني في أي حاجة في الإنجليزي: قواعد، ترجمة، تمارين، أو حتى مساعدة في استخدام الموقع.',
  quickPrompts: [
    'اشرحلي Present Perfect ببساطة',
    'صحّحلي الجملة دي',
    'اديني 5 تمارين على الـ Tenses',
    'ترجم الجملة دي للإنجليزي',
    'إزاي أحفظ كلمات جديدة بسرعة؟',
  ],
};

export function AIChatProvider({ children }) {
  const { user } = useAuth();
  const [history, setHistory] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(LS_HISTORY) || '[]');
      if (Array.isArray(stored)) {
        setHistory(stored.filter((m) => m && typeof m.content === 'string' && (m.role === 'user' || m.role === 'assistant')));
      }
    } catch (e) { setHistory([]); }
  }, []);

  function saveHistory(newHistory) {
    setHistory(newHistory);
    try { localStorage.setItem(LS_HISTORY, JSON.stringify(newHistory.slice(-30))); } catch (e) {}
  }

  async function sendMessage(text) {
    if (!text || !text.trim() || busy) return;
    if (!user) throw new Error('سجّل دخولك الأول');

    const trimmed = text.trim();
    const before = history.slice();
    setBusy(true);

    const newHistory = [...before, { role: 'user', content: trimmed }];
    saveHistory(newHistory);

    try {
      const messages = before.slice(-HISTORY_LIMIT).concat([{ role: 'user', content: trimmed }]);

      let token = '';
      try {
        const { data } = await supabase.auth.getSession();
        token = data?.session?.access_token || '';
      } catch (e) {}

      const headers = { 'Content-Type': 'application/json' };
      if (token) headers.Authorization = 'Bearer ' + token;

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

      let res;
      try {
        res = await fetch(`${API_URL.replace(/\/+$/, '')}/api/ai`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ messages }),
          signal: controller.signal,
        });
      } catch (e) {
        clearTimeout(timer);
        if (e.name === 'AbortError') throw new Error('الرد اتأخر أوي، جرّب تاني.');
        throw new Error('مش قادر أوصل للسيرفر.');
      } finally {
        clearTimeout(timer);
      }

      let data = null;
      try { data = await res.json(); } catch (e) {}

      if (!res.ok) {
        if (res.status === 401 || (data && data.code === 'LOGIN_REQUIRED')) {
          throw new Error('سجّل دخولك الأول عشان تستخدم المساعد الذكي');
        }
        if (!data || !data.code) throw new Error('سيرفر المساعد مش شغّال.');
        throw new Error(data.error || 'حصلت مشكلة.');
      }
      if (!data || !data.reply) throw new Error('الرد جه فاضي، جرّب تاني.');

      const finalHistory = [...newHistory, { role: 'assistant', content: data.reply }];
      saveHistory(finalHistory);
      return data.reply;
    } catch (err) {
      const errorHistory = [...newHistory, { role: 'assistant', content: '⚠️ ' + (err.message || 'حصلت مشكلة') }];
      saveHistory(errorHistory);
      throw err;
    } finally {
      setBusy(false);
    }
  }

  function clearChat() {
    saveHistory([]);
  }

  const value = {
    history, isOpen, setIsOpen, busy,
    sendMessage, clearChat,
    config: UI_CONFIG,
  };

  return <AIChatContext.Provider value={value}>{children}</AIChatContext.Provider>;
}

export function useAIChat() {
  const ctx = useContext(AIChatContext);
  if (!ctx) throw new Error('useAIChat must be used inside AIChatProvider');
  return ctx;
}