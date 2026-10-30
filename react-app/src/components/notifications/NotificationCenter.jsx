/* ============================================================
   NotificationCenter — مركز الإشعارات + الأرشيف
   - «الجديد»: الإشعارات اللي لسه ماتقرتش. دوسة على الإشعار بتفتح الصفحة
     المرتبطة بيه وبتعلّمه مقروء، وزرار «تعليم الكل كمقروء» فوق.
   - «الأرشيف»: كل اللي حصل (المقروء والجديد)، مع فلتر بالنوع وبحث، ومابيتمسحش.
   الاستخدام:
     <NotificationCenter audience="admin" onOpen={(n) => ...} onChanged={refreshBadge} />
     <NotificationCenter audience="user"  onOpen={(n) => ...} onChanged={refreshBadge} />
   ============================================================ */
import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../../services/supabase';
import { useT } from '../../i18n/useT';
import { notifLabels, describeNotification, CATEGORY_TYPES } from '../../i18n/notifLabels';

const PAGE = 40;

function relTime(iso, locale) {
  const diffSec = Math.round((new Date(iso).getTime() - Date.now()) / 1000);
  const abs = Math.abs(diffSec);
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  if (abs < 60) return rtf.format(diffSec, 'second');
  if (abs < 3600) return rtf.format(Math.round(diffSec / 60), 'minute');
  if (abs < 86400) return rtf.format(Math.round(diffSec / 3600), 'hour');
  if (abs < 86400 * 30) return rtf.format(Math.round(diffSec / 86400), 'day');
  return new Date(iso).toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' });
}

function NotificationCenter({ audience, onOpen, onChanged }) {
  const { lang } = useT();
  const N = notifLabels(lang);
  const locale = lang === 'en' ? 'en-GB' : 'ar-EG';
  const isAdmin = audience === 'admin';

  const [tab, setTab] = useState('unread'); /* unread | archive */
  const [unread, setUnread] = useState([]);
  const [loadingUnread, setLoadingUnread] = useState(true);
  const [archive, setArchive] = useState([]);
  const [archiveLoading, setArchiveLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [cat, setCat] = useState('all');
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const tabRef = useRef(tab);
  const rtTimer = useRef(null);

  useEffect(() => {
    tabRef.current = tab;
  }, [tab]);

  /* بحث بتأخير بسيط عشان ما نضغطش على السيرفر مع كل حرف */
  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 350);
    return () => clearTimeout(t);
  }, [query]);

  const fetchUnread = useCallback(async () => {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('audience', audience)
      .is('read_at', null)
      .order('created_at', { ascending: false })
      .limit(200);
    setLoadingUnread(false);
    if (error) {
      setFailed(true);
      return;
    }
    setFailed(false);
    setUnread(data || []);
  }, [audience]);

  const fetchArchive = useCallback(
    async (from) => {
      setArchiveLoading(true);
      let q = supabase
        .from('notifications')
        .select('*')
        .eq('audience', audience)
        .order('created_at', { ascending: false })
        .range(from, from + PAGE - 1);
      if (cat !== 'all') q = q.in('type', CATEGORY_TYPES[cat]);
      const term = debounced.replace(/[^\p{L}\p{N} ]/gu, ' ').trim();
      if (term) {
        q = q.or(
          `data->>name.ilike."*${term}*",data->>package.ilike."*${term}*",data->>preview.ilike."*${term}*"`
        );
      }
      const { data, error } = await q;
      setArchiveLoading(false);
      if (error) {
        setFailed(true);
        return;
      }
      setFailed(false);
      const rows = data || [];
      setArchive((prev) => (from === 0 ? rows : [...prev, ...rows]));
      setHasMore(rows.length === PAGE);
    },
    [audience, cat, debounced]
  );

  useEffect(() => {
    fetchUnread();
  }, [fetchUnread]);

  useEffect(() => {
    if (tab === 'archive') fetchArchive(0);
  }, [tab, fetchArchive]);

  /* أي حدث جديد يوصل لحظيًا */
  useEffect(() => {
    const channel = supabase
      .channel(`bc-notif-center-${audience}-${Math.random().toString(36).slice(2, 8)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, () => {
        clearTimeout(rtTimer.current);
        rtTimer.current = setTimeout(() => {
          fetchUnread();
          if (tabRef.current === 'archive') fetchArchive(0);
        }, 400);
      })
      .subscribe();
    return () => {
      clearTimeout(rtTimer.current);
      supabase.removeChannel(channel);
    };
  }, [audience, fetchUnread, fetchArchive]);

  async function markRead(ids) {
    const { error } = await supabase.rpc('mark_notifications_read', { p_ids: ids });
    if (error) {
      setFailed(true);
      return false;
    }
    const now = new Date().toISOString();
    setUnread((prev) => prev.filter((x) => !ids.includes(x.id)));
    setArchive((prev) => prev.map((x) => (ids.includes(x.id) && !x.read_at ? { ...x, read_at: now } : x)));
    if (onChanged) onChanged();
    return true;
  }

  async function open(n) {
    if (!n.read_at) await markRead([n.id]);
    if (onOpen) onOpen(n);
  }

  async function markAll() {
    setBusy(true);
    const { error } = await supabase.rpc('mark_notifications_read', { p_ids: null });
    setBusy(false);
    if (error) {
      setFailed(true);
      return;
    }
    const now = new Date().toISOString();
    setUnread([]);
    setArchive((prev) => prev.map((x) => (x.read_at ? x : { ...x, read_at: now })));
    if (onChanged) onChanged();
  }

  function renderItem(n) {
    const d = describeNotification(n, audience, lang);
    const isNew = !n.read_at;
    return (
      <li className={`bc-n ${isNew ? 'new' : ''}`} key={n.id}>
        <button type="button" className="bc-n-main" onClick={() => open(n)}>
          <span className="bc-n-ico" aria-hidden="true">
            {d.icon}
          </span>
          <span className="bc-n-text">
            <strong>{d.title}</strong>
            {d.body && <span>{d.body}</span>}
          </span>
          <time
            className="bc-n-time"
            dateTime={n.created_at}
            title={new Date(n.created_at).toLocaleString(locale, { dateStyle: 'medium', timeStyle: 'short' })}
          >
            {relTime(n.created_at, locale)}
          </time>
        </button>
        {isNew && (
          <button
            type="button"
            className="bc-n-check"
            onClick={() => markRead([n.id])}
            aria-label={N.markOne}
            title={N.markOne}
          >
            ✓
          </button>
        )}
      </li>
    );
  }

  const cats = [
    ['all', N.catAll],
    ['payments', N.catPayments],
    ['messages', N.catMessages],
    ['accounts', N.catAccounts],
    ['changes', N.catChanges],
  ];

  return (
    <div className="bc-notif">
      {failed && (
        <div className="card notice-card danger" role="alert">
          <p>⚠️ {N.loadFail}</p>
        </div>
      )}

      <div className="bc-chips bc-notif-tabs">
        <button type="button" className={tab === 'unread' ? 'active' : ''} onClick={() => setTab('unread')}>
          {N.tabUnread}
          {unread.length > 0 && <b>{unread.length}</b>}
        </button>
        <button type="button" className={tab === 'archive' ? 'active' : ''} onClick={() => setTab('archive')}>
          🗂️ {N.tabArchive}
        </button>
      </div>

      {tab === 'unread' && (
        <>
          <div className="bc-notif-bar">
            <button type="button" className="btn btn-teal btn-sm" onClick={markAll} disabled={busy || unread.length === 0}>
              {N.markAll}
            </button>
            {isAdmin && <small>{N.markAllNote}</small>}
          </div>
          {loadingUnread ? (
            <div className="bc-state">{N.loading}</div>
          ) : unread.length === 0 ? (
            <div className="bc-state">{N.empty}</div>
          ) : (
            <ul className="bc-n-list">{unread.map(renderItem)}</ul>
          )}
        </>
      )}

      {tab === 'archive' && (
        <>
          {isAdmin && (
            <div className="bc-notif-filters">
              <div className="bc-chips">
                {cats.map(([key, label]) => (
                  <button key={key} type="button" className={cat === key ? 'active' : ''} onClick={() => setCat(key)}>
                    {label}
                  </button>
                ))}
              </div>
              <div className="search-box">
                <input
                  type="search"
                  placeholder={N.search}
                  aria-label={N.search}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
            </div>
          )}

          {archive.length === 0 ? (
            <div className="bc-state">{archiveLoading ? N.loading : N.emptyArchive}</div>
          ) : (
            <ul className="bc-n-list">{archive.map(renderItem)}</ul>
          )}

          {hasMore && (
            <div className="bc-notif-more">
              <button type="button" className="btn btn-ghost btn-sm" disabled={archiveLoading} onClick={() => fetchArchive(archive.length)}>
                {archiveLoading ? N.loading : N.loadMore}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default NotificationCenter;