/* ============================================================
   ✨ WelcomeModal — اختيار النوع
   ============================================================ */
import { useUI } from '../context/UIContext';

function WelcomeModal() {
  const { showWelcome, pickGender } = useUI();

  if (!showWelcome) return null;

  return (
    <div className="overlay open">
      <div className="modal welcome-modal" role="dialog" aria-modal="true" aria-label="أهلاً بيك">
        <div className="welcome-logo">✨</div>
        <h2>أهلاً بيك في بسّطنا الإنجليزي</h2>
        <p className="sub">من فضلك حدد نوعك 👇</p>

        <button type="button" className="welcome-choice" onClick={() => pickGender('female')}>
          <span className="welcome-icon pink">👸</span>
          <span className="welcome-info">
            <span className="welcome-title">عزيزة</span>
            <span className="welcome-desc">طالبة / ميس / زائرة</span>
          </span>
        </button>

        <button type="button" className="welcome-choice" onClick={() => pickGender('male')}>
          <span className="welcome-icon blue">🤵</span>
          <span className="welcome-info">
            <span className="welcome-title">عزيز</span>
            <span className="welcome-desc">طالب / مستر / زائر</span>
          </span>
        </button>
      </div>
    </div>
  );
}

export default WelcomeModal;