/* ============================================================
   💳 SubscriptionForm — تفعيل اشتراك طالب
   ============================================================ */
import { useEffect, useState } from 'react';
import { supabase } from '../../services/supabase';

const todayStr = () => new Date().toISOString().slice(0, 10);

function SubscriptionForm({ student, onClose }) {
  const [levels, setLevels] = useState([]);
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState({ text: '', type: '' });
  const [current, setCurrent] = useState(null);

  const [levelId, setLevelId] = useState(student.grade_level_id || '');
  const [packageId, setPackageId] = useState('');

  useEffect(() => {
    async function loadLevels() {
      setLoading(true);
      const { data } = await supabase.from('grade_levels').select('*').order('sort_order');
      setLevels(data || []);
      setLoading(false);
    }
    loadLevels();
  }, []);

  /* اشتراك فعّال حالي؟ */
  useEffect(() => {
    async function loadCurrent() {
      const { data } = await supabase
        .from('subscriptions')
        .select('end_date,status')
        .eq('student_id', student.id)
        .eq('status', 'active')
        .order('end_date', { ascending: false })
        .limit(1)
        .maybeSingle();
      setCurrent(data && data.end_date >= todayStr() ? data : null);
    }
    loadCurrent();
  }, [student.id]);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && !saving && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [saving, onClose]);

  useEffect(() => {
    if (!levelId) {
      setPackages([]);
      setPackageId('');
      return;
    }
    async function loadPackages() {
      let { data, error } = await supabase
        .from('packages')
        .select('*')
        .eq('is_active', true)
        .or(`grade_level_id.eq.${levelId},grade_level_ids.cs.{${levelId}}`);
      if (error) {
        /* لسه ماشغلتش coupons.sql: ارجع للطريقة القديمة */
        ({ data } = await supabase.from('packages').select('*').eq('grade_level_id', levelId).eq('is_active', true));
      }
      setPackages(data || []);
      setPackageId(data?.[0]?.id || '');
    }
    loadPackages();
  }, [levelId]);

  const pkg = packages.find((p) => p.id === packageId);

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setMsg({ text: '', type: '' });

    if (!levelId) {
      setMsg({ text: '❌ اختار المرحلة', type: 'error' });
      setSaving(false);
      return;
    }
    if (!pkg) {
      setMsg({ text: '❌ اختار الباقة', type: 'error' });
      setSaving(false);
      return;
    }

    const endDate = new Date();
    endDate.setDate(endDate.getDate() + (pkg.duration_days || 30));

    await supabase.from('profiles').update({ grade_level_id: levelId }).eq('id', student.id);

    const { error } = await supabase.from('subscriptions').insert({
      student_id: student.id,
      package_id: packageId,
      status: 'active',
      start_date: todayStr(),
      end_date: endDate.toISOString().slice(0, 10),
    });

    setSaving(false);

    if (error) {
      setMsg({ text: '❌ ' + error.message, type: 'error' });
      return;
    }

    onClose();
  }

  if (loading) {
    return (
      <div className="overlay open">
        <div className="modal">
          <div className="skeleton-list"><span /><span /><span /></div>
        </div>
      </div>
    );
  }

  return (
    <div className="overlay open">
      <div className="modal" role="dialog" aria-modal="true">
        <button className="close" onClick={onClose} type="button" aria-label="إغلاق">✕</button>

        <h3>💳 تفعيل اشتراك</h3>
        <p className="sub">الطالب: <b>{student.full_name}</b></p>

        {current && (
          <div className="info-box warn">
            ⚠️ الطالب عنده اشتراك فعّال لحد <b>{current.end_date}</b>. تفعيل اشتراك جديد هيتضاف جنبه.
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label>المرحلة الدراسية</label>
            <select value={levelId} onChange={(e) => setLevelId(e.target.value)} required>
              <option value="">— اختار مرحلة —</option>
              {levels.map((lv) => (
                <option key={lv.id} value={lv.id}>{lv.name_ar}</option>
              ))}
            </select>
          </div>

          <div className="field">
            <label>الباقة</label>
            {!levelId ? (
              <div className="empty-state compact">اختار مرحلة الأول</div>
            ) : packages.length === 0 ? (
              <div className="empty-state compact">مفيش باقات للمرحلة دي</div>
            ) : (
              <select value={packageId} onChange={(e) => setPackageId(e.target.value)} required>
                {packages.map((p) => (
                  <option key={p.id} value={p.id}>{p.coupon_required ? '🎟️ ' : ''}{p.name_ar} — {p.price} ج.م / {p.duration_days} يوم</option>
                ))}
              </select>
            )}
          </div>

          {pkg && (
            <div className="info-box">
              <div><b>السعر:</b> {Number(pkg.price).toLocaleString('ar-EG')} ج.م</div>
              <div><b>المدة:</b> {pkg.duration_days} يوم</div>
              <div>
                <b>ينتهي في:</b>{' '}
                {new Date(Date.now() + pkg.duration_days * 86400000).toISOString().slice(0, 10)}
              </div>
            </div>
          )}

          {msg.text && <div className={`form-msg ${msg.type}`}>{msg.text}</div>}

          <div className="modal-actions">
            <button type="button" className="btn btn-ghost" onClick={onClose} disabled={saving}>إلغاء</button>
            <button className="btn btn-teal" type="submit" disabled={saving}>
              {saving ? 'جاري التفعيل...' : '✅ تفعيل الاشتراك'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default SubscriptionForm;