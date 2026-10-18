/* ============================================================
   🔥 AdminDaily — إدارة أسئلة التحدي اليومي
   - ضيف أسئلة لكل المراحل أو لمرحلة معينة
   - السؤال بيتبدّل تلقائي كل يوم، أو حدد تاريخ لسؤال بعينه
   - توليد أسئلة بالذكاء الاصطناعي
   ============================================================ */
import { useEffect, useState } from 'react';
import { supabase } from '../../services/supabase';
import AdminFormModal from './AdminFormModal';
import { AdminToolbar, StateRow, RowActions } from './AdminUI';

const API_URL = import.meta.env.VITE_AI_API_URL || 'https://basetna-server.vercel.app';
const LETTERS = ['أ', 'ب', 'ج', 'د', 'هـ', 'و'];

const EMPTY = { level: '', question: '', options: ['', '', '', ''], correct: 0, explanation: '', active_date: '', is_active: true };

function AdminDaily() {
  const [items, setItems] = useState([]);
  const [levels, setLevels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tableMissing, setTableMissing] = useState(false);
  const [search, setSearch] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  const [genOpen, setGenOpen] = useState(false);
  const [gen, setGen] = useState({ topic: '', level: '', count: 10 });
  const [generating, setGenerating] = useState(false);
  const [genMsg, setGenMsg] = useState('');

  async function loadData() {
    setLoading(true);
    const [qRes, lRes] = await Promise.all([
      supabase.from('daily_questions').select('*').order('created_at', { ascending: false }),
      supabase.from('grade_levels').select('*').order('sort_order'),
    ]);
    setTableMissing(!!qRes.error);
    setItems(qRes.data || []);
    setLevels(lRes.data || []);
    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  const levelName = (id) => (id ? levels.find((l) => String(l.id) === String(id))?.name_ar || '—' : 'كل المراحل');

  /* ---------- إضافة / تعديل ---------- */
  function openAdd() {
    setEditing(null);
    setForm(EMPTY);
    setMsg('');
    setModalOpen(true);
  }

  function openEdit(it) {
    setEditing(it);
    setForm({
      level: it.grade_level_id || '',
      question: it.question,
      options: Array.isArray(it.options) ? it.options : ['', '', '', ''],
      correct: it.correct ?? 0,
      explanation: it.explanation || '',
      active_date: it.active_date || '',
      is_active: it.is_active,
    });
    setMsg('');
    setModalOpen(true);
  }

  const setOpt = (i, v) => setForm((f) => ({ ...f, options: f.options.map((o, idx) => (idx === i ? v : o)) }));
  const addOpt = () => setForm((f) => (f.options.length < 6 ? { ...f, options: [...f.options, ''] } : f));
  const removeOpt = (i) =>
    setForm((f) => {
      if (f.options.length <= 2) return f;
      const options = f.options.filter((_, idx) => idx !== i);
      let correct = f.correct;
      if (i === correct) correct = 0;
      else if (i < correct) correct -= 1;
      return { ...f, options, correct };
    });

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setMsg('');
    const fail = (t) => { setMsg('❌ ' + t); setSaving(false); };

    const options = form.options.map((o) => o.trim());
    if (form.question.trim().length < 3) return fail('اكتب السؤال');
    if (options.some((o) => !o)) return fail('املأ كل الاختيارات أو امسح الفاضي');

    const payload = {
      grade_level_id: form.level || null,
      question: form.question.trim(),
      options,
      correct: Number(form.correct),
      explanation: form.explanation.trim() || null,
      active_date: form.active_date || null,
      is_active: !!form.is_active,
    };

    const { error } = editing
      ? await supabase.from('daily_questions').update(payload).eq('id', editing.id)
      : await supabase.from('daily_questions').insert(payload);

    if (error) return fail(error.message);
    setSaving(false);
    setModalOpen(false);
    await loadData();
  }

  async function handleDelete(it) {
    if (!confirm('متأكد إنك عايز تحذف السؤال ده؟')) return;
    const { error } = await supabase.from('daily_questions').delete().eq('id', it.id);
    if (error) { alert('❌ ' + error.message); return; }
    await loadData();
  }

  async function toggleActive(it) {
    const { error } = await supabase.from('daily_questions').update({ is_active: !it.is_active }).eq('id', it.id);
    if (error) { alert('❌ ' + error.message); return; }
    setItems((list) => list.map((x) => (x.id === it.id ? { ...x, is_active: !it.is_active } : x)));
  }

  /* ---------- توليد بالذكاء الاصطناعي ---------- */
  async function handleGenerate(e) {
    e.preventDefault();
    setGenerating(true);
    setGenMsg('');
    const fail = (t) => { setGenMsg('❌ ' + t); setGenerating(false); };

    if (gen.topic.trim().length < 2) return fail('اكتب موضوع الأسئلة');

    try {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess?.session?.access_token;
      if (!token) return fail('سجّل دخولك الأول');

      const res = await fetch(`${API_URL}/api/generate-quiz`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify({
          lessonTitle: gen.topic.trim(),
          lessonDescription: `أسئلة اختيار من متعدد قصيرة عن: ${gen.topic.trim()}`,
          lessonDuration: 0,
          questionsCount: Number(gen.count),
          timeLimitMin: 10,
          maxAttempts: 1,
        }),
      });
      const data = await res.json();
      if (!res.ok) return fail(data.error || 'فشل التوليد');
      if (!Array.isArray(data.questions)) return fail('الرد مش فيه أسئلة');

      const rows = data.questions
        .filter((q) => q && q.question && Array.isArray(q.options) && q.options.length >= 2 && q.options.length <= 6 && Number.isInteger(q.correct) && q.correct >= 0 && q.correct < q.options.length)
        .map((q) => ({
          grade_level_id: gen.level || null,
          question: String(q.question).slice(0, 500),
          options: q.options.map((o) => String(o)),
          correct: q.correct,
          explanation: q.explanation ? String(q.explanation) : null,
          is_active: true,
        }));

      if (rows.length === 0) return fail('الأسئلة اللي رجعت مش بالشكل المطلوب، جرّب تاني');

      const { error } = await supabase.from('daily_questions').insert(rows);
      if (error) return fail(error.message);

      setGenerating(false);
      setGenOpen(false);
      setGen({ topic: '', level: '', count: 10 });
      alert(`✅ اتضاف ${rows.length} سؤال`);
      await loadData();
    } catch (err) {
      console.error(err);
      fail(err.message || 'فشل التوليد');
    }
  }

  const q = search.toLowerCase();
  const filtered = items.filter(
    (it) => it.question.toLowerCase().includes(q) || levelName(it.grade_level_id).toLowerCase().includes(q)
  );

  return (
    <>
      <AdminToolbar
        title="التحدي اليومي"
        count={items.length}
        search={search}
        onSearch={setSearch}
        placeholder="ابحث في الأسئلة..."
        addLabel="إضافة سؤال"
        onAdd={openAdd}
      >
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setGenMsg(''); setGenOpen(true); }}>
          🤖 توليد بالذكاء الاصطناعي
        </button>
      </AdminToolbar>

      {tableMissing && (
        <div className="info-box warn">
          ⚠️ لازم تشغّل ملف <b>daily_challenge.sql</b> في Supabase مرة واحدة الأول.
        </div>
      )}

      <div className="info-box">
        🔁 كل يوم بيظهر للطالب سؤال واحد من الأسئلة المفعّلة لمرحلته (بيتبدّل تلقائي). لو حددت <b>تاريخ</b> لسؤال، بيظهر في اليوم ده بالذات.
      </div>

      <div className="table-wrap stack">
        <table>
          <thead>
            <tr>
              <th>السؤال</th>
              <th>المرحلة</th>
              <th>الإجابة الصح</th>
              <th>تاريخ محدد</th>
              <th>الحالة</th>
              <th>إجراءات</th>
            </tr>
          </thead>
          <tbody>
            <StateRow colSpan={6} loading={loading} />
            <StateRow colSpan={6} empty={!loading && filtered.length === 0} text={search ? 'مفيش نتايج' : 'لسه مفيش أسئلة'} />
            {!loading &&
              filtered.map((it) => (
                <tr key={it.id}>
                  <td data-label="السؤال"><b className="dq-text" dir="auto">{it.question}</b></td>
                  <td data-label="المرحلة"><span className="level-chip">{levelName(it.grade_level_id)}</span></td>
                  <td data-label="الإجابة الصح" dir="auto">{LETTERS[it.correct]} — {it.options?.[it.correct]}</td>
                  <td data-label="تاريخ محدد">{it.active_date || <span className="muted">تلقائي</span>}</td>
                  <td data-label="الحالة">
                    <button type="button" className={`badge btn-badge ${it.is_active ? 'active' : 'expired'}`} onClick={() => toggleActive(it)} title="اضغط للتبديل">
                      {it.is_active ? 'مفعّل' : 'موقوف'}
                    </button>
                  </td>
                  <td data-label="إجراءات">
                    <RowActions>
                      <button className="icon-btn" onClick={() => openEdit(it)} aria-label="تعديل">✏️ <span className="only-mobile">تعديل</span></button>
                      <button className="icon-btn danger" onClick={() => handleDelete(it)} aria-label="حذف">🗑️ <span className="only-mobile">حذف</span></button>
                    </RowActions>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {/* إضافة / تعديل */}
      <AdminFormModal
        open={modalOpen}
        wide
        title={editing ? 'تعديل سؤال' : 'إضافة سؤال'}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSubmit}
        loading={saving}
      >
        <div className="field">
          <label>المرحلة</label>
          <select value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value })}>
            <option value="">🌍 كل المراحل</option>
            {levels.map((lv) => (
              <option key={lv.id} value={String(lv.id)}>{lv.name_ar}</option>
            ))}
          </select>
        </div>

        <div className="field">
          <label>السؤال</label>
          <textarea rows="2" dir="auto" value={form.question} onChange={(e) => setForm({ ...form, question: e.target.value })} required />
        </div>

        <div className="field">
          <label>الاختيارات <small className="muted">(اختار الإجابة الصح بالدايرة)</small></label>
          <div className="dq-opts">
            {form.options.map((o, i) => (
              <div className="dq-opt" key={i}>
                <input type="radio" name="correct" checked={form.correct === i} onChange={() => setForm({ ...form, correct: i })} aria-label={`الإجابة الصح ${LETTERS[i]}`} />
                <span className="qz-letter">{LETTERS[i]}</span>
                <input type="text" dir="auto" value={o} onChange={(e) => setOpt(i, e.target.value)} placeholder={`الاختيار ${LETTERS[i]}`} />
                {form.options.length > 2 && (
                  <button type="button" className="icon-btn danger" onClick={() => removeOpt(i)} aria-label="مسح الاختيار">✕</button>
                )}
              </div>
            ))}
          </div>
          {form.options.length < 6 && (
            <div className="lvl-quick"><button type="button" onClick={addOpt}>＋ إضافة اختيار</button></div>
          )}
        </div>

        <div className="field">
          <label>شرح الإجابة <small className="muted">(اختياري، بيظهر للطالب بعد ما يجاوب)</small></label>
          <textarea rows="2" dir="auto" value={form.explanation} onChange={(e) => setForm({ ...form, explanation: e.target.value })} />
        </div>

        <div className="field-row">
          <div className="field">
            <label>تاريخ محدد <small className="muted">(اختياري)</small></label>
            <input type="date" value={form.active_date} onChange={(e) => setForm({ ...form, active_date: e.target.value })} />
          </div>
          <label className="check-row" style={{ alignSelf: 'end', marginBottom: 16 }}>
            <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
            <span>السؤال مفعّل</span>
          </label>
        </div>

        {msg && <div className="form-msg error">{msg}</div>}
      </AdminFormModal>

      {/* توليد بالذكاء الاصطناعي */}
      <AdminFormModal
        open={genOpen}
        title="🤖 توليد أسئلة بالذكاء الاصطناعي"
        subtitle="اكتب الموضوع وهيتعملك أسئلة جاهزة تتضاف للبنك."
        submitLabel="🤖 توليد وحفظ"
        onClose={() => setGenOpen(false)}
        onSubmit={handleGenerate}
        loading={generating}
      >
        <div className="field">
          <label>موضوع الأسئلة</label>
          <input type="text" dir="auto" value={gen.topic} onChange={(e) => setGen({ ...gen, topic: e.target.value })} placeholder="مثال: Present Perfect  /  Prepositions of place" required />
        </div>
        <div className="field-row">
          <div className="field">
            <label>المرحلة</label>
            <select value={gen.level} onChange={(e) => setGen({ ...gen, level: e.target.value })}>
              <option value="">🌍 كل المراحل</option>
              {levels.map((lv) => (
                <option key={lv.id} value={String(lv.id)}>{lv.name_ar}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>عدد الأسئلة</label>
            <select value={gen.count} onChange={(e) => setGen({ ...gen, count: e.target.value })}>
              <option value="5">5</option>
              <option value="10">10</option>
              <option value="15">15</option>
            </select>
          </div>
        </div>
        <small className="hint">ممكن ياخد نص دقيقة. راجع الأسئلة بعد التوليد وعدّل أو وقّف أي سؤال مش عاجبك.</small>
        {genMsg && <div className="form-msg error">{genMsg}</div>}
      </AdminFormModal>
    </>
  );
}

export default AdminDaily;