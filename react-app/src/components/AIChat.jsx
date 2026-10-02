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

function renderText(text) {
  let h = escapeHtml(text);
  h = h.replace(/```([\s\S]*?)```/g, (m, c) => `<code class="en">${c.trim()}</code>`);
  h = h.replace(/`([^`\n]+)`/g, '<code class="en">$1</code>');
  h = h.replace(/\*\*([^*\n]+)\*\*/g, '<b>$1</b>');
  h = h.split(/(<code class="en">[\s\S]*?<\/code>)/).map((seg, i) =>
    i % 2 ? seg : seg.replace(/(^|[\s(])([A-Za-z][\w''.\-]*(?:[ \t]+[A-Za-z0-9][\w''.\-]*)+)/g, (m, p, w) => p + '<span class="en">' + w + '</span>')
  ).join('');
  return h;
}

function AIChat() {
  const { user } = useAuth();
  const { history, isOpen, setIsOpen, busy, sendMessage, clearChat, config } = useAIChat();
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }
  }, [history, isOpen]);

  useEffect(() => {
    function handleKey(e) {
      if (e.key === 'Escape' && isOpen) setIsOpen(false);
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen, setIsOpen]);

  async function handleSend() {
    if (!input.trim() || busy) return;
    const text = input;
    setInput('');
    try { await sendMessage(text); } catch (err) {}
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleQuick(prompt) {
    setInput(prompt);
    setTimeout(() => { sendMessage(prompt).catch(() => {}); setInput(''); }, 50);
  }

  if (!user) return null;
  if (!isOpen) return null;

  return (
    <div className="bai-overlay open" onClick={() => setIsOpen(false)}>
      <div className="bai-panel" onClick={(e) => e.stopPropagation()}>
        <div className="bai-head">
          <div className="bai-ava">🤖</div>
          <div>
            <h3>{config.assistantName}</h3>
            <p>{busy ? 'بيفكر...' : 'جاهز للمساعدة'}</p>
          </div>
          <div className="bai-tools">
            <button type="button" title="محادثة جديدة" onClick={clearChat}>🗑</button>
            <button type="button" title="إغلاق" onClick={() => setIsOpen(false)}>✕</button>
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
            <div className="bai-typing">
              <span></span><span></span><span></span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {history.length === 0 && (
          <div className="bai-quick">
            {config.quickPrompts.map((p) => (
              <button key={p} type="button" onClick={() => handleQuick(p)}>{p}</button>
            ))}
          </div>
        )}

        <div className="bai-foot">
          <textarea
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
          <button
            className="bai-send"
            type="button"
            onClick={handleSend}
            disabled={busy || !input.trim()}
            aria-label="إرسال"
          >
            ➤
          </button>
        </div>
      </div>
    </div>
  );
}

export default AIChat;