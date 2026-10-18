/* ============================================================
   🆘 SupportLinks — أزرار الدعم جوه السايد بار (نفس شكل باقي العناصر)
   حطه جوه <aside className="sidebar"> تحت اللينكات وقبل "تسجيل الخروج".
   لما يظهر في الصفحة، الأزرار الدايرية العايمة بتختفي لوحدها.
   ============================================================ */
import { useUI } from '../context/UIContext';
import { useAuth } from '../context/AuthContext';
import { useAIChat } from '../context/AIChatContext';
import { useActingAs } from '../context/ActingAsContext';
import { isStaffFor } from '../context/ChatContext';

function SupportLinks() {
  const { openSupport } = useUI();
  const { user, profile } = useAuth();
  const { setIsOpen: setAIOpen } = useAIChat();
  const { isOwnerAccount, actingInfo, openPicker } = useActingAs();

  const items = [
    ...(user ? [{ id: 'ai', icon: '🤖', text: 'مساعد ذكي', run: () => setAIOpen(true) }] : []),
    ...(user
      ? [{ id: 'general', icon: '💬', text: isStaffFor('general', profile?.role) ? 'دردشات المراحل' : 'دردشة مرحلتي', run: () => openSupport('general') }]
      : []),
    { id: 'owner', icon: '👩‍🏫', text: isStaffFor('owner', profile?.role) ? 'رسائل الميس' : 'مس. شيرهان', run: () => openSupport('owner') },
    { id: 'support', icon: '🛠️', text: isStaffFor('support', profile?.role) ? 'صندوق الدعم' : 'الدعم الفني', run: () => openSupport('support') },
    ...(isOwnerAccount
      ? [{ id: 'acting', icon: '🎭', text: `أرد بصفة: ${actingInfo?.label || ''}`, run: openPicker }]
      : []),
  ];

  return (
    <div className="support-links">
      <div className="side-title">المساعدة والدعم</div>
      {items.map((it) => (
        <a
          key={it.id}
          href="#"
          onClick={(e) => {
            e.preventDefault();
            it.run();
          }}
        >
          <span className="side-ico">{it.icon}</span>
          <span>{it.text}</span>
        </a>
      ))}
    </div>
  );
}

export default SupportLinks;