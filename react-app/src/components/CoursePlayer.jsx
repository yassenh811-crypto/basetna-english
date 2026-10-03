/* ============================================================
   🎬 CoursePlayer — مشغل الكورس (كامل مع كل الميزات)
   ------------------------------------------------------------
   - الفيديو التقديمي + الدروس
   - Progress Bar + علامة ✓
   - التقييم
   - التعليقات
   - امتحان الدرس (AI)
   ============================================================ */
import { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from '../context/AuthContext';
import Comments from './Comments';
import LessonQuiz from './LessonQuiz';

/* ============================================================
   استخراج ID من روابط الفيديو
   ============================================================ */
function extractYouTubeId(url) {
  if (!url) return null;
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([A-Za-z0-9_-]{11})/,
    /^([A-Za-z0-9_-]{11})$/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

function getVideoThumbnail(type, url) {
  if (!url) return null;
  if (type === 'youtube') {
    const id = extractYouTubeId(url);
    return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : null;
  }
  if (type === 'drive') {
    const m = url.match(/drive\.google\.com\/(?:file\/d\/|open\?id=)([A-Za-z0-9_-]+)/);
    return m ? `https://drive.google.com/thumbnail?id=${m[1]}&sz=w800` : null;
  }
  return null;
}

/* ============================================================
   CoursePlayer
   ============================================================ */
function CoursePlayer({ course, onClose }) {
  const { profile } = useAuth();
  const [lessons, setLessons] = useState([]);
  const [activeLesson, setActiveLesson] = useState(null);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState(0);
  const [myRating, setMyRating] = useState(null);
  const [ratingStats, setRatingStats] = useState({ avg: 0, count: 0 });
  const [watchedIds, setWatchedIds] = useState(new Set());
  const [progress, setProgress] = useState({ watched: 0, total: 0, pct: 0 });
  const [showQuiz, setShowQuiz] = useState(false);

  /* ============================================================
     جلب الدروس + التقييمات + التقدم
     ============================================================ */
  useEffect(() => {
    async function load() {
      setLoading(true);

      const [lessonsRes, ratingsRes, myRatingRes] = await Promise.all([
        supabase.from('lessons').select('*').eq('course_id', course.id).order('sort_order'),
        supabase.from('course_ratings').select('rating').eq('course_id', course.id),
        profile
          ? supabase.from('course_ratings').select('*').eq('course_id', course.id).eq('student_id', profile.id).maybeSingle()
          : Promise.resolve({ data: null }),
      ]);

      const lessonsData = lessonsRes.data || [];

      /* ضيف الفيديو التقديمي في الأول */
      const introLesson = {
        id: '__intro__',
        title_ar: '🎬 الفيديو التقديمي',
        description_ar: course.description_ar || '',
        video_type: course.content_type || 'youtube',
        video_url: course.content_url || '',
        duration_min: 0,
        sort_order: -1,
        is_intro: true,
      };

      const allLessons = course.content_url
        ? [introLesson, ...lessonsData]
        : lessonsData;

      setLessons(allLessons);
      if (allLessons.length > 0) setActiveLesson(allLessons[0]);

      const ratings = ratingsRes.data || [];
      const total = ratings.reduce((a, r) => a + r.rating, 0);
      setRatingStats({
        avg: ratings.length ? (total / ratings.length).toFixed(1) : 0,
        count: ratings.length,
      });

      if (myRatingRes.data) {
        setMyRating(myRatingRes.data.rating);
        setRating(myRatingRes.data.rating);
      }

      /* جلب تقدم الطالب (بس للدروس الحقيقية) */
      if (profile && lessonsData.length > 0) {
        const { data: progressData } = await supabase
          .from('lesson_progress')
          .select('lesson_id, watched')
          .eq('student_id', profile.id)
          .in('lesson_id', lessonsData.map((l) => l.id));

        const watchedSet = new Set(
          (progressData || []).filter((p) => p.watched).map((p) => p.lesson_id)
        );
        setWatchedIds(watchedSet);

        const w = lessonsData.filter((l) => watchedSet.has(l.id)).length;
        setProgress({
          watched: w,
          total: lessonsData.length,
          pct: lessonsData.length > 0 ? Math.round((w / lessonsData.length) * 100) : 0,
        });
      }

      setLoading(false);
    }
    load();
  }, [course.id, profile, course.content_url, course.content_type, course.description_ar]);

  /* ============================================================
     تشغيل درس
     ============================================================ */
  async function playLesson(lesson) {
    setActiveLesson(lesson);
    setShowQuiz(false);

    /* الفيديو التقديمي مش بيتحسب في التقدم */
    if (lesson.is_intro) return;

    if (profile) {
      await supabase.from('lesson_progress').upsert(
        { lesson_id: lesson.id, student_id: profile.id, watched: true },
        { onConflict: 'lesson_id,student_id' }
      );

      const newSet = new Set(watchedIds);
      newSet.add(lesson.id);
      setWatchedIds(newSet);

      const realLessons = lessons.filter((l) => !l.is_intro);
      const w = realLessons.filter((l) => newSet.has(l.id)).length;
      setProgress({
        watched: w,
        total: realLessons.length,
        pct: realLessons.length > 0 ? Math.round((w / realLessons.length) * 100) : 0,
      });
    }
  }

  /* ============================================================
     إرسال تقييم
     ============================================================ */
  async function submitRating(value) {
    if (!profile) return;
    setRating(value);
    const { error } = await supabase.from('course_ratings').upsert(
      { course_id: course.id, student_id: profile.id, rating: value },
      { onConflict: 'course_id,student_id' }
    );
    if (error) { console.error(error); return; }
    setMyRating(value);
  }

  /* ============================================================
     عرض الفيديو — يدعم كل الأنواع
     ============================================================ */
  function renderVideo() {
    if (!activeLesson) {
      return (
        <div id="video-placeholder">
          <div style={{ fontSize: 64 }}>🎬</div>
          <p>اختار فيديو من القائمة</p>
        </div>
      );
    }

    const { video_type, video_url } = activeLesson;

    if (video_type === 'youtube') {
      const id = extractYouTubeId(video_url);
      return id ? (
        <iframe
          width="100%"
          height="100%"
          src={`https://www.youtube.com/embed/${id}?autoplay=1&rel=0`}
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        ></iframe>
      ) : (
        <div style={{ padding: 20, color: '#fff', textAlign: 'center' }}>
          <p>⚠️ رابط YouTube غلط</p>
          <a href={video_url} target="_blank" rel="noopener" style={{ color: 'var(--gold-soft)' }}>افتح الرابط خارج الموقع</a>
        </div>
      );
    }

    if (video_type === 'vimeo') {
      const m = video_url.match(/vimeo\.com\/(\d+)/);
      return m ? (
        <iframe src={`https://player.vimeo.com/video/${m[1]}?autoplay=1`} width="100%" height="100%" frameBorder="0" allow="autoplay; fullscreen"></iframe>
      ) : (
        <div style={{ padding: 20, color: '#fff', textAlign: 'center' }}>
          <p>⚠️ رابط Vimeo غلط</p>
        </div>
      );
    }

    if (video_type === 'drive') {
      const m = video_url.match(/drive\.google\.com\/(?:file\/d\/|open\?id=)([A-Za-z0-9_-]+)/);
      return m ? (
        <iframe src={`https://drive.google.com/file/d/${m[1]}/preview`} width="100%" height="100%" frameBorder="0" allow="autoplay"></iframe>
      ) : (
        <div style={{ padding: 20, color: '#fff', textAlign: 'center' }}>
          <p>⚠️ رابط Google Drive غلط</p>
        </div>
      );
    }

    if (video_type === 'link' || video_type === 'file') {
      if (/\.(mp4|webm|ogg|mov|m4v)(\?|#|$)/i.test(video_url)) {
        return <video src={video_url} controls autoPlay style={{ width: '100%', height: '100%' }}></video>;
      }
      return <iframe src={video_url} width="100%" height="100%" frameBorder="0" allow="autoplay; fullscreen"></iframe>;
    }

    return (
      <div style={{ padding: 20, color: '#fff', textAlign: 'center' }}>
        <p>⚠️ نوع الفيديو مش مدعوم</p>
        <a href={video_url} target="_blank" rel="noopener" style={{ color: 'var(--gold-soft)' }}>افتح الرابط خارج الموقع</a>
      </div>
    );
  }

  /* ============================================================
     Render
     ============================================================ */
  return (
    <div className="overlay open" onClick={onClose}>
      <div className="course-player-modal" onClick={(e) => e.stopPropagation()}>
        <button className="close" onClick={onClose}>✕</button>

        {/* الفيديو */}
        <div className="video-wrapper">
          <div id="video-player">{renderVideo()}</div>
        </div>

        {/* تفاصيل الفيديو */}
        {activeLesson && (
          <div className="video-details">
            <h3>{activeLesson.title_ar}</h3>
            <p>{activeLesson.description_ar || ''}</p>
          </div>
        )}

        {/* رأس الكورس */}
        <div className="course-player-head">
          <h2>{course.title_ar}</h2>
          <div className="player-meta">
            <span>⭐ {ratingStats.avg} ({ratingStats.count} تقييم)</span>
            <span>📹 {lessons.filter((l) => !l.is_intro).length} فيديو</span>
          </div>
        </div>

        {/* Progress Bar */}
        {progress.total > 0 && (
          <div style={{ padding: '0 20px', marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13, fontWeight: 700 }}>
              <span>📊 تقدمك</span>
              <span>{progress.watched} / {progress.total} ({progress.pct}%)</span>
            </div>
            <div style={{ width: '100%', height: 10, background: 'var(--paper-2)', borderRadius: 999, overflow: 'hidden' }}>
              <div style={{ width: `${progress.pct}%`, height: '100%', background: 'linear-gradient(90deg, var(--teal), var(--gold))', transition: 'width 0.3s ease' }} />
            </div>
          </div>
        )}

        {/* قايمة الدروس */}
        {loading ? (
          <div className="empty-state">جاري التحميل...</div>
        ) : lessons.length === 0 ? (
          <div className="empty-state">لسه مفيش فيديوهات</div>
        ) : (
          <div className="lessons-list">
            {lessons.map((lesson, i) => {
              const isWatched = watchedIds.has(lesson.id);
              const isActive = activeLesson?.id === lesson.id;
              return (
                <div
                  key={lesson.id}
                  className="lesson-item"
                  onClick={() => playLesson(lesson)}
                  style={isActive ? { borderColor: 'var(--teal)', background: '#F5FAF8' } : {}}
                >
                  <div className="lesson-thumb">
                    {getVideoThumbnail(lesson.video_type, lesson.video_url) ? (
                      <img src={getVideoThumbnail(lesson.video_type, lesson.video_url)} alt={lesson.title_ar} />
                    ) : (
                      <div className="lesson-placeholder">{lesson.is_intro ? '🎬' : '🎥'}</div>
                    )}
                    <div className="lesson-play">
                      <svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                    </div>
                    <span
                      className="lesson-num"
                      style={lesson.is_intro ? { background: 'var(--gold)', fontSize: 10, width: 'auto', padding: '2px 8px', borderRadius: 999 } : {}}
                    >
                      {lesson.is_intro ? 'مقدمة' : i}
                    </span>
                    {isWatched && !lesson.is_intro && (
                      <span style={{ position: 'absolute', top: 6, right: 6, background: 'var(--teal)', color: '#fff', borderRadius: '50%', width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800 }}>✓</span>
                    )}
                  </div>
                  <div className="lesson-info">
                    <h4>{lesson.title_ar}</h4>
                    {lesson.description_ar && <p>{lesson.description_ar}</p>}
                    {lesson.duration_min > 0 && (
                      <span className="lesson-duration">⏱️ {lesson.duration_min} دقيقة</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* التقييم */}
        <div className="course-rating-section">
          <h3>⭐ قيّم الكورس</h3>
          <div className="rating-stars">
            {[1, 2, 3, 4, 5].map((n) => (
              <span key={n} className={`star ${rating >= n ? 'active' : ''}`} onClick={() => submitRating(n)}>★</span>
            ))}
          </div>
          {myRating && <p className="rating-thanks">شكراً لتقييمك 💛</p>}
        </div>

        {/* ✅ زرار الامتحان — للمسجلين دخول بس، ومش للفيديو التقديمي */}
        {profile && activeLesson && !activeLesson.is_intro && (
          <div style={{ padding: '16px 20px', borderTop: '1px solid var(--line)', textAlign: 'center' }}>
            <button
              className="btn btn-teal btn-block"
              onClick={() => setShowQuiz(true)}
            >
              🎓 ابدأ امتحان الدرس
            </button>
          </div>
        )}

        {/* ✅ التعليقات — للمسجلين دخول بس، ومش للفيديو التقديمي */}
        {profile && activeLesson && !activeLesson.is_intro && (
          <Comments lessonId={activeLesson.id} />
        )}

        {/* ✅ نافذة الامتحان */}
        {showQuiz && activeLesson && (
          <LessonQuiz
            lesson={activeLesson}
            onClose={() => setShowQuiz(false)}
          />
        )}
      </div>
    </div>
  );
}

export default CoursePlayer;