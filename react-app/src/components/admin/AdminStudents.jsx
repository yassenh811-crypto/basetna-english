/* ============================================================
   👥 AdminStudents — إدارة الطلاب
   ------------------------------------------------------------
   - عرض الطلاب بس (role = student)
   - إضافة طالب جديد (مع إنشاء حساب Auth)
   - تعديل بيانات طالب
   - حذف طالب
   - تفعيل اشتراك (SubscriptionForm)
   ============================================================ */
import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { supabase } from '../../services/supabase';
import AdminFormModal from './AdminFormModal';
import SubscriptionForm from './SubscriptionForm';

/* ============================================================
   إعدادات Supabase
   ============================================================ */
const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL ||
  'https://wgostqkywpybmzgbyzeo.supabase.co';
const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'sb_publishable_zx0zeWR2bpbmyO90oN-4ow_FxZCSPl8';

function AdminStudents() {
  const [students, setStudents] = useState([]);
  const [levels, setLevels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [msg, setMsg] = useState({ text: '', type: '' });

  /* ← حالة الاشتراك */
  const [subscriptionStudent, setSubscriptionStudent] = useState(null);

  const [form, setForm] = useState({
    full_name: '',
    email: '',
    password: '',
    phone: '',
    grade_level_id: '',
    role: 'student',
  });

  /* ============================================================
     جلب البيانات
     ============================================================ */
  async function loadData() {
    setLoading(true);
    const [sRes, lRes] = await Promise.all([
      supabase
        .from('profiles')
        .select('*')
        .eq('role', 'student')
        .order('created_at', { ascending: false }),
      supabase.from('grade_levels').select('*').order('sort_order'),
    ]);
    if (sRes.error) console.error('❌ Students:', sRes.error);
    if (lRes.error) console.error('❌ Levels:', lRes.error);
    setStudents(sRes.data || []);
    setLevels(lRes.data || []);
    setLoading(false);
  }

  useEffect(() => { loadData(); }, []);

  /* ============================================================
     فتح Modal (إضافة)
     ============================================================ */
  function openAddModal() {
    setEditing(null);
    setForm({
      full_name: '',
      email: '',
      password: '',
      phone: '',
      grade_level_id: '',
      role: 'student',
    });
    setMsg({ text: '', type: '' });
    setModalOpen(true);
  }

  /* ============================================================
     فتح Modal (تعديل)
     ============================================================ */
  function openEditModal(student) {
    setEditing(student);
    setForm({
      full_name: student.full_name || '',
      email: '',
      password: '',
      phone: student.phone || '',
      grade_level_id: student.grade_level_id || '',
      role: student.role || 'student',
    });
    setMsg({ text: '', type: '' });
    setModalOpen(true);
  }

  /* ============================================================
     حفظ (إضافة أو تعديل)
     ============================================================ */
  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setMsg({ text: '', type: '' });

    /* ============================================================
       ✅ إضافة طالب جديد
       ============================================================ */
    if (!editing) {
      if (!form.full_name.trim()) {
        setMsg({ text: '❌ اكتب اسم الطالب', type: 'error' });
        setSaving(false);
        return;
      }
      if (!form.email.trim()) {
        setMsg({ text: '❌ اكتب الإيميل', type: 'error' });
        setSaving(false);
        return;
      }
      if (!form.password || form.password.length < 6) {
        setMsg({ text: '❌ كلمة المرور لازم 6 حروف على الأقل', type: 'error' });
        setSaving(false);
        return;
      }

      /* 1. إنشاء حساب */
      const tempClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          storageKey: 'temp-signup-' + Date.now(),
        },
      });

      const { data: authData, error: authError } = await tempClient.auth.signUp({
        email: form.email.trim().toLowerCase(),
        password: form.password,
      });

      if (authError) {
        setMsg({ text: '❌ ' + authError.message, type: 'error' });
        setSaving(false);
        return;
      }

      const userId = authData.user?.id;
      if (!userId) {
        setMsg({
          text: '❌ محتاج تأكيد الإيميل. عطّل Email Confirmation في Supabase',
          type: 'error',
        });
        setSaving(false);
        return;
      }

      /* 2. إنشاء profile */
      const { error: profileError } = await supabase.from('profiles').upsert({
        id: userId,
        full_name: form.full_name.trim(),
        phone: form.phone.trim() || null,
        grade_level_id: form.grade_level_id || null,
        role: 'student',
      }, { onConflict: 'id' });

      if (profileError) {
        setMsg({ text: '❌ ' + profileError.message, type: 'error' });
        setSaving(false);
        return;
      }

      setSaving(false);
      setModalOpen(false);
      await loadData();
      return;
    }

    /* ============================================================
       ✅ تعديل طالب
       ============================================================ */
    const payload = {
      full_name: form.full_name.trim(),
      phone: form.phone.trim() || null,
      grade_level_id: form.grade_level_id || null,
      role: form.role || 'student',
    };

    const { error } = await supabase
      .from('profiles')
      .update(payload)
      .eq('id', editing.id);

    setSaving(false);

    if (error) {
      setMsg({ text: '❌ ' + error.message, type: 'error' });
      return;
    }

    setModalOpen(false);
    await loadData();
  }

  /* ============================================================
     حذف طالب
     ============================================================ */
  async function handleDelete(student) {
    if (!confirm(`متأكد إنك عايز تحذف "${student.full_name}"؟`)) return;

    await supabase.from('subscriptions').delete().eq('student_id', student.id);
    await supabase.from('messages').delete().eq('sender_id', student.id);
    await supabase.from('course_ratings').delete().eq('student_id', student.id);
    await supabase.from('lesson_progress').delete().eq('student_id', student.id);

    const { error } = await supabase.from('profiles').delete().eq('id', student.id);

    if (error) {
      alert('❌ ' + error.message);
      return;
    }

    await loadData();
  }

  /* ============================================================
     جلب اسم المرحلة
     ============================================================ */
  function levelName(id) {
    return levels.find((l) => l.id === id)?.name_ar || '—';
  }

  /* ============================================================
     Render
     ============================================================ */
  return (
    <>
      <div className="dash-head">
        <h1>الطلاب والاشتراكات</h1>
        <button className="btn btn-gold btn-sm" onClick={openAddModal}>
          + إضافة طالب
        </button>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>الاسم</th>
              <th>الهاتف</th>
              <th>المرحلة</th>
              <th>إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="4">
                  <div className="empty-state">جاري التحميل...</div>
                </td>
              </tr>
            ) : students.length === 0 ? (
              <tr>
                <td colSpan="4">
                  <div className="empty-state">لسه مفيش طلاب</div>
                </td>
              </tr>
            ) : (
              students.map((s) => (
                <tr key={s.id}>
                  <td>
                    <b>{s.full_name}</b>
                  </td>
                  <td>{s.phone || '—'}</td>
                  <td>{levelName(s.grade_level_id)}</td>
                  <td>
                    {/* 💳 زرار الاشتراك */}
                    <button
                      className="icon-btn"
                      onClick={() => setSubscriptionStudent(s)}
                      style={{ background: 'var(--teal)', color: '#fff' }}
                    >
                      💳 الاشتراك
                    </button>

                    {/* ✏️ تعديل */}
                    <button className="icon-btn" onClick={() => openEditModal(s)}>
                      ✏️
                    </button>

                    {/* 🗑️ حذف */}
                    <button
                      className="icon-btn danger"
                      onClick={() => handleDelete(s)}
                    >
                      🗑️
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ============================================================
          Modal (إضافة/تعديل طالب)
          ============================================================ */}
      <AdminFormModal
        open={modalOpen}
        title={editing ? 'تعديل بيانات طالب' : 'إضافة طالب جديد'}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSubmit}
        loading={saving}
      >
        {/* الاسم */}
        <div className="field">
          <label>الاسم الكامل</label>
          <input
            type="text"
            value={form.full_name}
            onChange={(e) => setForm({ ...form, full_name: e.target.value })}
            required
          />
        </div>

        {/* الإيميل + الباسورد (بس عند الإضافة) */}
        {!editing && (
          <>
            <div className="field">
              <label>الإيميل</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="student@example.com"
                required
              />
            </div>
            <div className="field">
              <label>كلمة المرور</label>
              <input
                type="text"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="6 حروف على الأقل"
                minLength={6}
                required
              />
              <small
                style={{
                  display: 'block',
                  marginTop: 6,
                  color: 'var(--ink-soft)',
                }}
              >
                💡 هات الكلمة دي للطالب عشان يسجل دخول.
              </small>
            </div>
          </>
        )}

        {/* الهاتف */}
        <div className="field">
          <label>رقم الهاتف</label>
          <input
            type="tel"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            placeholder="01xxxxxxxxx"
          />
        </div>

        {/* المرحلة */}
        <div className="field">
          <label>المرحلة الدراسية</label>
          <select
            value={form.grade_level_id}
            onChange={(e) =>
              setForm({ ...form, grade_level_id: e.target.value })
            }
          >
            <option value="">— اختار مرحلة —</option>
            {levels.map((lv) => (
              <option key={lv.id} value={lv.id}>
                {lv.name_ar}
              </option>
            ))}
          </select>
        </div>

        {/* الدور (بس عند التعديل) */}
        {editing && (
          <div className="field">
            <label>الدور</label>
            <select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
            >
              <option value="student">🎓 طالب</option>
              <option value="support">🛠️ دعم فني</option>
              <option value="owner">👩‍🏫 ميس</option>
              <option value="superadmin">👑 مدير أعلى</option>
            </select>
          </div>
        )}

        {/* رسالة */}
        {msg.text && (
          <div
            className={`form-msg ${msg.type}`}
            style={{ display: 'block' }}
          >
            {msg.text}
          </div>
        )}
      </AdminFormModal>

      {/* ============================================================
          Modal (تفعيل اشتراك)
          ============================================================ */}
      {subscriptionStudent && (
        <SubscriptionForm
          student={subscriptionStudent}
          onClose={() => {
            setSubscriptionStudent(null);
            loadData();
          }}
        />
      )}
    </>
  );
}

export default AdminStudents;