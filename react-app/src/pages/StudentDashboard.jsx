import { useAuth } from '../context/AuthContext';

function StudentDashboard() {
  const { profile } = useAuth();

  return (
    <div className="dash-shell">
      <aside className="sidebar">
        <div className="brand"><span className="mark">EN</span> بسّطنا الإنجليزي</div>
        <a href="#" className="active">كورساتي</a>
        <a href="#" className="logout">تسجيل الخروج</a>
      </aside>

      <main className="dash-main">
        <div className="dash-head">
          <h1>أهلاً بيك 👋 {profile?.full_name || ''}</h1>
          <span className="badge active">—</span>
        </div>
        <div className="empty-state">هنا هيظهر كورساتك</div>
      </main>
    </div>
  );
}

export default StudentDashboard;