/* ============================================================
   🤖 AIChatContext — إدارة حالة المساعد الذكي
   ============================================================ */
import { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from './AuthContext';

const AIChatContext = createContext(null);

/* العنوان: المتغير لو موجود، وإلا نفس دومين الموقع (من غير CORS). محلياً (localhost) بنكلّم الموقع المنشور. */
const API_URL = (
  import.meta.env.VITE_AI_API_URL ||
  (typeof window !== 'undefined' && !/^(localhost|127\.)/.test(window.location.hostname)
    ? window.location.origin
    : 'https://basetna-english.online')
).replace(/\/+$/, '');
const LS_PREFIX = 'basetna_ai_chat';
const HISTORY_LIMIT = 10;
const STORED_LIMIT = 30;
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

const isValid = (m) =>
  m && typeof m.content === 'string' && (m.role === 'user' || m.role === 'assistant');

export function AIChatProvider({ children }) {
  const { user } = useAuth();
  const [history, setHistory] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  /* المحادثة بتتخزن لكل مستخدم لوحده (قبل كده كانت مشتركة بين أي حد يفتح من نفس الجهاز) */
  const storageKey = user ? `${LS_PREFIX}_${user.id}` : null;

  useEffect(() => {
    if (!storageKey) { setHistory([]); return; }
    try {
      const stored = JSON.parse(localStorage.getItem(storageKey) || '[]');
      setHistory(Array.isArray(stored) ? stored.filter(isValid) : []);
    } catch (e) { setHistory([]); }
  }, [storageKey]);

  function saveHistory(newHistory) {
    setHistory(newHistory);
    if (!storageKey) return;
    try { localStorage.setItem(storageKey, JSON.stringify(newHistory.slice(-STORED_LIMIT))); } catch (e) {}
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
      /* رسائل الأخطاء (isError) ماتتبعتش للسيرفر عشان ماتلخبطش المساعد */
      const messages = before
        .filter((m) => !m.isError)
        .slice(-HISTORY_LIMIT)
        .map(({ role, content }) => ({ role, content }))
        .concat([{ role: 'user', content: trimmed }]);

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
      let data = null;
      try {
        res = await fetch(`${API_URL}/api/ai`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ messages }),
          signal: controller.signal,
        });
        try { data = await res.json(); } catch (e) {}
      } catch (e) {
        /* السبب الحقيقي يظهر في Console (F12) عشان نعرف نشخّص */
        console.error('[AI] فشل الاتصال بـ', `${API_URL}/api/ai`, '→', e);
        if (e.name === 'AbortError') throw new Error('الرد اتأخر أوي، جرّب تاني.');
        throw new Error('مش قادر أوصل للسيرفر.');
      } finally {
        clearTimeout(timer);
      }

      if (!res.ok) {
        if (res.status === 401 || data?.code === 'LOGIN_REQUIRED') {
          throw new Error('سجّل دخولك الأول عشان تستخدم المساعد الذكي');
        }
        if (!data?.code) throw new Error('سيرفر المساعد مش شغّال.');
        throw new Error(data.error || 'حصلت مشكلة.');
      }
      if (!data?.reply) throw new Error('الرد جه فاضي، جرّب تاني.');

      saveHistory([...newHistory, { role: 'assistant', content: data.reply }]);
      return data.reply;
    } catch (err) {
      saveHistory([
        ...newHistory,
        { role: 'assistant', content: '⚠️ ' + (err.message || 'حصلت مشكلة'), isError: true },
      ]);
      throw err;
    } finally {
      setBusy(false);
    }
  }

  function clearChat() {
    saveHistory([]);
  }

  const value = useMemo(
    () => ({ history, isOpen, setIsOpen, busy, sendMessage, clearChat, config: UI_CONFIG }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [history, isOpen, busy, storageKey]
  );

  return <AIChatContext.Provider value={value}>{children}</AIChatContext.Provider>;
}

export function useAIChat() {
  const ctx = useContext(AIChatContext);
  if (!ctx) throw new Error('useAIChat must be used inside AIChatProvider');
  return ctx;
}