/* ============================================================
   🛟 SupportModal — الشات
   ------------------------------------------------------------
   الطالب / الزائر:
     - الدعم الفني ومس. شيرهان: محادثة خاصة بيه هو بس (الزائر كمان)
     - الدردشة العامة: خاصة بمرحلته الدراسية (للطلاب بس)
   الستاف (دعم فني / ميس / مدير عام):
     - بيشوف قايمة بكل الحسابات، يدوس على حساب فتظهر محادثته ويرد عليه
     - الدردشة العامة: بيختار المرحلة الأول
   ============================================================ */
import { useState, useEffect, useRef } from 'react';
import { supabase } from '../services/supabase';
import { useUI } from '../context/UIContext';
import { useAuth } from '../context/AuthContext';
import { useChat, isStaffFor, getGuestName, saveGuestName } from '../context/ChatContext';
import { useActingAs } from '../context/ActingAsContext';

const ROLE_EMOJI = { superadmin: '👑', owner: '👩‍🏫', support: '🛠️' };
const ROLE_LABEL = { superadmin: 'مدير', owner: 'الميس', support: 'دعم فني', student: 'طالب', guest: 'زائر' };

const TITLES = {
  general: { title: '💬 دردشة المرحلة', sub: 'كل طلاب مرحلتك مع بعض' },
  owner: { title: '👩‍🏫 مس. شيرهان علي', sub: 'محادثة خاصة بينك وبين الميس' },
  support: { title: '🛠️ الدعم الفني', sub: 'محادثة خاصة بينك وبين الدعم الفني' },
};
const STAFF_TITLES = {
  general: { title: '💬 دردشات المراحل', sub: 'اختار المرحلة' },
  owner: { title: '📥 رسائل مس. شيرهان', sub: 'كل الحسابات اللي كلمتك' },
  support: { title: '📥 صندوق الدعم الفني', sub: 'كل الحسابات اللي كلمت الدعم' },
};

function timeAgo(iso) {
  const d = new Date(iso);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return 'دلوقتي';
  if (diff < 3600) return `${Math.floor(diff / 60)} د`;
  if (diff < 86400) return d.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
  return d.toLocaleDateString('ar-EG', { day: 'numeric', month: 'short' });
}

function SupportModal() {
  const { showSupport, setShowSupport, supportType } = useUI();
  const { user, profile, setShowAuthModal } = useAuth();
  const { messages, loading, error, openChat, closeChat, sendMessage } = useChat();
  const { isOwnerAccount, actingAs, actingInfo, openPicker } = useActingAs();

  const [view, setView] = useState('thread'); /* list | thread */
  const [threads, setThreads] = useState([]);
  const [levels, setLevels] = useState([]);
  const [listLoading, setListLoading] = useState(false);
  const [threadTitle, setThreadTitle] = useState('');
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState('');
  const [guestName, setGuestName] = useState(getGuestName());
  const endRef = useRef(null);

  const role = profile?.role || null;
  const isGuest = !user;
  const staff = !!user && isStaffFor(supportType, role);
  const isGeneral = supportType === 'general';
  const myLevel = profile?.grade_level_id != null ? String(profile.grade_level_id) : null;

  /* فتح/تغيير الغرفة */
  useEffect(() => {
    if (!showSupport) {
      closeChat();
      return;
    }
    setErr('');
    setInput('');
    if (staff) {
      closeChat();
      setView('list');
      return;
    }
    setView('thread');
    if (isGeneral) {
      if (user && myLevel) openChat({ room: 'general', gradeLevelId: myLevel });
      else closeChat();
    } else {
      openChat({ room: supportType, threadKey: user ? 'u:' + user.id : 'guest' });
    }
  }, [showSupport, supportType, user?.id, myLevel, staff]); // eslint-disable-line react-hooks/exhaustive-deps

  /* أسماء المراحل */
  useEffect(() => {
    if (!showSupport || !isGeneral) return;
    let alive = true;
    supabase
      .from('grade_levels')
      .select('id,name_ar')
      .order('sort_order')
      .then(({ data }) => alive && setLevels(data || []));
    return () => { alive = false; };
  }, [showSupport, isGeneral]);

  /* قايمة المحادثات للستاف (تتحدث كل 8 ثواني) */
  useEffect(() => {
    if (!showSupport || !staff || view !== 'list' || isGeneral) return;
    let alive = true;
    async function load() {
      const { data, error: e } = await supabase.rpc('chat_threads', { p_room: supportType });
      if (!alive) return;
      if (e) setErr(e.message);
      else setThreads(data || []);
      setListLoading(false);
    }
    setListLoading(true);
    load();
    const timer = setInterval(load, 8000);
    return () => { alive = false; clearInterval(timer); };
  }, [showSupport, staff, view, supportType, isGeneral]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, view, showSupport]);

  useEffect(() => {
    if (!showSupport) return;
    const onKey = (e) => e.key === 'Escape' && setShowSupport(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [showSupport, setShowSupport]);

  if (!showSupport) return null;

  const info = (staff ? STAFF_TITLES : TITLES)[supportType] || TITLES.support;
  const levelName = (id) => levels.find((l) => String(l.id) === String(id))?.name_ar;
  const headTitle = !staff && isGeneral && myLevel && levelName(myLevel) ? `💬 دردشة ${levelName(myLevel)}` : info.title;

  const canWrite =
    view === 'thread' && (user ? !isGeneral || staff || !!myLevel : !isGeneral);

  function openThread(t) {
    setThreadTitle(t.display_name + (t.kind === 'guest' ? ' (زائر)' : ''));
    openChat({ room: supportType, threadKey: t.t_key });
    setView('thread');
  }
  function openLevel(l) {
    setThreadTitle(l.name_ar);
    openChat({ room: 'general', gradeLevelId: String(l.id) });
    setView('thread');
  }
  function backToList() {
    closeChat();
    setView('list');
  }

  async function handleSend() {
    if (!input.trim() || sending || !canWrite) return;
    setSending(true);
    setErr('');
    try {
      await sendMessage(input, supportType, actingAs);
      setInput('');
    } catch (e) {
      console.error(e);
      setErr(e.message?.includes('slow down') ? 'استنى ثانيتين بين كل رسالة والتانية' : 'حصلت مشكلة في الإرسال، جرّب تاني');
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      handleSend();
    }
  }

  /* ---------- المحتوى ---------- */
  function renderBody() {
    /* ستاف: قايمة */
    if (staff && view === 'list') {
      if (isGeneral) {
        return levels.length === 0 ? (
          <div className="empty-state">مفيش مراحل</div>
        ) : (
          levels.map((l) => (
            <div className="chat-contact" key={l.id} onClick={() => openLevel(l)}>
              <div className="chat-contact-avatar" style={{ background: 'linear-gradient(135deg,var(--teal),var(--teal-dark))' }}>📚</div>
              <div className="chat-contact-info">
                <div className="chat-contact-name">{l.name_ar}</div>
                <div className="chat-contact-meta">دردشة المرحلة</div>
              </div>
              <div className="chat-contact-action">›</div>
            </div>
          ))
        );
      }
      if (listLoading && threads.length === 0) return <div className="skeleton-list" style={{ padding: 0 }}><span /><span /><span /></div>;
      if (threads.length === 0) return <div className="empty-state">لسه محدش كلمك 👋</div>;
      return threads.map((t) => {
        const waiting = t.last_role === 'student' || t.last_role === 'guest';
        return (
          <div className="chat-contact" key={t.t_key} onClick={() => openThread(t)}>
            <div
              className="chat-contact-avatar"
              style={{ background: t.kind === 'guest' ? 'linear-gradient(135deg,#8892a6,#5c6578)' : 'linear-gradient(135deg,var(--teal),var(--teal-dark))' }}
            >
              {t.kind === 'guest' ? '👤' : '🎓'}
            </div>
            <div className="chat-contact-info">
              <div className="chat-contact-name">
                {t.display_name}
                {t.kind === 'guest' && <span className="role-tag" style={{ marginInlineStart: 6 }}>زائر</span>}
                {waiting && <span className="waiting-tag">منتظر رد</span>}
              </div>
              <div className="chat-contact-meta">
                <span className="chat-preview" dir="auto">{t.last_message}</span>
                <span>· {timeAgo(t.last_at)}</span>
              </div>
            </div>
            <div className="chat-contact-action">›</div>
          </div>
        );
      });
    }

    /* زائر في الدردشة العامة */
    if (isGuest && isGeneral) {
      return (
        <div className="empty-state">
          الدردشة العامة لطلاب كل مرحلة بس.
          <br />
          <button type="button" className="btn btn-gold btn-sm" style={{ marginTop: 12 }} onClick={() => { setShowSupport(false); setShowAuthModal(true); }}>
            تسجيل الدخول
          </button>
        </div>
      );
    }

    /* طالب من غير مرحلة */
    if (!staff && isGeneral && user && !myLevel) {
      return <div className="empty-state">محتاج تحدد مرحلتك الدراسية الأول. كلّم الدعم الفني.</div>;
    }

    if (loading) return <div className="skeleton-list" style={{ padding: 0 }}><span /><span /><span /></div>;
    if (messages.length === 0) {
      return <div className="empty-state">{staff ? 'لسه مفيش رسائل في المحادثة دي' : 'لسه مفيش رسائل 👋 ابدأ الكلام'}</div>;
    }

    return messages.map((m) => {
      const isMine = user ? m.sender_id === user.id : m.sender_role === 'guest';
      const staffMsg = !!ROLE_EMOJI[m.sender_role];
      const time = new Date(m.created_at).toLocaleString('ar-EG', { hour: '2-digit', minute: '2-digit' });
      return (
        <div key={m.id} className={`msg${isMine ? ' mine' : ''}${staffMsg && !isMine ? ' admin-msg' : ''}`}>
          {!isMine && <div className="msg-avatar">{ROLE_EMOJI[m.sender_role] || (m.sender_role === 'guest' ? '👤' : '🎓')}</div>}
          <div className="msg-bubble">
            {!isMine && (
              <div className="msg-name">
                {m.sender_name}
                <span className="role-tag">{ROLE_LABEL[m.sender_role] || m.sender_role}</span>
              </div>
            )}
            <div className="msg-text" dir="auto">{m.content}</div>
            <div className="msg-time">{time}</div>
          </div>
        </div>
      );
    });
  }

  return (
    <div className="overlay open" onClick={() => setShowSupport(false)}>
      <div className="support-modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <button className="close" type="button" onClick={() => setShowSupport(false)} aria-label="إغلاق">✕</button>

        <div className="support-head">
          <h3>{headTitle}</h3>
          <p>{info.sub}</p>
        </div>

        {staff && view === 'thread' && (
          <div className="thread-bar">
            <button type="button" onClick={backToList}>→ رجوع للقايمة</button>
            <b>{threadTitle}</b>
          </div>
        )}

        {isOwnerAccount && actingInfo && staff && view === 'thread' && (
          <div className="private-chat-banner">
            {actingInfo.icon} بترد بصفة: <b>{actingInfo.label}</b>
            <button type="button" onClick={openPicker}>تغيير</button>
          </div>
        )}

        {isGuest && !isGeneral && (
          <div className="guest-name-row">
            <label htmlFor="guest-name">اسمك (اختياري)</label>
            <input
              id="guest-name"
              type="text"
              maxLength={40}
              value={guestName}
              placeholder="زائر"
              onChange={(e) => { setGuestName(e.target.value); saveGuestName(e.target.value); }}
            />
          </div>
        )}

        <div className="support-messages">
          {renderBody()}
          <div ref={endRef} />
        </div>

        {(err || error) && view === 'thread' && <div className="form-msg error" style={{ margin: '0 18px 8px' }}>{err || error}</div>}
        {err && view === 'list' && <div className="form-msg error" style={{ margin: '0 18px 8px' }}>{err}</div>}

        {canWrite && (
          <div className="support-input-row">
            <input
              type="text"
              placeholder="اكتب رسالتك..."
              value={input}
              maxLength={1000}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={sending}
            />
            <button type="button" className="btn btn-teal btn-sm" onClick={handleSend} disabled={sending || !input.trim()}>
              {sending ? '...' : 'إرسال'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default SupportModal;