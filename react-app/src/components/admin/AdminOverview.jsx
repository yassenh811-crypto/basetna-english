import { useEffect, useState } from 'react';
import { supabase } from '../../services/supabase';

function AdminOverview({ profile }) {
  const [kpis, setKpis] = useState({ students: 0, active: 0, courses: 0, levels: 0 });

  useEffect(() => {
    async function loadKpis() {
      const [s, a, c, l] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'student'),
        supabase.from('subscriptions').select('*', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('courses').select('*', { count: 'exact', head: true }),
        supabase.from('grade_levels').select('*', { count: 'exact', head: true }),
      ]);
      setKpis({
        students: s.count || 0,
        active: a.count || 0,
        courses: c.count || 0,
        levels: l.count || 0,
      });
    }
    loadKpis();
  }, []);

  return (
    <>
      <div className="dash-head">
        <h1>أهلاً بيك 👋 {profile?.full_name || ''}</h1>
      </div>
      <div className="kpi-row">
        <div className="kpi"><div className="num">{kpis.students}</div><div className="label">إجمالي الطلاب</div></div>
        <div className="kpi"><div className="num">{kpis.active}</div><div className="label">اشتراكات فعّالة</div></div>
        <div className="kpi"><div className="num">{kpis.courses}</div><div className="label">عدد الكورسات</div></div>
        <div className="kpi"><div className="num">{kpis.levels}</div><div className="label">المراحل الدراسية</div></div>
      </div>
    </>
  );
}

export default AdminOverview;