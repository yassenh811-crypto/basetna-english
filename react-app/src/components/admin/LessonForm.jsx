/* ============================================================
   📹 LessonForm — إضافة/تعديل فيديو (مع Progress Bar)
   ============================================================ */
import { useState } from 'react';
import { supabase } from '../../services/supabase';

const BUCKET = 'course-files';
const MAX_FILE_SIZE = 50 * 1024 * 1024;

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
  const [progress, setProgress] = useState(0);
  const [msg, setMsg] = useState({ text: '', type: '' });
  const [preview, setPreview] = useState(null);

  function handleFileChange(e) {
    const f = e.target.files[0];
    if (!f) return;

    if (f.size > MAX_FILE_SIZE) {
      setMsg({
        text: `❌ الملف كبير جداً (${(f.size / 1024 / 1024).toFixed(1)} MB). الحد الأقصى 50 MB. استخدم YouTube أو Drive.`,
        type: 'error',
      });
      return;
    }

    setFile(f);
    setPreview(URL.createObjectURL(f));
    setMsg({ text: '', type: '' });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setMsg({ text: '', type: '' });

    if (!title.trim()) {
      setMsg({ text: '❌ اكتب عنوان الفيديو', type: 'error' });
      return;
    }

    let finalUrl = videoUrl.trim();

    if (videoType === 'file') {
      if (!file && !editing) {
        setMsg({ text: '❌ اختار ملف فيديو', type: 'error' });
        return;
      }

      if (file) {
        setUploading(true);
        setProgress(0);

        const path = `lessons/${Date.now()}_${file.name}`;

        try {
          const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
          const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

          const { data: sessionData } = await supabase.auth.getSession();
          const token = sessionData?.session?.access_token;

          const uploadUrl = `${supabaseUrl}/storage/v1/object/${BUCKET}/${path}`;

          const publicUrl = await new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open('POST', uploadUrl);
            xhr.setRequestHeader('Authorization', `Bearer ${token}`);
            xhr.setRequestHeader('apikey', supabaseKey);
            xhr.setRequestHeader('x-upsert', 'false');

            xhr.upload.onprogress = (ev) => {
              if (ev.lengthComputable) {
                setProgress(Math.round((ev.loaded / ev.total) * 100));
              }
            };

            xhr.onload = () => {
              if (xhr.status >= 200 && xhr.status < 300) {
                const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path);
                resolve(urlData.publicUrl);
              } else {
                reject(new Error(`Upload failed: ${xhr.status}`));
              }
            };

            xhr.onerror = () => reject(new Error('Network error'));
            xhr.send(file);
          });

          finalUrl = publicUrl;
          setProgress(100);
        } catch (err) {
          setMsg({ text: '❌ فشل الرفع: ' + err.message, type: 'error' });
          setUploading(false);
          setProgress(0);
          return;
        }

        setUploading(false);
      }
    } else {
      if (!finalUrl) {
        setMsg({ text: '❌ الصق رابط الفيديو', type: 'error' });
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
      setMsg({ text: '❌ ' + error.message, type: 'error' });
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

          <div className="field">
            <label>وصف مختصر (اختياري)</label>
            <textarea
              rows="2"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="field">
            <label>نوع الفيديو</label>
            <select value={videoType} onChange={(e) => setVideoType(e.target.value)}>
              <option value="youtube">▶️ يوتيوب (الأسرع والأفضل)</option>
              <option value="vimeo">🎥 فيميو</option>
              <option value="drive">📁 جوجل درايف</option>
              <option value="file">📱 رفع ملف (50 MB كحد أقصى)</option>
            </select>
          </div>

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

          {videoType === 'file' && (
            <div className="field">
              <label>اختر ملف الفيديو</label>
              <input type="file" accept="video/*" onChange={handleFileChange} />
              <small style={{ display: 'block', marginTop: 6, color: 'var(--danger)' }}>
                ⚠️ الحد الأقصى: 50 MB. للفيديوهات الأكبر، استخدم YouTube أو Drive.
              </small>
              {preview && (
                <video src={preview} controls style={{ marginTop: 10, maxWidth: '100%', maxHeight: 180, borderRadius: 8 }} />
              )}
              {file && (
                <small style={{ display: 'block', marginTop: 6, color: 'var(--ink-soft)' }}>
                  📹 {file.name} ({(file.size / 1024 / 1024).toFixed(1)} MB)
                </small>
              )}
            </div>
          )}

          {uploading && (
            <div style={{ marginTop: 12 }}>
              <div style={{ width: '100%', height: 12, background: 'var(--paper-2)', borderRadius: 999, overflow: 'hidden' }}>
                <div style={{ width: `${progress}%`, height: '100%', background: 'linear-gradient(90deg, var(--gold), var(--teal))', transition: 'width 0.3s ease' }} />
              </div>
              <p style={{ textAlign: 'center', marginTop: 8, fontSize: 13, fontWeight: 700 }}>
                {progress}% — جاري الرفع...
              </p>
            </div>
          )}

          <div style={{ display: 'flex', gap: 10 }}>
            <div className="field" style={{ flex: 1 }}>
              <label>المدة (دقيقة)</label>
              <input type="number" value={duration} onChange={(e) => setDuration(e.target.value)} min="0" />
            </div>
            <div className="field" style={{ flex: 1 }}>
              <label>الترتيب</label>
              <input type="number" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} />
            </div>
          </div>

          {msg.text && (
            <div className={`form-msg ${msg.type}`} style={{ display: 'block' }}>
              {msg.text}
            </div>
          )}

          <button className="btn btn-gold btn-block" type="submit" disabled={uploading} style={{ marginTop: 10 }}>
            {uploading ? `⏳ جاري الرفع... (${progress}%)` : '💾 حفظ'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default LessonForm;