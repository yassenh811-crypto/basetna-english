/* ============================================================
   🎟️ CouponBox — خانة الكوبون (اختياري)
   الاستخدام:  const coupon = useCouponPackages();  <CouponBox coupon={coupon} />
   ============================================================ */
import { useState } from 'react';

function CouponBox({ coupon }) {
  const { activeCode, loading, message, redeem, clear } = coupon;
  const [code, setCode] = useState('');

  function submit(e) {
    e.preventDefault();
    redeem(code);
  }

  return (
    <div className="coupon-box">
      {activeCode ? (
        <div className="coupon-active">
          <span>🎟️ كوبون <b dir="ltr">{activeCode}</b> مفعّل</span>
          <button type="button" onClick={() => { clear(); setCode(''); }}>إلغاء</button>
        </div>
      ) : (
        <form onSubmit={submit}>
          <label htmlFor="coupon-input">🎟️ عندك كوبون؟ <small>(اختياري)</small></label>
          <div className="coupon-row">
            <input
              id="coupon-input"
              type="text"
              dir="ltr"
              autoComplete="off"
              autoCapitalize="characters"
              placeholder="يرجى إدخال الكوبون (اختياري)"
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
            <button type="submit" className="btn btn-gold btn-sm" disabled={loading || !code.trim()}>
              {loading ? '...' : 'تفعيل'}
            </button>
          </div>
        </form>
      )}
      {message.text && <div className={`form-msg ${message.type}`}>{message.text}</div>}
    </div>
  );
}

export default CouponBox;