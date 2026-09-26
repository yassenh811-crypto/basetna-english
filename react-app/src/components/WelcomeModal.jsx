import { useUI } from '../context/UIContext';

function WelcomeModal() {
  const { showWelcome, pickGender } = useUI();

  if (!showWelcome) return null;

  return (
    <div className="overlay open">
      <div className="modal welcome-modal">
        <div className="welcome-logo">✨</div>
        <h2>أهلاً بيك في بسّطنا الإنجليزي</h2>
        <p className="sub">من فضلك حدد نوعك 👇</p>

        <div className="welcome-choice" onClick={() => pickGender('female')}>
          <div className="welcome-icon" style={{ background: 'linear-gradient(135deg,#E91E63,#AD1457)' }}>👸</div>
          <div className="welcome-info">
            <div className="welcome-title">عزيزة</div>
            <div className="welcome-desc">طالبة / ميس / زائرة</div>
          </div>
        </div>

        <div className="welcome-choice" onClick={() => pickGender('male')}>
          <div className="welcome-icon" style={{ background: 'linear-gradient(135deg,#1976D2,#0D47A1)' }}>🤵</div>
          <div className="welcome-info">
            <div className="welcome-title">عزيز</div>
            <div className="welcome-desc">طالب / مستر / زائر</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default WelcomeModal;