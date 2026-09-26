import { useState, useEffect, useRef } from 'react';
import { useUI } from '../context/UIContext';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../context/ChatContext';

function SupportModal() {
  const { showSupport, setShowSupport, supportType } = useUI();
  const { user, profile } = useAuth();
  const { messages, loading, sendMessage, openRoom, currentRoom } = useChat();
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);

  /* ============================================================
     فتح الغرفة لما النافذة تفتح
     ============================================================ */
  useEffect(() => {
    if (showSupport && user) {
      openRoom(supportType);
    }
  }, [showSupport, supportType, user, openRoom]);

  /* ============================================================
     Scroll لآخر رسالة
     ============================================================ */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!showSupport) return null;

  /* عناوين الغرف */
  const titles = {
    general: { title: '💬 الغرفة العامة', sub: 'كل الطلاب والميس والدعم' },
    owner: { title: '👩‍🏫 مس. شيرهان علي', sub: 'تواصلي مع الميس' },
    support: { title: '🛠️ الدعم الفني', sub: 'الدعم الفني للمنصة' },
  };
  const info = titles[supportType] || titles.support;

  /* ============================================================
     إرسال رسالة
     ============================================================ */
  async function handleSend() {
    if (!input.trim() || sending) return;
    setSending(true);
    try {
      await sendMessage(input, supportType);
      setInput('');
    } catch (err) {
      alert('❌ حصلت مشكلة في الإرسال');
      console.error(err);
    } finally {
      setSending(false);
    }
  }

  /* Enter للإرسال */
  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="overlay open" onClick={() => setShowSupport(false)}>
      <div className="support-modal" onClick={(e) => e.stopPropagation()}>
        <button className="close" onClick={() => setShowSupport(false)}>✕</button>

        <div className="support-head">
          <h3>{info.title}</h3>
          <p>{info.sub}</p>
        </div>

        {/* ============================================================
            الرسائل
            ============================================================ */}
        <div className="support-messages">
          {!user ? (
            <div className="empty-state">سجّل دخولك الأول عشان تقدر تستخدم الشات</div>
          ) : loading ? (
            <div className="empty-state">جاري التحميل...</div>
          ) : messages.length === 0 ? (
            <div className="empty-state">لسه مفيش رسائل 👋 ابدأ الكلام</div>
          ) : (
            messages.map((m) => {
              const isMine = m.sender_id === user.id;
              const time = new Date(m.created_at).toLocaleString('ar-EG', {
                hour: '2-digit',
                minute: '2-digit',
              });
              const roleEmoji =
                m.sender_role === 'superadmin' ? '👑' :
                m.sender_role === 'owner' ? '👩‍🏫' :
                m.sender_role === 'support' ? '🛠️' : '🎓';

              return (
                <div key={m.id} className={`msg ${isMine ? 'mine' : ''}`}>
                  {!isMine && <div className="msg-avatar">{roleEmoji}</div>}
                  <div className="msg-bubble">
                    {!isMine && (
                      <div className="msg-name">
                        {m.sender_name}
                        <span className="role-tag">{m.sender_role}</span>
                      </div>
                    )}
                    <div className="msg-text">{m.content}</div>
                    <div className="msg-time">{time}</div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* ============================================================
            الإدخال
            ============================================================ */}
        <div className="support-input-row">
          <input
            type="text"
            placeholder={user ? 'اكتب رسالتك...' : 'سجّل دخولك الأول'}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={!user || sending}
          />
          <button
            className="btn btn-teal btn-sm"
            onClick={handleSend}
            disabled={!user || sending || !input.trim()}
          >
            {sending ? '...' : 'إرسال'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default SupportModal;