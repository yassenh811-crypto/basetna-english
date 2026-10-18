/* ============================================================
   🎭 RoleSwitchModal — شاشة اختيار صفة الرد (لحساب واحد بس)
   ============================================================ */
import { useEffect } from 'react';
import { ACTING_OPTIONS, useActingAs } from '../context/ActingAsContext';

function RoleSwitchModal() {
  const { isOwnerAccount, showPicker, actingAs, setActingAs, closePicker } = useActingAs();

  useEffect(() => {
    if (!showPicker) return;
    const onKey = (e) => e.key === 'Escape' && closePicker();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [showPicker, closePicker]);

  if (!isOwnerAccount || !showPicker) return null;

  return (
    <div className="overlay open" onClick={closePicker}>
      <div className="modal role-picker-modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <button className="close" type="button" onClick={closePicker} aria-label="إغلاق">✕</button>
        <h3>🎭 هترد بصفة إيه؟</h3>
        <p className="sub">اختار الصفة اللي هتظهر بيها رسايلك في الشات. تقدر تغيّرها في أي وقت.</p>

        {Object.values(ACTING_OPTIONS).map((opt) => (
          <button
            key={opt.role}
            type="button"
            className={`role-choice${actingAs === opt.role ? ' current' : ''}`}
            onClick={() => setActingAs(opt.role)}
          >
            <span
              className="role-choice-icon"
              style={{ background: opt.role === 'support' ? 'linear-gradient(135deg,var(--purple),var(--purple-dark))' : 'linear-gradient(135deg,#B8860B,#8B6914)' }}
            >
              {opt.icon}
            </span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span className="role-choice-title">{opt.label}</span>
              <span className="role-choice-desc">{opt.desc}</span>
            </span>
            {actingAs === opt.role && <span className="role-current-tag">الحالية</span>}
          </button>
        ))}
      </div>
    </div>
  );
}

export default RoleSwitchModal;