/* ============================================================
   ⚙️ AdminSettings — إعدادات الموقع
   ============================================================ */
import { useEffect, useState } from 'react';
import { supabase } from '../../services/supabase';
import ImageUploader from './ImageUploader';

const COUNTRIES = [
  { dial: '20', ar: 'مصر' },
  { dial: '966', ar: 'السعودية' },
  { dial: '971', ar: 'الإمارات' },
  { dial: '965', ar: 'الكويت' },
  { dial: '974', ar: 'قطر' },
  { dial: '973', ar: 'البحرين' },
  { dial: '968', ar: 'عُمان' },
  { dial: '962', ar: 'الأردن' },
  { dial: '961', ar: 'لبنان' },
  { dial: '963', ar: 'سوريا' },
  { dial: '964', ar: 'العراق' },
];

function AdminSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState({ text: '', type: '' });

  const [ownerName, setOwnerName] = useState('');
  const [countryDial, setCountryDial] = useState('20');
  const [whatsapp, setWhatsapp] = useState('');

  const [demo, setDemo] = useState({ url: '', type: 'youtube', title: '', cover: '' });
  const [savingDemo, setSavingDemo] = useState(false);
  const [demoMsg, setDemoMsg] = useState({ text: '', type: '' });

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase.from('settings').select('*').eq('id', 1).maybeSingle();

      if (error) {
        console.error('❌', error);
        setLoading(false);
        return;
      }

      if (data) {
        setOwnerName(data.owner_name || '');
        setDemo({
          url: data.demo_video_url || '',
          type: data.demo_video_type || 'youtube',
          title: data.demo_video_title || '',
          cover: data.demo_video_cover || '',
        });
        const full = data.whatsapp_number || '';
        const matched = COUNTRIES.slice()
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

  function fullPhone() {
    const local = whatsapp.replace(/\D/g, '').replace(/^0+/, '');
    if (!local) return '';
    return countryDial + local;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setMsg({ text: '', type: '' });

    const payload = {
      owner_name: ownerName.trim() || 'ms. sherehan ali',
      whatsapp_number: fullPhone() || null,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase.from('settings').update(payload).eq('id', 1);
    setSaving(false);

    if (error) {
      setMsg({ text: '❌ ' + error.message, type: 'error' });
      return;
    }

    setMsg({ text: '✅ تم الحفظ بنجاح', type: 'ok' });
    setTimeout(() => setMsg({ text: '', type: '' }), 3000);
  }

  async function handleSaveDemo(e) {
    e.preventDefault();
    setSavingDemo(true);
    setDemoMsg({ text: '', type: '' });

    const payload = {
      demo_video_url: demo.url.trim() || null,
      demo_video_type: demo.type,
      demo_video_title: demo.title.trim() || null,
      demo_video_cover: demo.cover.trim() || null,
      updated_at: new Date().toISOString(),
    };
    const { error } = await supabase.from('settings').update(payload).eq('id', 1);
    setSavingDemo(false);

    if (error) {
      setDemoMsg({
        text: /demo_video/.test(error.message || '')
          ? '❌ لازم تشغّل ملف demo_video.sql في Supabase مرة واحدة الأول'
          : '❌ ' + error.message,
        type: 'error',
      });
      return;
    }
    setDemoMsg({ text: payload.demo_video_url ? '✅ تم الحفظ، الفيديو ظاهر في أول الموقع' : '✅ تم الحفظ، القسم مخفي', type: 'ok' });
    setTimeout(() => setDemoMsg({ text: '', type: '' }), 3500);
  }

  if (loading) {
    return (
      <div className="skeleton-list" style={{ maxWidth: 560 }}><span /><span /><span /></div>
    );
  }

  const phone = fullPhone();

  return (
    <>
      <div className="dash-head">
        <h1>⚙️ الإعدادات</h1>
      </div>

      <div className="settings-grid">
        <div className="card settings-card">
          <h3>بيانات الموقع</h3>
          <form onSubmit={handleSubmit}>
            <div className="field">
              <label>اسم الأونر</label>
              <input type="text" value={ownerName} onChange={(e) => setOwnerName(e.target.value)} placeholder="ms. sherehan ali" />
            </div>

            <div className="field">
              <label>رقم واتساب</label>
              <div className="phone-row">
                <select value={countryDial} onChange={(e) => setCountryDial(e.target.value)}>
                  {COUNTRIES.map((c) => (
                    <option key={c.dial} value={c.dial}>+{c.dial} — {c.ar}</option>
                  ))}
                </select>
                <input type="tel" dir="ltr" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="10XXXXXXXX" inputMode="numeric" />
              </div>
              <small className="hint">
                الرقم الكامل: <b dir="ltr">+{phone || '—'}</b>
                {phone && (
                  <>
                    {' · '}
                    <a href={`https://wa.me/${phone}`} target="_blank" rel="noopener noreferrer" className="link-chip">جرّب الرقم ↗</a>
                  </>
                )}
              </small>
            </div>

            <button className="btn btn-teal btn-block" type="submit" disabled={saving}>
              {saving ? 'جاري الحفظ...' : '💾 حفظ'}
            </button>

            {msg.text && <div className={`form-msg ${msg.type}`}>{msg.text}</div>}
          </form>
        </div>

        <div className="card settings-card" style={{ gridColumn: '1 / -1' }}>
          <h3>🎬 الفيديو التجريبي (بيظهر في أول الموقع)</h3>
          <form onSubmit={handleSaveDemo}>
            <div className="field-row">
              <div className="field">
                <label>نوع الفيديو</label>
                <select value={demo.type} onChange={(e) => setDemo({ ...demo, type: e.target.value })}>
                  <option value="youtube">▶️ يوتيوب</option>
                  <option value="vimeo">🎥 فيميو</option>
                  <option value="drive">📁 جوجل درايف</option>
                  <option value="link">🔗 رابط مباشر (MP4)</option>
                </select>
              </div>
              <div className="field">
                <label>رابط الفيديو</label>
                <input
                  type="url"
                  dir="ltr"
                  value={demo.url}
                  onChange={(e) => setDemo({ ...demo, url: e.target.value })}
                  placeholder="https://..."
                />
              </div>
            </div>

            <div className="field">
              <label>عنوان تحت الفيديو <small className="muted">(اختياري)</small></label>
              <input type="text" value={demo.title} onChange={(e) => setDemo({ ...demo, title: e.target.value })} placeholder="مثال: حصة تجريبية في الـ Present Perfect" />
            </div>

            <div className="field">
              <label>صورة الغلاف <small className="muted">(اختياري)</small></label>
              <ImageUploader value={demo.cover} onChange={(url) => setDemo({ ...demo, cover: url })} folder="demo" />
              <small className="hint">لو مرفعتش صورة، هنستخدم صورة الفيديو تلقائي (يوتيوب / درايف).</small>
            </div>

            {demo.type === 'drive' && (
              <small className="hint">📁 في درايف: Share ← General access ← Anyone with the link (Viewer)، وإلا الزائر مش هيشوفه.</small>
            )}
            <small className="hint">سيب الرابط فاضي لو عايز تخفي القسم من الموقع.</small>

            <button className="btn btn-teal" type="submit" disabled={savingDemo} style={{ marginTop: 14 }}>
              {savingDemo ? 'جاري الحفظ...' : '💾 حفظ الفيديو'}
            </button>
            {demoMsg.text && <div className={`form-msg ${demoMsg.type}`}>{demoMsg.text}</div>}
          </form>
        </div>

        <div className="card settings-card info">
          <h3>ℹ️ بتظهر فين؟</h3>
          <ul>
            <li><b>اسم الأونر:</b> في الفوتر وصفحات الموقع.</li>
            <li><b>رقم واتساب:</b> في زرار الواتساب العائم وفي روابط الاشتراك.</li>
          </ul>
        </div>
      </div>
    </>
  );
}

export default AdminSettings;