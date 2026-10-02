/* ============================================================
   🆘 SupportFabs — أزرار الدعم العائمة
   ============================================================ */
import { useUI } from '../context/UIContext';
import { useAuth } from '../context/AuthContext';
import { useAIChat } from '../context/AIChatContext';

function SupportFabs() {
  const { openSupport } = useUI();
  const { user } = useAuth();
  const { isOpen, setIsOpen } = useAIChat();

  return (
    <div className="support-fabs">
      {user && (
        <button
          className={`bai-fab ${isOpen ? 'active' : ''}`}
          type="button"
          title="المساعد الذكي"
          onClick={() => setIsOpen(!isOpen)}
          aria-label="المساعد الذكي"
        >
          <span>🤖</span>
          <span className="bai-label">مساعد ذكي</span>
        </button>
      )}

      <button
        className="support-fab support-fab-general"
        title="الغرفة العامة"
        onClick={() => openSupport('general')}
      >
        <span>💬</span>
        <span className="fab-label">عام</span>
      </button>

      <button
        className="support-fab support-fab-owner"
        title="مس. شيرهان علي"
        onClick={() => openSupport('owner')}
      >
        <span>👩‍🏫</span>
        <span className="fab-label">الميس</span>
      </button>

      <button
        className="support-fab support-fab-support"
        title="الدعم الفني"
        onClick={() => openSupport('support')}
      >
        <span>🛠️</span>
        <span className="fab-label">دعم فني</span>
      </button>
    </div>
  );
}

export default SupportFabs;