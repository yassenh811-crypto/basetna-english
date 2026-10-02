/* ============================================================
   🎬 LessonsManager — إدارة الفيديوهات جوه الكورس
   ============================================================ */
import { useEffect, useState } from 'react';
import { supabase } from '../../services/supabase';
import LessonForm from './LessonForm';

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

  async function handleDelete(id) {
    if (!confirm('متأكد إنك عايز تحذف الفيديو ده؟')) return;
    const { error } = await supabase.from('lessons').delete().eq('id', id);
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

  function getThumbnail(type, url) {
    if (type === 'youtube') {
      const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([A-Za-z0-9_-]{11})/);
      return m ? `https://img.youtube.com/vi/${m[1]}/hqdefault.jpg` : null;
    }
    if (type === 'drive') {
      const m = url.match(/drive\.google\.com\/(?:file\/d\/|open\?id=)([A-Za-z0-9_-]+)/);
      return m ? `https://drive.google.com/thumbnail?id=${m[1]}&sz=w400` : null;
    }
    return null;
  }

  return (
    <div className="overlay open" onClick={onClose}>
      <div
        className="modal"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 700, maxHeight: '90vh', overflowY: 'auto' }}
      >
        <button className="close" onClick={onClose}>✕</button>

        <h3>🎬 فيديوهات: {course.title_ar}</h3>
        <p className="sub">
          عدد الفيديوهات: <b>{lessons.length}</b>
        </p>

        <button
          className="btn btn-gold btn-block"
          style={{ marginBottom: 16 }}
          onClick={() => { setEditing(null); setShowForm(true); }}
        >
          ➕ إضافة فيديو جديد
        </button>

        {loading ? (
          <div className="empty-state">جاري التحميل...</div>
        ) : lessons.length === 0 ? (
          <div className="empty-state">لسه مفيش فيديوهات 👋</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
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
                  <div style={{
                    width: 100,
                    height: 60,
                    borderRadius: 8,
                    overflow: 'hidden',
                    background: 'var(--navy-deep)',
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    {thumb ? (
                      <img src={thumb} alt={l.title_ar} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <span style={{ fontSize: 30 }}>🎬</span>
                    )}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 800, color: 'var(--navy-deep)', marginBottom: 4 }}>
                      {i + 1}. {l.title_ar}
                    </div>
                    {l.description_ar && (
                      <div style={{ fontSize: 12.5, color: 'var(--ink-soft)' }}>
                        {l.description_ar}
                      </div>
                    )}
                    <div style={{ fontSize: 11.5, color: 'var(--ink-soft)', marginTop: 4 }}>
                      {l.video_type === 'youtube' ? '▶️ يوتيوب' :
                       l.video_type === 'vimeo' ? '🎥 فيميو' :
                       l.video_type === 'drive' ? '📁 درايف' :
                       '📱 ملف'}
                      {l.duration_min > 0 && ` · ⏱️ ${l.duration_min} دقيقة`}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    <button
                      className="icon-btn"
                      onClick={() => { setEditing(l); setShowForm(true); }}
                    >
                      ✏️
                    </button>
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