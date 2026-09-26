import { useEffect, useState } from 'react';
import { supabase } from '../../services/supabase';

function AdminPackages() {
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('packages').select('*');
      setPackages(data || []);
      setLoading(false);
    }
    load();
  }, []);

  return (
    <>
      <div className="dash-head"><h1>الباقات</h1></div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>اسم الباقة</th>
              <th>السعر</th>
              <th>المدة</th>
              <th>إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="4"><div className="empty-state">جاري التحميل...</div></td></tr>
            ) : packages.length === 0 ? (
              <tr><td colSpan="4"><div className="empty-state">لسه مفيش باقات</div></td></tr>
            ) : (
              packages.map((p) => (
                <tr key={p.id}>
                  <td>{p.name_ar}</td>
                  <td>{p.price} ج.م</td>
                  <td>{p.duration_days} يوم</td>
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

export default AdminPackages;