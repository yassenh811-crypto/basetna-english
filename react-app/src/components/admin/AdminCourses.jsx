import { useEffect, useState } from 'react';
import { supabase } from '../../services/supabase';

function AdminCourses() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('courses').select('*, grade_levels(name_ar)').order('sort_order');
      setCourses(data || []);
      setLoading(false);
    }
    load();
  }, []);

  return (
    <>
      <div className="dash-head">
        <h1>الكورسات</h1>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>الكورس</th>
              <th>المرحلة</th>
              <th>إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="3"><div className="empty-state">جاري التحميل...</div></td></tr>
            ) : courses.length === 0 ? (
              <tr><td colSpan="3"><div className="empty-state">لسه مفيش كورسات</div></td></tr>
            ) : (
              courses.map((c) => (
                <tr key={c.id}>
                  <td><b>{c.title_ar}</b></td>
                  <td>{c.grade_levels?.name_ar || '—'}</td>
                  <td>
                    <button className="icon-btn danger">🗑️</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

export default AdminCourses;