/* ============================================================
   useSupportThread — محادثة الدعم بين الأونر وطالب واحد
   - realtime (postgres_changes) + تحديث كل 20 ثانية كاحتياطي
   - الهوية (مين بعت) بتتحدد من السيرفر، مش من الكلاينت
   ============================================================ */
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../services/supabase';

const POLL_MS = 20000;

export function useSupportThread(studentId, viewerRole) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchAll = useCallback(async () => {
    if (!studentId) return;
    const { data, error: err } = await supabase
      .from('support_messages')
      .select('*')
      .eq('student_id', studentId)
      .order('created_at', { ascending: true })
      .limit(500);
    if (err) {
      setError(err.message);
      return;
    }
    setError('');
    setMessages(data || []);
  }, [studentId]);

  useEffect(() => {
    if (!studentId) {
      setMessages([]);
      setLoading(false);
      return undefined;
    }

    let alive = true;
    setLoading(true);
    setMessages([]);
    fetchAll().finally(() => {
      if (alive) setLoading(false);
    });

    const channel = supabase
      .channel(`bc-support-${studentId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'support_messages', filter: `student_id=eq.${studentId}` },
        (payload) => {
          if (!alive) return;
          if (payload.eventType === 'INSERT') {
            setMessages((prev) => (prev.some((m) => m.id === payload.new.id) ? prev : [...prev, payload.new]));
          } else if (payload.eventType === 'UPDATE') {
            setMessages((prev) => prev.map((m) => (m.id === payload.new.id ? payload.new : m)));
          } else if (payload.eventType === 'DELETE') {
            setMessages((prev) => prev.filter((m) => m.id !== payload.old?.id));
          }
        }
      )
      .subscribe();

    const timer = setInterval(fetchAll, POLL_MS);

    return () => {
      alive = false;
      clearInterval(timer);
      supabase.removeChannel(channel);
    };
  }, [studentId, fetchAll]);

  const send = useCallback(
    async (text) => {
      const body = String(text || '').trim();
      if (!body || !studentId) return { ok: false };
      const { data, error: err } = await supabase
        .from('support_messages')
        .insert({ student_id: studentId, body })
        .select()
        .single();
      if (err) return { ok: false, error: err.message };
      setMessages((prev) => (prev.some((m) => m.id === data.id) ? prev : [...prev, data]));
      return { ok: true };
    },
    [studentId]
  );

  /* بيعلّم رسايل الطرف التاني كمقروءة (الأونر يقرأ رسايل الطالب والعكس) */
  const markRead = useCallback(async () => {
    if (!studentId) return;
    const { error: err } = await supabase.rpc('mark_support_read', { p_student: studentId });
    if (err) return;
    const now = new Date().toISOString();
    setMessages((prev) =>
      prev.map((m) => (m.sender_role !== viewerRole && !m.read_at ? { ...m, read_at: now } : m))
    );
  }, [studentId, viewerRole]);

  return { messages, loading, error, send, markRead };
}