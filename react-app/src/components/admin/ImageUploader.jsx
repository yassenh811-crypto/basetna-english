/* ============================================================
   🖼️ ImageUploader — رفع صورة (سحب وإفلات / اختيار / لينك)
   - بيصغّر الصورة تلقائي قبل الرفع (أسرع وأخف)
   - بيرفع على نفس الـ bucket بتاع الفيديوهات: course-files
   ============================================================ */
import { useRef, useState } from 'react';
import { supabase } from '../../services/supabase';

const BUCKET = 'course-files';
const MAX_MB = 10;

async function toJpeg(file, maxW = 1280, quality = 0.84) {
  if (!file.type.startsWith('image/') || file.type === 'image/gif' || file.type === 'image/svg+xml') return file;
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, maxW / bmp.width);
    const w = Math.round(bmp.width * scale);
    const h = Math.round(bmp.height * scale);
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(bmp, 0, 0, w, h);
    const blob = await new Promise((res) => canvas.toBlob(res, 'image/jpeg', quality));
    return blob && blob.size < file.size ? blob : file;
  } catch {
    return file;
  }
}

function ImageUploader({ value, onChange, folder = 'thumbnails', hint }) {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [drag, setDrag] = useState(false);
  const [showUrl, setShowUrl] = useState(false);

  async function handleFile(file) {
    if (!file) return;
    setErr('');
    if (!file.type.startsWith('image/')) {
      setErr('اختار صورة بس (JPG / PNG / WEBP)');
      return;
    }
    if (file.size > MAX_MB * 1024 * 1024) {
      setErr(`الصورة كبيرة، الحد الأقصى ${MAX_MB} MB`);
      return;
    }

    setBusy(true);
    try {
      const blob = await toJpeg(file);
      const ext = blob.type === 'image/jpeg' ? 'jpg' : (file.name.split('.').pop() || 'png').toLowerCase();
      const path = `${folder}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;

      const { error } = await supabase.storage.from(BUCKET).upload(path, blob, {
        contentType: blob.type || file.type,
        cacheControl: '31536000',
        upsert: false,
      });
      if (error) throw error;

      const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
      onChange(data.publicUrl);
    } catch (e) {
      console.error(e);
      setErr('فشل الرفع: ' + (e.message || 'جرّب تاني'));
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  function onDrop(e) {
    e.preventDefault();
    setDrag(false);
    handleFile(e.dataTransfer.files?.[0]);
  }

  return (
    <div className="img-up">
      {value ? (
        <div className="img-up-preview">
          <img src={value} alt="" />
          <div className="img-up-actions">
            <button type="button" className="icon-btn" onClick={() => inputRef.current?.click()} disabled={busy}>
              {busy ? '⏳ جاري الرفع...' : '🔄 تغيير'}
            </button>
            <button type="button" className="icon-btn danger" onClick={() => onChange('')} disabled={busy}>
              🗑️ حذف
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          className={`img-up-drop${drag ? ' drag' : ''}`}
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={onDrop}
          disabled={busy}
        >
          <span className="img-up-ico">{busy ? '⏳' : '🖼️'}</span>
          <b>{busy ? 'جاري الرفع...' : 'اضغط لاختيار صورة أو اسحبها هنا'}</b>
          <small>{hint || 'يفضّل صورة أفقية 16:9 — JPG / PNG / WEBP'}</small>
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => handleFile(e.target.files?.[0])}
      />

      <button type="button" className="img-up-link" onClick={() => setShowUrl((v) => !v)}>
        {showUrl ? 'إخفاء' : 'أو الصق رابط صورة'}
      </button>
      {showUrl && (
        <input
          type="url"
          className="img-up-url"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://..."
        />
      )}
      {err && <div className="form-msg error">{err}</div>}
    </div>
  );
}

export default ImageUploader;