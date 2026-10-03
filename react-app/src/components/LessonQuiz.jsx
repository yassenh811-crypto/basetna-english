/* ============================================================
   🎓 LessonQuiz — امتحان مع تايمر + مرة واحدة + 15 سؤال
   ============================================================ */
import { useEffect, useState, useRef } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from '../context/AuthContext';

function LessonQuiz({ lesson, onClose }) {
  const { user } = useAuth();
  const [quiz, setQuiz] = useState(null);
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [previousAttempt, setPreviousAttempt] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [startedAt, setStartedAt] = useState(null);
  const timerRef = useRef(null);

  /* جلب الامتحان + المحاولات */
  useEffect(() => {
    async function load() {
      setLoading(true);
      setError('');
      try {
        const { data: quizData, error: quizErr } = await supabase
          .from('lesson_quizzes')
          .select('*')
          .eq('lesson_id', lesson.id)
          .maybeSingle();

        if (quizErr) throw quizErr;
        setQuiz(quizData);

        if (quizData && user) {
          const { data: attempts } = await supabase
            .from('quiz_attempts')
            .select('*')
            .eq('quiz_id', quizData.id)
            .eq('student_id', user.id)
            .order('created_at', { ascending: false })
            .limit(1);

          if (attempts && attempts.length > 0) setPreviousAttempt(attempts[0]);
        }
      } catch (err) {
        console.error('❌', err);
        setError(err.message || 'حصلت مشكلة');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [lesson.id, user]);

  /* التايمر */
  useEffect(() => {
    if (!quiz || submitted || previousAttempt) return;
    if (startedAt === null) return;
    if (timerRef.current) clearInterval(timerRef.current);

    timerRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startedAt) / 1000);
      const total = (quiz.time_limit_min || 10) * 60;
      const left = total - elapsed;
      setTimeLeft(left);
      if (left <= 0) {
        clearInterval(timerRef.current);
        handleSubmit(true);
      }
    }, 1000);

    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [quiz, startedAt, submitted, previousAttempt]);

  function startQuiz() {
    setStartedAt(Date.now());
    setTimeLeft((quiz.time_limit_min || 10) * 60);
  }

  async function handleSubmit(timeUp = false) {
    if (!quiz) return;
    if (timerRef.current) clearInterval(timerRef.current);

    let correct = 0;
    quiz.questions.forEach((q, i) => {
      if (answers[i] === q.correct) correct++;
    });

    setScore(correct);
    setSubmitted(true);

    if (user) {
      setSaving(true);
      try {
        const duration = startedAt ? Math.floor((Date.now() - startedAt) / 1000) : 0;
        await supabase.from('quiz_attempts').insert({
          quiz_id: quiz.id,
          student_id: user.id,
          score: correct,
          total: quiz.questions.length,
          duration_sec: duration,
        });
        await supabase.rpc('add_points', {
          student_uuid: user.id,
          amount: correct * 10,
        });
      } catch (err) { console.error('❌', err); }
      finally { setSaving(false); }
    }
  }

  if (loading) {
    return (
      <div className="overlay open" onClick={onClose}>
        <div className="modal" onClick={(e) => e.stopPropagation()}>
          <div className="empty-state">جاري التحميل...</div>
        </div>
      </div>
    );
  }

  if (!quiz) {
    return (
      <div className="overlay open" onClick={onClose}>
        <div className="modal" onClick={(e) => e.stopPropagation()}>
          <button className="close" onClick={onClose}>✕</button>
          <h3>🎓 امتحان الدرس</h3>
          <div className="empty-state" style={{ padding: 30 }}>
            <div style={{ fontSize: 48, marginBottom: 10 }}>📚</div>
            لسه مفيش امتحان للدرس ده.
          </div>
        </div>
      </div>
    );
  }

  /* محاولة سابقة + مرة واحدة */
  if (previousAttempt && (quiz.max_attempts || 1) === 1) {
    const pct = Math.round((previousAttempt.score / previousAttempt.total) * 100);
    return (
      <div className="overlay open" onClick={onClose}>
        <div className="modal" onClick={(e) => e.stopPropagation()}>
          <button className="close" onClick={onClose}>✕</button>
          <h3>{quiz.title_ar}</h3>
          <div style={{ textAlign: 'center', padding: 20 }}>
            <div style={{ fontSize: 48 }}>{pct >= 80 ? '🏆' : pct >= 50 ? '👍' : '💪'}</div>
            <div style={{ fontSize: 24, fontWeight: 900, color: 'var(--navy-deep)', marginTop: 8 }}>
              {previousAttempt.score} / {previousAttempt.total}
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, marginTop: 4 }}>{pct}%</div>
            <div style={{ marginTop: 16, padding: 10, background: 'var(--paper-2)', borderRadius: 8, fontSize: 13 }}>
              ⚠️ إنت حللت الامتحان ده بالفعل. مسموح بمحاولة واحدة بس.
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* شاشة البداية */
  if (startedAt === null) {
    return (
      <div className="overlay open" onClick={onClose}>
        <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 500 }}>
          <button className="close" onClick={onClose}>✕</button>
          <h3>{quiz.title_ar}</h3>
          <p className="sub">📝 {quiz.questions.length} أسئلة</p>
          <div style={{ padding: 16, background: 'var(--paper-2)', borderRadius: 12, marginBottom: 16 }}>
            <div style={{ marginBottom: 8, fontSize: 14 }}>⏱️ <b>الوقت:</b> {quiz.time_limit_min || 10} دقايق</div>
            <div style={{ marginBottom: 8, fontSize: 14 }}>🔒 <b>محاولات:</b> مرة واحدة بس</div>
            <div style={{ fontSize: 14 }}>⚠️ <b>مهم:</b> لو خرجت من الامتحان، الوقت مش هيقف.</div>
          </div>
          <button className="btn btn-teal btn-block" onClick={startQuiz}>🚀 ابدأ الامتحان</button>
        </div>
      </div>
    );
  }

  const totalTime = (quiz.time_limit_min || 10) * 60;
  const minutes = Math.floor(Math.max(0, timeLeft) / 60);
  const seconds = Math.max(0, timeLeft) % 60;
  const timePct = Math.max(0, (timeLeft / totalTime) * 100);
  const pct = Math.round((score / quiz.questions.length) * 100);

  return (
    <div className="overlay open" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 700, maxHeight: '90vh', overflowY: 'auto' }}>

        {/* التايمر */}
        {!submitted && (
          <div style={{ position: 'sticky', top: 0, background: 'var(--paper-2)', padding: 12, borderRadius: 10, marginBottom: 16, zIndex: 5 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontWeight: 800, fontSize: 15 }}>
              <span>⏱️ الوقت المتبقي</span>
              <span style={{ color: timeLeft < 60 ? 'var(--danger)' : 'var(--teal-dark)' }}>
                {minutes}:{seconds.toString().padStart(2, '0')}
              </span>
            </div>
            <div style={{ width: '100%', height: 8, background: 'var(--line)', borderRadius: 999, overflow: 'hidden' }}>
              <div style={{ width: `${timePct}%`, height: '100%', background: timeLeft < 60 ? 'var(--danger)' : 'linear-gradient(90deg, var(--teal), var(--gold))', transition: 'width 1s linear' }} />
            </div>
          </div>
        )}

        {submitted && (
          <div style={{ padding: 20, background: pct >= 50 ? '#E4F2EC' : '#FBE7E2', borderRadius: 12, marginBottom: 20, textAlign: 'center' }}>
            <div style={{ fontSize: 48 }}>{pct >= 80 ? '🏆' : pct >= 50 ? '👍' : '💪'}</div>
            <div style={{ fontSize: 24, fontWeight: 900, color: 'var(--navy-deep)' }}>
              {score} / {quiz.questions.length}
            </div>
            <div style={{ fontSize: 18, fontWeight: 700 }}>{pct}%</div>
            {saving && <div style={{ marginTop: 8, fontSize: 12 }}>جاري الحفظ...</div>}
          </div>
        )}

        {quiz.questions.map((q, i) => (
          <div key={i} style={{ marginBottom: 20, padding: 16, background: 'var(--paper)', borderRadius: 12, border: '1.5px solid var(--line)' }}>
            <div style={{ fontWeight: 800, marginBottom: 12, color: 'var(--navy-deep)', fontSize: 15 }}>
              {i + 1}. {q.question}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {q.options.map((opt, idx) => {
                const isSelected = answers[i] === idx;
                const isCorrect = idx === q.correct;
                let bg = 'var(--paper-2)';
                let border = 'var(--line)';
                let color = 'var(--ink)';
                if (submitted) {
                  if (isCorrect) { bg = '#E4F2EC'; border = 'var(--teal)'; color = 'var(--teal-dark)'; }
                  else if (isSelected) { bg = '#FBE7E2'; border = 'var(--danger)'; color = 'var(--danger)'; }
                } else if (isSelected) {
                  bg = '#FFF9E8'; border = 'var(--gold)'; color = 'var(--navy-deep)';
                }
                return (
                  <button key={idx} type="button"
                    onClick={() => !submitted && setAnswers({ ...answers, [i]: idx })}
                    style={{ padding: '12px 16px', background: bg, border: `1.5px solid ${border}`, borderRadius: 10, textAlign: 'start', fontSize: 14, fontFamily: 'inherit', cursor: submitted ? 'default' : 'pointer', fontWeight: isSelected || (submitted && isCorrect) ? 700 : 500, color }}
                  >
                    {submitted && isCorrect && '✅ '}
                    {submitted && isSelected && !isCorrect && '❌ '}
                    {opt}
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        {!submitted && (
          <button className="btn btn-teal btn-block" onClick={() => handleSubmit(false)} disabled={saving}>
            {saving ? 'جاري الحفظ...' : '✅ تسليم الامتحان'}
          </button>
        )}

        {error && <div className="form-msg error" style={{ display: 'block', marginTop: 12 }}>{error}</div>}
      </div>
    </div>
  );
}

export default LessonQuiz;