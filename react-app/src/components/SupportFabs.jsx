/* ============================================================
   🆘 SupportFabs — زرار واحد بيفتح قايمة (الدعم / الميس / العام / المساعد الذكي)
   ============================================================ */
import { useEffect, useState } from 'react';
import { useUI } from '../context/UIContext';
import { useAuth } from '../context/AuthContext';
import { useAIChat } from '../context/AIChatContext';
import { isStaffFor } from '../context/ChatContext';

function SupportFabs() {
  const { openSupport } = useUI();
  const { user, profile } = useAuth();
  const { setIsOpen: setAIOpen } = useAIChat();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  const items = [
    ...(user ? [{ id: 'ai', icon: '🤖', text: 'مساعد ذكي', run: () => setAIOpen(true) }] : []),
    ...(user
      ? [{ id: 'general', icon: '💬', text: isStaffFor('general', profile?.role) ? 'دردشات المراحل' : 'دردشة مرحلتي', run: () => openSupport('general') }]
      : []),
    { id: 'owner', icon: '👩‍🏫', text: isStaffFor('owner', profile?.role) ? 'رسائل الميس' : 'مس. شيرهان', run: () => openSupport('owner') },
    { id: 'support', icon: '🛠️', text: isStaffFor('support', profile?.role) ? 'صندوق الدعم' : 'الدعم الفني', run: () => openSupport('support') },
  ];

  function choose(item) {
    setOpen(false);
    item.run();
  }

  return (
    <>
      {open && <div className="fab-backdrop" onClick={() => setOpen(false)} />}
      <div className="support-fabs">
        <button
          type="button"
          className={`fab-toggle${open ? ' open' : ''}`}
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? 'إغلاق القايمة' : 'المساعدة والدعم'}
          aria-expanded={open}
        >
          {open ? '✕' : '💬'}
        </button>

        {open && (
          <div className="fab-menu">
            {items.map((it, i) => (
              <button
                key={it.id}
                type="button"
                className="fab-item"
                style={{ animationDelay: `${i * 45}ms` }}
                onClick={() => choose(it)}
              >
                <span className="fab-text">{it.text}</span>
                <span className={`fab-ico ${it.id}`}>{it.icon}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

export default SupportFabs;