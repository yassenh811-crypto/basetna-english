/* ============================================================
   📊 StudentStats — إحصائيات الطالب
   ============================================================ */
import { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from '../context/AuthContext';

function StudentStats() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    active_subs: 0, lessons_watched: 0, avg_rating: 0, total_points: 0,
  });
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
    <div className="kpi-row" style={{ marginBottom: 24 }}>
      <div className="kpi">
        <div className="num">{loading ? '—' : stats.active_subs}</div>
        <div className="label">اشتراكات فعّالة</div>
      </div>
      <div className="kpi">
        <div className="num">{loading ? '—' : stats.lessons_watched}</div>
        <div className="label">فيديوهات اتفرجت عليها</div>
      </div>
      <div className="kpi">
        <div className="num">{loading ? '—' : stats.avg_rating}</div>
        <div className="label">متوسط تقييماتك</div>
      </div>
      <div className="kpi">
        <div className="num">{loading ? '—' : stats.total_points}</div>
        <div className="label">نقاطك</div>
      </div>
    </div>
  );
}

export default StudentStats;