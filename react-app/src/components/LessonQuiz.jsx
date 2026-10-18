/* ============================================================
   🎓 LessonQuiz — امتحان مع تايمر + عدد محاولات + استكمال لو خرج
   ------------------------------------------------------------
   إصلاحات:
   - لما الوقت يخلص كان بيتسلّم بإجابات فاضية (stale closure) → اتصلّح
   - لو الطالب قفل الصفحة، الوقت فعلاً مش بيقف (بنحفظ وقت البداية)
   - عدد المحاولات بيتحسب صح (max_attempts)
   ============================================================ */
import { useEffect, useRef, useState } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from '../context/AuthContext';

const LETTERS = ['أ', 'ب', 'ج', 'د', 'هـ', 'و'];

function Shell({ children, onOverlay }) {
  return (
    <div className="overlay open" onClick={onOverlay}>
      <div className="modal qz-modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

const faceFor = (pct) => (pct >= 80 ? '🏆' : pct >= 50 ? '👍' : '💪');

function LessonQuiz({ lesson, onClose }) {
  const { user } = useAuth();
  const [quiz, setQuiz] = useState(null);
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [attempts, setAttempts] = useState([]);
  const [timeLeft, setTimeLeft] = useState(0);
  const [startedAt, setStartedAt] = useState(null);

  /* refs عشان الـ timer مياخدش قيم قديمة */
  const answersRef = useRef({});
  const quizRef = useRef(null);
  const userRef = useRef(null);
  const startedRef = useRef(null);
  const submittedRef = useRef(false);
  const timerRef = useRef(null);

  userRef.current = user;
  quizRef.current = quiz;
  startedRef.current = startedAt;

  const maxAttempts = quiz?.max_attempts || 1;
  const blocked = !!quiz && attempts.length >= maxAttempts;
  const last = attempts[0];
  const inProgress = startedAt !== null && !submitted;

  const storeKey = (q = quizRef.current) => (q && userRef.current ? `quiz_${q.id}_${userRef.current.id}` : null);

  /* ---------- تحميل ---------- */
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
        quizRef.current = quizData;

        let list = [];
        if (quizData && user) {
          const { data } = await supabase
            .from('quiz_attempts')
            .select('*')
            .eq('quiz_id', quizData.id)
            .eq('student_id', user.id)
            .order('created_at', { ascending: false });
          list = data || [];
          setAttempts(list);

          /* استكمال امتحان كان شغال */
          if (list.length < (quizData.max_attempts || 1)) {
            try {
              const saved = JSON.parse(localStorage.getItem(`quiz_${quizData.id}_${user.id}`) || 'null');
              if (saved?.startedAt) {
                answersRef.current = saved.answers || {};
                setAnswers(saved.answers || {});
                setStartedAt(saved.startedAt);
              }
            } catch {}
          }
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

  /* ---------- التسليم ---------- */
  async function submit() {
    if (submittedRef.current) return;
    const q = quizRef.current;
    if (!q) return;
    submittedRef.current = true;
    clearInterval(timerRef.current);

    const ans = answersRef.current;
    let correct = 0;
    q.questions.forEach((qq, i) => {
      if (ans[i] === qq.correct) correct++;
    });
    setScore(correct);
    setSubmitted(true);

    const u = userRef.current;
    try { const k = storeKey(q); if (k) localStorage.removeItem(k); } catch {}

    if (u) {
      setSaving(true);
      try {
        const duration = startedRef.current ? Math.floor((Date.now() - startedRef.current) / 1000) : 0;
        const { error: insErr } = await supabase.from('quiz_attempts').insert({
          quiz_id: q.id,
          student_id: u.id,
          score: correct,
          total: q.questions.length,
          duration_sec: duration,
        });
        if (insErr) throw insErr;
        await supabase.rpc('add_points', { student_uuid: u.id, amount: correct * 10 });
      } catch (err) {
        console.error('❌', err);
        setError('الامتحان اتسلّم، لكن حصلت مشكلة في حفظ النتيجة. صوّر الشاشة وابعتها للميس.');
      } finally {
        setSaving(false);
      }
    }
  }

  /* ---------- التايمر ---------- */
  useEffect(() => {
    if (!quiz || startedAt === null || submitted || blocked) return;
    const total = (quiz.time_limit_min || 10) * 60;
    const tick = () => {
      const left = total - Math.floor((Date.now() - startedAt) / 1000);
      setTimeLeft(left);
      if (left <= 0) submit();
    };
    tick();
    timerRef.current = setInterval(tick, 1000);
    return () => clearInterval(timerRef.current);
  }, [quiz, startedAt, submitted, blocked]);

  function startQuiz() {
    const now = Date.now();
    setStartedAt(now);
    try {
      const k = storeKey();
      if (k) localStorage.setItem(k, JSON.stringify({ startedAt: now, answers: {} }));
    } catch {}
  }

  function pick(i, idx) {
    if (submitted) return;
    const next = { ...answersRef.current, [i]: idx };
    answersRef.current = next;
    setAnswers(next);
    try {
      const k = storeKey();
      if (k) localStorage.setItem(k, JSON.stringify({ startedAt: startedRef.current, answers: next }));
    } catch {}
  }

  function handleManualSubmit() {
    const total = quiz.questions.length;
    const answered = Object.keys(answersRef.current).length;
    if (answered < total && !confirm(`فيه ${total - answered} سؤال من غير إجابة. عايز تسلّم؟`)) return;
    submit();
  }

  function handleClose() {
    if (inProgress && !confirm('لو خرجت، الوقت هيفضل شغال. متأكد؟')) return;
    onClose();
  }

  const CloseBtn = (
    <button className="close" type="button" onClick={handleClose} aria-label="إغلاق">✕</button>
  );

  /* ---------- الحالات ---------- */
  if (loading) {
    return (
      <Shell onOverlay={onClose}>
        <div className="skeleton-list"><span /><span /><span /></div>
      </Shell>
    );
  }

  if (!quiz) {
    return (
      <Shell onOverlay={onClose}>
        {CloseBtn}
        <h3>🎓 امتحان الدرس</h3>
        <div className="empty-state">
          <div style={{ fontSize: 44, marginBottom: 8 }}>📚</div>
          لسه مفيش امتحان للدرس ده.
        </div>
        {error && <div className="form-msg error">{error}</div>}
      </Shell>
    );
  }

  if (blocked && !submitted) {
    const pct = Math.round((last.score / last.total) * 100);
    return (
      <Shell onOverlay={onClose}>
        {CloseBtn}
        <h3>{quiz.title_ar}</h3>
        <div className="qz-result good">
          <div style={{ fontSize: 44 }}>{faceFor(pct)}</div>
          <div className="qz-score">{last.score} / {last.total}</div>
          <div className="qz-pct">{pct}%</div>
        </div>
        <div className="info-box warn">
          ⚠️ {maxAttempts === 1
            ? 'إنت حللت الامتحان ده بالفعل، والمسموح بمحاولة واحدة بس.'
            : `استنفدت محاولاتك (${maxAttempts}).`}
        </div>
      </Shell>
    );
  }

  if (startedAt === null && !submitted) {
    return (
      <Shell onOverlay={onClose}>
        {CloseBtn}
        <h3>{quiz.title_ar}</h3>
        <p className="sub">📝 {quiz.questions.length} سؤال</p>
        <ul className="qz-rules">
          <li>⏱️ <b>الوقت:</b> {quiz.time_limit_min || 10} دقايق</li>
          <li>🔒 <b>المحاولات:</b> {maxAttempts === 1 ? 'مرة واحدة بس' : `${maxAttempts - attempts.length} من ${maxAttempts} متبقية`}</li>
          <li>⚠️ <b>مهم:</b> لو خرجت من الامتحان الوقت مش هيقف، وإجاباتك بتتحفظ.</li>
        </ul>
        <button type="button" className="btn btn-teal btn-block" onClick={startQuiz}>🚀 ابدأ الامتحان</button>
      </Shell>
    );
  }

  const total = quiz.questions.length;
  const answeredCount = Object.keys(answers).length;
  const totalTime = (quiz.time_limit_min || 10) * 60;
  const mm = Math.floor(Math.max(0, timeLeft) / 60);
  const ss = String(Math.max(0, timeLeft) % 60).padStart(2, '0');
  const timePct = Math.max(0, (timeLeft / totalTime) * 100);
  const low = timeLeft < 60;
  const pct = Math.round((score / total) * 100);

  return (
    <Shell onOverlay={undefined}>
      {CloseBtn}

      {!submitted && (
        <div className="qz-bar">
          <div className="qz-bar-top">
            <span>⏱️ <b className={`qz-time${low ? ' low' : ''}`} dir="ltr">{mm}:{ss}</b></span>
            <span className="qz-meta">{answeredCount} / {total} اتجاوب</span>
          </div>
          <div className="qz-track"><div className={`qz-fill${low ? ' low' : ''}`} style={{ width: `${timePct}%` }} /></div>
        </div>
      )}

      {submitted && (
        <div className={`qz-result ${pct >= 50 ? 'good' : 'bad'}`}>
          <div style={{ fontSize: 44 }}>{faceFor(pct)}</div>
          <div className="qz-score">{score} / {total}</div>
          <div className="qz-pct">{pct}%</div>
          {saving && <div className="qz-meta">جاري الحفظ...</div>}
        </div>
      )}

      {quiz.questions.map((q, i) => (
        <div className="qz-q" key={i}>
          <h4 dir="auto">{i + 1}. {q.question}</h4>
          <div className="qz-opts">
            {q.options.map((opt, idx) => {
              const selected = answers[i] === idx;
              const right = idx === q.correct;
              let cls = 'qz-opt';
              if (submitted) {
                if (right) cls += ' right';
                else if (selected) cls += ' wrong';
              } else if (selected) cls += ' sel';
              return (
                <button key={idx} type="button" className={cls} onClick={() => pick(i, idx)} disabled={submitted}>
                  <span className="qz-letter">{LETTERS[idx] || idx + 1}</span>
                  <span className="qz-text" dir="auto">{opt}</span>
                  {submitted && right && <span className="qz-mark">✅</span>}
                  {submitted && selected && !right && <span className="qz-mark">❌</span>}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {!submitted ? (
        <button type="button" className="btn btn-teal btn-block" onClick={handleManualSubmit} disabled={saving}>
          ✅ تسليم الامتحان
        </button>
      ) : (
        <button type="button" className="btn btn-gold btn-block" onClick={onClose}>تمام</button>
      )}

      {error && <div className="form-msg error">{error}</div>}
    </Shell>
  );
}

export default LessonQuiz;