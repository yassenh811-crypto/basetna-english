/* ============================================================
   📝 QuizPlayer — حل الكويز
   ============================================================ */
import { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from '../context/AuthContext';

function QuizPlayer({ quiz, onClose }) {
  const { user } = useAuth();
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  /* ============================================================
     جلب الأسئلة
     ============================================================ */
  useEffect(() => {
    async function load() {
      setLoading(true);
      const { data, error } = await supabase
        .from('quiz_questions')
        .select('*')
        .eq('quiz_id', quiz.id)
        .order('sort_order');
      if (error) console.error(error);
      setQuestions(data || []);
      setLoading(false);
    }
    load();
  }, [quiz.id]);

  /* ============================================================
     اختيار إجابة
     ============================================================ */
  function pickAnswer(questionId, optionIndex) {
    if (submitted) return;
    setAnswers({ ...answers, [questionId]: optionIndex });
  }

  /* ============================================================
     تسليم الكويز
     ============================================================ */
  async function handleSubmit() {
    /* تحقق إن كل الأسئلة اتحلت */
    const unanswered = questions.filter((q) => answers[q.id] === undefined);
    if (unanswered.length > 0) {
      if (!confirm(`فيه ${unanswered.length} سؤال مش متجاوب. عايز تسلّم؟`)) return;
    }

    /* احسب النتيجة */
    let correct = 0;
    questions.forEach((q) => {
      if (answers[q.id] === q.correct_index) correct++;
    });

    setScore(correct);
    setSubmitted(true);

    /* احفظ النتيجة */
    if (user) {
      setSaving(true);
      await supabase.from('quiz_results').insert({
        quiz_id: quiz.id,
        student_id: user.id,
        score: correct,
        total: questions.length,
      });

      /* ضيف نقاط */
      const earned = correct * 5; /* 5 نقاط لكل إجابة صح */
      await supabase.rpc('add_points', {
        student_uuid: user.id,
        amount: earned,
      });

      setSaving(false);
    }
  }

  /* ============================================================
     إعادة المحاولة
     ============================================================ */
  function handleRetry() {
    setAnswers({});
    setSubmitted(false);
    setScore(0);
  }

  /* ============================================================
     تحميل
     ============================================================ */
  if (loading) {
    return (
      <div className="overlay open" onClick={onClose}>
        <div className="modal" onClick={(e) => e.stopPropagation()}>
          <div className="empty-state">جاري التحميل...</div>
        </div>
      </div>
    );
  }

  const percentage = questions.length > 0
    ? Math.round((score / questions.length) * 100)
    : 0;

  /* ============================================================
     Render
     ============================================================ */
  return (
    <div className="overlay open" onClick={onClose}>
      <div
        className="modal"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 700, maxHeight: '90vh', overflowY: 'auto' }}
      >
        <button className="close" onClick={onClose}>✕</button>

        <h3>{quiz.title_ar}</h3>
        <p className="sub">{quiz.description_ar || ''}</p>

        {/* ============================================================
            النتيجة (لو تم التسليم)
            ============================================================ */}
        {submitted && (
          <div
            style={{
              padding: 20,
              background: percentage >= 50 ? '#E4F2EC' : '#FBE7E2',
              borderRadius: 12,
              marginBottom: 20,
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: 48, marginBottom: 8 }}>
              {percentage >= 80 ? '🏆' : percentage >= 50 ? '👍' : '💪'}
            </div>
            <div style={{ fontSize: 24, fontWeight: 900, color: 'var(--navy-deep)' }}>
              {score} / {questions.length}
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, marginTop: 4 }}>
              {percentage}%
            </div>
            <div style={{ marginTop: 8, color: 'var(--ink-soft)' }}>
              {percentage >= 80 ? 'ممتاز! 🎉' :
               percentage >= 50 ? 'جيد! 💛' :
               'محتاج مراجعة 📚'}
            </div>
            {saving && <div style={{ marginTop: 8, fontSize: 12 }}>جاري الحفظ...</div>}
          </div>
        )}

        {/* ============================================================
            الأسئلة
            ============================================================ */}
        {questions.length === 0 ? (
          <div className="empty-state">لسه مفيش أسئلة</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {questions.map((q, i) => (
              <div
                key={q.id}
                style={{
                  padding: 16,
                  background: 'var(--paper)',
                  borderRadius: 12,
                  border: '1.5px solid var(--line)',
                }}
              >
                <div
                  style={{
                    fontWeight: 800,
                    marginBottom: 12,
                    color: 'var(--navy-deep)',
                    fontSize: 15,
                  }}
                >
                  {i + 1}. {q.question_ar}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {q.options.map((opt, idx) => {
                    const isSelected = answers[q.id] === idx;
                    const isCorrect = idx === q.correct_index;

                    let bg = 'var(--paper-2)';
                    let border = 'var(--line)';
                    let color = 'var(--ink)';

                    if (submitted) {
                      if (isCorrect) {
                        bg = '#E4F2EC';
                        border = 'var(--teal)';
                        color = 'var(--teal-dark)';
                      } else if (isSelected) {
                        bg = '#FBE7E2';
                        border = 'var(--danger)';
                        color = 'var(--danger)';
                      }
                    } else if (isSelected) {
                      bg = '#FFF9E8';
                      border = 'var(--gold)';
                      color = 'var(--navy-deep)';
                    }

                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => pickAnswer(q.id, idx)}
                        style={{
                          padding: '12px 16px',
                          background: bg,
                          border: `1.5px solid ${border}`,
                          borderRadius: 10,
                          textAlign: 'start',
                          cursor: submitted ? 'default' : 'pointer',
                          fontSize: 14,
                          fontFamily: 'inherit',
                          fontWeight: isSelected || (submitted && isCorrect) ? 700 : 500,
                          color,
                          transition: 'all 0.15s ease',
                        }}
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
          </div>
        )}

        {/* ============================================================
            الأزرار
            ============================================================ */}
        {questions.length > 0 && (
          <div style={{ marginTop: 20, display: 'flex', gap: 10 }}>
            {!submitted ? (
              <button
                className="btn btn-teal btn-block"
                onClick={handleSubmit}
                disabled={saving}
              >
                {saving ? 'جاري الحفظ...' : '✅ تسليم الكويز'}
              </button>
            ) : (
              <button
                className="btn btn-gold btn-block"
                onClick={handleRetry}
              >
                🔄 إعادة المحاولة
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default QuizPlayer;