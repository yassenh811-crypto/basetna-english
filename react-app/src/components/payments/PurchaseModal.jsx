/* ============================================================
   PurchaseModal — الاشتراك بالتحويل (من غير ما الطالب يعمل حساب)
   1) بيظهر رقم التحويل وسعر الباقة
   2) الطالب يكتب اسمه بس ويرفع صورة التحويل (إجباري)
   3) بيطلع له كود. مس شيرهان بتشوف الاسم والكود والصورة، وتعمل له الحساب بنفسها
   الاستخدام:
     <PurchaseModal pkg={باقة} onClose={...} />   // من الصفحة الرئيسية
     <PurchaseModal onClose={...} />               // من لوحة الطالب (بيختار الباقة)
   ============================================================ */
import { useEffect, useState } from 'react';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../context/AuthContext';
import { useT } from '../../i18n/useT';
import { payLabels } from '../../i18n/payLabels';
import { usePaymentSettings } from '../../hooks/usePaymentSettings';

const MAX_MB = 5;
const OK_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; /* من غير 0/O و1/I عشان ماتتلخبطش */

function makeCode() {
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  return `BT-${Array.from(bytes, (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join('')}`;
}

function extOf(file) {
  if (file.type === 'image/png') return 'png';
  if (file.type === 'image/webp') return 'webp';
  return 'jpg';
}

function waDigits(phone) {
  let d = String(phone || '').replace(/\D/g, '');
  if (d.startsWith('00')) d = d.slice(2);
  else if (d.startsWith('0')) d = `20${d.slice(1)}`;
  return d;
}

function PurchaseModal({ pkg = null, onClose }) {
  const { user, profile } = useAuth();
  const { lang, field } = useT();
  const P = payLabels(lang);
  const pay = usePaymentSettings();

  const [step, setStep] = useState(1);
  const [packages, setPackages] = useState([]);
  const [chosenId, setChosenId] = useState(pkg ? String(pkg.id) : '');
  const [name, setName] = useState((profile && profile.full_name) || '');
  const [trap, setTrap] = useState(''); /* خانة مخفية: لو اتملت يبقى بوت */
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState('');
  const [result, setResult] = useState(null); /* { code, name, pkgName } */

  /* من لوحة الطالب: نجيب الباقات المتاحة (من غير باقات الكوبون المخفية) */
  useEffect(() => {
    if (pkg) return undefined;
    let alive = true;
    supabase
      .from('packages')
      .select('*')
      .eq('is_active', true)
      .order('price', { ascending: true })
      .then(({ data }) => {
        if (!alive) return;
        const list = (data || []).filter((p) => !p.coupon_required);
        setPackages(list);
        if (list.length) setChosenId((prev) => prev || String(list[0].id));
      });
    return () => {
      alive = false;
    };
  }, [pkg]);

  const chosen = pkg || packages.find((p) => String(p.id) === chosenId) || null;
  const chosenName = chosen ? field(chosen, 'name') : '';

  /* اسم الطالب لو اتحمّل بعد فتح النافذة */
  useEffect(() => {
    if (profile && profile.full_name) setName((prev) => prev || profile.full_name);
  }, [profile]);

  /* معاينة الصورة */
  useEffect(() => {
    if (!file) {
      setPreview('');
      return undefined;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function close() {
    if (busy) return;
    /* الطالب المسجّل: ريفريش عشان لوحته تظهر حالة الطلب */
    if (result && user) window.location.reload();
    else onClose();
  }

  /* Esc يقفل النافذة */
  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') close();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busy, result, user]);

  function onFile(e) {
    const f = e.target.files && e.target.files[0];
    setError('');
    if (!f) return;
    if (!OK_TYPES.includes(f.type)) {
      setError(P.errType);
      e.target.value = '';
      return;
    }
    if (f.size > MAX_MB * 1024 * 1024) {
      setError(P.errSize);
      e.target.value = '';
      return;
    }
    setFile(f);
  }

  async function copy(text, key) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(''), 1800);
    } catch (e) {
      /* لو المتصفح منع النسخ الطالب يقدر ينسخ بإيده */
    }
  }

  async function submit(e) {
    e.preventDefault();
    setError('');

    const fullName = name.trim();
    if (!chosen) return setError(P.errPackage);
    if (fullName.length < 2) return setError(P.errName);
    if (!file) return setError(P.errReceipt);

    /* بوت: نرجّع نجاح وهمي من غير ما نحفظ حاجة */
    if (trap) {
      setResult({ code: makeCode(), name: fullName, pkgName: chosenName });
      return;
    }

    setBusy(true);
    try {
      const uid = user ? user.id : null;
      const unique = crypto.randomUUID();
      const path = uid ? `${uid}/${unique}.${extOf(file)}` : `incoming/${unique}.${extOf(file)}`;

      const up = await supabase.storage.from('receipts').upload(path, file, { contentType: file.type });
      if (up.error) throw new Error(`${P.errUpload}: ${up.error.message}`);

      let code = makeCode();
      let saved = false;
      for (let attempt = 0; attempt < 4 && !saved; attempt += 1) {
        const ins = await supabase.from('payment_requests').insert({
          user_id: uid,
          full_name: fullName,
          package_id: chosen.id,
          package_name: chosen.name_ar || chosen.name_en || '',
          amount: chosen.price,
          receipt_path: path,
          code,
        });
        if (!ins.error) {
          saved = true;
        } else if (ins.error.code === '23505') {
          code = makeCode(); /* الكود اتكرر (نادر جدًا)، نجرّب غيره */
        } else {
          throw new Error(ins.error.message);
        }
      }
      if (!saved) throw new Error(P.errUpload);

      setResult({ code, name: fullName, pkgName: chosen.name_ar || chosen.name_en || '' });
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setBusy(false);
    }
  }

  const waNumber = waDigits(pay.whatsapp);
  const waHref =
    result && waNumber
      ? `https://wa.me/${waNumber}?text=${encodeURIComponent(P.waRequestMsg(result.name, result.code, result.pkgName))}`
      : '';

  return (
    <div
      className="overlay open"
      role="dialog"
      aria-modal="true"
      aria-labelledby="bc-pay-title"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div className="modal bc-pay-modal">
        <button type="button" className="close" onClick={close} aria-label={P.close} disabled={busy}>
          ✕
        </button>
        <h3 id="bc-pay-title">{P.buyTitle}</h3>

        {result && (
          <div className="bc-pay-result">
            <strong>{P.doneTitle}</strong>
            <p>{P.doneWait}</p>

            <div className="bc-pay-number">
              <small>{P.codeTitle}</small>
              <div className="bc-pay-numrow">
                <bdi dir="ltr" className="bc-pay-num">
                  {result.code}
                </bdi>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => copy(result.code, 'code')}>
                  {copied === 'code' ? P.copied : P.codeCopy}
                </button>
              </div>
            </div>
            <p className="bc-pay-note">{P.codeHint}</p>

            {waHref && (
              <a className="btn btn-gold btn-block" href={waHref} target="_blank" rel="noopener noreferrer">
                {P.sendCodeWa}
              </a>
            )}
            <button type="button" className="btn btn-ghost btn-block" style={{ marginTop: 10 }} onClick={close}>
              {P.close}
            </button>
          </div>
        )}

        {!result && (
          <>
            <div className="bc-pay-tabs" aria-hidden="true">
              <span className={step === 1 ? 'on' : ''}>{P.stepPay}</span>
              <span className={step === 2 ? 'on' : ''}>{P.stepData}</span>
            </div>

            {step === 1 && (
              <div>
                {!pkg && packages.length > 1 && (
                  <div className="field">
                    <label htmlFor="bc-pay-pkg">{P.choosePackage}</label>
                    <select id="bc-pay-pkg" value={chosenId} onChange={(e) => setChosenId(e.target.value)}>
                      {packages.map((p) => (
                        <option key={p.id} value={String(p.id)}>
                          {field(p, 'name')} — {p.price} {P.currency}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {chosen && (
                  <div className="bc-pay-pkg">
                    <strong>{chosenName}</strong>
                    <span className="bc-pay-price">
                      {P.amount}: {chosen.price} {P.currency}
                    </span>
                  </div>
                )}

                <h4 className="bc-pay-h">{P.howTitle}</h4>
                <ol className="bc-pay-steps">
                  <li>{P.how1}</li>
                  <li>{P.how2}</li>
                  <li>{P.how3}</li>
                </ol>

                <div className="bc-pay-number">
                  <small>{P.transferTo}</small>
                  {pay.number ? (
                    <div className="bc-pay-numrow">
                      <bdi dir="ltr" className="bc-pay-num">
                        {pay.number}
                      </bdi>
                      <button type="button" className="btn btn-ghost btn-sm" onClick={() => copy(pay.number, 'num')}>
                        {copied === 'num' ? P.copied : P.copy}
                      </button>
                    </div>
                  ) : (
                    <span className="bc-pay-missing">{pay.loading ? P.loading : P.noNumber}</span>
                  )}
                </div>
                {pay.holder && (
                  <p className="bc-pay-holder">
                    {P.holder}: <b>{pay.holder}</b>
                  </p>
                )}
                {pay.note && <p className="bc-pay-note">{pay.note}</p>}

                <button type="button" className="btn btn-gold btn-block" disabled={!chosen} onClick={() => setStep(2)}>
                  {P.paidNext}
                </button>
              </div>
            )}

            {step === 2 && (
              <form onSubmit={submit}>
                <div className="field">
                  <label htmlFor="bc-pay-name">{P.fName}</label>
                  <input
                    id="bc-pay-name"
                    type="text"
                    autoComplete="name"
                    required
                    minLength={2}
                    maxLength={80}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>

                <div className="field">
                  <label htmlFor="bc-pay-file">{P.fReceipt}</label>
                  <label className="bc-file" htmlFor="bc-pay-file">
                    {preview ? <img src={preview} alt="" /> : <span>📷 {P.receiptPick}</span>}
                    {preview && <em>{P.receiptChange}</em>}
                  </label>
                  <input
                    id="bc-pay-file"
                    className="bc-file-input"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={onFile}
                  />
                  <small className="bc-pay-hint">{P.receiptHint}</small>
                </div>

                {/* خانة مصيدة للبوتات: مخفية عن الناس */}
                <input
                  type="text"
                  name="website"
                  tabIndex={-1}
                  autoComplete="off"
                  aria-hidden="true"
                  value={trap}
                  onChange={(e) => setTrap(e.target.value)}
                  style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, opacity: 0 }}
                />

                {error && (
                  <div className="form-msg error" role="alert">
                    {error}
                  </div>
                )}

                <div className="bc-pay-actions">
                  <button type="button" className="btn btn-ghost" onClick={() => setStep(1)} disabled={busy}>
                    {P.back}
                  </button>
                  <button type="submit" className="btn btn-gold" disabled={busy}>
                    {busy ? P.sending : P.submitReceipt}
                  </button>
                </div>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default PurchaseModal;