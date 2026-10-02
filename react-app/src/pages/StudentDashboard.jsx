/* ============================================================
   🎓 StudentDashboard — لوحة تحكم الطالب
   ============================================================ */
import { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from '../context/AuthContext';
import CoursePlayer from '../components/CoursePlayer';

function StudentDashboard() {
  const { profile, signOut } = useAuth();
  const [courses, setCourses] = useState([]);
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [playerCourse, setPlayerCourse] = useState(null);

  useEffect(() => {
    async function load() {
      if (!profile) return;
      setLoading(true);

      const { data: subs } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('student_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(1);

      const latestSub = subs?.[0] || null;
      setSubscription(latestSub);

      if (profile.grade_level_id) {
        const { data: coursesData } = await supabase
          .from('courses')
          .select('*')
          .eq('grade_level_id', profile.grade_level_id)
          .order('sort_order');
        setCourses(coursesData || []);
      }

      setLoading(false);
    }
    load();
  }, [profile]);

  const filteredCourses = courses.filter((c) =>
    (c.title_ar || '').toLowerCase().includes(search.toLowerCase())
  );

  const isActive = (() => {
    if (!subscription) return false;
    if (subscription.status !== 'active') return false;
    const endDate = new Date(subscription.end_date + 'T23:59:59');
    return endDate >= new Date();
  })();

  const daysLeft = (() => {
    if (!subscription) return 0;
    const endDate = new Date(subscription.end_date + 'T23:59:59');
    return Math.max(0, Math.ceil((endDate - new Date()) / (1000 * 60 * 60 * 24)));
  })();

  return (
    <div className="dash-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="mark">EN</span> بسّطنا الإنجليزي
        </div>
        <a href="#" className="active">
          كورساتي
        </a>
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault();
            signOut();
          }}
          className="logout"
        >
          تسجيل الخروج
        </a>
      </aside>

      <main className="dash-main">
        <div className="dash-head">
          <h1>🎓 أهلاً بيك يا {profile?.full_name || ''}</h1>
          <span className={`badge ${isActive ? 'active' : 'expired'}`}>
            {isActive ? `فعّال — باقي ${daysLeft} يوم` : 'لا يوجد اشتراك'}
          </span>
        </div>

        {!isActive && (
          <div
            className="card"
            style={{
              marginBottom: 24,
              borderTop: '4px solid var(--danger)',
            }}
          >
            <p style={{ margin: '0 0 12px' }}>
              ⚠️ مفيش اشتراك فعّال. تواصل مع مس. شيرهان لتجديد الاشتراك.
            </p>
          </div>
        )}

        {isActive && !profile?.grade_level_id && (
          <div className="empty-state">
            محتاج تحدد مرحلتك الدراسية. تواصل مع الدعم.
          </div>
        )}

        {isActive && profile?.grade_level_id && (
          <>
            <div
              className="search-box"
              style={{ marginBottom: 20, maxWidth: '100%' }}
            >
              <input
                type="text"
                placeholder="🔍 ابحث في كورساتك..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {loading ? (
              <div className="empty-state">جاري التحميل...</div>
            ) : filteredCourses.length === 0 ? (
              <div className="empty-state">
                {search ? 'مفيش نتايج للبحث' : 'لسه مفيش كورسات لمرحلتك'}
              </div>
            ) : (
              <div className="grid grid-3">
                {filteredCourses.map((course) => (
                  <div className="card course-card" key={course.id}>
                    <div className="course-thumb">
                      <div className="file-icon">🎬</div>
                      <div className="play-overlay">
                        <svg viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      </div>
                      <span className="video-badge">كورس</span>
                    </div>
                    <div className="course-body">
                      <h3>{course.title_ar}</h3>
                      <p>{course.description_ar || ''}</p>
                      <button
                        className="btn btn-teal btn-block"
                        onClick={() => setPlayerCourse(course)}
                      >
                        🎬 مشاهدة الكورس
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </main>

      {playerCourse && (
        <CoursePlayer
          course={playerCourse}
          onClose={() => setPlayerCourse(null)}
        />
      )}
    </div>
  );
}

export default StudentDashboard;