/* ============================================================
   🛡️ ProtectedVideoPlayer — مشغل فيديو محمي
   ------------------------------------------------------------
   - علامة مائية ديناميكية (اسم الطالب + ID + الوقت)
   - علامة مائية ثابتة (Grid) صعب تشيلها
   - كشف التلاعب بالعلامة المائية
   - إيقاف الفيديو عند فقدان التركيز
   - منع PrintScreen و F12 و Ctrl+S/U/P/C
   - منع Right Click
   - إخفاء عند الطباعة
   ============================================================ */
import { useEffect, useRef, useState, useCallback } from "react";

const css = `
.pvp-root { position: relative; width: 100%; max-width: 960px; aspect-ratio: 16 / 9;
  background: #000; overflow: hidden; border-radius: 10px;
  user-select: none; -webkit-user-select: none; -webkit-touch-callout: none; }
.pvp-video { width: 100%; height: 100%; display: block; transition: filter .2s; }
.pvp-video.pvp-blur { filter: blur(30px) brightness(.4); }
.pvp-wm-moving { position: absolute; z-index: 5; pointer-events: none; white-space: nowrap;
  color: rgba(255,255,255,.35); font: 600 14px/1.3 system-ui, sans-serif;
  text-shadow: 0 0 3px rgba(0,0,0,.6); transition: top 1.2s ease, left 1.2s ease; direction: ltr; }
.pvp-wm-tiles { position: absolute; inset: 0; z-index: 4; pointer-events: none; overflow: hidden; }
.pvp-wm-tile { position: absolute; transform: rotate(-25deg); white-space: nowrap;
  color: rgba(255,255,255,.08); font: 600 18px system-ui, sans-serif; direction: ltr; }
.pvp-msg { position: absolute; inset: 0; z-index: 10; display: flex; align-items: center;
  justify-content: center; text-align: center; padding: 24px; color: #fff;
  background: rgba(0,0,0,.75); font: 500 16px/1.7 system-ui, sans-serif; }
@media print { .pvp-root { display: none !important; } }
`;

function randomPos() {
  return { top: 8 + Math.random() * 78, left: 4 + Math.random() * 60 };
}

export default function ProtectedVideoPlayer({
  src,
  poster,
  user,
  pauseOnBlur = true,
  moveEveryMs = 4000,
}) {
  const rootRef = useRef(null);
  const videoRef = useRef(null);
  const wmRef = useRef(null);

  const [pos, setPos] = useState(randomPos);
  const [now, setNow] = useState(() => new Date());
  const [blocked, setBlocked] = useState(null);

  const label = `${user.name} • ID ${user.id}`;
  const stamp = now.toLocaleString("en-GB");

  const lock = useCallback((reason) => {
    videoRef.current?.pause();
    setBlocked(reason);
  }, []);

  useEffect(() => {
    const t = setInterval(() => {
      setPos(randomPos());
      setNow(new Date());
    }, moveEveryMs);
    return () => clearInterval(t);
  }, [moveEveryMs]);

  useEffect(() => {
    const check = setInterval(() => {
      const root = rootRef.current;
      const wm = wmRef.current;
      if (!root || !wm) return;
      const gone = !root.contains(wm);
      let hidden = false;
      if (!gone) {
        const s = getComputedStyle(wm);
        hidden =
          s.display === "none" ||
          s.visibility === "hidden" ||
          parseFloat(s.opacity) < 0.5 ||
          wm.offsetWidth === 0;
      }
      if (gone || hidden) lock("tamper");
    }, 1000);
    return () => clearInterval(check);
  }, [lock]);

  useEffect(() => {
    if (!pauseOnBlur) return;
    const onHide = () => lock("blur");
    const onVis = () => document.hidden && lock("blur");
    window.addEventListener("blur", onHide);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.removeEventListener("blur", onHide);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [pauseOnBlur, lock]);

  useEffect(() => {
    const onContext = (e) => e.preventDefault();

    const onKey = (e) => {
      const k = e.key.toLowerCase();
      const ctrl = e.ctrlKey || e.metaKey;

      if (k === "printscreen") {
        navigator.clipboard?.writeText("").catch(() => {});
        lock("blur");
        e.preventDefault();
        return;
      }

      if (
        (ctrl && ["s", "p", "u", "c"].includes(k)) ||
        k === "f12" ||
        (ctrl && e.shiftKey && ["i", "j", "c", "s"].includes(k)) ||
        (e.metaKey && e.shiftKey && ["3", "4", "5"].includes(k))
      ) {
        e.preventDefault();
        if (e.shiftKey) lock("blur");
      }
    };

    document.addEventListener("contextmenu", onContext);
    document.addEventListener("keydown", onKey);
    document.addEventListener("keyup", onKey);
    return () => {
      document.removeEventListener("contextmenu", onContext);
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("keyup", onKey);
    };
  }, [lock]);

  const resume = () => {
    if (blocked === "tamper") return;
    setBlocked(null);
    videoRef.current?.play().catch(() => {});
  };

  const tiles = [];
  for (let r = 0; r < 5; r++)
    for (let c = 0; c < 3; c++)
      tiles.push(
        <span
          key={`${r}-${c}`}
          className="pvp-wm-tile"
          style={{ top: `${r * 22}%`, left: `${c * 36 + (r % 2) * 10}%` }}
        >
          {user.email || user.name}
        </span>
      );

  return (
    <>
      <style>{css}</style>
      <div ref={rootRef} className="pvp-root" onContextMenu={(e) => e.preventDefault()}>
        <video
          ref={videoRef}
          className={`pvp-video ${blocked ? "pvp-blur" : ""}`}
          src={src}
          poster={poster}
          controls
          playsInline
          controlsList="nodownload noremoteplayback"
          disablePictureInPicture
          disableRemotePlayback
          draggable={false}
          onContextMenu={(e) => e.preventDefault()}
        />

        <div className="pvp-wm-tiles" aria-hidden="true">{tiles}</div>

        <div
          ref={wmRef}
          className="pvp-wm-moving"
          style={{ top: `${pos.top}%`, left: `${pos.left}%` }}
          aria-hidden="true"
        >
          {label}
          <br />
          {stamp}
        </div>

        {blocked && (
          <div className="pvp-msg">
            <div>
              {blocked === "tamper" ? (
                <>تم إيقاف الفيديو لأن العلامة المائية اتعدّلت أو اتشالت.<br />حدّث الصفحة للمتابعة.</>
              ) : (
                <>
                  تم إيقاف الفيديو مؤقتًا لأن الصفحة فقدت التركيز.<br />
                  <button
                    onClick={resume}
                    style={{ marginTop: 12, padding: "8px 18px", borderRadius: 6, border: 0, cursor: "pointer", font: "inherit" }}
                  >
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