/* ============================================================
   🎬 LessonsManager — إدارة الفيديوهات جوه الكورس
   ============================================================ */
import { useEffect, useState } from 'react';
import { supabase } from '../../services/supabase';
import LessonForm from './LessonForm';
import GenerateQuizButton from './GenerateQuizButton';

function getThumbnail(type, url) {
  if (!url) return null;
  if (type === 'youtube') {
    const m = url.match(
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([A-Za-z0-9_-]{11})/
    );
    return m ? `https://img.youtube.com/vi/${m[1]}/hqdefault.jpg` : null;
  }
  if (type === 'drive') {
    const m =
      url.match(/drive\.google\.com\/file\/d\/([A-Za-z0-9_-]+)/) ||
      url.match(/drive\.google\.com\/(?:open|uc)\?(?:[^#]*&)?id=([A-Za-z0-9_-]+)/);
    return m ? `https://drive.google.com/thumbnail?id=${m[1]}&sz=w400` : null;
  }
  return null;
}

const TYPE_LABEL = {
  youtube: '▶️ يوتيوب',
  vimeo: '🎥 فيميو',
  drive: '📁 درايف',
  file: '📱 ملف',
  link: '🔗 رابط',
};

function LessonsManager({ course, onClose }) {
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);

  async function loadLessons() {
    setLoading(true);
    const { data, error } = await supabase
      .from('lessons')
      .select('*')
      .eq('course_id', course.id)
      .order('sort_order');
    if (error) console.error(error);
    setLessons(data || []);
    setLoading(false);
  }

  useEffect(() => {
    loadLessons();
  }, [course.id]);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && !showForm && onClose();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [showForm, onClose]);

  async function handleDelete(l) {
    if (!confirm(`متأكد إنك عايز تحذف "${l.title_ar}"؟`)) return;
    const { error } = await supabase.from('lessons').delete().eq('id', l.id);
    if (error) {
      alert('❌ ' + error.message);
      return;
    }
    await loadLessons();
  }

  function handleFormClose() {
    setShowForm(false);
    setEditing(null);
    loadLessons();
  }

  return (
    <>
      <div className="overlay open" onClick={onClose}>
        <div className="modal wide" onClick={(e) => e.stopPropagation()}>
          <button className="close" onClick={onClose} type="button" aria-label="إغلاق">✕</button>

          <h3>🎬 {course.title_ar}</h3>
          <p className="sub">
            عدد الفيديوهات: <b>{lessons.length}</b>
          </p>

          <button
            className="btn btn-gold btn-block"
            style={{ marginBottom: 16 }}
            onClick={() => {
              setEditing(null);
              setShowForm(true);
            }}
          >
            ＋ إضافة فيديو جديد
          </button>

          {loading ? (
            <div className="skeleton-list"><span /><span /><span /></div>
          ) : lessons.length === 0 ? (
            <div className="empty-state">لسه مفيش فيديوهات 👋</div>
          ) : (
            <div className="lm-list">
              {lessons.map((l, i) => {
                const thumb = getThumbnail(l.video_type, l.video_url);
                return (
                  <div className="lm-item" key={l.id}>
                    <div className="lm-thumb">
                      {thumb ? <img src={thumb} alt="" loading="lazy" /> : <span>🎬</span>}
                      <em>{i + 1}</em>
                    </div>

                    <div className="lm-info">
                      <b>{l.title_ar}</b>
                      {l.description_ar && <p>{l.description_ar}</p>}
                      <small>
                        {TYPE_LABEL[l.video_type] || l.video_type}
                        {l.duration_min > 0 && ` · ⏱️ ${l.duration_min} دقيقة`}
                      </small>
                    </div>

                    <div className="lm-actions">
                      <GenerateQuizButton lesson={l} onGenerated={loadLessons} />
                      <button
                        className="icon-btn"
                        onClick={() => {
                          setEditing(l);
                          setShowForm(true);
                        }}
                        aria-label="تعديل"
                      >
                        ✏️
                      </button>
                      <button className="icon-btn danger" onClick={() => handleDelete(l)} aria-label="حذف">🗑️</button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* برّه الـ overlay الأول عشان القفل ميقفلش الاتنين مع بعض */}
      {showForm && <LessonForm courseId={course.id} lesson={editing} onClose={handleFormClose} />}
    </>
  );
}

export default LessonsManager;