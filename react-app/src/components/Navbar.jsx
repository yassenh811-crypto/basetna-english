import { useAuth } from '../context/AuthContext';
import { useUI } from '../context/UIContext';

function Navbar() {
  const { user, profile, setShowAuthModal, signOut } = useAuth();
  const { lang, toggleLanguage } = useUI();

  return (
    <div className="topbar">
      <div className="row">
        <div className="brand">
          <span className="mark">EN</span> بسّطنا الإنجليزي
        </div>
        <div className="topbar-actions">
          <button className="lang-switch" onClick={toggleLanguage}>
            {lang === 'ar' ? 'English' : 'العربية'}
          </button>
          {user ? (
            <>
              <span style={{ color: '#fff', fontWeight: 700 }}>
                👋 {profile?.full_name || 'مرحباً'}
              </span>
              <button className="btn btn-gold btn-sm" onClick={signOut}>
                تسجيل الخروج
              </button>
            </>
          ) : (
            <button
              className="btn btn-gold btn-sm"
              onClick={() => setShowAuthModal(true)}
            >
              تسجيل الدخول
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default Navbar;