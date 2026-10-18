/* ============================================================
   🎓 CourseCard — كارت الكورس عند الطالب (كامل)
   - بيعرض صورة الكورس (من الأدمن) أو صورة الفيديو التقديمي
   - لو مفيش صورة بيعرض خلفية متدرّجة شيك بدل الأسود
   ============================================================ */
import { useState } from 'react';
import { getCourseCover } from '../utils/courseCover';

function CourseCard({ course, onOpen, badge = 'كورس', lessonsCount }) {
  const cover = getCourseCover(course);
  const [broken, setBroken] = useState(false);
  const showImg = cover && !broken;

  return (
    <article className="card course-card">
      <button
        type="button"
        className="course-thumb"
        onClick={() => onOpen(course)}
        aria-label={`شاهد ${course.title_ar}`}
      >
        {showImg ? (
          <img src={cover} alt="" loading="lazy" onError={() => setBroken(true)} />
        ) : (
          <span className="file-icon">🎬</span>
        )}
        <span className="play-overlay">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg>
        </span>
        {badge && <span className="video-badge">{badge}</span>}
      </button>

      <div className="course-body">
        <h3>{course.title_ar}</h3>
        <p>{course.description_ar}</p>
        {typeof lessonsCount === 'number' && (
          <div className="course-meta">📹 {lessonsCount} فيديو</div>
        )}
        <button type="button" className="btn btn-teal btn-block" onClick={() => onOpen(course)}>
          🎬 مشاهدة الكورس
        </button>
      </div>
    </article>
  );
}

export default CourseCard;