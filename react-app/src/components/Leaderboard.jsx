/* ============================================================
   🏆 Leaderboard — لوحة المتصدرين لمرحلة الطالب
   ============================================================ */
import { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';

const MEDAL = { 1: '🥇', 2: '🥈', 3: '🥉' };

function Leaderboard({ refreshKey = 0 }) {
  const [period, setPeriod] = useState('week');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    setLoading(true);
    supabase.rpc('daily_leaderboard', { p_period: period }).then(({ data, error: err }) => {
      if (!alive) return;
      if (err) {
        setError(
          /daily_leaderboard|function|schema cache/i.test(err.message || '')
            ? 'لوحة المتصدرين محتاجة تشغّل ملف daily_challenge.sql.'
            : err.message
        );
        setRows([]);
      } else {
        setError('');
        setRows(data || []);
      }
      setLoading(false);
    });
    return () => { alive = false; };
  }, [period, refreshKey]);

  return (
    <div className="card lb-card">
      <div className="dc-head">
        <h3>🏆 لوحة المتصدرين</h3>
        <div className="lb-tabs" role="tablist">
          <button type="button" className={period === 'week' ? 'active' : ''} onClick={() => setPeriod('week')}>آخر 7 أيام</button>
          <button type="button" className={period === 'all' ? 'active' : ''} onClick={() => setPeriod('all')}>كل الوقت</button>
        </div>
      </div>
      <p className="lb-sub">ترتيب طلاب مرحلتك بحسب نقاط التحدي اليومي</p>

      {error && <div className="form-msg error">{error}</div>}

      {loading ? (
        <div className="skeleton-list" style={{ padding: 0 }}><span /><span /><span /></div>
      ) : rows.length === 0 && !error ? (
        <div className="empty-state">لسه محدش جاوب 👋 كن أول واحد في اللوحة!</div>
      ) : (
        <ol className="lb-list">
          {rows.map((r) => (
            <li key={r.r_student} className={`lb-row${r.r_me ? ' me' : ''}${r.r_rank <= 3 ? ' top' : ''}`}>
              <span className="lb-rank">{MEDAL[r.r_rank] || Number(r.r_rank).toLocaleString('ar-EG')}</span>
              <span className="lb-ava">{(r.r_name || '?').charAt(0)}</span>
              <span className="lb-name">
                {r.r_name}
                {r.r_me && <small className="lb-you">إنت</small>}
              </span>
              {r.r_streak > 0 && <span className="lb-streak">🔥 {r.r_streak}</span>}
              <b className="lb-points">{Number(r.r_points).toLocaleString('ar-EG')}</b>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

export default Leaderboard;