/* ============================================================
   📹 LessonForm — إضافة/تعديل فيديو (مع Progress Bar)
   ============================================================ */
import { useEffect, useState } from 'react';
import { supabase } from '../../services/supabase';

const BUCKET = 'course-files';
const MAX_FILE_SIZE = 50 * 1024 * 1024;

const PLACEHOLDER = {
  youtube: 'https://youtu.be/...',
  vimeo: 'https://vimeo.com/...',
  drive: 'https://drive.google.com/file/d/.../view',
  link: 'https://example.com/video.mp4',
};

const isDriveUrl = (u) =>
  /drive\.google\.com\/file\/d\/[A-Za-z0-9_-]+/.test(u) ||
  /drive\.google\.com\/(?:open|uc)\?(?:[^#]*&)?id=[A-Za-z0-9_-]+/.test(u);

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

  useEffect(() => () => preview && URL.revokeObjectURL(preview), [preview]);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && !uploading && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [uploading, onClose]);

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

        const safeName = file.name.replace(/[^\w.-]+/g, '_');
        const path = `lessons/${Date.now()}_${safeName}`;

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
              if (ev.lengthComputable) setProgress(Math.round((ev.loaded / ev.total) * 100));
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
      if (videoType === 'drive' && !isDriveUrl(finalUrl)) {
        setMsg({ text: '❌ ده مش رابط درايف صحيح. انسخ رابط المشاركة (Share → Copy link)', type: 'error' });
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
    <div className="overlay open">
      <div className="modal" role="dialog" aria-modal="true">
        <button className="close" onClick={onClose} type="button" disabled={uploading} aria-label="إغلاق">✕</button>

        <h3>{editing ? 'تعديل الفيديو' : 'إضافة فيديو جديد'}</h3>

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label>عنوان الفيديو</label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="مثال: الشرح - الدرس الأول" required />
          </div>

          <div className="field">
            <label>وصف مختصر (اختياري)</label>
            <textarea rows="2" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>

          <div className="field">
            <label>نوع الفيديو</label>
            <select value={videoType} onChange={(e) => setVideoType(e.target.value)}>
              <option value="youtube">▶️ يوتيوب (الأسرع والأفضل)</option>
              <option value="vimeo">🎥 فيميو</option>
              <option value="drive">📁 جوجل درايف</option>
              <option value="link">🔗 رابط مباشر (MP4)</option>
              <option value="file">📱 رفع ملف (50 MB كحد أقصى)</option>
            </select>
          </div>

          {videoType !== 'file' && (
            <div className="field">
              <label>رابط الفيديو</label>
              <input type="url" dir="ltr" value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder={PLACEHOLDER[videoType]} />
              {videoType === 'drive' && (
                <small className="hint">📁 Share ← General access ← Anyone with the link (Viewer)، وإلا الطالب مش هيشوفه.</small>
              )}
            </div>
          )}

          {videoType === 'file' && (
            <div className="field">
              <label>اختر ملف الفيديو</label>
              <input type="file" accept="video/*" onChange={handleFileChange} />
              <small className="hint warn">⚠️ الحد الأقصى 50 MB. للفيديوهات الأكبر استخدم YouTube أو Drive.</small>
              {preview && <video src={preview} controls className="form-video-preview" />}
              {file && (
                <small className="hint">📹 {file.name} ({(file.size / 1024 / 1024).toFixed(1)} MB)</small>
              )}
            </div>
          )}

          {uploading && (
            <div className="up-wrap">
              <div className="up-bar"><div className="up-fill" style={{ width: `${progress}%` }} /></div>
              <p>{progress}% — جاري الرفع...</p>
            </div>
          )}

          <div className="field-row">
            <div className="field">
              <label>المدة (دقيقة)</label>
              <input type="number" value={duration} onChange={(e) => setDuration(e.target.value)} min="0" />
            </div>
            <div className="field">
              <label>الترتيب</label>
              <input type="number" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} />
            </div>
          </div>

          {msg.text && <div className={`form-msg ${msg.type}`}>{msg.text}</div>}

          <div className="modal-actions">
            <button type="button" className="btn btn-ghost" onClick={onClose} disabled={uploading}>إلغاء</button>
            <button className="btn btn-gold" type="submit" disabled={uploading}>
              {uploading ? `⏳ ${progress}%` : '💾 حفظ'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default LessonForm;