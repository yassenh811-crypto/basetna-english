/* ============================================================
   GroupChat — الجروب العام لكل الحسابات
   - الأونر (isOwner): بيحذف أي رسالة وبيقفل/يفتح الكتابة للطلاب
   - الطالب: بيكتب ويحذف رسايله هو بس (لو الأونر ماقفلش الكتابة)
   ============================================================ */
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../context/AuthContext';
import { useT } from '../../i18n/useT';
import { chatLabels, chatLocale } from '../../i18n/chatLabels';
import ChatBox from './ChatBox';

const POLL_MS = 20000;

function GroupChat({ isOwner = false }) {
  const { profile } = useAuth();
  const { lang } = useT();
  const L = chatLabels(lang);

  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [canPost, setCanPost] = useState(true);
  const [lockError, setLockError] = useState('');

  const fetchMessages = useCallback(async () => {
    const { data, error: err } = await supabase
      .from('group_messages')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);
    if (err) {
      setError(err.message);
      return;
    }
    setError('');
    setMessages((data || []).slice().reverse());
  }, []);

  const fetchLock = useCallback(async () => {
    const { data, error: err } = await supabase
      .from('settings')
      .select('group_students_can_post')
      .eq('id', 1)
      .maybeSingle();
    if (!err && data) setCanPost(data.group_students_can_post !== false);
  }, []);

  useEffect(() => {
    let alive = true;
    Promise.all([fetchMessages(), fetchLock()]).finally(() => {
      if (alive) setLoading(false);
    });

    const channel = supabase
      .channel('bc-group')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'group_messages' }, (payload) => {
        if (!alive) return;
        setMessages((prev) => (prev.some((m) => m.id === payload.new.id) ? prev : [...prev, payload.new]));
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'group_messages' }, (payload) => {
        if (!alive) return;
        setMessages((prev) => prev.filter((m) => m.id !== payload.old?.id));
      })
      .subscribe();

    const timer = setInterval(() => {
      fetchMessages();
      fetchLock();
    }, POLL_MS);

    return () => {
      alive = false;
      clearInterval(timer);
      supabase.removeChannel(channel);
    };
  }, [fetchMessages, fetchLock]);

  async function send(body) {
    const { data, error: err } = await supabase.from('group_messages').insert({ body }).select().single();
    if (err) return { ok: false, error: err.message };
    setMessages((prev) => (prev.some((m) => m.id === data.id) ? prev : [...prev, data]));
    return { ok: true };
  }

  async function remove(m) {
    if (!window.confirm(L.confirmDelete)) return;
    const { error: err } = await supabase.from('group_messages').delete().eq('id', m.id);
    if (!err) setMessages((prev) => prev.filter((x) => x.id !== m.id));
  }

  async function toggleLock() {
    setLockError('');
    const next = !canPost;
    const { error: err } = await supabase.from('settings').update({ group_students_can_post: next }).eq('id', 1);
    if (err) {
      setLockError(L.lockFail);
      return;
    }
    setCanPost(next);
  }

  const lockedForMe = !isOwner && !canPost;

  return (
    <>
      {isOwner && (
        <div className="bc-lockbar">
          <span className={canPost ? 'open' : 'closed'}>{canPost ? L.stateOpen : L.stateLocked}</span>
          <button type="button" className="btn btn-ghost btn-sm" onClick={toggleLock}>
            {canPost ? `🔒 ${L.lockWrite}` : `🔓 ${L.unlockWrite}`}
          </button>
        </div>
      )}
      {lockError && (
        <div className="bc-err" role="alert">
          {lockError}
        </div>
      )}
      <ChatBox
        messages={messages}
        loading={loading}
        error={error}
        isMine={(m) => m.sender_id === profile?.id}
        onSend={send}
        labels={L}
        locale={chatLocale(lang)}
        showSender
        emptyText={L.groupEmpty}
        canDelete={(m) => isOwner || m.sender_id === profile?.id}
        onDelete={remove}
        disabled={lockedForMe}
        disabledText={L.groupLocked}
        maxLength={1000}
      />
    </>
  );
}

export default GroupChat;