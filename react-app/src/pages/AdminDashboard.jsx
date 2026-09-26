/* ============================================================
   👑 AdminDashboard — لوحة تحكم الأدمن
   ============================================================ */
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import AdminOverview from '../components/admin/AdminOverview';
import AdminLevels from '../components/admin/AdminLevels';
import AdminCourses from '../components/admin/AdminCourses';
import AdminPackages from '../components/admin/AdminPackages';
import AdminStudents from '../components/admin/AdminStudents';
import AdminSettings from '../components/admin/AdminSettings';

function AdminDashboard() {
  const { profile, signOut } = useAuth();
  const [tab, setTab] = useState('overview');

  const tabs = [
    { id: 'overview', label: 'نظرة عامة' },
    { id: 'levels', label: 'المراحل الدراسية' },
    { id: 'courses', label: 'الكورسات' },
    { id: 'packages', label: 'الباقات' },
    { id: 'students', label: 'الطلاب والاشتراكات' },
    { id: 'settings', label: 'الإعدادات' },
  ];

  return (
    <div className="dash-shell">
      <aside className="sidebar">
        <div className="brand"><span className="mark">EN</span> بسّطنا الإنجليزي</div>

        {tabs.map((t) => (
          <a
            key={t.id}
            href="#"
            className={`nav-link ${tab === t.id ? 'active' : ''}`}
            onClick={(e) => { e.preventDefault(); setTab(t.id); }}
          >
            {t.label}
          </a>
        ))}

        <a href="#" className="logout" onClick={(e) => { e.preventDefault(); signOut(); }}>
          تسجيل الخروج
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