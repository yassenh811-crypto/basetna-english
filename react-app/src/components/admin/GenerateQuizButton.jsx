/* ============================================================
   🎓 GenerateQuizButton — توليد امتحان من درس بـ AI
   ============================================================ */
import { useState } from 'react';
import { supabase } from '../../services/supabase';

const API_URL = import.meta.env.VITE_AI_API_URL || 'https://basetna-server.vercel.app';

function GenerateQuizButton({ lesson, onGenerated }) {
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ text: '', type: '' });

  function show(text, type, ms = 4000) {
    setToast({ text, type });
    if (ms) setTimeout(() => setToast({ text: '', type: '' }), ms);
  }

  async function handleGenerate() {
    if (loading) return;
    if (!confirm(`عايز AI يعمل امتحان لدرس "${lesson.title_ar}"؟\n(لو فيه امتحان قديم هيتبدل)`)) return;

    setLoading(true);
    show('⏳ جاري توليد الامتحان... ممكن ياخد نص دقيقة', 'ok', 0);

    try {
      let token = '';
      try {
        const { data } = await supabase.auth.getSession();
        token = data?.session?.access_token || '';
      } catch (e) {}

      if (!token) throw new Error('سجّل دخولك الأول');

      const res = await fetch(`${API_URL}/api/generate-quiz`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + token,
        },
        body: JSON.stringify({
          lessonTitle: lesson.title_ar,
          lessonDescription: lesson.description_ar,
          lessonDuration: lesson.duration_min,
          questionsCount: 15,
          timeLimitMin: 10,
          maxAttempts: 1,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل التوليد');
      if (!data.questions || !Array.isArray(data.questions)) throw new Error('الرد مش فيه questions');

      const { error } = await supabase.from('lesson_quizzes').upsert(
        {
          lesson_id: lesson.id,
          title_ar: data.title_ar || `امتحان: ${lesson.title_ar}`,
          questions: data.questions,
          time_limit_min: data.time_limit_min || 10,
          max_attempts: data.max_attempts || 1,
          questions_count: data.questions_count || 15,
        },
        { onConflict: 'lesson_id' }
      );
      if (error) throw error;

      show('✅ تم إنشاء الامتحان', 'ok');
      if (onGenerated) onGenerated();
    } catch (err) {
      console.error('❌', err);
      show('❌ ' + (err.message || 'فشل التوليد'), 'error', 6000);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        className="icon-btn ai"
        onClick={handleGenerate}
        disabled={loading}
        title="توليد امتحان بالذكاء الاصطناعي"
      >
        {loading ? '⏳' : '🎓 AI'}
      </button>
      {toast.text && (
        <div className={`global-toast show ${toast.type === 'ok' ? 'ok' : ''}`}>{toast.text}</div>
      )}
    </>
  );
}

export default GenerateQuizButton;