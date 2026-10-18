/* ============================================================
   📚 AdminLevels — إدارة المراحل الدراسية
   ============================================================ */
import { useEffect, useState } from 'react';
import { supabase } from '../../services/supabase';
import AdminFormModal from './AdminFormModal';
import { AdminToolbar, StateRow, RowActions } from './AdminUI';

const EMPTY = { name_ar: '', name_en: '', sort_order: 0 };

function AdminLevels() {
  const [levels, setLevels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState(EMPTY);
  const [msg, setMsg] = useState('');

  async function loadLevels() {
    setLoading(true);
    const { data, error } = await supabase.from('grade_levels').select('*').order('sort_order');
    if (error) console.error(error);
    setLevels(data || []);
    setLoading(false);
  }

  useEffect(() => {
    loadLevels();
  }, []);

  function openAddModal() {
    setEditing(null);
    setForm({ ...EMPTY, sort_order: levels.length + 1 });
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
      ({ error } = await supabase.from('grade_levels').update(payload).eq('id', editing.id));
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

  async function handleDelete(lv) {
    if (!confirm(`متأكد إنك عايز تحذف مرحلة "${lv.name_ar}"؟`)) return;
    const { error } = await supabase.from('grade_levels').delete().eq('id', lv.id);
    if (error) {
      alert('❌ ' + error.message + '\n\n(غالباً فيه كورسات أو باقات أو طلاب مرتبطين بالمرحلة دي)');
      return;
    }
    await loadLevels();
  }

  const q = search.toLowerCase();
  const filtered = levels.filter(
    (lv) => (lv.name_ar || '').toLowerCase().includes(q) || (lv.name_en || '').toLowerCase().includes(q)
  );

  return (
    <>
      <AdminToolbar
        title="المراحل الدراسية"
        count={levels.length}
        search={search}
        onSearch={setSearch}
        placeholder="ابحث في المراحل..."
        addLabel="إضافة مرحلة"
        onAdd={openAddModal}
      />

      <div className="table-wrap stack">
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
            <StateRow colSpan={4} loading={loading} />
            <StateRow colSpan={4} empty={!loading && filtered.length === 0} text={search ? 'مفيش نتايج' : 'لسه مفيش مراحل'} />
            {!loading &&
              filtered.map((lv) => (
                <tr key={lv.id}>
                  <td data-label="الاسم (عربي)"><b>{lv.name_ar}</b></td>
                  <td data-label="English" dir="ltr">{lv.name_en}</td>
                  <td data-label="الترتيب"><span className="level-chip">{lv.sort_order}</span></td>
                  <td data-label="إجراءات">
                    <RowActions>
                      <button className="icon-btn" onClick={() => openEditModal(lv)} aria-label="تعديل">✏️ <span className="only-mobile">تعديل</span></button>
                      <button className="icon-btn danger" onClick={() => handleDelete(lv)} aria-label="حذف">🗑️ <span className="only-mobile">حذف</span></button>
                    </RowActions>
                  </td>
                </tr>
              ))}
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
          <input type="text" value={form.name_ar} onChange={(e) => setForm({ ...form, name_ar: e.target.value })} required />
        </div>
        <div className="field">
          <label>Name (English)</label>
          <input type="text" dir="ltr" value={form.name_en} onChange={(e) => setForm({ ...form, name_en: e.target.value })} required />
        </div>
        <div className="field">
          <label>الترتيب</label>
          <input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: e.target.value })} />
        </div>
        {msg && <div className="form-msg error">{msg}</div>}
      </AdminFormModal>
    </>
  );
}

export default AdminLevels;