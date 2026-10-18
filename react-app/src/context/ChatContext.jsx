/* ============================================================
   💬 ChatContext — الشات الجديد
   - general : دردشة كل مرحلة دراسية
   - support / owner : محادثة خاصة لكل حساب (أو زائر)
   - الزائر بيتكلم بتوكن عشوائي من غير تسجيل
   - تحديث لحظي (Realtime) للحسابات، وتحديث كل 4 ثواني للزائر
   ============================================================ */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from './AuthContext';

const ChatContext = createContext(null);

/* مين الستاف في كل غرفة */
const STAFF = {
  support: ['support', 'superadmin'],
  owner: ['owner', 'superadmin'],
  general: ['support', 'owner', 'superadmin'],
};
export const isStaffFor = (room, role) => !!STAFF[room]?.includes(role);

/* ---------- الزائر ---------- */
function randomToken() {
  const a = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID().replace(/-/g, '') : '';
  return a || Date.now().toString(36) + Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
}
function getGuestToken() {
  try {
    let t = localStorage.getItem('chat_guest_token');
    if (!t || t.length < 16) {
      t = randomToken();
      localStorage.setItem('chat_guest_token', t);
    }
    return t;
  } catch {
    return randomToken();
  }
}
export function getGuestName() {
  try { return localStorage.getItem('chat_guest_name') || ''; } catch { return ''; }
}
export function saveGuestName(n) {
  try { localStorage.setItem('chat_guest_name', n); } catch {}
}

/* ---------- جلب الرسايل ---------- */
async function fetchMessages(userId, guestToken, t) {
  if (!t) return [];
  if (!userId) {
    if (t.room === 'general') return [];
    const { data, error } = await supabase.rpc('guest_get_messages', { p_token: guestToken, p_room: t.room });
    if (error) throw error;
    return data || [];
  }
  let q = supabase
    .from('chat_messages')
    .select('*')
    .eq('room', t.room)
    .order('created_at', { ascending: true })
    .limit(300);
  q = t.room === 'general' ? q.eq('grade_level_id', t.gradeLevelId) : q.eq('thread_key', t.threadKey);
  const { data, error } = await q;
  if (error) throw error;
  return data || [];
}

export function ChatProvider({ children }) {
  const { user, profile } = useAuth();
  const userId = user?.id || null;

  const [target, setTarget] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const guestToken = useMemo(() => getGuestToken(), []);
  const targetRef = useRef(null);
  targetRef.current = target;

  const openChat = useCallback((t) => {
    setMessages([]);
    setError('');
    setTarget(t);
  }, []);

  const closeChat = useCallback(() => {
    setTarget(null);
    setMessages([]);
    setError('');
  }, []);

  /* تحميل + تحديث لحظي */
  useEffect(() => {
    if (!target) return;
    let alive = true;
    setLoading(true);
    setError('');

    const run = async (silent) => {
      try {
        const rows = await fetchMessages(userId, guestToken, target);
        if (alive) setMessages(rows);
      } catch (e) {
        if (alive) setError(e.message || 'مشكلة في تحميل الرسائل');
      } finally {
        if (alive && !silent) setLoading(false);
      }
    };
    run(false);

    let channel;
    let timer;
    if (userId) {
      channel = supabase
        .channel('chat-' + Math.random().toString(36).slice(2, 9))
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `room=eq.${target.room}` },
          (payload) => {
            const m = payload.new;
            const t = targetRef.current;
            if (!t) return;
            const match = t.room === 'general' ? m.grade_level_id === t.gradeLevelId : m.thread_key === t.threadKey;
            if (!match) return;
            setMessages((list) => (list.some((x) => x.id === m.id) ? list : [...list, m]));
          }
        )
        .subscribe();
      timer = setInterval(() => run(true), 20000); /* احتياطي */
    } else {
      timer = setInterval(() => run(true), 4000);
    }

    return () => {
      alive = false;
      clearInterval(timer);
      if (channel) supabase.removeChannel(channel);
    };
  }, [target, userId, guestToken]);

  /* إرسال رسالة (actingAs لحساب المدير العام بس) */
  const sendMessage = useCallback(
    async (content, _room, actingAs) => {
      const text = String(content || '').trim().slice(0, 1000);
      const t = targetRef.current;
      if (!text || !t) return;

      if (!userId) {
        if (t.room === 'general') throw new Error('سجّل دخولك الأول');
        const { error: err } = await supabase.rpc('guest_send_message', {
          p_token: guestToken,
          p_room: t.room,
          p_name: getGuestName(),
          p_content: text,
        });
        if (err) throw err;
        setMessages(await fetchMessages(null, guestToken, t));
        return;
      }

      const realRole = profile?.role || 'student';
      const asRole = realRole === 'superadmin' && actingAs ? actingAs : realRole;

      const row = {
        room: t.room,
        thread_key: t.room === 'general' ? null : t.threadKey,
        grade_level_id: t.room === 'general' ? t.gradeLevelId : null,
        sender_id: userId,
        sender_name: profile?.full_name || 'مستخدم',
        sender_role: asRole,
        content: text,
      };
      const { data, error: err } = await supabase.from('chat_messages').insert(row).select().single();
      if (err) throw err;
      setMessages((list) => (list.some((x) => x.id === data.id) ? list : [...list, data]));
    },
    [userId, profile, guestToken]
  );

  /* للتوافق مع الكود القديم */
  const openRoom = useCallback(
    (room) => {
      if (room === 'general') {
        if (userId && profile?.grade_level_id != null) openChat({ room, gradeLevelId: String(profile.grade_level_id) });
        else closeChat();
      } else {
        openChat({ room, threadKey: userId ? 'u:' + userId : 'guest' });
      }
    },
    [userId, profile, openChat, closeChat]
  );

  const value = useMemo(
    () => ({
      messages,
      loading,
      error,
      target,
      currentRoom: target?.room || null,
      openChat,
      closeChat,
      openRoom,
      sendMessage,
    }),
    [messages, loading, error, target, openChat, closeChat, openRoom, sendMessage]
  );

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChat() {
  return useContext(ChatContext);
}