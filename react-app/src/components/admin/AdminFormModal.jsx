/* ============================================================
   📝 AdminFormModal — Modal موحّد للنماذج
   ============================================================ */
import { useEffect } from 'react';

function AdminFormModal({ open, title, onClose, onSubmit, children, loading }) {
  /* Escape للإغلاق */
  useEffect(() => {
    function handleKey(e) {
      if (e.key === 'Escape') onClose();
    }
    if (open) document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="overlay open" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <button className="close" onClick={onClose} type="button">✕</button>
        <h3>{title}</h3>
        <form onSubmit={onSubmit}>
          {children}
          <button
            className="btn btn-gold btn-block"
            type="submit"
            disabled={loading}
            style={{ marginTop: 16 }}
          >
            {loading ? 'جاري الحفظ...' : 'حفظ'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default AdminFormModal;