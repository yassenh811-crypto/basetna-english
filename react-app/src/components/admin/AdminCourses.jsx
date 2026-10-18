/* ============================================================
   🎬 AdminCourses — إدارة الكورسات (مع صورة الكورس)
   ============================================================ */
import { useEffect, useState } from 'react';
import { supabase } from '../../services/supabase';
import { getCourseCover } from '../../utils/courseCover';
import AdminFormModal from './AdminFormModal';
import LessonsManager from './LessonsManager';
import CoursePlayer from '../CoursePlayer';
import ImageUploader from './ImageUploader';
import { AdminToolbar, StateRow, RowActions } from './AdminUI';

const EMPTY_FORM = {
  title_ar: '',
  title_en: '',
  description_ar: '',
  grade_level_id: '',
  content_type: 'youtube',
  content_url: '',
  thumbnail_url: '',
  sort_order: 0,
};

const TYPE_LABEL = {
  youtube: '▶️ يوتيوب',
  vimeo: '🎥 فيميو',
  drive: '📁 درايف',
  link: '🔗 رابط',
};

const URL_PLACEHOLDER = {
  youtube: 'https://youtu.be/xxxxxxxxxxx',
  vimeo: 'https://vimeo.com/123456789',
  drive: 'https://drive.google.com/file/d/xxxxx/view',
  link: 'https://example.com/video.mp4',
};

function AdminCourses() {
  const [courses, setCourses] = useState([]);
  const [levels, setLevels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [msg, setMsg] = useState('');
  const [lessonsCourse, setLessonsCourse] = useState(null);
  const [watchCourse, setWatchCourse] = useState(null);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState(EMPTY_FORM);

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  async function loadData() {
    setLoading(true);
    const [cRes, lRes] = await Promise.all([
      supabase.from('courses').select('*').order('sort_order'),
      supabase.from('grade_levels').select('*').order('sort_order'),
    ]);
    setCourses(cRes.data || []);
    setLevels(lRes.data || []);
    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  function openAddModal() {
    setEditing(null);
    setForm({ ...EMPTY_FORM, grade_level_id: levels[0]?.id || '' });
    setMsg('');
    setModalOpen(true);
  }

  function openEditModal(c) {
    setEditing(c);
    setForm({
      title_ar: c.title_ar || '',
      title_en: c.title_en || '',
      description_ar: c.description_ar || '',
      grade_level_id: c.grade_level_id || '',
      content_type: c.content_type || 'youtube',
      content_url: c.content_url || '',
      thumbnail_url: c.thumbnail_url || '',
      sort_order: c.sort_order ?? 0,
    });
    setMsg('');
    setModalOpen(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setMsg('');

    const payload = {
      title_ar: form.title_ar.trim(),
      title_en: form.title_en.trim(),
      description_ar: form.description_ar.trim(),
      grade_level_id: form.grade_level_id || null,
      content_type: form.content_type,
      content_url: form.content_url.trim() || null,
      thumbnail_url: form.thumbnail_url.trim() || null,
      sort_order: Number(form.sort_order) || 0,
    };

    if (!payload.title_ar || !payload.title_en) {
      setMsg('❌ لازم تملأ العنوانين');
      setSaving(false);
      return;
    }

    let error;
    if (editing) {
      ({ error } = await supabase.from('courses').update(payload).eq('id', editing.id));
    } else {
      ({ error } = await supabase.from('courses').insert(payload));
    }

    setSaving(false);

    if (error) {
      setMsg(
        error.message?.includes('thumbnail_url')
          ? '❌ لازم تضيف عمود thumbnail_url في جدول courses (شغّل أمر الـ SQL مرة واحدة في Supabase)'
          : '❌ ' + error.message
      );
      return;
    }

    setModalOpen(false);
    await loadData();
  }

  async function handleDelete(c) {
    if (!confirm(`متأكد إنك عايز تحذف كورس "${c.title_ar}" وكل فيديوهاته؟`)) return;
    const { error: lessonsErr } = await supabase.from('lessons').delete().eq('course_id', c.id);
    if (lessonsErr) {
      alert('❌ ' + lessonsErr.message);
      return;
    }
    const { error } = await supabase.from('courses').delete().eq('id', c.id);
    if (error) {
      alert('❌ ' + error.message);
      return;
    }
    await loadData();
  }

  const levelName = (id) => levels.find((l) => l.id === id)?.name_ar || '—';

  const q = search.toLowerCase();
  const filtered = courses.filter(
    (c) =>
      (c.title_ar || '').toLowerCase().includes(q) ||
      (c.title_en || '').toLowerCase().includes(q) ||
      levelName(c.grade_level_id).toLowerCase().includes(q)
  );

  return (
    <>
      <AdminToolbar
        title="الكورسات"
        count={courses.length}
        search={search}
        onSearch={setSearch}
        placeholder="ابحث في الكورسات..."
        addLabel="إضافة كورس"
        onAdd={openAddModal}
      />

      <div className="table-wrap stack">
        <table>
          <thead>
            <tr>
              <th>الكورس</th>
              <th>المرحلة</th>
              <th>الفيديو التقديمي</th>
              <th>إجراءات</th>
            </tr>
          </thead>
          <tbody>
            <StateRow colSpan={4} loading={loading} />
            <StateRow colSpan={4} empty={!loading && filtered.length === 0} text={search ? 'مفيش نتايج' : 'لسه مفيش كورسات'} />
            {!loading &&
              filtered.map((c) => {
                const cover = getCourseCover(c, 'w400');
                return (
                  <tr key={c.id}>
                    <td data-label="الكورس">
                      <div className="cell-course">
                        <div className="mini-cover">
                          {cover ? <img src={cover} alt="" loading="lazy" /> : <span>🎬</span>}
                        </div>
                        <b>{c.title_ar}</b>
                      </div>
                    </td>
                    <td data-label="المرحلة">
                      <span className="level-chip">{levelName(c.grade_level_id)}</span>
                    </td>
                    <td data-label="الفيديو التقديمي">
                      {c.content_url ? (
                        <a className="link-chip" href={c.content_url} target="_blank" rel="noopener noreferrer">
                          {TYPE_LABEL[c.content_type] || '🔗 رابط'} ↗
                        </a>
                      ) : (
                        <span className="muted">—</span>
                      )}
                    </td>
                    <td data-label="إجراءات">
                      <RowActions>
                        <button className="icon-btn watch" onClick={() => setWatchCourse(c)}>
                          ▶️ مشاهدة
                        </button>
                        <button className="icon-btn primary" onClick={() => setLessonsCourse(c)}>
                          🎬 الفيديوهات
                        </button>
                        <button className="icon-btn" onClick={() => openEditModal(c)} aria-label="تعديل">✏️</button>
                        <button className="icon-btn danger" onClick={() => handleDelete(c)} aria-label="حذف">🗑️</button>
                      </RowActions>
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>

      <AdminFormModal
        open={modalOpen}
        wide
        title={editing ? 'تعديل كورس' : 'إضافة كورس'}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSubmit}
        loading={saving}
      >
        <div className="field">
          <label>صورة الكورس</label>
          <ImageUploader value={form.thumbnail_url} onChange={(url) => set({ thumbnail_url: url })} />
          <small className="hint">لو مرفعتش صورة، هنستخدم صورة الفيديو التقديمي تلقائي (يوتيوب / درايف).</small>
        </div>

        <div className="field-row">
          <div className="field">
            <label>العنوان (عربي)</label>
            <input type="text" value={form.title_ar} onChange={(e) => set({ title_ar: e.target.value })} required />
          </div>
          <div className="field">
            <label>Title (English)</label>
            <input type="text" value={form.title_en} onChange={(e) => set({ title_en: e.target.value })} required />
          </div>
        </div>

        <div className="field-row">
          <div className="field">
            <label>المرحلة</label>
            <select value={form.grade_level_id} onChange={(e) => set({ grade_level_id: e.target.value })} required>
              <option value="">— اختار مرحلة —</option>
              {levels.map((lv) => (
                <option key={lv.id} value={lv.id}>{lv.name_ar}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>الترتيب</label>
            <input type="number" value={form.sort_order} onChange={(e) => set({ sort_order: e.target.value })} />
          </div>
        </div>

        <div className="field">
          <label>الوصف</label>
          <textarea rows="3" value={form.description_ar} onChange={(e) => set({ description_ar: e.target.value })} />
        </div>

        <div className="field-row">
          <div className="field">
            <label>نوع الفيديو التقديمي</label>
            <select value={form.content_type} onChange={(e) => set({ content_type: e.target.value })}>
              <option value="youtube">▶️ يوتيوب</option>
              <option value="vimeo">🎥 فيميو</option>
              <option value="drive">📁 جوجل درايف</option>
              <option value="link">🔗 رابط مباشر (MP4 أو iframe)</option>
            </select>
          </div>
          <div className="field">
            <label>رابط الفيديو التقديمي</label>
            <input
              type="url"
              value={form.content_url}
              onChange={(e) => set({ content_url: e.target.value })}
              placeholder={URL_PLACEHOLDER[form.content_type] || 'https://...'}
            />
          </div>
        </div>
        {form.content_type === 'drive' && (
          <small className="hint">📁 في درايف: Share ← General access ← Anyone with the link (Viewer)، وإلا الطالب مش هيشوف الفيديو.</small>
        )}

        {msg && <div className="form-msg error">{msg}</div>}
      </AdminFormModal>

      {watchCourse && <CoursePlayer course={watchCourse} preview onClose={() => setWatchCourse(null)} />}

      {lessonsCourse && (
        <LessonsManager
          course={lessonsCourse}
          onClose={() => {
            setLessonsCourse(null);
            loadData();
          }}
        />
      )}
    </>
  );
}

export default AdminCourses;