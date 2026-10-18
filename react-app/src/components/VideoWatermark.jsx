/* ============================================================
   💧 VideoWatermark — علامة مائية على الفيديو
   ------------------------------------------------------------
   - بيعرض اسم الطالب + رقمه + التاريخ
   - بيتحرك كل 10 ثواني (صعب يتشال)
   ============================================================ */
import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';

function VideoWatermark({ active }) {
  const { profile } = useAuth();
  const [position, setPosition] = useState({ top: 20, left: 20 });

  /* حرّك العلامة كل 10 ثواني */
  useEffect(() => {
    if (!active) return;
    const interval = setInterval(() => {
      setPosition({
        top: Math.random() * 70 + 10,
        left: Math.random() * 70 + 10,
      });
    }, 10000);
    return () => clearInterval(interval);
  }, [active]);

  if (!active || !profile) return null;

  const text = `${profile.full_name || 'طالب'} • ${profile.phone || ''} • ${new Date().toLocaleDateString('ar-EG')}`;

  return (
    <div
      style={{
        position: 'absolute',
        top: `${position.top}%`,
        left: `${position.left}%`,
        color: 'rgba(255, 255, 255, 0.18)',
        fontSize: 14,
        fontWeight: 800,
        pointerEvents: 'none',
        zIndex: 10,
        textShadow: '1px 1px 2px rgba(0,0,0,0.4)',
        userSelect: 'none',
        transform: 'rotate(-25deg)',
        whiteSpace: 'nowrap',
        transition: 'top 1s ease, left 1s ease',
      }}
    >
      {text}
    </div>
  );
}

export default VideoWatermark;