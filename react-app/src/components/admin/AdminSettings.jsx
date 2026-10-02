/* ============================================================
   ⚙️ AdminSettings — إعدادات الموقع
   ============================================================ */
import { useEffect, useState } from 'react';
import { supabase } from '../../services/supabase';

const COUNTRIES = [
  { dial: '20', ar: 'مصر', en: 'Egypt' },
  { dial: '966', ar: 'السعودية', en: 'Saudi Arabia' },
  { dial: '971', ar: 'الإمارات', en: 'UAE' },
  { dial: '965', ar: 'الكويت', en: 'Kuwait' },
  { dial: '974', ar: 'قطر', en: 'Qatar' },
  { dial: '973', ar: 'البحرين', en: 'Bahrain' },
  { dial: '968', ar: 'عُمان', en: 'Oman' },
  { dial: '962', ar: 'الأردن', en: 'Jordan' },
  { dial: '961', ar: 'لبنان', en: 'Lebanon' },
  { dial: '963', ar: 'سوريا', en: 'Syria' },
  { dial: '964', ar: 'العراق', en: 'Iraq' },
];

function AdminSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState({ text: '', type: '' });

  const [ownerName, setOwnerName] = useState('');
  const [countryDial, setCountryDial] = useState('20');
  const [whatsapp, setWhatsapp] = useState('');

  /* ============================================================
     جلب الإعدادات
     ============================================================ */
  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from('settings')
        .select('*')
        .eq('id', 1)
        .maybeSingle();

      if (error) {
        console.error('❌', error);
        setLoading(false);
        return;
      }

      if (data) {
        setOwnerName(data.owner_name || '');
        const full = data.whatsapp_number || '';
        /* افصل رمز الدولة عن الرقم */
        const matched = COUNTRIES
          .slice()
          .sort((a, b) => b.dial.length - a.dial.length)
          .find((c) => full.startsWith(c.dial));
        if (matched) {
          setCountryDial(matched.dial);
          setWhatsapp(full.slice(matched.dial.length));
        } else {
          setWhatsapp(full);
        }
      }

      setLoading(false);
    }
    load();
  }, []);

  /* ============================================================
     تكوين الرقم الكامل
     ============================================================ */
  function fullPhone() {
    const local = whatsapp.replace(/\D/g, '').replace(/^0+/, '');
    if (!local) return '';
    return countryDial + local;
  }

  /* ============================================================
     حفظ
     ============================================================ */
  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setMsg({ text: '', type: '' });

    const payload = {
      owner_name: ownerName.trim() || 'ms. sherehan ali',
      whatsapp_number: fullPhone() || null,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from('settings')
      .update(payload)
      .eq('id', 1);

    setSaving(false);

    if (error) {
      setMsg({ text: '❌ ' + error.message, type: 'error' });
      return;
    }

    setMsg({ text: '✅ تم الحفظ بنجاح', type: 'ok' });
    setTimeout(() => setMsg({ text: '', type: '' }), 3000);
  }

  if (loading) {
    return <div className="empty-state">جاري التحميل...</div>;
  }

  return (
    <>
      <div className="dash-head">
        <h1>⚙️ الإعدادات</h1>
      </div>

      <div className="card" style={{ maxWidth: 560 }}>
        <form onSubmit={handleSubmit}>
          {/* اسم الأونر */}
          <div className="field">
            <label>اسم الأونر</label>
            <input
              type="text"
              value={ownerName}
              onChange={(e) => setOwnerName(e.target.value)}
              placeholder="ms. sherehan ali"
            />
          </div>

          {/* رقم واتساب */}
          <div className="field">
            <label>رقم واتساب</label>
            <div className="phone-row">
              <select
                value={countryDial}
                onChange={(e) => setCountryDial(e.target.value)}
              >
                {COUNTRIES.map((c) => (
                  <option key={c.dial} value={c.dial}>
                    +{c.dial} — {c.ar}
                  </option>
                ))}
              </select>
              <input
                type="tel"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                placeholder="10XXXXXXXX"
                inputMode="numeric"
              />
            </div>
            <small style={{ display: 'block', marginTop: 6, color: 'var(--ink-soft)' }}>
              الرقم الكامل: <b>+{fullPhone() || '—'}</b>
            </small>
          </div>

          {/* زر الحفظ */}
          <button
            className="btn btn-teal btn-block"
            type="submit"
            disabled={saving}
          >
            {saving ? 'جاري الحفظ...' : '💾 حفظ'}
          </button>

          {/* رسالة */}
          {msg.text && (
            <div className={`form-msg ${msg.type}`} style={{ display: 'block' }}>
              {msg.text}
            </div>
          )}
        </form>
      </div>

      {/* معلومات إضافية */}
      <div className="card" style={{ maxWidth: 560, marginTop: 20 }}>
        <h3 style={{ marginTop: 0, color: 'var(--navy-deep)' }}>ℹ️ معلومات</h3>
        <p style={{ color: 'var(--ink-soft)', fontSize: 14 }}>
          الإعدادات دي بتظهر في كل الموقع:
        </p>
        <ul style={{ color: 'var(--ink-soft)', fontSize: 14, paddingInlineStart: 20 }}>
          <li><b>اسم الأونر:</b> يظهر في الفوتر وصفحات الموقع.</li>
          <li><b>رقم واتساب:</b> يظهر في زرار الواتساب العائم وفي روابط الاشتراك.</li>
        </ul>
      </div>
    </>
  );
}

export default AdminSettings;