/* ============================================================
   👑 AdminOverview — نظرة عامة
   ============================================================ */
import { useEffect, useState } from 'react';
import { supabase } from '../../services/supabase';

const CARDS = [
  { key: 'students', icon: '👥', label: 'إجمالي الطلاب' },
  { key: 'active', icon: '✅', label: 'اشتراكات فعّالة' },
  { key: 'expiring', icon: '⏳', label: 'بتنتهي خلال 7 أيام' },
  { key: 'courses', icon: '🎬', label: 'عدد الكورسات' },
  { key: 'levels', icon: '📚', label: 'المراحل الدراسية' },
];

function AdminOverview({ profile }) {
  const [kpis, setKpis] = useState({ students: 0, active: 0, expiring: 0, courses: 0, levels: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadKpis() {
      setLoading(true);
      const today = new Date();
      const todayStr = today.toISOString().slice(0, 10);
      const in7 = new Date(today.getTime() + 7 * 86400000).toISOString().slice(0, 10);
      const head = { count: 'exact', head: true };

      const [s, a, e, c, l] = await Promise.all([
        supabase.from('profiles').select('*', head).eq('role', 'student'),
        supabase.from('subscriptions').select('*', head).eq('status', 'active').or(`end_date.gte.${todayStr},end_date.is.null`),
        supabase.from('subscriptions').select('*', head).eq('status', 'active').gte('end_date', todayStr).lte('end_date', in7),
        supabase.from('courses').select('*', head),
        supabase.from('grade_levels').select('*', head),
      ]);

      setKpis({
        students: s.count || 0,
        active: a.count || 0,
        expiring: e.count || 0,
        courses: c.count || 0,
        levels: l.count || 0,
      });
      setLoading(false);
    }
    loadKpis();
  }, []);

  const dateText = new Date().toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <>
      <div className="dash-head">
        <div>
          <h1>أهلاً بيك 👋 {profile?.full_name || ''}</h1>
          <p className="dash-sub">{dateText}</p>
        </div>
      </div>

      <div className="kpi-row kpi-auto">
        {CARDS.map((c) => (
          <div className={`kpi kpi-${c.key}`} key={c.key}>
            <span className="kpi-ico" aria-hidden="true">{c.icon}</span>
            <div className="num">{loading ? '—' : kpis[c.key].toLocaleString('ar-EG')}</div>
            <div className="label">{c.label}</div>
          </div>
        ))}
      </div>
    </>
  );
}

export default AdminOverview;