/* ============================================================
   AdminPayments — التحويلات والحسابات (لوحة الأونر)
   1) رقم التحويل اللي بيظهر للطلاب
   2) طلبات التحويل: صورة الإيصال + تفعيل الاشتراك / رفض
   3) قفل وفتح أي حساب
   ============================================================ */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../context/AuthContext';
import { useT } from '../../i18n/useT';
import { payLabels } from '../../i18n/payLabels';

const URL_TTL_MS = 45 * 60 * 1000;

function waLink(phone) {
  let d = String(phone || '').replace(/\D/g, '');
  if (d.startsWith('00')) d = d.slice(2);
  else if (d.startsWith('0')) d = `20${d.slice(1)}`;
  return d.length >= 10 ? `https://wa.me/${d}` : '';
}

/* ---------------- رقم التحويل ---------------- */
function TransferSettings({ P }) {
  const [form, setForm] = useState({ number: '', holder: '', note: '' });
  const [msg, setMsg] = useState({ type: '', text: '' });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    supabase
      .from('settings')
      .select('*')
      .eq('id', 1)
      .maybeSingle()
      .then(({ data }) => {
        if (!alive || !data) return;
        setForm({
          number: data.transfer_number || '',
          holder: data.transfer_name || '',
          note: data.transfer_note || '',
        });
      });
    return () => {
      alive = false;
    };
  }, []);

  async function save(e) {
    e.preventDefault();
    setBusy(true);
    setMsg({ type: '', text: '' });
    const { error } = await supabase
      .from('settings')
      .update({
        transfer_number: form.number.trim(),
        transfer_name: form.holder.trim(),
        transfer_note: form.note.trim(),
      })
      .eq('id', 1);
    setBusy(false);
    setMsg(error ? { type: 'error', text: P.saveFail } : { type: 'ok', text: P.saved });
  }

  return (
    <form className="card bc-pay-settings" onSubmit={save}>
      <h3>{P.settingsTitle}</h3>
      <div className="bc-pay-settings-grid">
        <div className="field">
          <label htmlFor="bc-set-number">{P.fNumber}</label>
          <input
            id="bc-set-number"
            type="text"
            dir="ltr"
            inputMode="tel"
            value={form.number}
            onChange={(e) => setForm({ ...form, number: e.target.value })}
          />
        </div>
        <div className="field">
          <label htmlFor="bc-set-holder">{P.fHolder}</label>
          <input
            id="bc-set-holder"
            type="text"
            value={form.holder}
            onChange={(e) => setForm({ ...form, holder: e.target.value })}
          />
        </div>
      </div>
      <div className="field">
        <label htmlFor="bc-set-note">{P.fNote}</label>
        <input
          id="bc-set-note"
          type="text"
          value={form.note}
          onChange={(e) => setForm({ ...form, note: e.target.value })}
        />
      </div>
      <button type="submit" className="btn btn-teal btn-sm" disabled={busy}>
        {P.save}
      </button>
      {msg.text && (
        <span className={`bc-pay-saved ${msg.type}`} role="status">
          {msg.text}
        </span>
      )}
    </form>
  );
}

/* ---------------- الصفحة ---------------- */
function AdminPayments() {
  const { profile: me } = useAuth();
  const meId = me ? me.id : null;
  const { lang } = useT();
  const P = payLabels(lang);
  const locale = lang === 'en' ? 'en-GB' : 'ar-EG';

  const [tab, setTab] = useState('requests'); /* requests | accounts */
  const [filter, setFilter] = useState('pending');
  const [requests, setRequests] = useState([]);
  const [urls, setUrls] = useState({});
  const [loadingReq, setLoadingReq] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [accounts, setAccounts] = useState([]);
  const [loadingAcc, setLoadingAcc] = useState(true);
  const [query, setQuery] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [actionError, setActionError] = useState('');
  const [viewer, setViewer] = useState(null);
  const urlCache = useRef({});
  const debounceRef = useRef(null);

  const loadRequests = useCallback(async () => {
    const { data, error } = await supabase
      .from('payment_requests')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(300);
    if (error) {
      setLoadError(true);
      setLoadingReq(false);
      return;
    }
    setLoadError(false);
    const rows = data || [];
    setRequests(rows);

    /* روابط الصور مؤقتة (الـ bucket خاص). بنجدّد بس اللي ناقص أو قرّب يخلص */
    const now = Date.now();
    const need = rows
      .map((r) => r.receipt_path)
      .filter((p) => p && !(urlCache.current[p] && now - urlCache.current[p].at < URL_TTL_MS));
    if (need.length) {
      const { data: signed } = await supabase.storage.from('receipts').createSignedUrls(need, 3600);
      (signed || []).forEach((s) => {
        if (s.signedUrl) urlCache.current[s.path] = { url: s.signedUrl, at: now };
      });
    }
    const map = {};
    Object.keys(urlCache.current).forEach((k) => {
      map[k] = urlCache.current[k].url;
    });
    setUrls(map);
    setLoadingReq(false);
  }, []);

  useEffect(() => {
    loadRequests();
    const channel = supabase
      .channel('bc-admin-payments')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payment_requests' }, () => {
        clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(loadRequests, 400);
      })
      .subscribe();
    const timer = setInterval(loadRequests, 30000);
    return () => {
      clearTimeout(debounceRef.current);
      clearInterval(timer);
      supabase.removeChannel(channel);
    };
  }, [loadRequests]);

  const loadAccounts = useCallback(async () => {
    const { data } = await supabase.from('profiles').select('*').order('full_name');
    setAccounts(
      (data || []).filter(
        (r) => r.id !== meId && r.is_admin !== true && r.role !== 'admin' && r.role !== 'owner'
      )
    );
    setLoadingAcc(false);
  }, [meId]);

  useEffect(() => {
    if (tab === 'accounts') loadAccounts();
  }, [tab, loadAccounts]);

  const counts = useMemo(() => {
    const c = { pending: 0, approved: 0, rejected: 0 };
    requests.forEach((r) => {
      if (c[r.status] !== undefined) c[r.status] += 1;
    });
    return c;
  }, [requests]);

  const visibleRequests = requests.filter((r) => filter === 'all' || r.status === filter);

  const visibleAccounts = useMemo(() => {
    const q = query.trim().toLowerCase();
    return accounts.filter((a) => !q || (a.full_name || '').toLowerCase().includes(q));
  }, [accounts, query]);

  async function approve(r) {
    setBusyId(r.id);
    setActionError('');
    const { error } = await supabase.rpc('approve_payment', { p_id: r.id });
    setBusyId(null);
    if (error) {
      setActionError(`${P.actionFail}: ${error.message}`);
      return;
    }
    loadRequests();
  }

  async function reject(r) {
    const note = window.prompt(P.rejectReason, '');
    if (note === null) return;
    setBusyId(r.id);
    setActionError('');
    const { error } = await supabase.rpc('reject_payment', { p_id: r.id, p_note: note });
    setBusyId(null);
    if (error) {
      setActionError(`${P.actionFail}: ${error.message}`);
      return;
    }
    loadRequests();
  }

  async function toggleLock(acc) {
    const next = !acc.is_locked;
    const name = acc.full_name || '';
    if (!window.confirm(next ? P.confirmLock(name) : P.confirmUnlock(name))) return;
    setBusyId(acc.id);
    setActionError('');
    const { error } = await supabase.rpc('set_account_locked', { p_user: acc.id, p_locked: next });
    setBusyId(null);
    if (error) {
      setActionError(`${P.actionFail}: ${error.message}`);
      return;
    }
    setAccounts((prev) => prev.map((a) => (a.id === acc.id ? { ...a, is_locked: next } : a)));
  }

  const statusLabel = { pending: P.statusPending, approved: P.statusApproved, rejected: P.statusRejected };

  return (
    <div className="bc-section">
      <div className="dash-head">
        <div>
          <h1>💳 {P.payTitle}</h1>
          <p className="dash-sub">{P.paySub}</p>
        </div>
      </div>

      <TransferSettings P={P} />

      <div className="bc-chips bc-pay-tabs-bar">
        <button type="button" className={tab === 'requests' ? 'active' : ''} onClick={() => setTab('requests')}>
          {P.tabRequests}
          {counts.pending > 0 && <b>{counts.pending}</b>}
        </button>
        <button type="button" className={tab === 'accounts' ? 'active' : ''} onClick={() => setTab('accounts')}>
          {P.tabAccounts}
        </button>
      </div>

      {actionError && (
        <div className="card notice-card danger" role="alert">
          <p>⚠️ {actionError}</p>
        </div>
      )}

      {tab === 'requests' && (
        <>
          {loadError && (
            <div className="card notice-card danger">
              <p>⚠️ {P.loadFail}</p>
            </div>
          )}

          <div className="bc-chips">
            {[
              ['pending', P.fPending],
              ['approved', P.fApproved],
              ['rejected', P.fRejected],
              ['all', P.fAll],
            ].map(([key, label]) => (
              <button key={key} type="button" className={filter === key ? 'active' : ''} onClick={() => setFilter(key)}>
                {label}
                {key !== 'all' && counts[key] > 0 && <b>{counts[key]}</b>}
              </button>
            ))}
          </div>

          {loadingReq ? (
            <div className="bc-state">{P.loading}</div>
          ) : visibleRequests.length === 0 ? (
            <div className="bc-state">{P.noRequests}</div>
          ) : (
            <ul className="bc-req-list">
              {visibleRequests.map((r) => {
                const img = urls[r.receipt_path];
                const wa = waLink(r.phone);
                return (
                  <li className="bc-req card" key={r.id}>
                    <button
                      type="button"
                      className="bc-req-thumb"
                      disabled={!img}
                      onClick={() => img && setViewer({ url: img, name: r.full_name })}
                      aria-label={P.viewReceipt}
                    >
                      {img ? <img src={img} alt="" loading="lazy" /> : <span>{P.noReceipt}</span>}
                    </button>

                    <div className="bc-req-body">
                      <div className="bc-req-top">
                        <strong>{r.full_name}</strong>
                        <span className={`badge bc-st-${r.status}`}>{statusLabel[r.status] || r.status}</span>
                      </div>
                      <div className="bc-req-meta">
                        <span>
                          {P.packageLbl}: <b>{r.package_name || '—'}</b>
                        </span>
                        {r.amount != null && (
                          <span>
                            {P.amount}: <b>{r.amount} {P.currency}</b>
                          </span>
                        )}
                        <time dateTime={r.created_at}>
                          {new Date(r.created_at).toLocaleString(locale, { dateStyle: 'medium', timeStyle: 'short' })}
                        </time>
                      </div>
                      {r.phone && (
                        <div className="bc-req-meta">
                          <bdi dir="ltr">{r.phone}</bdi>
                          {wa && (
                            <a href={wa} target="_blank" rel="noopener noreferrer">
                              {P.whatsapp}
                            </a>
                          )}
                        </div>
                      )}
                      {r.status === 'rejected' && r.admin_note && (
                        <p className="bc-req-note">
                          {P.rejectedNote}: {r.admin_note}
                        </p>
                      )}
                    </div>

                    {r.status === 'pending' && (
                      <div className="bc-req-actions">
                        <button type="button" className="btn btn-teal btn-sm" disabled={busyId === r.id} onClick={() => approve(r)}>
                          {P.approve}
                        </button>
                        <button type="button" className="btn btn-ghost btn-sm" disabled={busyId === r.id} onClick={() => reject(r)}>
                          {P.reject}
                        </button>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}

      {tab === 'accounts' && (
        <>
          <div className="search-box bc-acc-search">
            <input
              type="search"
              placeholder={P.searchAccounts}
              aria-label={P.searchAccounts}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          {loadingAcc ? (
            <div className="bc-state">{P.loading}</div>
          ) : visibleAccounts.length === 0 ? (
            <div className="bc-state">{P.noAccounts}</div>
          ) : (
            <ul className="bc-acc-list">
              {visibleAccounts.map((a) => (
                <li className="bc-acc card" key={a.id}>
                  <div className="bc-acc-id">
                    <strong>{a.full_name || '—'}</strong>
                    <span className={`badge ${a.is_locked ? 'expired' : 'active'}`}>
                      {a.is_locked ? P.lockedBadge : P.activeBadge}
                    </span>
                  </div>
                  <button
                    type="button"
                    className={`btn btn-sm ${a.is_locked ? 'btn-teal' : 'btn-ghost'}`}
                    disabled={busyId === a.id}
                    onClick={() => toggleLock(a)}
                  >
                    {a.is_locked ? P.unlockBtn : P.lockBtn}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {viewer && (
        <div className="overlay open" role="dialog" aria-modal="true" onClick={() => setViewer(null)}>
          <div className="bc-lightbox" onClick={(e) => e.stopPropagation()}>
            <img src={viewer.url} alt={viewer.name} />
            <div className="bc-lightbox-bar">
              <a className="btn btn-ghost btn-sm" href={viewer.url} target="_blank" rel="noopener noreferrer">
                {P.openFull}
              </a>
              <button type="button" className="btn btn-gold btn-sm" onClick={() => setViewer(null)}>
                {P.close}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminPayments;