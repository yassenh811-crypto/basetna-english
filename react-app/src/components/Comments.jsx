/* ============================================================
   💬 Comments — تعليقات على الدرس
   ============================================================ */
import { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from '../context/AuthContext';

const MAX_LEN = 500;
const ROLE_EMOJI = { superadmin: '👑', owner: '👩‍🏫', support: '🛠️' };

function Comments({ lessonId }) {
  const { user } = useAuth();
  const [comments, setComments] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  async function loadComments() {
    setLoading(true);
    const { data, error } = await supabase
      .from('comments')
      .select('*, profiles(full_name, role)')
      .eq('lesson_id', lessonId)
      .order('created_at', { ascending: true });
    if (error) console.error(error);
    setComments(data || []);
    setLoading(false);
  }

  useEffect(() => {
    if (lessonId) loadComments();
  }, [lessonId]);

  async function handleSend() {
    if (!input.trim() || sending || !user) return;
    setSending(true);

    const { error } = await supabase.from('comments').insert({
      lesson_id: lessonId,
      student_id: user.id,
      content: input.trim().slice(0, MAX_LEN),
    });

    setSending(false);
    if (error) {
      alert('❌ ' + error.message);
      return;
    }
    setInput('');
    await loadComments();
  }

  async function handleDelete(id) {
    if (!confirm('متأكد إنك عايز تحذف التعليق؟')) return;
    const { error } = await supabase.from('comments').delete().eq('id', id);
    if (error) {
      alert('❌ ' + error.message);
      return;
    }
    setComments((list) => list.filter((c) => c.id !== id));
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <section className="cm">
      <h3>💬 التعليقات <span className="count-chip">{comments.length}</span></h3>

      {loading ? (
        <div className="skeleton-list" style={{ padding: 0 }}><span /><span /></div>
      ) : comments.length === 0 ? (
        <div className="empty-state">لسه مفيش تعليقات 👋 كن أول واحد</div>
      ) : (
        <div className="cm-list">
          {comments.map((c) => {
            const isMine = c.student_id === user?.id;
            const role = c.profiles?.role;
            const staff = !!ROLE_EMOJI[role];
            return (
              <div className="cm-item" key={c.id}>
                <div className="cm-ava">{ROLE_EMOJI[role] || '🎓'}</div>
                <div className={`cm-bubble${staff ? ' staff' : ''}`}>
                  <div className="cm-head">
                    <b>{c.profiles?.full_name || 'طالب'}</b>
                    <small>
                      {new Date(c.created_at).toLocaleString('ar-EG', {
                        day: '2-digit',
                        month: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </small>
                    {isMine && (
                      <button type="button" className="icon-btn danger cm-del" onClick={() => handleDelete(c.id)} aria-label="حذف التعليق">
                        🗑️
                      </button>
                    )}
                  </div>
                  <div className="cm-text" dir="auto">{c.content}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {user ? (
        <div className="cm-form">
          <input
            type="text"
            placeholder="اكتب تعليق..."
            value={input}
            maxLength={MAX_LEN}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={sending}
          />
          <button type="button" className="btn btn-teal btn-sm" onClick={handleSend} disabled={sending || !input.trim()}>
            {sending ? '...' : 'إرسال'}
          </button>
        </div>
      ) : (
        <div className="empty-state compact">سجّل دخولك عشان تعلّق</div>
      )}
    </section>
  );
}

export default Comments;