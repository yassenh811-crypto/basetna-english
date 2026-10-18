/* ============================================================
   🤖 AIChat — المساعد الذكي (Panel بس، الزرار في SupportFabs)
   ============================================================ */
import { useEffect, useRef, useState } from 'react';
import { useAIChat } from '../context/AIChatContext';
import { useAuth } from '../context/AuthContext';

function escapeHtml(s) {
  return String(s == null ? '' : s).replace(/[&<>"]/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])
  );
}

/* بيعمل Bold و code، وبيلفّ الجمل الإنجليزي في span.en عشان يتعرض صح جوه العربي */
function renderText(text) {
  let h = escapeHtml(text);
  h = h.replace(/```([\s\S]*?)```/g, (m, c) => `<code class="en">${c.trim()}</code>`);
  h = h.replace(/`([^`\n]+)`/g, '<code class="en">$1</code>');
  h = h.replace(/\*\*([^*\n]+)\*\*/g, '<b>$1</b>');
  h = h
    .split(/(<code class="en">[\s\S]*?<\/code>)/)
    .map((seg, i) =>
      i % 2
        ? seg
        : seg.replace(
            /(^|[\s(])([A-Za-z][\w'’.\-]*(?:[ \t]+[A-Za-z0-9][\w'’.\-]*)+)/g,
            (m, p, w) => p + '<span class="en">' + w + '</span>'
          )
    )
    .join('');
  return h;
}

function AIChat() {
  const { user } = useAuth();
  const { history, isOpen, setIsOpen, busy, sendMessage, clearChat, config } = useAIChat();
  const [input, setInput] = useState('');
  const endRef = useRef(null);
  const taRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      const t = setTimeout(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
      return () => clearTimeout(t);
    }
  }, [history, isOpen, busy]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => e.key === 'Escape' && setIsOpen(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, setIsOpen]);

  async function send(text) {
    const value = (text ?? input).trim();
    if (!value || busy) return;
    setInput('');
    if (taRef.current) taRef.current.style.height = 'auto';
    try {
      await sendMessage(value);
    } catch (err) {
      /* الخطأ بيتعالج في الـ context */
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      send();
    }
  }

  if (!user || !isOpen) return null;

  return (
    <div className="bai-overlay open" onClick={() => setIsOpen(false)}>
      <div className="bai-panel" role="dialog" aria-modal="true" aria-label={config.assistantName} onClick={(e) => e.stopPropagation()}>
        <div className="bai-head">
          <div className="bai-ava">🤖</div>
          <div>
            <h3>{config.assistantName}</h3>
            <p>{busy ? 'بيفكر...' : 'جاهز للمساعدة'}</p>
          </div>
          <div className="bai-tools">
            <button type="button" title="محادثة جديدة" aria-label="محادثة جديدة" onClick={clearChat}>🗑</button>
            <button type="button" title="إغلاق" aria-label="إغلاق" onClick={() => setIsOpen(false)}>✕</button>
          </div>
        </div>

        <div className="bai-body">
          {history.length === 0 ? (
            <div className="bai-msg bot">{config.greeting}</div>
          ) : (
            history.map((m, i) => (
              <div
                key={i}
                className={`bai-msg ${m.role === 'user' ? 'me' : 'bot'}`}
                dangerouslySetInnerHTML={{
                  __html: m.role === 'user' ? escapeHtml(m.content) : renderText(m.content),
                }}
              />
            ))
          )}
          {busy && (
            <div className="bai-typing"><span /><span /><span /></div>
          )}
          <div ref={endRef} />
        </div>

        {history.length === 0 && (
          <div className="bai-quick">
            {config.quickPrompts.map((p) => (
              <button key={p} type="button" onClick={() => send(p)}>{p}</button>
            ))}
          </div>
        )}

        <div className="bai-foot">
          <textarea
            ref={taRef}
            rows="1"
            placeholder="اكتب سؤالك هنا..."
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              e.target.style.height = 'auto';
              e.target.style.height = Math.min(e.target.scrollHeight, 110) + 'px';
            }}
            onKeyDown={handleKeyDown}
            disabled={busy}
          />
          <button className="bai-send" type="button" onClick={() => send()} disabled={busy || !input.trim()} aria-label="إرسال">
            ➤
          </button>
        </div>
      </div>
    </div>
  );
}

export default AIChat;