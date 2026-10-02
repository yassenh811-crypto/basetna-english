/* ============================================================
   💬 Comments — تعليقات على الدرس
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

  /* ============================================================
     جلب التعليقات
     ============================================================ */
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

  /* ============================================================
     إرسال تعليق
     ============================================================ */
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

  /* ============================================================
     حذف تعليق
     ============================================================ */
  async function handleDelete(id) {
    if (!confirm('متأكد إنك عايز تحذف التعليق؟')) return;
    const { error } = await supabase.from('comments').delete().eq('id', id);
    if (error) {
      alert('❌ ' + error.message);
      return;
    }
    await loadComments();
  }

  /* ============================================================
     Enter للإرسال
     ============================================================ */
  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  /* ============================================================
     Render
     ============================================================ */
  return (
    <div style={{ padding: '16px 20px', borderTop: '1px solid var(--line)' }}>
      <h3 style={{ marginBottom: 12, color: 'var(--navy-deep)', fontSize: 16 }}>
        💬 التعليقات ({comments.length})
      </h3>

      {/* قايمة التعليقات */}
      {loading ? (
        <div className="empty-state">جاري التحميل...</div>
      ) : comments.length === 0 ? (
        <div className="empty-state">لسه مفيش تعليقات 👋 كن أول واحد</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16, maxHeight: 300, overflowY: 'auto' }}>
          {comments.map((c) => {
            const isMine = c.student_id === user?.id;
            const roleEmoji =
              c.profiles?.role === 'superadmin' ? '👑' :
              c.profiles?.role === 'owner' ? '👩‍🏫' :
              c.profiles?.role === 'support' ? '🛠️' : '🎓';

            return (
              <div
                key={c.id}
                style={{
                  padding: 12,
                  background: 'var(--paper)',
                  borderRadius: 10,
                  border: '1px solid var(--line)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 18 }}>{roleEmoji}</span>
                    <b style={{ color: 'var(--navy-deep)', fontSize: 14 }}>
                      {c.profiles?.full_name || 'طالب'}
                    </b>
                    <small style={{ color: 'var(--ink-soft)', fontSize: 11 }}>
                      {new Date(c.created_at).toLocaleString('ar-EG', {
                        day: '2-digit',
                        month: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </small>
                  </div>
                  {isMine && (
                    <button
                      className="icon-btn danger"
                      onClick={() => handleDelete(c.id)}
                      style={{ padding: '4px 8px', fontSize: 11 }}
                    >
                      🗑️
                    </button>
                  )}
                </div>
                <div style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--ink)', whiteSpace: 'pre-wrap' }}>
                  {c.content}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* إضافة تعليق */}
      {user ? (
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            type="text"
            placeholder="اكتب تعليق..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={sending}
            style={{
              flex: 1,
              padding: '10px 14px',
              border: '1.5px solid var(--line)',
              borderRadius: 999,
              fontSize: 14,
              fontFamily: 'inherit',
              background: '#fff',
            }}
          />
          <button
            className="btn btn-teal btn-sm"
            onClick={handleSend}
            disabled={sending || !input.trim()}
          >
            {sending ? '...' : 'إرسال'}
          </button>
        </div>
      ) : (
        <div className="empty-state" style={{ padding: 12 }}>
          سجّل دخولك عشان تعلّق
        </div>
      )}
    </div>
  );
}

export default Comments;