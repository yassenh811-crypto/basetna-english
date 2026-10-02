/* ============================================================
   💳 SubscriptionForm — تفعيل اشتراك طالب
   ============================================================ */
import { useEffect, useState } from 'react';
import { supabase } from '../../services/supabase';

function SubscriptionForm({ student, onClose }) {
  const [levels, setLevels] = useState([]);
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState({ text: '', type: '' });

  const [levelId, setLevelId] = useState(student.grade_level_id || '');
  const [packageId, setPackageId] = useState('');

  useEffect(() => {
    async function loadLevels() {
      setLoading(true);
      const { data } = await supabase
        .from('grade_levels')
        .select('*')
        .order('sort_order');
      setLevels(data || []);
      setLoading(false);
    }
    loadLevels();
  }, []);

  useEffect(() => {
    if (!levelId) {
      setPackages([]);
      setPackageId('');
      return;
    }
    async function loadPackages() {
      const { data } = await supabase
        .from('packages')
        .select('*')
        .eq('grade_level_id', levelId)
        .eq('is_active', true);
      setPackages(data || []);
      setPackageId(data?.[0]?.id || '');
    }
    loadPackages();
  }, [levelId]);

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setMsg({ text: '', type: '' });

    if (!levelId) {
      setMsg({ text: '❌ اختار المرحلة', type: 'error' });
      setSaving(false);
      return;
    }
    if (!packageId) {
      setMsg({ text: '❌ اختار الباقة', type: 'error' });
      setSaving(false);
      return;
    }

    const pkg = packages.find((p) => p.id === packageId);
    if (!pkg) {
      setMsg({ text: '❌ الباقة مش موجودة', type: 'error' });
      setSaving(false);
      return;
    }

    const endDate = new Date();
    endDate.setDate(endDate.getDate() + (pkg.duration_days || 30));

    await supabase
      .from('profiles')
      .update({ grade_level_id: levelId })
      .eq('id', student.id);

    const { error } = await supabase.from('subscriptions').insert({
      student_id: student.id,
      package_id: packageId,
      status: 'active',
      start_date: new Date().toISOString().slice(0, 10),
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
      <div className="overlay open" onClick={onClose}>
        <div className="modal" onClick={(e) => e.stopPropagation()}>
          <div className="empty-state">جاري التحميل...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="overlay open" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <button className="close" onClick={onClose}>
          ✕
        </button>

        <h3>💳 تفعيل اشتراك</h3>
        <p className="sub">
          الطالب: <b>{student.full_name}</b>
        </p>

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label>المرحلة الدراسية</label>
            <select
              value={levelId}
              onChange={(e) => setLevelId(e.target.value)}
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
            <label>الباقة</label>
            {!levelId ? (
              <div className="empty-state" style={{ padding: 16 }}>
                اختار مرحلة الأول
              </div>
            ) : packages.length === 0 ? (
              <div className="empty-state" style={{ padding: 16 }}>
                مفيش باقات للمرحلة دي
              </div>
            ) : (
              <select
                value={packageId}
                onChange={(e) => setPackageId(e.target.value)}
                required
              >
                {packages.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name_ar} — {p.price} ج.م / {p.duration_days} يوم
                  </option>
                ))}
              </select>
            )}
          </div>

          {packageId && (
            <div
              style={{
                background: 'var(--paper-2)',
                padding: 12,
                borderRadius: 8,
                marginBottom: 16,
                fontSize: 13,
              }}
            >
              {(() => {
                const p = packages.find((x) => x.id === packageId);
                if (!p) return null;
                return (
                  <>
                    <div>
                      <b>السعر:</b> {p.price} ج.م
                    </div>
                    <div>
                      <b>المدة:</b> {p.duration_days} يوم
                    </div>
                    <div>
                      <b>ينتهي في:</b>{' '}
                      {new Date(Date.now() + p.duration_days * 86400000)
                        .toISOString()
                        .slice(0, 10)}
                    </div>
                  </>
                );
              })()}
            </div>
          )}

          {msg.text && (
            <div
              className={`form-msg ${msg.type}`}
              style={{ display: 'block' }}
            >
              {msg.text}
            </div>
          )}

          <button
            className="btn btn-teal btn-block"
            type="submit"
            disabled={saving}
          >
            {saving ? 'جاري التفعيل...' : '✅ تفعيل الاشتراك'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default SubscriptionForm;