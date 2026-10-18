/* ============================================================
   🎓 StudentDashboard — لوحة تحكم الطالب
   (بيستخدم CourseCard الجديد + صور الكورسات)
   ============================================================ */
import { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from '../context/AuthContext';
import CoursePlayer from '../components/CoursePlayer';
import CourseCard from '../components/CourseCard';
import SupportLinks from '../components/SupportLinks';

function StudentDashboard() {
  const { profile, signOut } = useAuth();
  const [courses, setCourses] = useState([]);
  const [lessonCounts, setLessonCounts] = useState({});
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

      setSubscription(subs?.[0] || null);

      if (profile.grade_level_id) {
        const { data: coursesData } = await supabase
          .from('courses')
          .select('*')
          .eq('grade_level_id', profile.grade_level_id)
          .order('sort_order');
        const list = coursesData || [];
        setCourses(list);

        /* عدد الفيديوهات في كل كورس */
        if (list.length > 0) {
          const { data: lessonRows } = await supabase
            .from('lessons')
            .select('course_id')
            .in('course_id', list.map((c) => c.id));
          const counts = {};
          (lessonRows || []).forEach((l) => {
            counts[l.course_id] = (counts[l.course_id] || 0) + 1;
          });
          setLessonCounts(counts);
        }
      }

      setLoading(false);
    }
    load();
  }, [profile]);

  const filteredCourses = courses.filter((c) =>
    (c.title_ar || '').toLowerCase().includes(search.toLowerCase())
  );

  const endDate = subscription?.end_date ? new Date(subscription.end_date + 'T23:59:59') : null;
  const isActive = !!subscription && subscription.status === 'active' && !!endDate && endDate >= new Date();
  const daysLeft = endDate ? Math.max(0, Math.ceil((endDate - new Date()) / 86400000)) : 0;

  return (
    <div className="dash-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="mark">EN</span> بسّطنا الإنجليزي
        </div>
        <a href="#" className="active" onClick={(e) => e.preventDefault()}>
          📚 كورساتي
        </a>

        <SupportLinks />
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
          <div>
            <h1>🎓 أهلاً بيك يا {profile?.full_name || ''}</h1>
            <p className="dash-sub">كمّل من حيث وقفت، وكل يوم خطوة.</p>
          </div>
          <span className={`badge ${isActive ? 'active' : 'expired'}`}>
            {isActive ? `فعّال — باقي ${daysLeft} يوم` : 'لا يوجد اشتراك'}
          </span>
        </div>

        {!isActive && (
          <div className="card notice-card danger">
            <p>⚠️ مفيش اشتراك فعّال. تواصل مع مس. شيرهان لتجديد الاشتراك.</p>
          </div>
        )}

        {isActive && daysLeft <= 7 && (
          <div className="card notice-card warn">
            <p>⏳ اشتراكك هيخلص بعد {daysLeft} يوم. تواصل مع مس. شيرهان للتجديد.</p>
          </div>
        )}

        {isActive && !profile?.grade_level_id && (
          <div className="empty-state">محتاج تحدد مرحلتك الدراسية. تواصل مع الدعم.</div>
        )}

        {isActive && profile?.grade_level_id && (
          <>
            <div className="search-box student-search">
              <input
                type="text"
                placeholder="🔍 ابحث في كورساتك..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {loading ? (
              <div className="grid grid-3">
                {[1, 2, 3].map((n) => (
                  <div className="card skeleton-card" key={n}>
                    <div className="sk-thumb" />
                    <div className="sk-line" />
                    <div className="sk-line short" />
                  </div>
                ))}
              </div>
            ) : filteredCourses.length === 0 ? (
              <div className="empty-state">
                {search ? 'مفيش نتايج للبحث' : 'لسه مفيش كورسات لمرحلتك'}
              </div>
            ) : (
              <div className="grid grid-3">
                {filteredCourses.map((course) => (
                  <CourseCard
                    key={course.id}
                    course={course}
                    lessonsCount={lessonCounts[course.id]}
                    onOpen={setPlayerCourse}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </main>

      {playerCourse && (
        <CoursePlayer course={playerCourse} onClose={() => setPlayerCourse(null)} />
      )}
    </div>
  );
}

export default StudentDashboard;