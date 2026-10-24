/* ============================================================
   PhoneInput — خانة رقم الواتساب (مصر +20 هي الافتراضي)
   الاستخدام:
     <PhoneInput value={whatsapp} onChange={setWhatsapp} />
   - value    : الرقم المخزّن (أرقام بس بالكود الدولي) مثال 201012345678
   - onChange : بيرجّع الرقم النهائي الجاهز للحفظ وللينك wa.me
   ============================================================ */
import { useEffect, useState } from 'react';
import { useT } from '../i18n/useT';
import {
  COUNTRIES,
  splitWhatsAppNumber,
  toWhatsAppNumber,
  validateNumber,
  formatIntl,
} from '../utils/phone';

function PhoneInput({ value = '', onChange, id = 'wa-number' }) {
  const { lang } = useT();
  const isEn = lang === 'en';

  const [dial, setDial] = useState(() => splitWhatsAppNumber(value).country.dial);
  const [local, setLocal] = useState(() => splitWhatsAppNumber(value).local);

  /* لو القيمة اتغيّرت من بره (مثلاً بعد تحميل الإعدادات) نزامن الخانتين */
  useEffect(() => {
    if (value !== toWhatsAppNumber(local, dial)) {
      const s = splitWhatsAppNumber(value);
      setDial(s.country.dial);
      setLocal(s.local);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  function update(nextDial, nextLocal) {
    setDial(nextDial);
    setLocal(nextLocal);
    onChange?.(toWhatsAppNumber(nextLocal, nextDial));
  }

  const full = toWhatsAppNumber(local, dial);
  const check = full ? validateNumber(full) : null;

  return (
    <div className="bc-phone-wrap">
      <div className="bc-phone">
        <select
          aria-label={isEn ? 'Country code' : 'كود الدولة'}
          value={dial}
          onChange={(e) => update(e.target.value, local)}
        >
          {COUNTRIES.map((c) => (
            <option key={c.code} value={c.dial}>
              {c.flag} {isEn ? c.en : c.ar} (+{c.dial})
            </option>
          ))}
        </select>
        <input
          id={id}
          type="tel"
          inputMode="tel"
          dir="ltr"
          autoComplete="tel-national"
          value={local}
          placeholder={dial === '20' ? '010 1234 5678' : ''}
          onChange={(e) => update(dial, e.target.value)}
        />
      </div>

      {check && (
        <small className={`bc-phone-hint ${check.ok ? 'ok' : 'bad'}`} role={check.ok ? undefined : 'alert'}>
          {check.ok ? (
            <>
              ✅ {isEn ? 'Will be saved as' : 'هيتحفظ كـ'} <bdi dir="ltr">{formatIntl(full)}</bdi>
            </>
          ) : (
            <>⚠️ {isEn ? check.en : check.ar}</>
          )}
        </small>
      )}
    </div>
  );
}

export default PhoneInput;