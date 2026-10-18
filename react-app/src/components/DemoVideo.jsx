/* ============================================================
   🎬 DemoVideo — فيديو تجريبي في أول الموقع
   - كارت بصورة وزرار تشغيل، ولما حد يدوس عليه الفيديو بيفتح
   - لو الفيديو درايف: زرار "فتح في درايف" وزرار تكبير درايف متغطيين،
     وفيه زرار تكبير بتاعنا (التكبير بيتم جوه الموقع)
   ============================================================ */
import { useEffect, useRef, useState } from 'react';
import { getCourseCover } from '../utils/courseCover';
import { getEmbed } from '../utils/video';

const TEXT = {
  ar: {
    title: 'جرّب قبل ما تشترك',
    sub: 'شوف فيديو تجريبي من شرح مس. شيرهان',
    play: 'شغّل الفيديو التجريبي',
    free: 'مجاناً',
    close: 'إغلاق',
    bad: 'رابط الفيديو غلط',
    enlarge: '⛶ تكبير',
    shrink: '🗗 تصغير',
  },
  en: {
    title: 'Try it before you subscribe',
    sub: 'Watch a free sample lesson',
    play: 'Play the demo video',
    free: 'Free',
    close: 'Close',
    bad: 'The video link is invalid',
    enlarge: '⛶ Enlarge',
    shrink: '🗗 Shrink',
  },
};

function DemoVideo({ demo, lang = 'ar' }) {
  const L = TEXT[lang === 'en' ? 'en' : 'ar'];
  const [open, setOpen] = useState(false);
  const [broken, setBroken] = useState(false);
  const [theater, setTheater] = useState(false);
  const [isFs, setIsFs] = useState(false);
  const frameRef = useRef(null);

  /* Esc: يصغّر لو مكبّر، وإلا يقفل */
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      if (theater) setTheater(false);
      else setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, theater]);

  useEffect(() => {
    const onFs = () => setIsFs(!!(document.fullscreenElement || document.webkitFullscreenElement));
    document.addEventListener('fullscreenchange', onFs);
    document.addEventListener('webkitfullscreenchange', onFs);
    return () => {
      document.removeEventListener('fullscreenchange', onFs);
      document.removeEventListener('webkitfullscreenchange', onFs);
    };
  }, []);

  /* قفل النافذة يرجّع كل حاجة لحالتها */
  useEffect(() => {
    if (!open) setTheater(false);
  }, [open]);

  if (!demo?.url) return null;

  const embed = getEmbed(demo.type, demo.url);
  const protectedDrive = demo.type === 'drive' && !!embed;
  const cover = getCourseCover({ thumbnail_url: demo.cover, content_type: demo.type, content_url: demo.url }, 'w1280');
  const showImg = cover && !broken;
  const noMenu = (e) => e.preventDefault();

  function toggleEnlarge() {
    const el = frameRef.current;
    if (!el) return;
    const cur = document.fullscreenElement || document.webkitFullscreenElement;
    if (cur) {
      (document.exitFullscreen || document.webkitExitFullscreen)?.call(document);
      return;
    }
    if (theater) { setTheater(false); return; }
    const req = el.requestFullscreen || el.webkitRequestFullscreen;
    if (!req) { setTheater(true); return; } /* iPhone */
    try {
      const r = req.call(el);
      if (r && r.catch) r.catch(() => setTheater(true));
    } catch {
      setTheater(true);
    }
  }

  return (
    <section className="block demo-section" id="demo">
      <div className="container">
        <div className="section-head">
          <h2>{L.title}</h2>
          <p>{L.sub}</p>
        </div>

        <button type="button" className="demo-card" onClick={() => setOpen(true)} aria-label={L.play}>
          {showImg ? (
            <img src={cover} alt="" loading="lazy" onError={() => setBroken(true)} />
          ) : (
            <span className="demo-fallback">🎬</span>
          )}
          <span className="demo-play">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg>
          </span>
          <span className="demo-badge">{L.free}</span>
          {demo.title && <span className="demo-title">{demo.title}</span>}
        </button>
      </div>

      {open && (
        <div className={`overlay open demo-overlay${theater ? ' has-theater' : ''}`} onClick={() => setOpen(false)}>
          <div className="demo-modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="demo-close" onClick={() => setOpen(false)} aria-label={L.close}>✕</button>

            <div ref={frameRef} className={`demo-frame${theater ? ' theater' : ''}`}>
              {!embed ? (
                <div className="video-error"><span>⚠️</span><p>{L.bad}</p></div>
              ) : embed.kind === 'video' ? (
                <video src={embed.src} controls autoPlay playsInline controlsList="nodownload" onContextMenu={noMenu} />
              ) : (
                <iframe
                  title={demo.title || L.title}
                  src={embed.src}
                  allow={protectedDrive ? 'autoplay' : 'autoplay; encrypted-media; fullscreen; picture-in-picture'}
                  allowFullScreen={!protectedDrive}
                  sandbox={protectedDrive ? 'allow-scripts allow-same-origin' : undefined}
                />
              )}

              {protectedDrive && (
                <>
                  {/* دروع بتغطي زرار "فتح في درايف" وزرار تكبير درايف */}
                  <div className="drive-shield shield-top" aria-hidden="true" onContextMenu={noMenu} />
                  <div className="drive-shield shield-bottom" aria-hidden="true" onContextMenu={noMenu} />
                  <button type="button" className="enlarge-btn" onClick={toggleEnlarge}>
                    {isFs || theater ? L.shrink : L.enlarge}
                  </button>
                </>
              )}
            </div>

            {demo.title && <div className="demo-caption">{demo.title}</div>}
          </div>
        </div>
      )}
    </section>
  );
}

export default DemoVideo;