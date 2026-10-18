/* ============================================================
   🌗 ThemeToggle — زرار الوضع الليلي / النهاري
   حطه في الهيدر أو أي مكان:  <ThemeToggle />
   ============================================================ */
import { useUI } from '../context/UIContext';

export default function ThemeToggle({ className = '' }) {
  const { theme, toggleTheme, lang } = useUI();
  const dark = theme === 'dark';
  const en = lang === 'en';

  const label = en
    ? (dark ? 'Switch to light mode' : 'Switch to dark mode')
    : (dark ? 'التبديل للوضع النهاري' : 'التبديل للوضع الليلي');

  return (
    <button
      type="button"
      role="switch"
      aria-checked={dark}
      aria-label={label}
      title={label}
      className={`theme-toggle ${dark ? 'is-dark' : ''} ${className}`}
      onClick={toggleTheme}
    >
      <span className="tt-track" aria-hidden="true">
        <span className="tt-icon tt-sun">☀️</span>
        <span className="tt-icon tt-moon">🌙</span>
        <span className="tt-thumb" />
      </span>
      <span className="tt-text">{dark ? (en ? 'Dark' : 'ليلي') : (en ? 'Light' : 'نهاري')}</span>
    </button>
  );
}