/* ============================================================
   ChatBox — واجهة المحادثة المشتركة (دعم + جروب)
   مفيهاش أي استعلامات: بتاخد الرسايل وبتنادي onSend / onDelete
   ============================================================ */
import { Fragment, useLayoutEffect, useRef, useState } from 'react';

const MAX_LEN = 2000;

function dayKey(iso) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function ChatBox({
  messages,
  isMine,
  onSend,
  labels: L,
  locale,
  loading = false,
  error = '',
  emptyText,
  showSender = false,
  showReceipts = false,
  canDelete,
  onDelete,
  disabled = false,
  disabledText = '',
  maxLength = MAX_LEN,
}) {
  const listRef = useRef(null);
  const stickRef = useRef(true);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState('');

  /* ينزل لآخر رسالة، بس لو الشخص مش بيقرأ رسايل قديمة فوق */
  useLayoutEffect(() => {
    const el = listRef.current;
    if (el && stickRef.current) el.scrollTop = el.scrollHeight;
  }, [messages, loading]);

  function onScroll() {
    const el = listRef.current;
    if (!el) return;
    stickRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  }

  function dayLabel(iso) {
    const d = new Date(iso);
    const today = new Date();
    const yest = new Date();
    yest.setDate(today.getDate() - 1);
    if (dayKey(iso) === dayKey(today)) return L.today;
    if (dayKey(iso) === dayKey(yest)) return L.yesterday;
    return d.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' });
  }

  function timeLabel(iso) {
    return new Date(iso).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
  }

  async function submit(e) {
    if (e && e.preventDefault) e.preventDefault();
    const body = text.trim();
    if (!body || sending || disabled) return;
    setSending(true);
    setErr('');
    stickRef.current = true;
    const res = await onSend(body);
    setSending(false);
    if (res && res.ok) {
      setText('');
    } else {
      setErr(res && res.error ? `${L.sendFail}: ${res.error}` : L.sendFail);
    }
  }

  function onKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      submit();
    }
  }

  function autoGrow(e) {
    setText(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
  }

  let lastDay = '';

  return (
    <div className="bc-chat">
      <div className="bc-list" ref={listRef} onScroll={onScroll} role="log" aria-live="polite">
        {loading ? (
          <div className="bc-state">{L.loading}</div>
        ) : error ? (
          <div className="bc-state bad">{L.loadFail}</div>
        ) : messages.length === 0 ? (
          <div className="bc-state">{emptyText}</div>
        ) : (
          messages.map((m) => {
            const mine = isMine(m);
            const key = dayKey(m.created_at);
            const separator =
              key !== lastDay ? (
                <div className="bc-day" key={`day-${key}`}>
                  <span>{dayLabel(m.created_at)}</span>
                </div>
              ) : null;
            lastDay = key;
            return (
              <Fragment key={m.id}>
                {separator}
                <div className={`bc-msg ${mine ? 'mine' : 'theirs'}`}>
                  {showSender && !mine && (
                    <span className="bc-sender">
                      {m.sender_name}
                      {m.sender_role === 'owner' && <em className="bc-role">{L.teacher}</em>}
                    </span>
                  )}
                  <div className="bc-bubble">
                    <p className="bc-text">{m.body}</p>
                    <span className="bc-meta">
                      <time dateTime={m.created_at}>{timeLabel(m.created_at)}</time>
                      {showReceipts && mine && (
                        <span className={`bc-tick ${m.read_at ? 'seen' : ''}`} title={m.read_at ? L.seen : L.delivered}>
                          {m.read_at ? '✓✓' : '✓'}
                        </span>
                      )}
                      {canDelete && canDelete(m) && (
                        <button type="button" className="bc-del" onClick={() => onDelete(m)} aria-label={L.remove}>
                          🗑
                        </button>
                      )}
                    </span>
                  </div>
                </div>
              </Fragment>
            );
          })
        )}
      </div>

      {disabled ? (
        <div className="bc-locked">🔒 {disabledText}</div>
      ) : (
        <form className="bc-composer" onSubmit={submit}>
          <textarea
            rows={1}
            maxLength={maxLength}
            value={text}
            onChange={autoGrow}
            onKeyDown={onKeyDown}
            placeholder={L.placeholder}
            aria-label={L.placeholder}
            disabled={sending}
          />
          <button type="submit" className="btn btn-teal btn-sm" disabled={sending || !text.trim()}>
            {L.send}
          </button>
        </form>
      )}
      {err && (
        <div className="bc-err" role="alert">
          {err}
        </div>
      )}
    </div>
  );
}

export default ChatBox;