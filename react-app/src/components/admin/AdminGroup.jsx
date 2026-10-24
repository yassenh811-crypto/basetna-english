/* ============================================================
   AdminGroup — الجروب العام في لوحة الأونر
   (الأونر بيحذف أي رسالة وبيقفل/يفتح الكتابة للطلاب)
   ============================================================ */
import { useT } from '../../i18n/useT';
import { chatLabels } from '../../i18n/chatLabels';
import GroupChat from '../chat/GroupChat';

function AdminGroup() {
  const { lang } = useT();
  const L = chatLabels(lang);

  return (
    <div className="bc-section">
      <div className="dash-head">
        <div>
          <h1>👥 {L.groupTitle}</h1>
          <p className="dash-sub">{L.groupSub}</p>
        </div>
      </div>
      <div className="bc-panel">
        <GroupChat isOwner />
      </div>
    </div>
  );
}

export default AdminGroup;