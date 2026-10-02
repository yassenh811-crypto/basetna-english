/* ============================================================
   📚 AdminLevels — إدارة المراحل الدراسية
   ============================================================ */
import { useEffect, useState } from 'react';
import { supabase } from '../../services/supabase';
import AdminFormModal from './AdminFormModal';

function AdminLevels() {
  const [levels, setLevels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState('');

  const [form, setForm] = useState({
    name_ar: '',
    name_en: '',
    sort_order: 0,
  });
  const [msg, setMsg] = useState('');

  async function loadLevels() {
    setLoading(true);
    const { data, error } = await supabase
      .from('grade_levels')
      .select('*')
      .order('sort_order');
    if (error) console.error(error);
    setLevels(data || []);
    setLoading(false);
  }

  useEffect(() => {
    loadLevels();
  }, []);

  function openAddModal() {
    setEditing(null);
    setForm({ name_ar: '', name_en: '', sort_order: 0 });
    setMsg('');
    setModalOpen(true);
  }

  function openEditModal(level) {
    setEditing(level);
    setForm({
      name_ar: level.name_ar || '',
      name_en: level.name_en || '',
      sort_order: level.sort_order ?? 0,
    });
    setMsg('');
    setModalOpen(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setMsg('');

    const payload = {
      name_ar: form.name_ar.trim(),
      name_en: form.name_en.trim(),
      sort_order: Number(form.sort_order) || 0,
    };

    if (!payload.name_ar || !payload.name_en) {
      setMsg('❌ لازم تملأ الاسمين');
      setSaving(false);
      return;
    }

    let error;
    if (editing) {
      ({ error } = await supabase
        .from('grade_levels')
        .update(payload)
        .eq('id', editing.id));
    } else {
      ({ error } = await supabase.from('grade_levels').insert(payload));
    }

    setSaving(false);

    if (error) {
      setMsg('❌ ' + error.message);
      return;
    }

    setModalOpen(false);
    await loadLevels();
  }

  async function handleDelete(id) {
    if (!confirm('متأكد إنك عايز تحذف المرحلة دي؟')) return;
    const { error } = await supabase
      .from('grade_levels')
      .delete()
      .eq('id', id);
    if (error) {
      alert('❌ ' + error.message);
      return;
    }
    await loadLevels();
  }

  const filteredLevels = levels.filter(
    (lv) =>
      (lv.name_ar || '').toLowerCase().includes(search.toLowerCase()) ||
      (lv.name_en || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <div className="dash-head" style={{ flexWrap: 'wrap', gap: 10 }}>
        <h1>المراحل الدراسية</h1>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder="🔍 ابحث في المراحل..."
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
            + إضافة مرحلة
          </button>
        </div>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>الاسم (عربي)</th>
              <th>Name (English)</th>
              <th>الترتيب</th>
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
            ) : filteredLevels.length === 0 ? (
              <tr>
                <td colSpan="4">
                  <div className="empty-state">
                    {search ? 'مفيش نتايج' : 'لسه مفيش مراحل'}
                  </div>
                </td>
              </tr>
            ) : (
              filteredLevels.map((lv) => (
                <tr key={lv.id}>
                  <td>{lv.name_ar}</td>
                  <td>{lv.name_en}</td>
                  <td>{lv.sort_order}</td>
                  <td>
                    <button
                      className="icon-btn"
                      onClick={() => openEditModal(lv)}
                    >
                      ✏️
                    </button>
                    <button
                      className="icon-btn danger"
                      onClick={() => handleDelete(lv.id)}
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
        title={editing ? 'تعديل مرحلة' : 'إضافة مرحلة'}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSubmit}
        loading={saving}
      >
        <div className="field">
          <label>الاسم (عربي)</label>
          <input
            type="text"
            value={form.name_ar}
            onChange={(e) => setForm({ ...form, name_ar: e.target.value })}
            required
          />
        </div>
        <div className="field">
          <label>Name (English)</label>
          <input
            type="text"
            value={form.name_en}
            onChange={(e) => setForm({ ...form, name_en: e.target.value })}
            required
          />
        </div>
        <div className="field">
          <label>الترتيب</label>
          <input
            type="number"
            value={form.sort_order}
            onChange={(e) => setForm({ ...form, sort_order: e.target.value })}
          />
        </div>
        {msg && <div className="form-msg error">{msg}</div>}
      </AdminFormModal>
    </>
  );
}

export default AdminLevels;