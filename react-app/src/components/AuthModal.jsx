import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

function AuthModal() {
  const { showAuthModal, setShowAuthModal, signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!showAuthModal) return null;

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signIn(email, password);
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
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <button className="close" onClick={() => setShowAuthModal(false)}>✕</button>
        <form onSubmit={handleSubmit}>
          <h3>تسجيل الدخول</h3>
          <p className="sub">أهلاً بيك تاني 👋</p>

          <div className="field">
            <label>البريد / اسم المستخدم</label>
            <input
              type="text"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="field">
            <label>كلمة المرور</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error && <div className="form-msg error">{error}</div>}

          <button className="btn btn-gold btn-block" type="submit" disabled={loading}>
            {loading ? 'جاري الدخول...' : 'دخول'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default AuthModal;