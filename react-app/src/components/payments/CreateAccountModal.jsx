/* ============================================================
   CreateAccountModal — الأونر تفتح حساب لطالب من طلب التحويل
   1) تراجع الاسم والكود وصورة التحويل (في الصفحة اللي فاتحة النافذة دي)
   2) تكتب إيميل الدخول والباسورد وتختار المرحلة وتدوس «تم»
   3) بيتعمل الحساب وتتفعّل الباقة، وتظهر بيانات الدخول عشان تبعتيها للطالب
   ============================================================ */
import { useEffect, useRef, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { supabase } from '../../services/supabase';
import { getLevels } from '../../services/api';
import { useT } from '../../i18n/useT';
import { payLabels } from '../../i18n/payLabels';
import { packageLevelIds } from '../../utils/packages';

const PASS_ALPHABET = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789';

function makePassword(length = 8) {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => PASS_ALPHABET[b % PASS_ALPHABET.length]).join('');
}

function suggestEmail(code) {
  const host = window.location.hostname.replace(/^www\./, '');
  const domain = host && host.includes('.') ? host : 'basetna-english.online';
  return `${String(code || 'student').toLowerCase()}@students.${domain}`;
}

function waDigits(phone) {
  let d = String(phone || '').replace(/\D/g, '');
  if (d.startsWith('00')) d = d.slice(2);
  else if (d.startsWith('0')) d = `20${d.slice(1)}`;
  return d;
}

function CreateAccountModal({ request, onClose, onDone }) {
  const { lang, field } = useT();
  const P = payLabels(lang);

  const [pkg, setPkg] = useState(null);
  const [levels, setLevels] = useState([]);
  const [form, setForm] = useState({
    name: request.full_name || '',
    email: suggestEmail(request.code),
    password: makePassword(),
    levelId: request.grade_level_id ? String(request.grade_level_id) : '',
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [created, setCreated] = useState(null); /* { email, password, name, needsConfirm } */
  const [copied, setCopied] = useState(false);
  const uidRef = useRef(null); /* لو الحساب اتعمل وفشل التفعيل، نكمل من غير ما نعمله تاني */
  const needsConfirmRef = useRef(false);

  useEffect(() => {
    let alive = true;
    if (request.package_id) {
      supabase
        .from('packages')
        .select('*')
        .eq('id', request.package_id)
        .maybeSingle()
        .then(({ data }) => {
          if (alive) setPkg(data || null);
        });
    }
    getLevels()
      .then((list) => {
        if (alive) setLevels(list || []);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [request.package_id]);

  /* المراحل المتاحة للباقة دي */
  const allowed = pkg ? packageLevelIds(pkg) : [];
  const levelOptions = allowed.length ? levels.filter((l) => allowed.includes(String(l.id))) : levels;

  useEffect(() => {
    if (levelOptions.length === 1) {
      setForm((f) => (f.levelId ? f : { ...f, levelId: String(levelOptions[0].id) }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [levelOptions.length]);

  function setField(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function submit(e) {
    e.preventDefault();
    setError('');

    const name = form.name.trim() || request.full_name;
    const email = form.email.trim();
    if (!/^\S+@\S+\.\S+$/.test(email)) return setError(P.errEmail);
    if (form.password.length < 6) return setError(P.errPassShort);
    if (levelOptions.length > 0 && !form.levelId) return setError(P.errLevel);

    setBusy(true);
    try {
      if (!uidRef.current) {
        /* عميل مؤقت: بيعمل حساب الطالب من غير ما يسجّل الأونر خروج */
        const url = supabase.supabaseUrl || import.meta.env.VITE_SUPABASE_URL;
        const key = supabase.supabaseKey || import.meta.env.VITE_SUPABASE_ANON_KEY;
        const temp = createClient(url, key, {
          auth: {
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false,
            storageKey: `bt-admin-temp-${Date.now()}`,
          },
        });
        const { data, error: signErr } = await temp.auth.signUp({
          email,
          password: form.password,
          options: { data: { full_name: name } },
        });
        if (signErr) {
          throw new Error(/registered|exists/i.test(signErr.message) ? P.errEmailExists : signErr.message);
        }
        if (!data.user) throw new Error(P.errEmailExists);
        uidRef.current = data.user.id;
        needsConfirmRef.current = !data.session; /* تأكيد الإيميل شغّال في Supabase */
      }

      const { error: rpcErr } = await supabase.rpc('approve_payment_for', {
        p_id: request.id,
        p_user: uidRef.current,
        p_level: form.levelId || null,
      });
      if (rpcErr) throw new Error(rpcErr.message);

      setCreated({ email, password: form.password, name, needsConfirm: needsConfirmRef.current });
      if (onDone) onDone();
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setBusy(false);
    }
  }

  const site = typeof window !== 'undefined' ? window.location.origin : '';
  const message = created ? P.loginMsg(created.name, created.email, created.password, site) : '';
  const wa = created && request.phone ? waDigits(request.phone) : '';

  async function copyMessage() {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch (e) {
      /* لو المتصفح منع النسخ، الرسالة ظاهرة وتتنسخ بإيدك */
    }
  }

  return (
    <div
      className="overlay open"
      role="dialog"
      aria-modal="true"
      aria-labelledby="bc-ca-title"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !busy) onClose();
      }}
    >
      <div className="modal bc-pay-modal">
        <button type="button" className="close" onClick={onClose} aria-label={P.close} disabled={busy}>
          ✕
        </button>
        <h3 id="bc-ca-title">{created ? P.credsTitle(created.name) : P.createTitle}</h3>

        {!created && (
          <form onSubmit={submit}>
            <p className="bc-pay-note" style={{ textAlign: 'start' }}>
              {P.createHint}
            </p>

            <div className="bc-ca-summary">
              <span>
                <b>{request.full_name}</b> · <bdi dir="ltr">{request.code}</bdi>
              </span>
              <span>
                {request.package_name || '—'}
                {request.amount != null ? ` — ${request.amount} ${P.currency}` : ''}
              </span>
            </div>

            <div className="field">
              <label htmlFor="bc-ca-name">{P.fName}</label>
              <input
                id="bc-ca-name"
                type="text"
                value={form.name}
                onChange={(e) => setField('name', e.target.value)}
                required
                minLength={2}
                maxLength={80}
              />
            </div>

            <div className="field">
              <label htmlFor="bc-ca-email">{P.fLoginEmail}</label>
              <input
                id="bc-ca-email"
                type="email"
                dir="ltr"
                autoComplete="off"
                value={form.email}
                onChange={(e) => setField('email', e.target.value)}
                required
              />
            </div>

            <div className="field">
              <label htmlFor="bc-ca-pass">{P.fLoginPass}</label>
              <div className="bc-ca-passrow">
                <input
                  id="bc-ca-pass"
                  type="text"
                  dir="ltr"
                  autoComplete="off"
                  value={form.password}
                  onChange={(e) => setField('password', e.target.value)}
                  required
                  minLength={6}
                />
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setField('password', makePassword())}>
                  {P.genPass}
                </button>
              </div>
            </div>

            {levelOptions.length > 1 && (
              <div className="field">
                <label htmlFor="bc-ca-level">{P.fLevel}</label>
                <select id="bc-ca-level" required value={form.levelId} onChange={(e) => setField('levelId', e.target.value)}>
                  <option value="">{P.fLevelPick}</option>
                  {levelOptions.map((l) => (
                    <option key={l.id} value={String(l.id)}>
                      {field(l, 'name')}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {error && (
              <div className="form-msg error" role="alert">
                {error}
              </div>
            )}

            <div className="bc-pay-actions">
              <button type="button" className="btn btn-ghost" onClick={onClose} disabled={busy}>
                {P.close}
              </button>
              <button type="submit" className="btn btn-gold" disabled={busy}>
                {busy ? P.creating : P.doneCreate}
              </button>
            </div>
          </form>
        )}

        {created && (
          <div className="bc-pay-result">
            <p>{P.credsHint}</p>
            {created.needsConfirm && (
              <div className="form-msg error" role="alert" style={{ display: 'block' }}>
                {P.errNeedConfirmOff}
              </div>
            )}
            <pre className="bc-ca-message">{message}</pre>
            <button type="button" className="btn btn-gold btn-block" onClick={copyMessage}>
              {copied ? P.copyDone : P.copyMsg}
            </button>
            {wa && (
              <a
                className="btn btn-ghost btn-block"
                style={{ marginTop: 10 }}
                href={`https://wa.me/${wa}?text=${encodeURIComponent(message)}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                {P.whatsapp}
              </a>
            )}
            <button type="button" className="btn btn-ghost btn-block" style={{ marginTop: 10 }} onClick={onClose}>
              {P.close}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default CreateAccountModal;