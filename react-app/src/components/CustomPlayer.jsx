/* ============================================================
   🎬 CustomPlayer — مشغل مخصص للفيديوهات
   ------------------------------------------------------------
   - بيجيب الفيديو من السيرفر الوسيط (/api/stream/:lessonId)
   - علامة مائية ديناميكية
   - كشف التلاعب بالعلامة المائية
   - منع Right Click و F12 و PrintScreen
   - إيقاف عند فقدان التركيز
   ============================================================ */
import { useEffect, useRef, useState, useCallback } from "react";

const css = `
.cp { position: relative; width: 100%; max-width: 960px; aspect-ratio: 16/9; background:#000;
  border-radius: 10px; overflow: hidden; user-select: none; -webkit-user-select: none; direction: ltr; }
.cp video { width: 100%; height: 100%; display: block; transition: filter .2s; }
.cp video.cp-blur { filter: blur(30px) brightness(.4); }
.cp-wm { position:absolute; z-index:5; pointer-events:none; white-space:nowrap; color:rgba(255,255,255,.35);
  font: 600 14px/1.3 system-ui,sans-serif; text-shadow:0 0 3px rgba(0,0,0,.6);
  transition: top 1.2s ease, left 1.2s ease; }
.cp-bar { position:absolute; left:0; right:0; bottom:0; z-index:8; padding:28px 14px 10px;
  background:linear-gradient(transparent, rgba(0,0,0,.8)); color:#fff; font:500 13px system-ui,sans-serif;
  transition: opacity .25s; }
.cp-bar.hide { opacity:0; pointer-events:none; }
.cp-row { display:flex; align-items:center; gap:10px; margin-top:8px; }
.cp-btn { background:none; border:0; color:#fff; cursor:pointer; font:inherit; padding:4px 6px; border-radius:4px; }
.cp-btn:hover, .cp-btn:focus-visible { background:rgba(255,255,255,.18); outline:none; }
.cp input[type=range] { accent-color:#fff; cursor:pointer; }
.cp-seek { width:100%; }
.cp-spacer { flex:1; }
.cp-msg { position:absolute; inset:0; z-index:10; display:flex; align-items:center; justify-content:center;
  text-align:center; padding:24px; color:#fff; background:rgba(0,0,0,.75); font:500 16px/1.7 system-ui,sans-serif; direction:rtl; }
.cp-center { position:absolute; inset:0; z-index:6; cursor:pointer; }
@media print { .cp { display:none !important; } }
`;

const fmt = (s) => {
  if (!isFinite(s)) return "0:00";
  const m = Math.floor(s / 60);
  return `${m}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
};
const rnd = () => ({ top: 8 + Math.random() * 70, left: 4 + Math.random() * 55 });

export default function CustomPlayer({ lessonId, user }) {
  const root = useRef(null);
  const vid = useRef(null);
  const wm = useRef(null);
  const hideTimer = useRef(null);

  const [playing, setPlaying] = useState(false);
  const [cur, setCur] = useState(0);
  const [dur, setDur] = useState(0);
  const [vol, setVol] = useState(1);
  const [rate, setRate] = useState(1);
  const [show, setShow] = useState(true);
  const [pos, setPos] = useState(rnd);
  const [blocked, setBlocked] = useState(null);

  const API_BASE = import.meta.env.VITE_AI_API_URL || 'https://basetna-server.vercel.app';

  const toggle = useCallback(() => {
    const v = vid.current;
    if (!v) return;
    v.paused ? v.play().catch(() => {}) : v.pause();
  }, []);
  const skip = (d) => (vid.current.currentTime = Math.max(0, Math.min(dur, vid.current.currentTime + d)));
  const fullscreen = () =>
    document.fullscreenElement ? document.exitFullscreen() : root.current.requestFullscreen?.();

  const wake = () => {
    setShow(true);
    clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => playing && setShow(false), 2500);
  };

  useEffect(() => {
    const t = setInterval(() => setPos(rnd()), 4000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const t = setInterval(() => {
      const el = wm.current;
      if (!el || !root.current) return;
      const s = getComputedStyle(el);
      if (!root.current.contains(el) || s.display === "none" || s.visibility === "hidden" || +s.opacity < 0.5) {
        vid.current?.pause();
        setBlocked("tamper");
      }
    }, 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const lock = () => { vid.current?.pause(); setBlocked((b) => b || "blur"); };
    const onKey = (e) => {
      const k = e.key.toLowerCase();
      const ctrl = e.ctrlKey || e.metaKey;
      if (k === "printscreen") { navigator.clipboard?.writeText("").catch(() => {}); lock(); }
      if ((ctrl && ["s", "p", "u"].includes(k)) || k === "f12" || (ctrl && e.shiftKey && ["i", "j", "c"].includes(k)))
        e.preventDefault();
      if (document.activeElement === document.body || root.current?.contains(document.activeElement)) {
        if (k === " ") { e.preventDefault(); if (e.type === "keydown") toggle(); }
      }
    };
    const noCtx = (e) => e.preventDefault();
    window.addEventListener("blur", lock);
    document.addEventListener("visibilitychange", () => document.hidden && lock());
    document.addEventListener("keydown", onKey);
    document.addEventListener("keyup", onKey);
    document.addEventListener("contextmenu", noCtx);
    return () => {
      window.removeEventListener("blur", lock);
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("keyup", onKey);
      document.removeEventListener("contextmenu", noCtx);
    };
  }, [toggle]);

  const resume = () => {
    if (blocked === "tamper") return;
    setBlocked(null);
    vid.current?.play().catch(() => {});
  };

  return (
    <>
      <style>{css}</style>
      <div ref={root} className="cp" onMouseMove={wake} onMouseLeave={() => playing && setShow(false)}>
        <video
          ref={vid}
          className={blocked ? "cp-blur" : ""}
          src={`${API_BASE}/api/stream/${encodeURIComponent(lessonId)}`}
          playsInline
          preload="metadata"
          controlsList="nodownload noremoteplayback"
          disablePictureInPicture
          disableRemotePlayback
          onPlay={() => setPlaying(true)}
          onPause={() => { setPlaying(false); setShow(true); }}
          onTimeUpdate={(e) => setCur(e.target.currentTime)}
          onLoadedMetadata={(e) => setDur(e.target.duration)}
        />

        <div className="cp-center" onClick={toggle} onDoubleClick={fullscreen} />

        <div ref={wm} className="cp-wm" style={{ top: `${pos.top}%`, left: `${pos.left}%` }}>
          {user.name} • ID {user.id}
          <br />
          {new Date().toLocaleString("en-GB")}
        </div>

        <div className={`cp-bar ${show ? "" : "hide"}`}>
          <input
            className="cp-seek" type="range" min={0} max={dur || 0} step="0.1" value={cur}
            onChange={(e) => (vid.current.currentTime = +e.target.value)}
            aria-label="شريط التقدم"
          />
          <div className="cp-row">
            <button className="cp-btn" onClick={toggle}>{playing ? "⏸" : "▶"}</button>
            <button className="cp-btn" onClick={() => skip(-10)}>⏪ 10</button>
            <button className="cp-btn" onClick={() => skip(10)}>10 ⏩</button>
            <span>{fmt(cur)} / {fmt(dur)}</span>
            <span className="cp-spacer" />
            <span>🔊</span>
            <input
              type="range" min="0" max="1" step="0.05" value={vol} style={{ width: 80 }}
              onChange={(e) => { setVol(+e.target.value); vid.current.volume = +e.target.value; }}
              aria-label="الصوت"
            />
            <select
              className="cp-btn" value={rate} style={{ background: "#222" }}
              onChange={(e) => { setRate(+e.target.value); vid.current.playbackRate = +e.target.value; }}
              aria-label="السرعة"
            >
              {[0.5, 0.75, 1, 1.25, 1.5, 2].map((r) => <option key={r} value={r}>{r}x</option>)}
            </select>
            <button className="cp-btn" onClick={fullscreen}>⛶</button>
          </div>
        </div>

        {blocked && (
          <div className="cp-msg">
            <div>
              {blocked === "tamper" ? (
                <>تم إيقاف الفيديو لأن العلامة المائية اتعدّلت أو اتشالت.<br />حدّث الصفحة للمتابعة.</>
              ) : (
                <>
                  تم إيقاف الفيديو مؤقتًا لأن الصفحة فقدت التركيز.<br />
                  <button className="cp-btn" style={{ marginTop: 12, background: "#fff", color: "#000", padding: "8px 18px" }} onClick={resume}>
                    كمّل المشاهدة
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}