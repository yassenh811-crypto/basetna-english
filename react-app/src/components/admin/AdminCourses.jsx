/* ============================================================
   🎬 AdminCourses — إدارة الكورسات
   ============================================================ */
import { useEffect, useState } from 'react';
import { supabase } from '../../services/supabase';
import AdminFormModal from './AdminFormModal';
import LessonsManager from './LessonsManager';

function AdminCourses() {
  const [courses, setCourses] = useState([]);
  const [levels, setLevels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [msg, setMsg] = useState('');
  const [lessonsCourse, setLessonsCourse] = useState(null);
  const [search, setSearch] = useState('');

  const [form, setForm] = useState({
    title_ar: '',
    title_en: '',
    description_ar: '',
    grade_level_id: '',
    content_type: 'link',
    content_url: '',
    sort_order: 0,
  });

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
    setForm({
      title_ar: '',
      title_en: '',
      description_ar: '',
      grade_level_id: levels[0]?.id || '',
      content_type: 'link',
      content_url: '',
      sort_order: 0,
    });
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
      content_type: c.content_type || 'link',
      content_url: c.content_url || '',
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
      content_url: form.content_url.trim() || 'https://placeholder.com',
      sort_order: Number(form.sort_order) || 0,
    };

    if (!payload.title_ar || !payload.title_en) {
      setMsg('❌ لازم تملأ العنوانين');
      setSaving(false);
      return;
    }

    let error;
    if (editing) {
      ({ error } = await supabase
        .from('courses')
        .update(payload)
        .eq('id', editing.id));
    } else {
      ({ error } = await supabase.from('courses').insert(payload));
    }

    setSaving(false);

    if (error) {
      setMsg('❌ ' + error.message);
      return;
    }

    setModalOpen(false);
    await loadData();
  }

  async function handleDelete(id) {
    if (!confirm('متأكد إنك عايز تحذف الكورس ده؟')) return;
    await supabase.from('lessons').delete().eq('course_id', id);
    const { error } = await supabase.from('courses').delete().eq('id', id);
    if (error) {
      alert('❌ ' + error.message);
      return;
    }
    await loadData();
  }

  function levelName(id) {
    return levels.find((l) => l.id === id)?.name_ar || '—';
  }

  const filteredCourses = courses.filter(
    (c) =>
      (c.title_ar || '').toLowerCase().includes(search.toLowerCase()) ||
      (c.title_en || '').toLowerCase().includes(search.toLowerCase()) ||
      levelName(c.grade_level_id).toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <div className="dash-head" style={{ flexWrap: 'wrap', gap: 10 }}>
        <h1>الكورسات</h1>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder="🔍 ابحث في الكورسات..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              padding: '10px 16px',
              border: '1.5px solid var(--line)',
              borderRadius: 999,
              fontSize: 14,
              minWidth: 220,
              background: '#fff',
            }}
          />
          <button className="btn btn-gold btn-sm" onClick={openAddModal}>
            + إضافة كورس
          </button>
        </div>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>الكورس</th>
              <th>المرحلة</th>
              <th>النوع</th>
              <th>إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="4">
                  <div className="empty-state">جاري التحميل...</div>
                </td>
              </tr>
            ) : filteredCourses.length === 0 ? (
              <tr>
                <td colSpan="4">
                  <div className="empty-state">
                    {search ? 'مفيش نتايج' : 'لسه مفيش كورسات'}
                  </div>
                </td>
              </tr>
            ) : (
              filteredCourses.map((c) => (
                <tr key={c.id}>
                  <td>
                    <b>{c.title_ar}</b>
                  </td>
                  <td>{levelName(c.grade_level_id)}</td>
                  <td>{c.content_type === 'link' ? '🎬 كورس' : '📄 ملف'}</td>
                  <td>
                    <button
                      className="icon-btn"
                      onClick={() => setLessonsCourse(c)}
                      style={{ background: 'var(--teal)', color: '#fff' }}
                    >
                      🎬 الفيديوهات
                    </button>
                    <button
                      className="icon-btn"
                      onClick={() => openEditModal(c)}
                    >
                      ✏️
                    </button>
                    <button
                      className="icon-btn danger"
                      onClick={() => handleDelete(c.id)}
                    >
                      🗑️
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <AdminFormModal
        open={modalOpen}
        title={editing ? 'تعديل كورس' : 'إضافة كورس'}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSubmit}
        loading={saving}
      >
        <div className="field">
          <label>العنوان (عربي)</label>
          <input
            type="text"
            value={form.title_ar}
            onChange={(e) => setForm({ ...form, title_ar: e.target.value })}
            required
          />
        </div>
        <div className="field">
          <label>Title (English)</label>
          <input
            type="text"
            value={form.title_en}
            onChange={(e) => setForm({ ...form, title_en: e.target.value })}
            required
          />
        </div>
        <div className="field">
          <label>المرحلة</label>
          <select
            value={form.grade_level_id}
            onChange={(e) =>
              setForm({ ...form, grade_level_id: e.target.value })
            }
            required
          >
            <option value="">— اختار مرحلة —</option>
            {levels.map((lv) => (
              <option key={lv.id} value={lv.id}>
                {lv.name_ar}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>الوصف</label>
          <textarea
            rows="3"
            value={form.description_ar}
            onChange={(e) =>
              setForm({ ...form, description_ar: e.target.value })
            }
          />
        </div>
        <div className="field">
          <label>رابط الفيديو التقديمي</label>
          <input
            type="url"
            value={form.content_url}
            onChange={(e) => setForm({ ...form, content_url: e.target.value })}
            placeholder="https://youtu.be/..."
          />
        </div>
        {msg && <div className="form-msg error">{msg}</div>}
      </AdminFormModal>

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