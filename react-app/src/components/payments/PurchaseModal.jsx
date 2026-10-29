/* ============================================================
   PurchaseModal — الاشتراك بالتحويل
   1) بيظهر رقم التحويل وسعر الباقة
   2) الطالب يكتب اسمه ويرفع صورة التحويل (إجباري)
      - زائر جديد: بيتعمله حساب + طلب تحويل
      - طالب مسجّل دخول: بيتبعت طلب التحويل بس
   الاستخدام:
     <PurchaseModal pkg={باقة} levels={المراحل} onClose={...} />   // من الصفحة الرئيسية
     <PurchaseModal levels={[]} defaultLevelId={...} onClose={...} /> // من لوحة الطالب (بيختار الباقة)
   ============================================================ */
import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { supabase } from '../../services/supabase';
import { getLevels } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useT } from '../../i18n/useT';
import { payLabels } from '../../i18n/payLabels';
import { packageLevelIds } from '../../utils/packages';
import { usePaymentSettings } from '../../hooks/usePaymentSettings';

const MAX_MB = 5;
const OK_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const NO_LEVELS = [];

function extOf(file) {
  if (file.type === 'image/png') return 'png';
  if (file.type === 'image/webp') return 'webp';
  return 'jpg';
}

function PurchaseModal({ pkg = null, levels: levelsProp = NO_LEVELS, defaultLevelId = '', onClose }) {
  const { user } = useAuth();
  const { lang, field } = useT();
  const P = payLabels(lang);
  const pay = usePaymentSettings();

  const [step, setStep] = useState(1);
  const [packages, setPackages] = useState([]);
  const [chosenId, setChosenId] = useState(pkg ? String(pkg.id) : '');
  const [levels, setLevels] = useState(levelsProp);
  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    password: '',
    levelId: defaultLevelId ? String(defaultLevelId) : '',
  });
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [outcome, setOutcome] = useState(''); /* '' | 'done' | 'confirm' */

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

  useEffect(() => {
    if (levelsProp.length) return undefined;
    let alive = true;
    getLevels()
      .then((list) => {
        if (alive) setLevels(list || []);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [levelsProp]);

  const chosen = pkg || packages.find((p) => String(p.id) === chosenId) || null;

  /* لو الباقة محدّدة لمراحل معينة، نعرض المراحل دي بس */
  const levelOptions = useMemo(() => {
    const allowed = chosen ? packageLevelIds(chosen) : [];
    return allowed.length ? levels.filter((l) => allowed.includes(String(l.id))) : levels;
  }, [chosen, levels]);

  useEffect(() => {
    if (levelOptions.length === 1) {
      setForm((f) => ({ ...f, levelId: String(levelOptions[0].id) }));
    }
  }, [levelOptions]);

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

  /* Esc يقفل النافذة */
  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape' && !busy) onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [busy, onClose]);

  function setField(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

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

  async function copyNumber() {
    try {
      await navigator.clipboard.writeText(pay.number);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch (e) {
      /* لو المتصفح منع النسخ الطالب يقدر ينسخ بإيده */
    }
  }

  async function submit(e) {
    e.preventDefault();
    setError('');

    const name = form.name.trim();
    if (!chosen) return setError(P.errPackage);
    if (!name) return setError(P.errName);
    if (!user) {
      if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) return setError(P.errEmail);
      if (form.password.length < 6) return setError(P.errPassword);
    }
    if (levelOptions.length > 0 && !form.levelId) return setError(P.errLevel);
    if (!file) return setError(P.errReceipt);

    setBusy(true);
    try {
      let client = supabase;
      let uid = user ? user.id : null;
      let creds = null;

      if (!user) {
        /* عميل مؤقت: بيعمل الحساب ويرفع الصورة من غير ما يغيّر جلسة الموقع
           لحد ما كل حاجة تخلص، وبعدها بنسجّل الدخول. */
        const url = supabase.supabaseUrl || import.meta.env.VITE_SUPABASE_URL;
        const key = supabase.supabaseKey || import.meta.env.VITE_SUPABASE_ANON_KEY;
        client = createClient(url, key, {
          auth: {
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false,
            storageKey: `bt-temp-${Date.now()}`,
          },
        });

        const email = form.email.trim();
        const { data, error: signErr } = await client.auth.signUp({
          email,
          password: form.password,
          options: { data: { full_name: name, phone: form.phone.trim() } },
        });
        if (signErr) {
          throw new Error(/registered|exists/i.test(signErr.message) ? P.errExists : signErr.message);
        }
        if (!data.session) {
          /* تأكيد الإيميل شغّال: مفيش جلسة عشان نرفع الصورة دلوقتي */
          setOutcome('confirm');
          setBusy(false);
          return;
        }
        uid = data.user.id;
        creds = { email, password: form.password };

        /* لو التطبيق عندك بيعمل صف profiles تلقائيًا ده مش هيعمل حاجة */
        await client
          .from('profiles')
          .upsert({ id: uid, full_name: name }, { onConflict: 'id', ignoreDuplicates: true });
      }

      const path = `${uid}/${Date.now()}.${extOf(file)}`;
      const up = await client.storage.from('receipts').upload(path, file, { contentType: file.type });
      if (up.error) throw new Error(`${P.errUpload}: ${up.error.message}`);

      const ins = await client.from('payment_requests').insert({
        user_id: uid,
        full_name: name,
        phone: form.phone.trim() || null,
        package_id: chosen.id,
        package_name: chosen.name_ar || chosen.name_en || '',
        amount: chosen.price,
        grade_level_id: form.levelId || null,
        receipt_path: path,
      });
      if (ins.error) throw new Error(ins.error.message);

      setOutcome('done');
      setBusy(false);
      /* ريفريش نضيف عشان لوحة الطالب تظهر حالة الطلب */
      setTimeout(() => window.location.reload(), 2200);

      if (creds) await supabase.auth.signInWithPassword(creds);
    } catch (err) {
      setError(err.message || String(err));
      setBusy(false);
    }
  }

  const chosenName = chosen ? field(chosen, 'name') : '';

  return (
    <div
      className="overlay open"
      role="dialog"
      aria-modal="true"
      aria-labelledby="bc-pay-title"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !busy) onClose();
      }}
    >
      <div className="modal bc-pay-modal">
        <button type="button" className="close" onClick={onClose} aria-label={P.close} disabled={busy}>
          ✕
        </button>
        <h3 id="bc-pay-title">{P.buyTitle}</h3>

        {outcome === 'done' && (
          <div className="bc-pay-result">
            <strong>{P.doneTitle}</strong>
            <p>{P.doneText}</p>
          </div>
        )}

        {outcome === 'confirm' && (
          <div className="bc-pay-result">
            <strong>{P.confirmTitle}</strong>
            <p>{P.confirmText}</p>
            <button type="button" className="btn btn-gold btn-block" onClick={onClose}>
              {P.close}
            </button>
          </div>
        )}

        {!outcome && (
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
                      <button type="button" className="btn btn-ghost btn-sm" onClick={copyNumber}>
                        {copied ? P.copied : P.copy}
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

                <button
                  type="button"
                  className="btn btn-gold btn-block"
                  disabled={!chosen}
                  onClick={() => setStep(2)}
                >
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
                    value={form.name}
                    onChange={(e) => setField('name', e.target.value)}
                  />
                </div>

                <div className="field">
                  <label htmlFor="bc-pay-phone">{P.fPhone}</label>
                  <input
                    id="bc-pay-phone"
                    type="tel"
                    inputMode="tel"
                    dir="ltr"
                    autoComplete="tel"
                    value={form.phone}
                    onChange={(e) => setField('phone', e.target.value)}
                  />
                </div>

                {!user && (
                  <>
                    <div className="field">
                      <label htmlFor="bc-pay-email">{P.fEmail}</label>
                      <input
                        id="bc-pay-email"
                        type="email"
                        dir="ltr"
                        autoComplete="email"
                        required
                        value={form.email}
                        onChange={(e) => setField('email', e.target.value)}
                      />
                    </div>
                    <div className="field">
                      <label htmlFor="bc-pay-pass">{P.fPassword}</label>
                      <input
                        id="bc-pay-pass"
                        type="password"
                        dir="ltr"
                        autoComplete="new-password"
                        minLength={6}
                        required
                        value={form.password}
                        onChange={(e) => setField('password', e.target.value)}
                      />
                    </div>
                  </>
                )}

                {levelOptions.length > 1 && (
                  <div className="field">
                    <label htmlFor="bc-pay-level">{P.fLevel}</label>
                    <select
                      id="bc-pay-level"
                      required
                      value={form.levelId}
                      onChange={(e) => setField('levelId', e.target.value)}
                    >
                      <option value="">{P.fLevelPick}</option>
                      {levelOptions.map((l) => (
                        <option key={l.id} value={String(l.id)}>
                          {field(l, 'name')}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="field">
                  <label htmlFor="bc-pay-file">{P.fReceipt}</label>
                  <label className="bc-file" htmlFor="bc-pay-file">
                    {preview ? (
                      <img src={preview} alt="" />
                    ) : (
                      <span>📷 {P.receiptPick}</span>
                    )}
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
                    {busy ? P.sending : user ? P.submitExisting : P.submitNew}
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