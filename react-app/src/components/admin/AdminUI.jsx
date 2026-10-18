/* ============================================================
   🧩 AdminUI — مكونات مشتركة للوحة الأدمن
   ============================================================ */

/* الهيدر: عنوان + عدّاد + بحث + زرار إضافة */
export function AdminToolbar({
  title,
  count,
  search,
  onSearch,
  placeholder = 'ابحث...',
  addLabel,
  onAdd,
  children,
}) {
  return (
    <div className="dash-head toolbar">
      <div className="toolbar-title">
        <h1>{title}</h1>
        {typeof count === 'number' && <span className="count-chip">{count}</span>}
      </div>
      <div className="toolbar-actions">
        {onSearch && (
          <label className="search-pill">
            <input
              type="search"
              value={search}
              onChange={(e) => onSearch(e.target.value)}
              placeholder={placeholder}
              aria-label={placeholder}
            />
          </label>
        )}
        {children}
        {onAdd && (
          <button type="button" className="btn btn-gold btn-sm" onClick={onAdd}>
            ＋ {addLabel}
          </button>
        )}
      </div>
    </div>
  );
}

/* صف التحميل / الفاضي جوه الجدول */
export function StateRow({ colSpan, loading, empty, text }) {
  if (loading) {
    return (
      <tr>
        <td colSpan={colSpan} className="state-cell">
          <div className="skeleton-list"><span /><span /><span /></div>
        </td>
      </tr>
    );
  }
  if (empty) {
    return (
      <tr>
        <td colSpan={colSpan} className="state-cell">
          <div className="empty-state">{text}</div>
        </td>
      </tr>
    );
  }
  return null;
}

/* أزرار الإجراءات (بتتحول لأزرار عريضة على الموبايل) */
export function RowActions({ children }) {
  return <div className="row-actions">{children}</div>;
}