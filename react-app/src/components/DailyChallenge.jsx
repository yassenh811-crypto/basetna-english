/* ============================================================
   🔥 DailyChallenge — تحدي اليوم (سؤال واحد كل يوم + ستريك)
   - الإجابة الصح بتتحسب من السيرفر (مش بتتبعت للمتصفح قبل ما تجاوب)
   - بيتجدد كل يوم 12 بالليل بتوقيت القاهرة
   ============================================================ */
import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../services/supabase';

const LETTERS = ['أ', 'ب', 'ج', 'د', 'هـ', 'و'];

function cairoSecondsLeft() {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Africa/Cairo', hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(new Date());
  const get = (t) => Number(parts.find((p) => p.type === t).value);
  return 86400 - ((get('hour') % 24) * 3600 + get('minute') * 60 + get('second'));
}

function fmt(sec) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return [h, m, s].map((n) => String(n).padStart(2, '0')).join(':');
}

function DailyChallenge({ onAnswered }) {
  const [state, setState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [left, setLeft] = useState(cairoSecondsLeft());
  const prevLeft = useRef(left);

  const load = useCallback(async (silent) => {
    if (!silent) setLoading(true);
    const { data, error: err } = await supabase.rpc('daily_state');
    if (err) {
      setError(
        /daily_state|function|schema cache/i.test(err.message || '')
          ? 'التحدي اليومي محتاج تشغّل ملف daily_challenge.sql في Supabase مرة واحدة.'
          : err.message
      );
    } else {
      setError('');
      setState(data);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load(false);
  }, [load]);

  /* عدّاد السؤال الجاي + تجديد تلقائي بعد نص الليل */
  useEffect(() => {
    const t = setInterval(() => {
      const s = cairoSecondsLeft();
      if (s > prevLeft.current) {
        setSelected(null);
        load(true);
      }
      prevLeft.current = s;
      setLeft(s);
    }, 1000);
    return () => clearInterval(t);
  }, [load]);

  async function submit() {
    if (selected === null || submitting) return;
    setSubmitting(true);
    setError('');
    const { data, error: err } = await supabase.rpc('daily_answer', { p_choice: selected });
    setSubmitting(false);

    if (err) {
      setError(
        /already answered/.test(err.message || '')
          ? 'إنت جاوبت على سؤال النهارده قبل كده.'
          : 'حصلت مشكلة، جرّب تاني.'
      );
      load(true);
      return;
    }

    setState((s) => ({
      ...s,
      answered: true,
      streak: data.streak,
      total_points: (s?.total_points || 0) + data.points,
      week_points: (s?.week_points || 0) + data.points,
      result: {
        choice: data.choice,
        is_correct: data.is_correct,
        points: data.points,
        correct_index: data.correct_index,
        explanation: data.explanation,
      },
    }));
    onAnswered?.();
  }

  if (loading) {
    return (
      <div className="card dc-card">
        <div className="skeleton-list" style={{ padding: 0 }}><span /><span /><span /></div>
      </div>
    );
  }

  const q = state?.question;
  const res = state?.result;
  const answered = !!state?.answered;
  const streak = state?.streak || 0;

  return (
    <div className="card dc-card">
      <div className="dc-head">
        <h3>🔥 تحدي اليوم</h3>
        <div className="dc-chips">
          <span className={`dc-streak${streak >= 3 ? ' hot' : ''}`}>🔥 {streak} {streak === 1 ? 'يوم' : 'أيام'} متتالية</span>
          <span className="dc-points">⭐ {(state?.total_points || 0).toLocaleString('ar-EG')}</span>
        </div>
      </div>

      {error && <div className="form-msg error">{error}</div>}

      {!q && !answered && !error && (
        <div className="empty-state">مفيش سؤال النهارده 👋 ارجع بكره وكمّل الستريك.</div>
      )}

      {q && (
        <>
          <h4 className="dc-question" dir="auto">{q.question}</h4>

          <div className="qz-opts">
            {q.options.map((opt, idx) => {
              let cls = 'qz-opt';
              if (answered && res) {
                if (idx === res.correct_index) cls += ' right';
                else if (idx === res.choice) cls += ' wrong';
              } else if (idx === selected) {
                cls += ' sel';
              }
              return (
                <button
                  key={idx}
                  type="button"
                  className={cls}
                  disabled={answered || submitting}
                  onClick={() => setSelected(idx)}
                >
                  <span className="qz-letter">{LETTERS[idx] || idx + 1}</span>
                  <span className="qz-text" dir="auto">{opt}</span>
                  {answered && res && idx === res.correct_index && <span className="qz-mark">✅</span>}
                  {answered && res && idx === res.choice && idx !== res.correct_index && <span className="qz-mark">❌</span>}
                </button>
              );
            })}
          </div>

          {!answered && (
            <button type="button" className="btn btn-teal btn-block" style={{ marginTop: 14 }} onClick={submit} disabled={selected === null || submitting}>
              {submitting ? '...' : '✅ تأكيد الإجابة'}
            </button>
          )}
        </>
      )}

      {answered && res && (
        <>
          <div className={`dc-result ${res.is_correct ? 'good' : 'bad'}`}>
            <b>{res.is_correct ? '🎉 إجابة صح!' : '💪 مش مشكلة، المهم الستريك مكمّل'}</b>
            <span>+{res.points} نقطة</span>
          </div>
          {res.explanation && <div className="dc-explain" dir="auto">💡 {res.explanation}</div>}
          <div className="dc-next">السؤال الجاي بعد <b dir="ltr">{fmt(left)}</b></div>
        </>
      )}

      {!answered && q && <div className="dc-note">جاوب كل يوم عشان الستريك ما يتقطعش. كل يوم متتالي بيزوّد البونص.</div>}
    </div>
  );
}

export default DailyChallenge;