/* ============================================================
   🎓 StudentDashboard — لوحة تحكم الطالب
   (بيستخدم CourseCard الجديد + صور الكورسات)
   ------------------------------------------------------------
   جديد:
   - 💬 تواصل مع مس شيرهان (شات خاص مع عدّاد رسايل جديدة)
   - 👥 الجروب العام (كل الحسابات)
   - 🌍 الكورسات العامة (is_general) بتظهر لكل الحسابات المشتركة،
     حتى الكورسات اللي تتنزل بعد كده، من غير ما حد يعمل أي حاجة
   - 💳 حالة التحويل (قيد المراجعة / مرفوض) وزرار رفع صورة التحويل
   - 🔒 الحساب المقفول بيشوف شاشة قفل + شات الدعم بس
   - 🔔 إشعاراتي: تحويل اتفعّل/اترفض، رسايل مس شيرهان، مع أرشيف
   ============================================================ */
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from '../context/AuthContext';
import { useT } from '../i18n/useT';
import { chatLabels } from '../i18n/chatLabels';
import { payLabels } from '../i18n/payLabels';
import { useUnreadSupport } from '../hooks/useUnreadSupport';
import { useUnreadNotifications } from '../hooks/useUnreadNotifications';
import { notifLabels } from '../i18n/notifLabels';
import CoursePlayer from '../components/CoursePlayer';
import CourseCard from '../components/CourseCard';
import SupportLinks from '../components/SupportLinks';
import DailyChallenge from '../components/DailyChallenge';
import Leaderboard from '../components/Leaderboard';
import SupportChat from '../components/chat/SupportChat';
import GroupChat from '../components/chat/GroupChat';
import PurchaseModal from '../components/payments/PurchaseModal';
import NotificationCenter from '../components/notifications/NotificationCenter';

/* كورسات مرحلة الطالب + الكورسات العامة.
   لو عمود is_general لسه ماتضافش (ملف SQL ماتشغّلش) بنرجع للطريقة القديمة */
async function loadCoursesFor(gradeLevelId) {
  let query = supabase.from('courses').select('*').order('sort_order');
  query = gradeLevelId
    ? query.or(`grade_level_id.eq.${gradeLevelId},is_general.eq.true`)
    : query.eq('is_general', true);

  const { data, error } = await query;
  if (!error) return data || [];

  if (!gradeLevelId) return [];
  const fallback = await supabase
    .from('courses')
    .select('*')
    .eq('grade_level_id', gradeLevelId)
    .order('sort_order');
  return fallback.data || [];
}

function StudentDashboard() {
  const { profile, signOut } = useAuth();
  const { lang } = useT();
  const C = chatLabels(lang);
  const P = payLabels(lang);
  const NL = notifLabels(lang);
  const [courses, setCourses] = useState([]);
  const [lessonCounts, setLessonCounts] = useState({});
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [playerCourse, setPlayerCourse] = useState(null);
  const [tab, setTab] = useState('courses'); /* courses | challenge | notifications | support | group */
  const [boardKey, setBoardKey] = useState(0);
  const [locked, setLocked] = useState(false);
  const [payReq, setPayReq] = useState(null); /* آخر طلب تحويل */
  const [showPay, setShowPay] = useState(false);

  /* رسايل مس شيرهان اللي لسه ماتقرتش */
  const { count: unread, refresh: refreshUnread } = useUnreadSupport('owner');
  /* إشعارات الطالب (الجرس) */
  const { count: notifCount, refresh: refreshNotif } = useUnreadNotifications('user');

  /* دوسة على إشعار: افتح الصفحة المرتبطة بيه */
  function openNotification(n) {
    if (n.type === 'message_new') setTab('support');
    else if (n.type === 'payment_approved' || n.type === 'payment_rejected' || n.type === 'payment_submitted') setTab('courses');
  }

  const load = useCallback(async (silent = false) => {
      if (!profile) return;
      if (!silent) setLoading(true);

      /* قفل الحساب + آخر طلب تحويل */
      const { data: lk } = await supabase
        .from('profiles')
        .select('is_locked')
        .eq('id', profile.id)
        .maybeSingle();
      setLocked(!!(lk && lk.is_locked));

      const { data: pr } = await supabase
        .from('payment_requests')
        .select('id,status,admin_note,package_name,created_at')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(1);
      setPayReq((pr && pr[0]) || null);

      const { data: subs } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('student_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(1);

      setSubscription(subs?.[0] || null);

      const list = await loadCoursesFor(profile.grade_level_id);
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

      setLoading(false);
  }, [profile]);

  useEffect(() => {
    load();
  }, [load]);

  const filteredCourses = courses.filter((c) =>
    (c.title_ar || '').toLowerCase().includes(search.toLowerCase())
  );

  const endDate = subscription?.end_date ? new Date(subscription.end_date + 'T23:59:59') : null;
  const isActive = !!subscription && subscription.status === 'active' && !!endDate && endDate >= new Date();
  const daysLeft = endDate ? Math.max(0, Math.ceil((endDate - new Date()) / 86400000)) : 0;

  /* الكورسات بتظهر لو الطالب له مرحلة، أو فيه كورسات عامة */
  const hasCourseAccess = isActive && (!!profile?.grade_level_id || courses.length > 0);

  /* لو التحويل قيد المراجعة، نحدّث الحالة لوحدها (أول ما مس شيرهان تفعّل يظهر المحتوى) */
  useEffect(() => {
    if (isActive || !payReq || payReq.status !== 'pending') return undefined;
    const timer = setInterval(() => load(true), 25000);
    return () => clearInterval(timer);
  }, [isActive, payReq, load]);

  /* حساب مقفول: شاشة قفل + شات الدعم بس */
  if (locked && profile) {
    return (
      <div className="bc-locked-screen">
        <div className="card bc-locked-card">
          <h1>🔒 {P.lockedTitle}</h1>
          <p>{P.lockedText}</p>
          <div className="bc-panel">
            <SupportChat studentId={profile.id} viewerRole="student" onRead={refreshUnread} />
          </div>
          <button type="button" className="btn btn-ghost" onClick={signOut}>
            {P.logout}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="dash-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="mark">EN</span> بسّطنا الإنجليزي
        </div>
        <a
          href="#"
          className={tab === 'courses' ? 'active' : ''}
          onClick={(e) => { e.preventDefault(); setTab('courses'); }}
        >
          📚 كورساتي
        </a>
        <a
          href="#"
          className={tab === 'challenge' ? 'active' : ''}
          onClick={(e) => { e.preventDefault(); setTab('challenge'); }}
        >
          🏆 التحدي اليومي
        </a>
        <a
          href="#"
          className={tab === 'notifications' ? 'active' : ''}
          onClick={(e) => { e.preventDefault(); setTab('notifications'); }}
        >
          🔔 {NL.studentTab}
          {notifCount > 0 && (
            <b className="nav-badge" aria-label={NL.unreadN(notifCount)}>
              {notifCount > 99 ? '99+' : notifCount}
            </b>
          )}
        </a>
        <a
          href="#"
          className={tab === 'support' ? 'active' : ''}
          onClick={(e) => { e.preventDefault(); setTab('support'); }}
        >
          💬 {C.tabSupport}
          {unread > 0 && (
            <b className="nav-badge" aria-label={C.unreadN(unread)}>
              {unread > 99 ? '99+' : unread}
            </b>
          )}
        </a>
        <a
          href="#"
          className={tab === 'group' ? 'active' : ''}
          onClick={(e) => { e.preventDefault(); setTab('group'); }}
        >
          👥 {C.tabGroup}
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

        {!isActive && payReq && payReq.status === 'pending' && (
          <div className="card notice-card warn">
            <p>{P.pendingText(payReq.package_name)}</p>
          </div>
        )}

        {!isActive && !(payReq && payReq.status === 'pending') && (
          <div className="card notice-card danger">
            <p>⚠️ مفيش اشتراك فعّال. كلّم مس. شيرهان من تبويب «{C.tabSupport}» لتجديد الاشتراك.</p>
            {payReq && payReq.status === 'rejected' && (
              <p>
                {P.rejectedText}
                {payReq.admin_note ? ` ${P.rejectedNote}: ${payReq.admin_note}` : ''}
              </p>
            )}
            <button type="button" className="btn btn-gold btn-sm" onClick={() => setShowPay(true)}>
              {payReq && payReq.status === 'rejected' ? P.uploadAgainBtn : P.uploadBtn}
            </button>
          </div>
        )}

        {isActive && daysLeft <= 7 && (
          <div className="card notice-card warn">
            <p>⏳ اشتراكك هيخلص بعد {daysLeft} يوم. كلّم مس. شيرهان للتجديد.</p>
          </div>
        )}

        {isActive && !loading && !profile?.grade_level_id && courses.length === 0 && (
          <div className="empty-state">محتاج تحدد مرحلتك الدراسية. تواصل مع الدعم.</div>
        )}

        {tab === 'courses' && hasCourseAccess && (
          <>
            <button type="button" className="dc-banner" onClick={() => setTab('challenge')}>
              <span>🔥 تحدي اليوم جاهز — جاوب وكمّل الستريك</span>
              <b>‹</b>
            </button>

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

        {tab === 'challenge' && isActive && (
          profile?.grade_level_id ? (
            <div className="dc-layout">
              <DailyChallenge onAnswered={() => setBoardKey((k) => k + 1)} />
              <Leaderboard refreshKey={boardKey} />
            </div>
          ) : (
            <div className="empty-state">محتاج تحدد مرحلتك الدراسية. تواصل مع الدعم.</div>
          )
        )}

        {tab === 'notifications' && (
          <section className="bc-section">
            <div className="bc-head">
              <h2>🔔 {NL.studentTitle}</h2>
              <p>{NL.studentSub}</p>
            </div>
            <NotificationCenter audience="user" onOpen={openNotification} onChanged={refreshNotif} />
          </section>
        )}

        {/* الشات والجروب متاحين حتى لو الاشتراك منتهي (عشان الطالب يقدر يطلب التجديد) */}
        {tab === 'support' && profile?.id && (
          <section className="bc-section">
            <div className="bc-head">
              <h2>💬 {C.studentTitle}</h2>
              <p>{C.studentSub}</p>
            </div>
            <div className="bc-panel">
              <SupportChat studentId={profile.id} viewerRole="student" onRead={refreshUnread} />
            </div>
          </section>
        )}

        {tab === 'group' && (
          <section className="bc-section">
            <div className="bc-head">
              <h2>👥 {C.groupTitle}</h2>
              <p>{C.groupSub}</p>
            </div>
            <div className="bc-panel">
              <GroupChat />
            </div>
          </section>
        )}
      </main>

      {playerCourse && (
        <CoursePlayer course={playerCourse} onClose={() => setPlayerCourse(null)} />
      )}

      {showPay && (
        <PurchaseModal defaultLevelId={profile?.grade_level_id} onClose={() => setShowPay(false)} />
      )}
    </div>
  );
}

export default StudentDashboard;