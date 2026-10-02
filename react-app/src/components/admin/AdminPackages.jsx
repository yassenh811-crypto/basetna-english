/* ============================================================
   📦 AdminPackages — إدارة الباقات
   ============================================================ */
import { useEffect, useState } from 'react';
import { supabase } from '../../services/supabase';
import AdminFormModal from './AdminFormModal';

function AdminPackages() {
  const [packages, setPackages] = useState([]);
  const [levels, setLevels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [msg, setMsg] = useState('');

  const [form, setForm] = useState({
    name_ar: '',
    name_en: '',
    grade_level_id: '',
    price: 0,
    duration_days: 30,
    description_ar: '',
    is_active: true,
  });

  /* ============================================================
     جلب البيانات
     ============================================================ */
  async function loadData() {
    setLoading(true);
    const [pkgRes, lvRes] = await Promise.all([
      supabase.from('packages').select('*').order('created_at', { ascending: false }),
      supabase.from('grade_levels').select('*').order('sort_order'),
    ]);
    if (pkgRes.error) console.error(pkgRes.error);
    setPackages(pkgRes.data || []);
    setLevels(lvRes.data || []);
    setLoading(false);
  }

  useEffect(() => { loadData(); }, []);

  /* ============================================================
     Modal
     ============================================================ */
  function openAddModal() {
    setEditing(null);
    setForm({
      name_ar: '',
      name_en: '',
      grade_level_id: levels[0]?.id || '',
      price: 0,
      duration_days: 30,
      description_ar: '',
      is_active: true,
    });
    setMsg('');
    setModalOpen(true);
  }

  function openEditModal(pkg) {
    setEditing(pkg);
    setForm({
      name_ar: pkg.name_ar || '',
      name_en: pkg.name_en || '',
      grade_level_id: pkg.grade_level_id || '',
      price: pkg.price ?? 0,
      duration_days: pkg.duration_days ?? 30,
      description_ar: pkg.description_ar || '',
      is_active: pkg.is_active ?? true,
    });
    setMsg('');
    setModalOpen(true);
  }

  /* ============================================================
     حفظ
     ============================================================ */
  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setMsg('');

    const payload = {
      name_ar: form.name_ar.trim(),
      name_en: form.name_en.trim(),
      grade_level_id: form.grade_level_id || null,
      price: Number(form.price) || 0,
      duration_days: Number(form.duration_days) || 30,
      description_ar: form.description_ar.trim(),
      is_active: !!form.is_active,
    };

    if (!payload.name_ar || !payload.name_en) {
      setMsg('❌ لازم تملأ الاسمين');
      setSaving(false);
      return;
    }

    let error;
    if (editing) {
      ({ error } = await supabase.from('packages').update(payload).eq('id', editing.id));
    } else {
      ({ error } = await supabase.from('packages').insert(payload));
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
    if (!confirm('متأكد إنك عايز تحذف الباقة دي؟')) return;
    const { error } = await supabase.from('packages').delete().eq('id', id);
    if (error) { alert('❌ ' + error.message); return; }
    await loadData();
  }

  /* ============================================================
     جلب اسم المرحلة
     ============================================================ */
  function levelName(id) {
    return levels.find((l) => l.id === id)?.name_ar || '—';
  }

  return (
    <>
      <div className="dash-head">
        <h1>الباقات</h1>
        <button className="btn btn-gold btn-sm" onClick={openAddModal}>
          + إضافة باقة
        </button>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>اسم الباقة</th>
              <th>المرحلة</th>
              <th>السعر</th>
              <th>المدة</th>
              <th>الحالة</th>
              <th>إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="6"><div className="empty-state">جاري التحميل...</div></td></tr>
            ) : packages.length === 0 ? (
              <tr><td colSpan="6"><div className="empty-state">لسه مفيش باقات</div></td></tr>
            ) : (
              packages.map((p) => (
                <tr key={p.id}>
                  <td><b>{p.name_ar}</b></td>
                  <td>{levelName(p.grade_level_id)}</td>
                  <td>{p.price} ج.م</td>
                  <td>{p.duration_days} يوم</td>
                  <td>
                    <span className={`badge ${p.is_active ? 'active' : 'expired'}`}>
                      {p.is_active ? 'فعّالة' : 'موقوفة'}
                    </span>
                  </td>
                  <td>
                    <button className="icon-btn" onClick={() => openEditModal(p)}>✏️</button>
                    <button className="icon-btn danger" onClick={() => handleDelete(p.id)}>🗑️</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <AdminFormModal
        open={modalOpen}
        title={editing ? 'تعديل باقة' : 'إضافة باقة'}
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
          <label>المرحلة</label>
          <select
            value={form.grade_level_id}
            onChange={(e) => setForm({ ...form, grade_level_id: e.target.value })}
            required
          >
            <option value="">— اختار مرحلة —</option>
            {levels.map((lv) => (
              <option key={lv.id} value={lv.id}>{lv.name_ar}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>السعر (ج.م)</label>
          <input
            type="number"
            value={form.price}
            onChange={(e) => setForm({ ...form, price: e.target.value })}
            min="0"
          />
        </div>
        <div className="field">
          <label>المدة (يوم)</label>
          <input
            type="number"
            value={form.duration_days}
            onChange={(e) => setForm({ ...form, duration_days: e.target.value })}
            min="1"
          />
        </div>
        <div className="field">
          <label>الوصف</label>
          <textarea
            rows="3"
            value={form.description_ar}
            onChange={(e) => setForm({ ...form, description_ar: e.target.value })}
          />
        </div>
        <div className="field">
          <label>
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
              style={{ marginInlineEnd: 8 }}
            />
            فعّالة
          </label>
        </div>
        {msg && <div className="form-msg error">{msg}</div>}
      </AdminFormModal>
    </>
  );
}

export default AdminPackages;