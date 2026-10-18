/* ============================================================
   🎬 CoursePlayer — مشغل الكورس
   فيديوهات درايف بتتشغل مباشرة من Google Drive (iframe عادي)
   ============================================================ */
import { useEffect, useRef, useState } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from '../context/AuthContext';
import Comments from './Comments';
import LessonQuiz from './LessonQuiz';

/* ---------- Helpers ---------- */
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

function extractDriveId(url) {
  if (!url) return null;
  const m =
    url.match(/drive\.google\.com\/file\/d\/([A-Za-z0-9_-]+)/) ||
    url.match(/drive\.google\.com\/(?:open|uc)\?(?:[^#]*&)?id=([A-Za-z0-9_-]+)/);
  return m ? m[1] : null;
}

function getVideoThumbnail(type, url) {
  if (!url) return null;
  if (type === 'youtube') {
    const id = extractYouTubeId(url);
    return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : null;
  }
  if (type === 'drive') {
    const id = extractDriveId(url);
    return id ? `https://drive.google.com/thumbnail?id=${id}&sz=w800` : null;
  }
  return null;
}

function VideoError({ text }) {
  return (
    <div className="video-error">
      <span>⚠️</span>
      <p>{text}</p>
    </div>
  );
}

/* ---------- Component ---------- */
function CoursePlayer({ course, onClose, preview = false }) {
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

  /* تكبير الشاشة من جوه الموقع (مش من درايف) */
  const wrapRef = useRef(null);
  const [isFs, setIsFs] = useState(false);
  const [theater, setTheater] = useState(false);

  function toggleEnlarge() {
    const el = wrapRef.current;
    if (!el) return;
    const fsEl = document.fullscreenElement || document.webkitFullscreenElement;
    if (fsEl) {
      (document.exitFullscreen || document.webkitExitFullscreen)?.call(document);
      return;
    }
    if (theater) { setTheater(false); return; }
    const req = el.requestFullscreen || el.webkitRequestFullscreen;
    if (!req) { setTheater(true); return; }   // iPhone: وضع المسرح
    try {
      const r = req.call(el);
      if (r && r.catch) r.catch(() => setTheater(true));
    } catch {
      setTheater(true);
    }
  }

  useEffect(() => {
    const onFs = () => setIsFs(!!(document.fullscreenElement || document.webkitFullscreenElement));
    document.addEventListener('fullscreenchange', onFs);
    document.addEventListener('webkitfullscreenchange', onFs);
    return () => {
      document.removeEventListener('fullscreenchange', onFs);
      document.removeEventListener('webkitfullscreenchange', onFs);
    };
  }, []);

  /* قفل بالـ Esc ومنع سكرول الصفحة ورا المودال */
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      if (theater) setTheater(false);
      else onClose();
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose, theater]);

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
      const allLessons = course.content_url ? [introLesson, ...lessonsData] : lessonsData;
      setLessons(allLessons);
      setActiveLesson((cur) => cur || allLessons[0] || null);

      const ratings = ratingsRes.data || [];
      const total = ratings.reduce((a, r) => a + r.rating, 0);
      setRatingStats({ avg: ratings.length ? (total / ratings.length).toFixed(1) : 0, count: ratings.length });
      if (myRatingRes.data) {
        setMyRating(myRatingRes.data.rating);
        setRating(myRatingRes.data.rating);
      }

      if (profile && lessonsData.length > 0) {
        const { data: progressData } = await supabase
          .from('lesson_progress')
          .select('lesson_id, watched')
          .eq('student_id', profile.id)
          .in('lesson_id', lessonsData.map((l) => l.id));
        const watchedSet = new Set((progressData || []).filter((p) => p.watched).map((p) => p.lesson_id));
        setWatchedIds(watchedSet);
        const w = lessonsData.filter((l) => watchedSet.has(l.id)).length;
        setProgress({ watched: w, total: lessonsData.length, pct: Math.round((w / lessonsData.length) * 100) });
      }
      setLoading(false);
    }
    load();
  }, [course.id, profile, course.content_url, course.content_type, course.description_ar]);

  async function playLesson(lesson) {
    setActiveLesson(lesson);
    setShowQuiz(false);
    if (lesson.is_intro || !profile || preview) return;

    await supabase
      .from('lesson_progress')
      .upsert({ lesson_id: lesson.id, student_id: profile.id, watched: true }, { onConflict: 'lesson_id,student_id' });

    const newSet = new Set(watchedIds);
    newSet.add(lesson.id);
    setWatchedIds(newSet);
    const real = lessons.filter((l) => !l.is_intro);
    const w = real.filter((l) => newSet.has(l.id)).length;
    setProgress({ watched: w, total: real.length, pct: real.length ? Math.round((w / real.length) * 100) : 0 });
  }

  async function submitRating(value) {
    if (!profile) return;
    setRating(value);
    const { error } = await supabase
      .from('course_ratings')
      .upsert({ course_id: course.id, student_id: profile.id, rating: value }, { onConflict: 'course_id,student_id' });
    if (error) {
      console.error(error);
      return;
    }
    setMyRating(value);
  }

  /* ---------- الفيديو ---------- */
  function renderVideo() {
    if (!activeLesson) {
      return (
        <div id="video-placeholder">
          <div style={{ fontSize: 64 }}>🎬</div>
          <p>اختار فيديو من القائمة</p>
        </div>
      );
    }

    const { video_type, video_url, id } = activeLesson;
    const noMenu = (e) => e.preventDefault();

    if (video_type === 'youtube') {
      const ytId = extractYouTubeId(video_url);
      if (!ytId) return <VideoError text="رابط YouTube غلط" />;
      return (
        <iframe
          key={id}
          title={activeLesson.title_ar}
          src={`https://www.youtube.com/embed/${ytId}?autoplay=1&rel=0&modestbranding=1&iv_load_policy=3`}
          allow="autoplay; encrypted-media"
          onContextMenu={noMenu}
        />
      );
    }

    if (video_type === 'vimeo') {
      const m = video_url.match(/vimeo\.com\/(\d+)/);
      if (!m) return <VideoError text="رابط Vimeo غلط" />;
      return (
        <iframe
          key={id}
          title={activeLesson.title_ar}
          src={`https://player.vimeo.com/video/${m[1]}?autoplay=1&title=0&byline=0&portrait=0`}
          allow="autoplay"
          onContextMenu={noMenu}
        />
      );
    }

    /* ✅ درايف: مشغل جوجل نفسه، من غير سكربت */
    if (video_type === 'drive') {
      const driveId = extractDriveId(video_url);
      if (!driveId) return <VideoError text="رابط Google Drive غلط، اتأكد إنه رابط مشاركة" />;
      return (
        <>
          <iframe
            key={id}
            title={activeLesson.title_ar}
            src={`https://drive.google.com/file/d/${driveId}/preview`}
            allow="autoplay"
            sandbox="allow-scripts allow-same-origin"
          />
          {/* دروع بتغطي زرار فتح الفيديو في درايف وزرار التكبير بتاعه */}
          <div className="drive-shield shield-top" aria-hidden="true" onContextMenu={noMenu} />
          <div className="drive-shield shield-bottom" aria-hidden="true" onContextMenu={noMenu} />
        </>
      );
    }

    if (video_type === 'link' || video_type === 'file') {
      if (/\.(mp4|webm|ogg|mov|m4v)(\?|#|$)/i.test(video_url)) {
        return (
          <video
            key={id}
            src={video_url}
            controls
            autoPlay
            playsInline
            controlsList="nodownload noremoteplayback"
            disablePictureInPicture
            onContextMenu={noMenu}
          />
        );
      }
      return (
        <iframe key={id} title={activeLesson.title_ar} src={video_url} allow="autoplay" onContextMenu={noMenu} />
      );
    }

    return <VideoError text="نوع الفيديو مش مدعوم" />;
  }

  const realCount = lessons.filter((l) => !l.is_intro).length;

  return (
    <div className={`overlay open${theater ? ' has-theater' : ''}`} onClick={onClose}>
      <div className="course-player-modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <button className="close" onClick={onClose} aria-label="إغلاق">✕</button>
        {preview && <div className="preview-banner">👁️ وضع المعاينة — مش بيتسجل ليك تقدم ولا تقييم</div>}

        <div ref={wrapRef} className={`video-wrapper${theater ? ' theater' : ''}`}>
          <div id="video-player">{renderVideo()}</div>

          {profile && (
            <div className="wm" aria-hidden="true">
              {profile.full_name} · {profile.phone || profile.email}
            </div>
          )}

          {activeLesson && (
            <button type="button" className="enlarge-btn" onClick={toggleEnlarge} aria-label="تكبير الشاشة">
              {isFs || theater ? '🗗 تصغير' : '⛶ تكبير'}
            </button>
          )}
        </div>

        {activeLesson && (
          <div className="video-details">
            <h3>{activeLesson.title_ar}</h3>
            {activeLesson.description_ar && <p>{activeLesson.description_ar}</p>}
          </div>
        )}

        <div className="course-player-head">
          <h2>{course.title_ar}</h2>
          <div className="player-meta">
            <span className="meta-chip">⭐ {ratingStats.avg} <small>({ratingStats.count} تقييم)</small></span>
            <span className="meta-chip">📹 {realCount} فيديو</span>
          </div>
        </div>

        {progress.total > 0 && (
          <div className="pp-wrap">
            <div className="pp-top">
              <span>📊 تقدمك في الكورس</span>
              <b>{progress.watched} / {progress.total} · {progress.pct}%</b>
            </div>
            <div className="pp-bar" role="progressbar" aria-valuenow={progress.pct} aria-valuemin="0" aria-valuemax="100">
              <div className="pp-fill" style={{ width: `${progress.pct}%` }} />
            </div>
          </div>
        )}

        {loading ? (
          <div className="empty-state">جاري التحميل...</div>
        ) : lessons.length === 0 ? (
          <div className="empty-state">لسه مفيش فيديوهات في الكورس ده</div>
        ) : (
          <div className="lessons-list">
            {lessons.map((lesson, i) => {
              const isWatched = watchedIds.has(lesson.id) && !lesson.is_intro;
              const isActive = activeLesson?.id === lesson.id;
              const thumb = getVideoThumbnail(lesson.video_type, lesson.video_url);
              return (
                <div
                  key={lesson.id}
                  className={`lesson-item${isActive ? ' active' : ''}${isWatched ? ' done' : ''}`}
                  onClick={() => playLesson(lesson)}
                >
                  <div className="lesson-thumb">
                    {thumb ? (
                      <img src={thumb} alt="" loading="lazy" />
                    ) : (
                      <div className="lesson-placeholder">{lesson.is_intro ? '🎬' : '🎥'}</div>
                    )}
                    <div className="lesson-play"><svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg></div>
                    <span className={`lesson-num${lesson.is_intro ? ' intro' : ''}`}>{lesson.is_intro ? 'مقدمة' : i}</span>
                    {isWatched && <span className="lesson-check">✓</span>}
                  </div>
                  <div className="lesson-info">
                    <h4>{lesson.title_ar}</h4>
                    {lesson.description_ar && <p>{lesson.description_ar}</p>}
                    {lesson.duration_min > 0 && <span className="lesson-duration">⏱️ {lesson.duration_min} دقيقة</span>}
                  </div>
                  {isActive && <span className="now-playing">شغّال دلوقتي</span>}
                </div>
              );
            })}
          </div>
        )}

        <div className="course-rating-section" hidden={preview}>
          <h3>قيّم الكورس</h3>
          <div className="rating-stars">
            {[1, 2, 3, 4, 5].map((n) => (
              <span key={n} className={`star ${rating >= n ? 'active' : ''}`} onClick={() => submitRating(n)}>★</span>
            ))}
          </div>
          {myRating && <p className="rating-thanks">شكراً لتقييمك 💛</p>}
        </div>

        {!preview && profile && activeLesson && !activeLesson.is_intro && (
          <div className="quiz-cta">
            <button className="btn btn-teal btn-block" onClick={() => setShowQuiz(true)}>🎓 ابدأ امتحان الدرس</button>
          </div>
        )}

        {profile && activeLesson && !activeLesson.is_intro && <Comments lessonId={activeLesson.id} />}

        {showQuiz && activeLesson && <LessonQuiz lesson={activeLesson} onClose={() => setShowQuiz(false)} />}
      </div>
    </div>
  );
}

export default CoursePlayer;