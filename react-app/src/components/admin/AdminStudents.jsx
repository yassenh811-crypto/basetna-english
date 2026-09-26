import { useEffect, useState } from 'react';
import { supabase } from '../../services/supabase';

function AdminStudents() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('profiles').select('*').eq('role', 'student').order('created_at', { ascending: false });
      setStudents(data || []);
      setLoading(false);
    }
    load();
  }, []);

  return (
    <>
      <div className="dash-head"><h1>الطلاب والاشتراكات</h1></div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>اسم الطالب</th>
              <th>الهاتف</th>
              <th>إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="3"><div className="empty-state">جاري التحميل...</div></td></tr>
            ) : students.length === 0 ? (
              <tr><td colSpan="3"><div className="empty-state">لسه مفيش طلاب</div></td></tr>
            ) : (
              students.map((s) => (
                <tr key={s.id}>
                  <td>{s.full_name}</td>
                  <td>{s.phone || '—'}</td>
                  <td><button className="icon-btn danger">🗑️</button></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

export default AdminStudents;