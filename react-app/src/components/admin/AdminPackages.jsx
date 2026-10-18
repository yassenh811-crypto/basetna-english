/* ============================================================
   📦 AdminPackages — إدارة الباقات
   - الباقة تقدر تبقى لأكتر من مرحلة
   - كوبون اختياري: لو كتبت كود، الباقة بتظهر بس لما حد يدخل الكود
     ولو سبته فاضي الباقة بتظهر للكل عادي
   ============================================================ */
import { useEffect, useState } from 'react';
import { supabase } from '../../services/supabase';
import { COUPON_RE, generateCoupon, normalizeCoupon, packageLevelIds } from '../../utils/packages';
import AdminFormModal from './AdminFormModal';
import { AdminToolbar, StateRow, RowActions } from './AdminUI';

const EMPTY = {
  name_ar: '',
  name_en: '',
  level_ids: [],
  price: 0,
  duration_days: 30,
  description_ar: '',
  is_active: true,
  coupon_code: '',
};

function AdminPackages() {
  const [packages, setPackages] = useState([]);
  const [levels, setLevels] = useState([]);
  const [coupons, setCoupons] = useState({});
  const [couponsMissing, setCouponsMissing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [msg, setMsg] = useState('');
  const [search, setSearch] = useState('');
  const [form, setForm] = useState(EMPTY);
  const [copied, setCopied] = useState('');

  async function loadData() {
    setLoading(true);
    const [pkgRes, lvRes, cRes] = await Promise.all([
      supabase.from('packages').select('*').order('created_at', { ascending: false }),
      supabase.from('grade_levels').select('*').order('sort_order'),
      supabase.from('package_coupons').select('package_id,code'),
    ]);
    setPackages(pkgRes.data || []);
    setLevels(lvRes.data || []);
    if (cRes.error) {
      setCouponsMissing(true);
      setCoupons({});
    } else {
      setCouponsMissing(false);
      const map = {};
      (cRes.data || []).forEach((c) => { map[String(c.package_id)] = c.code; });
      setCoupons(map);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  function openAddModal() {
    setEditing(null);
    setForm({ ...EMPTY, level_ids: levels[0] ? [String(levels[0].id)] : [] });
    setMsg('');
    setModalOpen(true);
  }

  function openEditModal(pkg) {
    setEditing(pkg);
    setForm({
      name_ar: pkg.name_ar || '',
      name_en: pkg.name_en || '',
      level_ids: packageLevelIds(pkg),
      price: pkg.price ?? 0,
      duration_days: pkg.duration_days ?? 30,
      description_ar: pkg.description_ar || '',
      is_active: pkg.is_active ?? true,
      coupon_code: coupons[String(pkg.id)] || '',
    });
    setMsg('');
    setModalOpen(true);
  }

  function toggleLevel(id) {
    const sid = String(id);
    setForm((f) => ({
      ...f,
      level_ids: f.level_ids.includes(sid) ? f.level_ids.filter((x) => x !== sid) : [...f.level_ids, sid],
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setMsg('');
    const fail = (t) => { setMsg('❌ ' + t); setSaving(false); };

    const ids = form.level_ids;
    const code = normalizeCoupon(form.coupon_code);

    if (!form.name_ar.trim() || !form.name_en.trim()) return fail('لازم تملأ الاسمين');
    if (ids.length === 0) return fail('اختار مرحلة واحدة على الأقل');
    if (code && !COUPON_RE.test(code)) return fail('الكوبون: من 3 لـ 30 حرف أو رقم (يسمح بـ - و _)');

    const payload = {
      name_ar: form.name_ar.trim(),
      name_en: form.name_en.trim(),
      grade_level_id: ids[0],
      grade_level_ids: ids,
      price: Number(form.price) || 0,
      duration_days: Number(form.duration_days) || 30,
      description_ar: form.description_ar.trim(),
      is_active: !!form.is_active,
      coupon_required: !!code,
    };

    let savedId = editing?.id;
    let error;
    if (editing) {
      ({ error } = await supabase.from('packages').update(payload).eq('id', editing.id));
    } else {
      const res = await supabase.from('packages').insert(payload).select('id').single();
      error = res.error;
      savedId = res.data?.id;
    }

    if (error) {
      return fail(
        /grade_level_ids|coupon_required/.test(error.message || '')
          ? 'لازم تشغّل ملف coupons.sql في Supabase مرة واحدة الأول'
          : error.message
      );
    }

    /* الكوبون */
    if (code) {
      const { error: cErr } = await supabase
        .from('package_coupons')
        .upsert({ package_id: String(savedId), code }, { onConflict: 'package_id' });
      if (cErr) {
        await supabase.from('packages').update({ coupon_required: false }).eq('id', savedId);
        await loadData();
        return fail(cErr.code === '23505' ? 'الكوبون ده مستخدم في باقة تانية، اختار كود مختلف' : cErr.message);
      }
    } else if (editing) {
      await supabase.from('package_coupons').delete().eq('package_id', String(savedId));
    }

    setSaving(false);
    setModalOpen(false);
    await loadData();
  }

  async function handleDelete(p) {
    if (!confirm(`متأكد إنك عايز تحذف باقة "${p.name_ar}"؟`)) return;
    const { error } = await supabase.from('packages').delete().eq('id', p.id);
    if (error) {
      alert('❌ ' + error.message + '\n\n(لو فيه اشتراكات على الباقة دي، وقّفها بدل ما تحذفها)');
      return;
    }
    await loadData();
  }

  async function toggleActive(p) {
    const { error } = await supabase.from('packages').update({ is_active: !p.is_active }).eq('id', p.id);
    if (error) {
      alert('❌ ' + error.message);
      return;
    }
    setPackages((list) => list.map((x) => (x.id === p.id ? { ...x, is_active: !p.is_active } : x)));
  }

  function copyCode(code) {
    navigator.clipboard?.writeText(code).then(() => {
      setCopied(code);
      setTimeout(() => setCopied(''), 1500);
    });
  }

  const levelName = (id) => levels.find((l) => String(l.id) === String(id))?.name_ar || '—';

  const q = search.toLowerCase();
  const filtered = packages.filter(
    (p) =>
      (p.name_ar || '').toLowerCase().includes(q) ||
      (p.name_en || '').toLowerCase().includes(q) ||
      (coupons[String(p.id)] || '').toLowerCase().includes(q)
  );

  return (
    <>
      <AdminToolbar
        title="الباقات"
        count={packages.length}
        search={search}
        onSearch={setSearch}
        placeholder="ابحث في الباقات أو الكوبونات..."
        addLabel="إضافة باقة"
        onAdd={openAddModal}
      />

      {couponsMissing && (
        <div className="info-box warn">
          ⚠️ نظام الكوبونات والمراحل المتعددة محتاج تشغّل ملف <b>coupons.sql</b> في Supabase مرة واحدة.
        </div>
      )}

      <div className="table-wrap stack">
        <table>
          <thead>
            <tr>
              <th>اسم الباقة</th>
              <th>المراحل</th>
              <th>السعر</th>
              <th>المدة</th>
              <th>الحالة</th>
              <th>إجراءات</th>
            </tr>
          </thead>
          <tbody>
            <StateRow colSpan={6} loading={loading} />
            <StateRow colSpan={6} empty={!loading && filtered.length === 0} text={search ? 'مفيش نتايج' : 'لسه مفيش باقات'} />
            {!loading &&
              filtered.map((p) => {
                const code = coupons[String(p.id)];
                return (
                  <tr key={p.id}>
                    <td data-label="الباقة">
                      <div className="pkg-name-cell">
                        <b>{p.name_ar}</b>
                        {code && (
                          <button type="button" className="coupon-badge" onClick={() => copyCode(code)} title="اضغط للنسخ">
                            🎟️ <span dir="ltr">{code}</span> {copied === code ? '✓' : '📋'}
                          </button>
                        )}
                      </div>
                    </td>
                    <td data-label="المراحل">
                      <div className="chip-row">
                        {packageLevelIds(p).map((id) => (
                          <span className="level-chip" key={id}>{levelName(id)}</span>
                        ))}
                      </div>
                    </td>
                    <td data-label="السعر"><b className="price-cell">{Number(p.price).toLocaleString('ar-EG')} ج.م</b></td>
                    <td data-label="المدة">{p.duration_days} يوم</td>
                    <td data-label="الحالة">
                      <button
                        type="button"
                        className={`badge btn-badge ${p.is_active ? 'active' : 'expired'}`}
                        onClick={() => toggleActive(p)}
                        title="اضغط للتبديل"
                      >
                        {p.is_active ? 'فعّالة' : 'موقوفة'}
                      </button>
                    </td>
                    <td data-label="إجراءات">
                      <RowActions>
                        <button className="icon-btn" onClick={() => openEditModal(p)} aria-label="تعديل">✏️ <span className="only-mobile">تعديل</span></button>
                        <button className="icon-btn danger" onClick={() => handleDelete(p)} aria-label="حذف">🗑️ <span className="only-mobile">حذف</span></button>
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
        title={editing ? 'تعديل باقة' : 'إضافة باقة'}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSubmit}
        loading={saving}
      >
        <div className="field-row">
          <div className="field">
            <label>الاسم (عربي)</label>
            <input type="text" value={form.name_ar} onChange={(e) => setForm({ ...form, name_ar: e.target.value })} required />
          </div>
          <div className="field">
            <label>Name (English)</label>
            <input type="text" dir="ltr" value={form.name_en} onChange={(e) => setForm({ ...form, name_en: e.target.value })} required />
          </div>
        </div>

        <div className="field">
          <label>المراحل اللي الباقة بتشملها <small className="muted">(اختار واحدة أو أكتر)</small></label>
          <div className="lvl-pick">
            {levels.map((lv) => {
              const on = form.level_ids.includes(String(lv.id));
              return (
                <button type="button" key={lv.id} className={`lvl-chip${on ? ' on' : ''}`} onClick={() => toggleLevel(lv.id)} aria-pressed={on}>
                  {on ? '✓ ' : ''}{lv.name_ar}
                </button>
              );
            })}
          </div>
          {levels.length > 1 && (
            <div className="lvl-quick">
              <button type="button" onClick={() => setForm({ ...form, level_ids: levels.map((l) => String(l.id)) })}>اختيار الكل</button>
              <button type="button" onClick={() => setForm({ ...form, level_ids: [] })}>مسح</button>
            </div>
          )}
        </div>

        <div className="field-row">
          <div className="field">
            <label>السعر (ج.م)</label>
            <input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} min="0" />
          </div>
          <div className="field">
            <label>المدة (يوم)</label>
            <input type="number" value={form.duration_days} onChange={(e) => setForm({ ...form, duration_days: e.target.value })} min="1" />
          </div>
        </div>

        <div className="field">
          <label>الوصف</label>
          <textarea rows="3" value={form.description_ar} onChange={(e) => setForm({ ...form, description_ar: e.target.value })} />
        </div>

        <div className="field coupon-field">
          <label>🎟️ إنشاء كوبون <small className="muted">(اختياري)</small></label>
          <div className="coupon-row">
            <input
              type="text"
              dir="ltr"
              autoComplete="off"
              placeholder="مثال: BS-7K3Q9X"
              value={form.coupon_code}
              onChange={(e) => setForm({ ...form, coupon_code: e.target.value.toUpperCase() })}
            />
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setForm({ ...form, coupon_code: generateCoupon() })}>
              🎲 توليد
            </button>
          </div>
          <small className="hint">
            {form.coupon_code.trim()
              ? '🔒 الباقة هتبقى مخفية، وتظهر بس للي يكتب الكوبون ده.'
              : '🌍 من غير كوبون، الباقة بتظهر للكل عادي.'}
          </small>
        </div>

        <label className="check-row">
          <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
          <span>الباقة فعّالة</span>
        </label>

        {msg && <div className="form-msg error">{msg}</div>}
      </AdminFormModal>
    </>
  );
}

export default AdminPackages;