/* ============================================================
   📊 StudentStats — إحصائيات الطالب
   ============================================================ */
import { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from '../context/AuthContext';

const CARDS = [
  { key: 'active_subs', icon: '✅', label: 'اشتراكات فعّالة' },
  { key: 'lessons_watched', icon: '🎬', label: 'فيديوهات اتفرجت عليها' },
  { key: 'avg_rating', icon: '⭐', label: 'متوسط تقييماتك' },
  { key: 'total_points', icon: '🏆', label: 'نقاطك' },
];

function StudentStats() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ active_subs: 0, lessons_watched: 0, avg_rating: 0, total_points: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!user) return;
      const { data } = await supabase.rpc('get_student_stats', { student_uuid: user.id });
      if (data && data[0]) setStats(data[0]);
      setLoading(false);
    }
    load();
  }, [user]);

  return (
    <div className="kpi-row kpi-auto" style={{ marginBottom: 24 }}>
      {CARDS.map((c) => (
        <div className="kpi" key={c.key}>
          <span className="kpi-ico" aria-hidden="true">{c.icon}</span>
          <div className="num">{loading ? '—' : Number(stats[c.key] || 0).toLocaleString('ar-EG')}</div>
          <div className="label">{c.label}</div>
        </div>
      ))}
    </div>
  );
}

export default StudentStats;