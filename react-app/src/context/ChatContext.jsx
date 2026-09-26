/* ============================================================
   💬 ChatContext — إدارة الرسائل
   ============================================================ */
import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from './AuthContext';

const ChatContext = createContext(null);

export function ChatProvider({ children }) {
  const { user, profile } = useAuth();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentRoom, setCurrentRoom] = useState('general');
  const [privateWith, setPrivateWith] = useState(null);

  /* عشان نمنع الـ Loop */
  const loadingRef = useRef(false);

  /* ============================================================
     جلب الرسائل
     ============================================================ */
  const loadMessages = useCallback(async (room, privateUserId = null) => {
    if (!user) {
      setMessages([]);
      return;
    }
    if (loadingRef.current) return; /* ← منع التكرار */
    loadingRef.current = true;
    setLoading(true);

    try {
      let query = supabase
        .from('messages')
        .select('*')
        .order('created_at', { ascending: true })
        .limit(200);

      if (room === 'private' && privateUserId) {
        query = query
          .eq('recipient_role', 'private')
          .or(`and(sender_id.eq.${user.id},private_with.eq.${privateUserId}),and(sender_id.eq.${privateUserId},private_with.eq.${user.id})`);
      } else {
        query = query.eq('recipient_role', room);
      }

      const { data, error } = await query;
      if (error) throw error;
      setMessages(data || []);
    } catch (err) {
      console.error('❌ خطأ في جلب الرسائل:', err);
      setMessages([]);
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, [user]);

  /* ============================================================
     إرسال رسالة
     ============================================================ */
  const sendMessage = useCallback(async (content, room, privateUserId = null) => {
    if (!user || !profile) return;
    const trimmed = (content || '').trim();
    if (!trimmed) return;

    const payload = {
      sender_id: user.id,
      sender_name: profile.full_name || 'مستخدم',
      sender_role: profile.role || 'student',
      recipient_role: room,
      content: trimmed,
    };
    if (room === 'private' && privateUserId) payload.private_with = privateUserId;

    const { error } = await supabase.from('messages').insert(payload);
    if (error) throw error;
  }, [user, profile]);

  /* ============================================================
     فتح غرفة
     ============================================================ */
  const openRoom = useCallback((room, privateUserId = null) => {
    setCurrentRoom(room);
    setPrivateWith(privateUserId);
  }, []);

  /* ============================================================
     تحميل الرسائل لما تتغير الغرفة أو المستخدم
     ============================================================ */
  useEffect(() => {
    if (user) {
      loadMessages(currentRoom, privateWith);
    } else {
      setMessages([]);
    }
  }, [user, currentRoom, privateWith, loadMessages]);

  /* ============================================================
     Realtime
     ============================================================ */
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('messages-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          const m = payload.new;
          /* ضيف الرسالة لو في نفس الغرفة */
          if (
            (currentRoom === 'private' && m.recipient_role === 'private') ||
            (m.recipient_role === currentRoom)
          ) {
            setMessages((prev) => {
              /* منع التكرار */
              if (prev.some((x) => x.id === m.id)) return prev;
              return [...prev, m];
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, currentRoom]);

  const value = {
    messages,
    loading,
    currentRoom,
    privateWith,
    sendMessage,
    openRoom,
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChat() {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error('useChat must be used inside ChatProvider');
  return ctx;
}