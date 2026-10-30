/* ============================================================
   AdminNotifications — 🔔 الإشعارات والأرشيف (لوحة الأونر)
   دوسة على إشعار بتفتح الصفحة المرتبطة بيه:
     تحويلات → التحويلات والحسابات | رسالة طالب → محادثته | حساب جديد → الطلاب
     تعديل كورس/باقة/مرحلة → صفحتها
   ============================================================ */
import { useT } from '../../i18n/useT';
import { notifLabels } from '../../i18n/notifLabels';
import NotificationCenter from '../notifications/NotificationCenter';

function targetTab(n) {
  switch (n.type) {
    case 'payment_new':
    case 'payment_approved':
    case 'payment_rejected':
    case 'account_locked':
    case 'account_unlocked':
      return 'payments';
    case 'message_new':
      return 'support';
    case 'signup_new':
      return 'students';
    case 'admin_change': {
      const entity = n.data && n.data.entity;
      if (entity === 'course') return 'courses';
      if (entity === 'package') return 'packages';
      if (entity === 'level') return 'levels';
      return null;
    }
    default:
      return null;
  }
}

function AdminNotifications({ onNavigate, onChanged }) {
  const { lang } = useT();
  const N = notifLabels(lang);

  function open(n) {
    const tab = targetTab(n);
    if (tab && onNavigate) onNavigate(tab, n);
  }

  return (
    <div className="bc-section">
      <div className="dash-head">
        <div>
          <h1>🔔 {N.title}</h1>
          <p className="dash-sub">{N.sub}</p>
        </div>
      </div>
      <NotificationCenter audience="admin" onOpen={open} onChanged={onChanged} />
    </div>
  );
}

export default AdminNotifications;