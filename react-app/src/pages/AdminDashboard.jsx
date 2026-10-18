/* ============================================================
   👑 AdminDashboard — لوحة تحكم الأدمن (عربي / English)
   ============================================================ */
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useUI } from '../context/UIContext';
import { useT } from '../i18n/useT';
import AdminOverview from '../components/admin/AdminOverview';
import AdminLevels from '../components/admin/AdminLevels';
import AdminCourses from '../components/admin/AdminCourses';
import AdminPackages from '../components/admin/AdminPackages';
import AdminStudents from '../components/admin/AdminStudents';
import AdminSettings from '../components/admin/AdminSettings';

function AdminDashboard() {
  const { profile, signOut } = useAuth();
  const { toggleLanguage } = useUI();
  const { t } = useT();
  const [tab, setTab] = useState('overview');

  const tabs = [
    { id: 'overview', icon: '📊', label: t('tabOverview') },
    { id: 'levels', icon: '🪜', label: t('tabLevels') },
    { id: 'courses', icon: '🎬', label: t('tabCourses') },
    { id: 'packages', icon: '🎁', label: t('tabPackages') },
    { id: 'students', icon: '👩‍🎓', label: t('tabStudents') },
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
        {tab === 'settings' && <AdminSettings />}
      </main>
    </div>
  );
}

export default AdminDashboard;