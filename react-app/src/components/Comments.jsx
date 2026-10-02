/* ============================================================
   💬 Comments — تعليقات على الفيديو
   ============================================================ */
import { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from '../context/AuthContext';

function Comments({ lessonId }) {
  const { user, profile } = useAuth();
  const [comments, setComments] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  async function loadComments() {
    setLoading(true);
    const { data } = await supabase
      .from('comments')
      .select('*, profiles(full_name)')
      .eq('lesson_id', lessonId)
      .order('created_at', { ascending: true });
    setComments(data || []);
    setLoading(false);
  }

  useEffect(() => {
    loadComments();
  }, [lessonId]);

  async function handleSend() {
    if (!input.trim() || sending || !user) return;
    setSending(true);
    const { error } = await supabase.from('comments').insert({
      lesson_id: lessonId,
      student_id: user.id,
      content: input.trim(),
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
    if (!confirm('متأكد؟')) return;
    await supabase.from('comments').delete().eq('id', id);
    await loadComments();
  }

  return (
    <div style={{ padding: 20 }}>
      <h3 style={{ marginBottom: 12 }}>💬 التعليقات</h3>

      {loading ? (
        <div className="empty-state">جاري التحميل...</div>
      ) : comments.length === 0 ? (
        <div className="empty-state">لسه مفيش تعليقات</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
          {comments.map((c) => (
            <div key={c.id} style={{ padding: 12, background: 'var(--paper)', borderRadius: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <b style={{ color: 'var(--navy-deep)' }}>{c.profiles?.full_name || 'طالب'}</b>
                {c.student_id === user?.id && (
                  <button className="icon-btn danger" onClick={() => handleDelete(c.id)}>🗑️</button>
                )}
              </div>
              <div>{c.content}</div>
              <small style={{ color: 'var(--ink-soft)', fontSize: 11 }}>
                {new Date(c.created_at).toLocaleString('ar-EG')}
              </small>
            </div>
          ))}
        </div>
      )}

      {user && (
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            type="text"
            placeholder="اكتب تعليق..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            style={{ flex: 1, padding: '10px 14px', border: '1.5px solid var(--line)', borderRadius: 999 }}
          />
          <button className="btn btn-teal btn-sm" onClick={handleSend} disabled={sending}>
            {sending ? '...' : 'إرسال'}
          </button>
        </div>
      )}
    </div>
  );
}

export default Comments;