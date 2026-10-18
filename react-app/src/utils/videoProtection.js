/* ============================================================
   🛡️ videoProtection — منع Right Click + Copy + Download
   ------------------------------------------------------------
   - منع كليك يمين على الموقع كله
   - منع Copy / Cut
   - منع F12 / Ctrl+U / Ctrl+S / Ctrl+Shift+I
   - منع Drag
   - منع تحديد النص
   ============================================================ */

export function enableVideoProtection(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return () => {};

  /* 1. منع Right Click */
  const onContextMenu = (e) => {
    e.preventDefault();
    return false;
  };

  /* 2. منع Copy / Cut */
  const onCopy = (e) => e.preventDefault();
  const onCut = (e) => e.preventDefault();

  /* 3. منع Ctrl+S / Ctrl+U / F12 / Ctrl+Shift+I / Ctrl+P */
  const onKeyDown = (e) => {
    if (e.ctrlKey && ['s', 'u', 'S', 'U'].includes(e.key)) {
      e.preventDefault();
      return false;
    }
    if (e.key === 'F12') {
      e.preventDefault();
      return false;
    }
    if (e.ctrlKey && e.shiftKey && ['I', 'J', 'C', 'i', 'j', 'c'].includes(e.key)) {
      e.preventDefault();
      return false;
    }
    if (e.ctrlKey && ['p', 'P'].includes(e.key)) {
      e.preventDefault();
      return false;
    }
  };

  /* 4. منع Drag */
  const onDragStart = (e) => e.preventDefault();

  /* 5. منع تحديد النص */
  const onSelectStart = (e) => e.preventDefault();

  /* ربط الأحداث بالعنصر */
  container.addEventListener('contextmenu', onContextMenu);
  container.addEventListener('copy', onCopy);
  container.addEventListener('cut', onCut);
  container.addEventListener('keydown', onKeyDown);
  container.addEventListener('dragstart', onDragStart);
  container.addEventListener('selectstart', onSelectStart);

  /* 6. منع Right Click على الموقع كله */
  document.addEventListener('contextmenu', onContextMenu);
  document.addEventListener('keydown', onKeyDown);

  /* Cleanup */
  return () => {
    container.removeEventListener('contextmenu', onContextMenu);
    container.removeEventListener('copy', onCopy);
    container.removeEventListener('cut', onCut);
    container.removeEventListener('keydown', onKeyDown);
    container.removeEventListener('dragstart', onDragStart);
    container.removeEventListener('selectstart', onSelectStart);
    document.removeEventListener('contextmenu', onContextMenu);
    document.removeEventListener('keydown', onKeyDown);
  };
}