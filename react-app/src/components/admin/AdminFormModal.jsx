/* ============================================================
   📝 AdminFormModal — Modal موحّد للنماذج
   - مفيش قفل بالضغط بره (عشان الداتا متضيعش بالغلط)
   - Esc / زرار إلغاء / ✕ للإغلاق
   ============================================================ */
import { useEffect } from 'react';

function AdminFormModal({
  open,
  title,
  subtitle,
  onClose,
  onSubmit,
  children,
  loading,
  submitLabel = 'حفظ',
  wide = false,
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && !loading && onClose();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose, loading]);

  if (!open) return null;

  return (
    <div className="overlay open">
      <div className={`modal${wide ? ' wide' : ''}`} role="dialog" aria-modal="true" aria-label={title}>
        <button className="close" onClick={onClose} type="button" aria-label="إغلاق">✕</button>
        <h3>{title}</h3>
        {subtitle && <p className="sub">{subtitle}</p>}
        <form onSubmit={onSubmit}>
          {children}
          <div className="modal-actions">
            <button type="button" className="btn btn-ghost" onClick={onClose} disabled={loading}>
              إلغاء
            </button>
            <button className="btn btn-gold" type="submit" disabled={loading}>
              {loading ? 'جاري الحفظ...' : submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AdminFormModal;