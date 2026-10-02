/* ============================================================
   📹 LessonForm — إضافة/تعديل فيديو
   ============================================================ */
import { useState } from 'react';
import { supabase } from '../../services/supabase';

const BUCKET = 'course-files';

function LessonForm({ courseId, lesson, onClose }) {
  const editing = !!lesson;

  const [title, setTitle] = useState(lesson?.title_ar || '');
  const [description, setDescription] = useState(lesson?.description_ar || '');
  const [videoType, setVideoType] = useState(lesson?.video_type || 'youtube');
  const [videoUrl, setVideoUrl] = useState(lesson?.video_url || '');
  const [duration, setDuration] = useState(lesson?.duration_min || 0);
  const [sortOrder, setSortOrder] = useState(lesson?.sort_order || 0);

  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState('');
  const [preview, setPreview] = useState(null);

  /* ============================================================
     اختيار ملف
     ============================================================ */
  function handleFileChange(e) {
    const f = e.target.files[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }

  /* ============================================================
     حفظ
     ============================================================ */
  async function handleSubmit(e) {
    e.preventDefault();
    setMsg('');

    if (!title.trim()) {
      setMsg('❌ اكتب عنوان الفيديو');
      return;
    }

    let finalUrl = videoUrl.trim();

    /* لو ملف مرفوع */
    if (videoType === 'file') {
      if (!file && !editing) {
        setMsg('❌ اختار ملف فيديو');
        return;
      }

      if (file) {
        setUploading(true);
        const path = `lessons/${Date.now()}_${file.name}`;
        const { error: upErr } = await supabase.storage
          .from(BUCKET)
          .upload(path, file, { contentType: file.type, upsert: false });

        if (upErr) {
          setMsg('❌ فشل الرفع: ' + upErr.message);
          setUploading(false);
          return;
        }

        const { data: urlData } = supabase.storage
          .from(BUCKET)
          .getPublicUrl(path);
        finalUrl = urlData.publicUrl;
        setUploading(false);
      }
    } else {
      if (!finalUrl) {
        setMsg('❌ الصق رابط الفيديو');
        return;
      }
    }

    const payload = {
      course_id: courseId,
      title_ar: title.trim(),
      description_ar: description.trim(),
      video_type: videoType,
      video_url: finalUrl,
      duration_min: Number(duration) || 0,
      sort_order: Number(sortOrder) || 0,
    };

    let error;
    if (editing) {
      ({ error } = await supabase.from('lessons').update(payload).eq('id', lesson.id));
    } else {
      ({ error } = await supabase.from('lessons').insert(payload));
    }

    if (error) {
      setMsg('❌ ' + error.message);
      return;
    }

    onClose();
  }

  return (
    <div className="overlay open" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <button className="close" onClick={onClose}>✕</button>

        <h3>{editing ? 'تعديل الفيديو' : 'إضافة فيديو جديد'}</h3>

        <form onSubmit={handleSubmit}>
          {/* العنوان */}
          <div className="field">
            <label>عنوان الفيديو</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="مثال: الشرح - الدرس الأول"
              required
            />
          </div>

          {/* الوصف */}
          <div className="field">
            <label>وصف مختصر (اختياري)</label>
            <textarea
              rows="2"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* نوع الفيديو */}
          <div className="field">
            <label>نوع الفيديو</label>
            <select value={videoType} onChange={(e) => setVideoType(e.target.value)}>
              <option value="youtube">▶️ يوتيوب</option>
              <option value="vimeo">🎥 فيميو</option>
              <option value="drive">📁 جوجل درايف</option>
              <option value="file">📱 رفع ملف من الجهاز</option>
            </select>
          </div>

          {/* رابط الفيديو */}
          {videoType !== 'file' && (
            <div className="field">
              <label>رابط الفيديو</label>
              <input
                type="url"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder={
                  videoType === 'youtube' ? 'https://youtu.be/...' :
                  videoType === 'vimeo' ? 'https://vimeo.com/...' :
                  'https://drive.google.com/file/d/.../view'
                }
              />
            </div>
          )}

          {/* رفع ملف */}
          {videoType === 'file' && (
            <div className="field">
              <label>اختر ملف الفيديو</label>
              <input
                type="file"
                accept="video/*"
                onChange={handleFileChange}
              />
              {preview && (
                <video
                  src={preview}
                  controls
                  style={{ marginTop: 10, maxWidth: '100%', maxHeight: 180, borderRadius: 8 }}
                />
              )}
              {file && (
                <small style={{ display: 'block', marginTop: 6, color: 'var(--ink-soft)' }}>
                  📹 {file.name} ({(file.size / 1024 / 1024).toFixed(1)} MB)
                </small>
              )}
            </div>
          )}

          {/* المدة والترتيب */}
          <div style={{ display: 'flex', gap: 10 }}>
            <div className="field" style={{ flex: 1 }}>
              <label>المدة (دقيقة)</label>
              <input
                type="number"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                min="0"
              />
            </div>
            <div className="field" style={{ flex: 1 }}>
              <label>الترتيب</label>
              <input
                type="number"
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
              />
            </div>
          </div>

          {msg && <div className="form-msg error">{msg}</div>}

          <button
            className="btn btn-gold btn-block"
            type="submit"
            disabled={uploading}
            style={{ marginTop: 10 }}
          >
            {uploading ? '⏳ جاري الرفع...' : '💾 حفظ'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default LessonForm;