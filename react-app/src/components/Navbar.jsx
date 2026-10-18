/* ============================================================
   🧭 Navbar — شريط التنقل
   ============================================================ */
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useUI } from '../context/UIContext';

function Navbar() {
  const { user, profile, setShowAuthModal, signOut } = useAuth();
  const { lang, toggleLanguage, theme, toggleTheme } = useUI();
  const [logoOk, setLogoOk] = useState(true);

  return (
    <header className="topbar">
      <div className="row">
        <div className="brand">
          {logoOk ? (
            <img
              className="brand-logo"
              src="/logo.png"
              alt=""
              onError={() => setLogoOk(false)}
            />
          ) : (
            <span className="mark">EN</span>
          )}
          <span className="brand-name">بسّطنا الإنجليزي</span>
        </div>

        <div className="topbar-actions">
          <button type="button" className="lang-switch" onClick={toggleTheme} title="تغيير المظهر" aria-label="تغيير المظهر">
            {theme === 'light' ? '🌙' : '☀️'}
          </button>

          <button type="button" className="lang-switch" onClick={toggleLanguage}>
            {lang === 'ar' ? 'English' : 'العربية'}
          </button>

          {user ? (
            <>
              <span className="nav-user">👋 {profile?.full_name || 'مرحباً'}</span>
              <button type="button" className="btn btn-gold btn-sm" onClick={signOut}>
                تسجيل الخروج
              </button>
            </>
          ) : (
            <button type="button" className="btn btn-gold btn-sm" onClick={() => setShowAuthModal(true)}>
              تسجيل الدخول
            </button>
          )}
        </div>
      </div>
    </header>
  );
}

export default Navbar;