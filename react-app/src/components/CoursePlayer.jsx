/* ============================================================
   🎬 CoursePlayer — مشغل الكورس
   ============================================================ */
import { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from '../context/AuthContext';

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

  /* ============================================================
     جلب الدروس + التقييمات
     ============================================================ */
  useEffect(() => {
    async function load() {
      setLoading(true);

      const [lessonsRes, ratingsRes, myRatingRes] = await Promise.all([
        supabase
          .from('lessons')
          .select('*')
          .eq('course_id', course.id)
          .order('sort_order'),
        supabase
          .from('course_ratings')
          .select('rating')
          .eq('course_id', course.id),
        profile
          ? supabase
              .from('course_ratings')
              .select('*')
              .eq('course_id', course.id)
              .eq('student_id', profile.id)
              .maybeSingle()
          : Promise.resolve({ data: null }),
      ]);

      const lessonsData = lessonsRes.data || [];
      setLessons(lessonsData);
      if (lessonsData.length > 0) setActiveLesson(lessonsData[0]);

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

      setLoading(false);
    }
    load();
  }, [course.id, profile]);

  /* ============================================================
     تشغيل درس
     ============================================================ */
  function playLesson(lesson) {
    setActiveLesson(lesson);

    /* سجّل التقدم */
    if (profile) {
      supabase
        .from('lesson_progress')
        .upsert(
          { lesson_id: lesson.id, student_id: profile.id, watched: true },
          { onConflict: 'lesson_id,student_id' }
        )
        .then(() => {});
    }
  }

  /* ============================================================
     إرسال تقييم
     ============================================================ */
  async function submitRating(value) {
    if (!profile) return;
    setRating(value);
    const { error } = await supabase
      .from('course_ratings')
      .upsert(
        { course_id: course.id, student_id: profile.id, rating: value },
        { onConflict: 'course_id,student_id' }
      );
    if (error) {
      console.error(error);
      return;
    }
    setMyRating(value);
  }

  /* ============================================================
     عرض الفيديو
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
      ) : null;
    }

    if (video_type === 'vimeo') {
      const m = video_url.match(/vimeo\.com\/(\d+)/);
      return m ? (
        <iframe
          src={`https://player.vimeo.com/video/${m[1]}?autoplay=1`}
          width="100%"
          height="100%"
          frameBorder="0"
          allow="autoplay; fullscreen"
        ></iframe>
      ) : null;
    }

    if (video_type === 'drive') {
      const m = video_url.match(/drive\.google\.com\/(?:file\/d\/|open\?id=)([A-Za-z0-9_-]+)/);
      return m ? (
        <iframe
          src={`https://drive.google.com/file/d/${m[1]}/preview`}
          width="100%"
          height="100%"
          frameBorder="0"
          allow="autoplay"
        ></iframe>
      ) : null;
    }

    /* ملف فيديو مباشر */
    return (
      <video
        src={video_url}
        controls
        autoPlay
        style={{ width: '100%', height: '100%' }}
      ></video>
    );
  }

  return (
    <div className="overlay open" onClick={onClose}>
      <div
        className="course-player-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <button className="close" onClick={onClose}>✕</button>

        {/* ============================================================
            الفيديو
            ============================================================ */}
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
            <span>📹 {lessons.length} فيديو</span>
          </div>
        </div>

        {/* قائمة الدروس */}
        {loading ? (
          <div className="empty-state">جاري التحميل...</div>
        ) : lessons.length === 0 ? (
          <div className="empty-state">لسه مفيش فيديوهات</div>
        ) : (
          <div className="lessons-list">
            {lessons.map((lesson, i) => (
              <div
                key={lesson.id}
                className="lesson-item"
                onClick={() => playLesson(lesson)}
                style={
                  activeLesson?.id === lesson.id
                    ? { borderColor: 'var(--teal)', background: '#F5FAF8' }
                    : {}
                }
              >
                <div className="lesson-thumb">
                  {getVideoThumbnail(lesson.video_type, lesson.video_url) ? (
                    <img
                      src={getVideoThumbnail(lesson.video_type, lesson.video_url)}
                      alt={lesson.title_ar}
                    />
                  ) : (
                    <div className="lesson-placeholder">🎬</div>
                  )}
                  <div className="lesson-play">
                    <svg viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </div>
                  <span className="lesson-num">{i + 1}</span>
                </div>
                <div className="lesson-info">
                  <h4>{lesson.title_ar}</h4>
                  {lesson.description_ar && <p>{lesson.description_ar}</p>}
                  {lesson.duration_min > 0 && (
                    <span className="lesson-duration">
                      ⏱️ {lesson.duration_min} دقيقة
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* التقييم */}
        <div className="course-rating-section">
          <h3>⭐ قيّم الكورس</h3>
          <div className="rating-stars">
            {[1, 2, 3, 4, 5].map((n) => (
              <span
                key={n}
                className={`star ${rating >= n ? 'active' : ''}`}
                onClick={() => submitRating(n)}
              >
                ★
              </span>
            ))}
          </div>
          {myRating && <p className="rating-thanks">شكراً لتقييمك 💛</p>}
        </div>
      </div>
    </div>
  );
}

export default CoursePlayer;