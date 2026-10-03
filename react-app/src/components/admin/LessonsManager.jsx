/* ============================================================
   🎬 LessonsManager — إدارة الفيديوهات جوه الكورس
   ------------------------------------------------------------
   - عرض كل الفيديوهات
   - إضافة فيديو جديد
   - تعديل / حذف
   - توليد امتحان بالـ AI
   ============================================================ */
import { useEffect, useState } from 'react';
import { supabase } from '../../services/supabase';
import LessonForm from './LessonForm';
import GenerateQuizButton from './GenerateQuizButton';

function LessonsManager({ course, onClose }) {
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);

  /* ============================================================
     جلب الفيديوهات
     ============================================================ */
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

  /* ============================================================
     حذف فيديو
     ============================================================ */
  async function handleDelete(id) {
    if (!confirm('متأكد إنك عايز تحذف الفيديو ده؟')) return;
    const { error } = await supabase.from('lessons').delete().eq('id', id);
    if (error) {
      alert('❌ ' + error.message);
      return;
    }
    await loadLessons();
  }

  /* ============================================================
     إغلاق الفورم
     ============================================================ */
  function handleFormClose() {
    setShowForm(false);
    setEditing(null);
    loadLessons();
  }

  /* ============================================================
     صورة مصغّرة للفيديو
     ============================================================ */
  function getThumbnail(type, url) {
    if (!url) return null;

    if (type === 'youtube') {
      const m = url.match(
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([A-Za-z0-9_-]{11})/
      );
      return m ? `https://img.youtube.com/vi/${m[1]}/hqdefault.jpg` : null;
    }
    if (type === 'drive') {
      const m = url.match(
        /drive\.google\.com\/(?:file\/d\/|open\?id=)([A-Za-z0-9_-]+)/
      );
      return m
        ? `https://drive.google.com/thumbnail?id=${m[1]}&sz=w400`
        : null;
    }
    return null;
  }

  /* ============================================================
     أيقونة نوع الفيديو
     ============================================================ */
  function typeIcon(type) {
    return (
      {
        youtube: '▶️ يوتيوب',
        vimeo: '🎥 فيميو',
        drive: '📁 درايف',
        file: '📱 ملف',
        link: '🔗 رابط',
      }[type] || type
    );
  }

  /* ============================================================
     Render
     ============================================================ */
  return (
    <div className="overlay open" onClick={onClose}>
      <div
        className="modal"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 750, maxHeight: '90vh', overflowY: 'auto' }}
      >
        <button className="close" onClick={onClose}>
          ✕
        </button>

        <h3>🎬 فيديوهات: {course.title_ar}</h3>
        <p className="sub">
          عدد الفيديوهات: <b>{lessons.length}</b>
        </p>

        {/* زرار إضافة فيديو */}
        <button
          className="btn btn-gold btn-block"
          style={{ marginBottom: 16 }}
          onClick={() => {
            setEditing(null);
            setShowForm(true);
          }}
        >
          ➕ إضافة فيديو جديد
        </button>

        {/* قايمة الفيديوهات */}
        {loading ? (
          <div className="empty-state">جاري التحميل...</div>
        ) : lessons.length === 0 ? (
          <div className="empty-state">لسه مفيش فيديوهات 👋</div>
        ) : (
          <div
            style={{ display: 'flex', flexDirection: 'column', gap: 10 }}
          >
            {lessons.map((l, i) => {
              const thumb = getThumbnail(l.video_type, l.video_url);
              return (
                <div
                  key={l.id}
                  style={{
                    display: 'flex',
                    gap: 12,
                    padding: 10,
                    background: 'var(--paper)',
                    border: '1.5px solid var(--line)',
                    borderRadius: 12,
                    alignItems: 'center',
                  }}
                >
                  {/* صورة مصغّرة */}
                  <div
                    style={{
                      width: 100,
                      height: 60,
                      borderRadius: 8,
                      overflow: 'hidden',
                      background: 'var(--navy-deep)',
                      flexShrink: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {thumb ? (
                      <img
                        src={thumb}
                        alt={l.title_ar}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                        }}
                      />
                    ) : (
                      <span style={{ fontSize: 30 }}>🎬</span>
                    )}
                  </div>

                  {/* معلومات */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontWeight: 800,
                        color: 'var(--navy-deep)',
                        marginBottom: 4,
                      }}
                    >
                      {i + 1}. {l.title_ar}
                    </div>
                    {l.description_ar && (
                      <div
                        style={{
                          fontSize: 12.5,
                          color: 'var(--ink-soft)',
                        }}
                      >
                        {l.description_ar}
                      </div>
                    )}
                    <div
                      style={{
                        fontSize: 11.5,
                        color: 'var(--ink-soft)',
                        marginTop: 4,
                      }}
                    >
                      {typeIcon(l.video_type)}
                      {l.duration_min > 0 && ` · ⏱️ ${l.duration_min} دقيقة`}
                    </div>
                  </div>

                  {/* أزرار */}
                  <div
                    style={{ display: 'flex', gap: 6, flexShrink: 0 }}
                  >
                    {/* زرار AI */}
                    <GenerateQuizButton
                      lesson={l}
                      onGenerated={loadLessons}
                    />

                    {/* تعديل */}
                    <button
                      className="icon-btn"
                      onClick={() => {
                        setEditing(l);
                        setShowForm(true);
                      }}
                    >
                      ✏️
                    </button>

                    {/* حذف */}
                    <button
                      className="icon-btn danger"
                      onClick={() => handleDelete(l.id)}
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* فورم إضافة/تعديل فيديو */}
      {showForm && (
        <LessonForm
          courseId={course.id}
          lesson={editing}
          onClose={handleFormClose}
        />
      )}
    </div>
  );
}

export default LessonsManager;