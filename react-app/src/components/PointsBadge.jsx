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
      const { data } = await supabase
        .from('user_points')
        .select('*')
        .eq('student_id', user.id)
        .maybeSingle();
      if (data) setData(data);
    }
    load();
  }, [user]);

  const earnedBadges = BADGE_RULES.filter((b) => data.points >= b.min);

  return (
    <div style={{ padding: 16, background: 'var(--paper)', borderRadius: 12 }}>
      <div style={{ fontSize: 32, fontWeight: 900, color: 'var(--gold)' }}>
        {data.points} نقطة
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
        {earnedBadges.map((b) => (
          <span key={b.id} style={{ background: 'var(--gold-soft)', padding: '4px 12px', borderRadius: 999, fontSize: 13, fontWeight: 700 }}>
            {b.name}
          </span>
        ))}
      </div>
    </div>
  );
}

export default PointsBadge;