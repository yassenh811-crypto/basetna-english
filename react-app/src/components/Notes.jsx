/* ============================================================
   📝 Notes — ملاحظات الطالب على الفيديو
   ============================================================ */
import { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from '../context/AuthContext';

function Notes({ lessonId }) {
  const { user } = useAuth();
  const [note, setNote] = useState('');
  const [existing, setExisting] = useState(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    async function load() {
      if (!user) return;
      const { data } = await supabase
        .from('notes')
        .select('*')
        .eq('lesson_id', lessonId)
        .eq('student_id', user.id)
        .maybeSingle();
      if (data) {
        setExisting(data);
        setNote(data.content);
      } else {
        setExisting(null);
        setNote('');
      }
    }
    load();
  }, [lessonId, user]);

  async function handleSave() {
    if (!note.trim() || saving || !user) return;
    setSaving(true);
    setMsg('');
    const payload = {
      lesson_id: lessonId,
      student_id: user.id,
      content: note.trim(),
      updated_at: new Date().toISOString(),
    };
    let error;
    if (existing) {
      ({ error } = await supabase.from('notes').update(payload).eq('id', existing.id));
    } else {
      ({ error } = await supabase.from('notes').insert(payload));
    }
    setSaving(false);
    if (error) { setMsg('❌ ' + error.message); return; }
    setMsg('✅ تم الحفظ');
    setTimeout(() => setMsg(''), 2000);
  }

  async function handleDelete() {
    if (!existing) return;
    if (!confirm('متأكد؟')) return;
    await supabase.from('notes').delete().eq('id', existing.id);
    setExisting(null);
    setNote('');
  }

  if (!user) return null;

  return (
    <div style={{ padding: 20 }}>
      <h3 style={{ marginBottom: 12 }}>📝 ملاحظاتي</h3>
      <textarea
        rows="5"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="اكتب ملاحظاتك عن الفيديو..."
        style={{ width: '100%', padding: 12, border: '1.5px solid var(--line)', borderRadius: 10, fontSize: 14, fontFamily: 'inherit', background: 'var(--paper)' }}
      />
      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
        <button className="btn btn-teal btn-sm" onClick={handleSave} disabled={saving || !note.trim()}>
          {saving ? '...' : existing ? '💾 تحديث' : '💾 حفظ'}
        </button>
        {existing && (
          <button className="btn btn-ghost btn-sm" onClick={handleDelete}>🗑️ حذف</button>
        )}
      </div>
      {msg && <p style={{ marginTop: 8, fontSize: 13 }}>{msg}</p>}
    </div>
  );
}

export default Notes;