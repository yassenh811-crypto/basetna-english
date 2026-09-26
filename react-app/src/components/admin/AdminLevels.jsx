import { useEffect, useState } from 'react';
import { supabase } from '../../services/supabase';

function AdminLevels() {
  const [levels, setLevels] = useState([]);
  const [loading, setLoading] = useState(true);

  async function loadLevels() {
    setLoading(true);
    const { data } = await supabase.from('grade_levels').select('*').order('sort_order');
    setLevels(data || []);
    setLoading(false);
  }

  useEffect(() => { loadLevels(); }, []);

  async function handleDelete(id) {
    if (!confirm('متأكد؟')) return;
    await supabase.from('grade_levels').delete().eq('id', id);
    loadLevels();
  }

  return (
    <>
      <div className="dash-head">
        <h1>المراحل الدراسية</h1>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>الاسم (عربي)</th>
              <th>Name (English)</th>
              <th>الترتيب</th>
              <th>إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="4"><div className="empty-state">جاري التحميل...</div></td></tr>
            ) : levels.length === 0 ? (
              <tr><td colSpan="4"><div className="empty-state">لسه مفيش مراحل</div></td></tr>
            ) : (
              levels.map((lv) => (
                <tr key={lv.id}>
                  <td>{lv.name_ar}</td>
                  <td>{lv.name_en}</td>
                  <td>{lv.sort_order}</td>
                  <td>
                    <button className="icon-btn danger" onClick={() => handleDelete(lv.id)}>🗑️</button>
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

export default AdminLevels;