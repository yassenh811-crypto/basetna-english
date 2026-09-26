import { useEffect, useState } from 'react';
import { supabase } from '../../services/supabase';

function AdminSettings() {
  const [ownerName, setOwnerName] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('settings').select('*').eq('id', 1).maybeSingle();
      if (data) {
        setOwnerName(data.owner_name || '');
        setWhatsapp(data.whatsapp_number || '');
      }
    }
    load();
  }, []);

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setMsg('');
    const { error } = await supabase.from('settings').update({
      owner_name: ownerName,
      whatsapp_number: whatsapp,
    }).eq('id', 1);
    setSaving(false);
    setMsg(error ? '❌ حصلت مشكلة' : '✅ تم الحفظ');
  }

  return (
    <>
      <div className="dash-head"><h1>الإعدادات</h1></div>
      <div className="card" style={{ maxWidth: 520 }}>
        <form onSubmit={handleSave}>
          <div className="field">
            <label>اسم الأونر</label>
            <input type="text" value={ownerName} onChange={(e) => setOwnerName(e.target.value)} />
          </div>
          <div className="field">
            <label>رقم واتساب</label>
            <input type="text" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} />
          </div>
          <button className="btn btn-teal" type="submit" disabled={saving}>
            {saving ? 'جاري الحفظ...' : 'حفظ'}
          </button>
          {msg && <p style={{ marginTop: 10 }}>{msg}</p>}
        </form>
      </div>
    </>
  );
}

export default AdminSettings;