/* ============================================================
   👑 AdminDashboard — لوحة تحكم الأدمن
   ------------------------------------------------------------
   - كل صفحة ليها رابط خاص (/admin/courses ...) فالريفرش والرجوع بيشتغلوا
   - مين يشوف إيه بيتحدد من القايمة NAV تحت (roles)
   - الصفحات: نظرة عامة، المراحل، الكورسات، الباقات، الطلاب والاشتراكات،
              التحدي اليومي، الإعدادات
   ============================================================ */
import { NavLink, Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useUI } from '../context/UIContext';
import SupportLinks from '../components/SupportLinks';

import AdminOverview from '../components/admin/AdminOverview';
import AdminLevels from '../components/admin/AdminLevels';
import AdminCourses from '../components/admin/AdminCourses';
import AdminPackages from '../components/admin/AdminPackages';
import AdminStudents from '../components/admin/AdminStudents';
import AdminDaily from '../components/admin/AdminDaily';
import AdminSettings from '../components/admin/AdminSettings';

const ALL = ['superadmin', 'owner', 'support'];
const MANAGERS = ['superadmin', 'owner'];

/* ✏️ عدّل roles هنا لو عايز تغيّر مين يشوف كل صفحة */
const NAV = [
  { path: '', end: true, icon: '📊', label: 'نظرة عامة', roles: ALL },
  { path: 'levels', icon: '📚', label: 'المراحل الدراسية', roles: MANAGERS },
  { path: 'courses', icon: '🎬', label: 'الكورسات', roles: MANAGERS },
  { path: 'packages', icon: '🎁', label: 'الباقات', roles: MANAGERS },
  { path: 'students', icon: '👩‍🎓', label: 'الطلاب والاشتراكات', roles: ALL },
  { path: 'daily', icon: '🔥', label: 'التحدي اليومي', roles: MANAGERS },
  { path: 'settings', icon: '⚙️', label: 'الإعدادات', roles: MANAGERS },
];

const ROLE_BADGE = {
  superadmin: { cls: 'superadmin', text: '👑 مدير أعلى' },
  owner: { cls: '', text: '👩‍🏫 ميس' },
  support: { cls: 'support', text: '🛠️ دعم فني' },
};

/* لو حد دخل صفحة مش من صلاحياته يرجع للنظرة العامة */
function Guard({ roles, role, children }) {
  return roles.includes(role) ? children : <Navigate to="/admin" replace />;
}

function AdminDashboard() {
  const { profile, signOut } = useAuth();
  const { lang, toggleLanguage, theme, toggleTheme } = useUI();

  const role = profile?.role;
  const badge = ROLE_BADGE[role];
  const guard = (path, el) => (
    <Guard roles={NAV.find((n) => n.path === path).roles} role={role}>{el}</Guard>
  );

  return (
    <div className="dash-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="mark">EN</span> بسّطنا الإنجليزي
        </div>

        {badge && <div className={`role-badge ${badge.cls}`}>{badge.text}</div>}

        {NAV.filter((n) => n.roles.includes(role)).map((n) => (
          <NavLink key={n.path || 'home'} to={n.path ? `/admin/${n.path}` : '/admin'} end={!!n.end}>
            <span className="side-ico">{n.icon}</span>
            <span>{n.label}</span>
          </NavLink>
        ))}

        <SupportLinks />

        <div className="side-tools">
          <button type="button" onClick={toggleLanguage}>
            {lang === 'ar' ? 'English' : 'العربية'} 🌐
          </button>
          <button type="button" onClick={toggleTheme} aria-label="تغيير المظهر" title="تغيير المظهر">
            {theme === 'light' ? '🌙' : '☀️'}
          </button>
        </div>

        <a
          href="#"
          className="logout"
          onClick={(e) => {
            e.preventDefault();
            signOut();
          }}
        >
          <span className="side-ico">🚪</span>
          <span>تسجيل الخروج</span>
        </a>
      </aside>

      <main className="dash-main">
        <Routes>
          <Route index element={<AdminOverview profile={profile} />} />
          <Route path="levels" element={guard('levels', <AdminLevels />)} />
          <Route path="courses" element={guard('courses', <AdminCourses />)} />
          <Route path="packages" element={guard('packages', <AdminPackages />)} />
          <Route path="students" element={guard('students', <AdminStudents />)} />
          <Route path="daily" element={guard('daily', <AdminDaily />)} />
          <Route path="settings" element={guard('settings', <AdminSettings />)} />
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Routes>
      </main>
    </div>
  );
}

export default AdminDashboard;