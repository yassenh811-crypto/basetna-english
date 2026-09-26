import { useUI } from '../context/UIContext';

function SupportFabs() {
  const { openSupport } = useUI();

  return (
    <div className="support-fabs">
      <button
        className="support-fab support-fab-general"
        title="الغرفة العامة"
        onClick={() => openSupport('general')}
      >
        <span>💬</span><span className="fab-label">عام</span>
      </button>
      <button
        className="support-fab support-fab-owner"
        title="مس. شيرهان علي"
        onClick={() => openSupport('owner')}
      >
        <span>👩‍🏫</span><span className="fab-label">الميس</span>
      </button>
      <button
        className="support-fab support-fab-support"
        title="الدعم الفني"
        onClick={() => openSupport('support')}
      >
        <span>🛠️</span><span className="fab-label">دعم فني</span>
      </button>
    </div>
  );
}

export default SupportFabs;