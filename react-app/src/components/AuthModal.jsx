/* ============================================================
   🔐 AuthModal — تسجيل الدخول
   ============================================================ */
import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';

function AuthModal() {
  const { showAuthModal, setShowAuthModal, signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!showAuthModal) return;
    const onKey = (e) => e.key === 'Escape' && setShowAuthModal(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [showAuthModal, setShowAuthModal]);

  if (!showAuthModal) return null;

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signIn(email.trim(), password);
      setShowAuthModal(false);
      setEmail('');
      setPassword('');
    } catch (err) {
      setError(err.message || 'حصلت مشكلة');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="overlay open" onClick={() => setShowAuthModal(false)}>
      <div className="modal auth-modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <button className="close" type="button" onClick={() => setShowAuthModal(false)} aria-label="إغلاق">✕</button>

        <div className="auth-logo">🔐</div>
        <form onSubmit={handleSubmit}>
          <h3>تسجيل الدخول</h3>
          <p className="sub">أهلاً بيك تاني 👋</p>

          <div className="field">
            <label htmlFor="auth-user">البريد / اسم المستخدم</label>
            <input
              id="auth-user"
              type="text"
              dir="ltr"
              autoFocus
              autoComplete="username"
              autoCapitalize="none"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="field">
            <label htmlFor="auth-pw">كلمة المرور</label>
            <div className="pw-wrap">
              <input
                id="auth-pw"
                type={showPw ? 'text' : 'password'}
                dir="ltr"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button type="button" className="pw-toggle" onClick={() => setShowPw((v) => !v)} aria-label={showPw ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}>
                {showPw ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          {error && <div className="form-msg error">{error}</div>}

          <button className="btn btn-gold btn-block" type="submit" disabled={loading} style={{ marginTop: 6 }}>
            {loading ? 'جاري الدخول...' : 'دخول'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default AuthModal;