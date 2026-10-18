/* ============================================================
   🏆 PointsBadge — نقاط وشارات الطالب
   ============================================================ */
import { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from '../context/AuthContext';

const BADGE_RULES = [
  { id: 'starter', name: '🌱 مبتدئ', min: 10 },
  { id: 'active', name: '🔥 نشيط', min: 50 },
  { id: 'advanced', name: '⚡ متقدم', min: 100 },
  { id: 'master', name: '👑 محترف', min: 500 },
];

function PointsBadge() {
  const { user } = useAuth();
  const [data, setData] = useState({ points: 0, badges: [] });

  useEffect(() => {
    async function load() {
      if (!user) return;
      const { data: row } = await supabase
        .from('user_points')
        .select('*')
        .eq('student_id', user.id)
        .maybeSingle();
      if (row) setData(row);
    }
    load();
  }, [user]);

  const points = data.points || 0;
  const earned = BADGE_RULES.filter((b) => points >= b.min);
  const next = BADGE_RULES.find((b) => points < b.min);
  const prevMin = earned.length ? earned[earned.length - 1].min : 0;
  const pct = next ? Math.round(((points - prevMin) / (next.min - prevMin)) * 100) : 100;

  return (
    <div className="points-card">
      <div className="points-num">⭐ {points.toLocaleString('ar-EG')} <small>نقطة</small></div>

      {earned.length > 0 && (
        <div className="badges-row">
          {earned.map((b) => (
            <span key={b.id} className="badge-chip">{b.name}</span>
          ))}
        </div>
      )}

      {next ? (
        <div className="next-badge">
          <div className="next-top">
            <span>الشارة الجاية: <b>{next.name}</b></span>
            <span>باقي {next.min - points} نقطة</span>
          </div>
          <div className="pp-bar"><div className="pp-fill" style={{ width: `${pct}%` }} /></div>
        </div>
      ) : (
        <div className="next-badge"><span>🎉 وصلت لأعلى شارة!</span></div>
      )}
    </div>
  );
}

export default PointsBadge;