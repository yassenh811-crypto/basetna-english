/* ============================================================
   👑 AdminDashboard — لوحة تحكم الأدمن (عربي / English)
   ------------------------------------------------------------
   جديد:
   - 💬 الدعم والمحادثات: الأونر يكلّم أي طالب (مع عدّاد رسايل جديدة)
   - 👥 الجروب العام: كل الحسابات في مكان واحد
   - 💳 التحويلات والحسابات: رقم التحويل، صور الإيصالات، تفعيل الاشتراك،
     وقفل/فتح الحسابات (مع عدّاد التحويلات الجديدة)
   - 🔔 الإشعارات والأرشيف: كل اللي بيحصل، والمقروء بيختفي من «الجديد»
   باقي التابات زي ما هي بالظبط.
   ============================================================ */
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useUI } from '../context/UIContext';
import { useT } from '../i18n/useT';
import { chatLabels } from '../i18n/chatLabels';
import { payLabels } from '../i18n/payLabels';
import { useUnreadSupport } from '../hooks/useUnreadSupport';
import { usePendingPayments } from '../hooks/usePendingPayments';
import { useUnreadNotifications } from '../hooks/useUnreadNotifications';
import { notifLabels } from '../i18n/notifLabels';
import AdminOverview from '../components/admin/AdminOverview';
import AdminLevels from '../components/admin/AdminLevels';
import AdminCourses from '../components/admin/AdminCourses';
import AdminPackages from '../components/admin/AdminPackages';
import AdminStudents from '../components/admin/AdminStudents';
import AdminSupport from '../components/admin/AdminSupport';
import AdminGroup from '../components/admin/AdminGroup';
import AdminPayments from '../components/admin/AdminPayments';
import AdminNotifications from '../components/admin/AdminNotifications';
import AdminSettings from '../components/admin/AdminSettings';

function AdminDashboard() {
  const { profile, signOut } = useAuth();
  const { toggleLanguage } = useUI();
  const { t, lang } = useT();
  const C = chatLabels(lang);
  const P = payLabels(lang);
  const NL = notifLabels(lang);
  const [tab, setTab] = useState('overview');
  const [focusStudent, setFocusStudent] = useState(null);

  /* رسايل الطلاب اللي لسه ماتقرتش */
  const { count: unread } = useUnreadSupport('student');
  /* تحويلات لسه ماتراجعتش */
  const { count: pendingPay } = usePendingPayments();
  /* إشعارات جديدة (الجرس) */
  const { count: notifCount, refresh: refreshNotif } = useUnreadNotifications('admin');

  /* دوسة على إشعار: افتح الصفحة المرتبطة بيه (ولو رسالة، افتح محادثة الطالب) */
  function goTo(tabId, n) {
    if (tabId === 'support' && n && n.ref_id) setFocusStudent(n.ref_id);
    setTab(tabId);
  }

  const tabs = [
    { id: 'overview', icon: '📊', label: t('tabOverview') },
    { id: 'notifications', icon: '🔔', label: NL.tab, badge: notifCount, badgeLabel: NL.unreadN(notifCount) },
    { id: 'levels', icon: '🪜', label: t('tabLevels') },
    { id: 'courses', icon: '🎬', label: t('tabCourses') },
    { id: 'packages', icon: '🎁', label: t('tabPackages') },
    { id: 'students', icon: '👩‍🎓', label: t('tabStudents') },
    { id: 'payments', icon: '💳', label: P.tabPayments, badge: pendingPay, badgeLabel: P.pendingN(pendingPay) },
    { id: 'support', icon: '💬', label: C.tabSupport, badge: unread, badgeLabel: C.unreadN(unread) },
    { id: 'group', icon: '👥', label: C.tabGroup },
    { id: 'settings', icon: '⚙️', label: t('tabSettings') },
  ];

  return (
    <div className="dash-shell">
      <aside className="sidebar">
        <div className="brand"><span className="mark">EN</span> {t('brand')}</div>

        {tabs.map((x) => (
          <a
            key={x.id}
            href="#"
            className={`nav-link ${tab === x.id ? 'active' : ''}`}
            aria-current={tab === x.id ? 'page' : undefined}
            onClick={(e) => { e.preventDefault(); setTab(x.id); }}
          >
            <span aria-hidden="true">{x.icon}</span> {x.label}
            {x.badge > 0 && (
              <b className="nav-badge" aria-label={x.badgeLabel}>
                {x.badge > 99 ? '99+' : x.badge}
              </b>
            )}
          </a>
        ))}

        <div className="side-tools">
          <button type="button" onClick={toggleLanguage}>🌐 {t('langBtn')}</button>
        </div>

        <a href="#" className="logout" onClick={(e) => { e.preventDefault(); signOut(); }}>
          🚪 {t('logout')}
        </a>
      </aside>

      <main className="dash-main">
        {tab === 'overview' && <AdminOverview profile={profile} />}
        {tab === 'levels' && <AdminLevels />}
        {tab === 'courses' && <AdminCourses />}
        {tab === 'packages' && <AdminPackages />}
        {tab === 'students' && <AdminStudents />}
        {tab === 'payments' && <AdminPayments />}
        {tab === 'notifications' && <AdminNotifications onNavigate={goTo} onChanged={refreshNotif} />}
        {tab === 'support' && <AdminSupport initialStudentId={focusStudent} />}
        {tab === 'group' && <AdminGroup />}
        {tab === 'settings' && <AdminSettings />}
      </main>
    </div>
  );
}

export default AdminDashboard;