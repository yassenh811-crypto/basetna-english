/* ============================================================
   AdminSupport — صفحة الدعم في لوحة الأونر
   قايمة بكل الطلاب (مع بحث وفلتر غير المقروء) + محادثة خاصة مع أي طالب
   ============================================================ */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../context/AuthContext';
import { useT } from '../../i18n/useT';
import { chatLabels, chatLocale } from '../../i18n/chatLabels';
import { toWhatsAppNumber, whatsappLink } from '../../utils/phone';
import SupportChat from '../chat/SupportChat';

function initialOf(name) {
  return (name || '?').trim().charAt(0).toUpperCase();
}

/* كل حساب غير الأدمن = طالب (من غير الاعتماد على عمود role) */
function isStudentRow(row, meId) {
  if (row.id === meId) return false;
  if (row.is_admin === true || row.role === 'admin' || row.role === 'owner') return false;
  return true;
}

function AdminSupport() {
  const { profile: me } = useAuth();
  const meId = me ? me.id : null;
  const { lang } = useT();
  const L = chatLabels(lang);
  const locale = chatLocale(lang);

  const [students, setStudents] = useState([]);
  const [meta, setMeta] = useState({}); /* { [studentId]: { last, unread } } */
  const [selectedId, setSelectedId] = useState(null);
  const [query, setQuery] = useState('');
  const [onlyUnread, setOnlyUnread] = useState(false);
  const [loading, setLoading] = useState(true);
  const [schemaError, setSchemaError] = useState(false);
  const debounceRef = useRef(null);

  const load = useCallback(async () => {
    const [stRes, msgRes] = await Promise.all([
      supabase.from('profiles').select('*').order('full_name'),
      supabase
        .from('support_messages')
        .select('student_id, body, sender_role, read_at, created_at')
        .order('created_at', { ascending: false })
        .limit(1500),
    ]);

    setStudents((stRes.data || []).filter((row) => isStudentRow(row, meId)));
    setSchemaError(!!msgRes.error);

    const next = {};
    (msgRes.data || []).forEach((row) => {
      const cur = next[row.student_id] || { last: null, unread: 0 };
      if (!cur.last) cur.last = row; /* الترتيب تنازلي، فأول صف هو الأحدث */
      if (row.sender_role === 'student' && !row.read_at) cur.unread += 1;
      next[row.student_id] = cur;
    });
    setMeta(next);
    setLoading(false);
  }, [meId]);

  useEffect(() => {
    load();
    const channel = supabase
      .channel('bc-admin-inbox')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'support_messages' }, () => {
        clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(load, 400);
      })
      .subscribe();
    const timer = setInterval(load, 45000);
    return () => {
      clearTimeout(debounceRef.current);
      clearInterval(timer);
      supabase.removeChannel(channel);
    };
  }, [load]);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return students
      .filter((s) => !q || `${s.full_name || ''} ${s.phone || ''}`.toLowerCase().includes(q))
      .filter((s) => !onlyUnread || (meta[s.id] && meta[s.id].unread > 0))
      .sort((a, b) => {
        const ta = meta[a.id] && meta[a.id].last ? new Date(meta[a.id].last.created_at).getTime() : 0;
        const tb = meta[b.id] && meta[b.id].last ? new Date(meta[b.id].last.created_at).getTime() : 0;
        if (ta !== tb) return tb - ta; /* اللي فيه رسايل أحدث الأول */
        return (a.full_name || '').localeCompare(b.full_name || '', lang === 'en' ? 'en' : 'ar');
      });
  }, [students, meta, query, onlyUnread, lang]);

  const totalUnread = Object.values(meta).reduce((sum, m) => sum + m.unread, 0);
  const selected = students.find((s) => s.id === selectedId) || null;
  const waHref = selected && selected.phone ? whatsappLink(toWhatsAppNumber(selected.phone)) : '';

  function shortTime(iso) {
    const d = new Date(iso);
    const now = new Date();
    const sameDay = d.toDateString() === now.toDateString();
    return sameDay
      ? d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })
      : d.toLocaleDateString(locale, { day: 'numeric', month: 'short' });
  }

  return (
    <div className="bc-section">
      <div className="dash-head">
        <div>
          <h1>💬 {L.ownerTitle}</h1>
          <p className="dash-sub">{L.ownerSub}</p>
        </div>
      </div>

      {schemaError && (
        <div className="card notice-card danger">
          <p>⚠️ {L.loadFail}</p>
        </div>
      )}

      <div className={`bc-split ${selected ? 'has-sel' : ''}`}>
        <aside className="bc-people" aria-label={L.ownerTitle}>
          <div className="bc-people-tools">
            <div className="search-box">
              <input
                type="search"
                placeholder={L.searchStudents}
                aria-label={L.searchStudents}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <div className="bc-chips">
              <button type="button" className={!onlyUnread ? 'active' : ''} onClick={() => setOnlyUnread(false)}>
                {L.filterAll}
              </button>
              <button type="button" className={onlyUnread ? 'active' : ''} onClick={() => setOnlyUnread(true)}>
                {L.filterUnread}
                {totalUnread > 0 && <b>{totalUnread}</b>}
              </button>
            </div>
          </div>

          <ul className="bc-people-list">
            {loading ? (
              <li className="bc-state">{L.loading}</li>
            ) : students.length === 0 ? (
              <li className="bc-state">{L.noStudents}</li>
            ) : list.length === 0 ? (
              <li className="bc-state">{L.noResults}</li>
            ) : (
              list.map((s) => {
                const m = meta[s.id];
                const unread = m ? m.unread : 0;
                const last = m ? m.last : null;
                const preview = last
                  ? `${last.sender_role === 'owner' ? `${L.you}: ` : ''}${last.body.slice(0, 48)}`
                  : '';
                return (
                  <li key={s.id}>
                    <button
                      type="button"
                      className={`bc-person ${s.id === selectedId ? 'active' : ''}`}
                      onClick={() => setSelectedId(s.id)}
                    >
                      <span className="bc-ava" aria-hidden="true">
                        {initialOf(s.full_name)}
                      </span>
                      <span className="bc-person-body">
                        <span className="bc-person-name">{s.full_name}</span>
                        <span className="bc-person-prev">{preview}</span>
                      </span>
                      <span className="bc-person-side">
                        {last && <time dateTime={last.created_at}>{shortTime(last.created_at)}</time>}
                        {unread > 0 && (
                          <b className="bc-unread" aria-label={L.unreadN(unread)}>
                            {unread}
                          </b>
                        )}
                      </span>
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </aside>

        <section className="bc-thread">
          {selected ? (
            <>
              <header className="bc-thread-head">
                <button type="button" className="bc-back" onClick={() => setSelectedId(null)} aria-label={L.back}>
                  {lang === 'en' ? '‹' : '›'}
                </button>
                <span className="bc-ava" aria-hidden="true">
                  {initialOf(selected.full_name)}
                </span>
                <div className="bc-thread-id">
                  <strong>{selected.full_name}</strong>
                  {selected.phone && <small dir="ltr">{selected.phone}</small>}
                </div>
                {waHref && (
                  <a className="btn btn-sm bc-wa" href={waHref} target="_blank" rel="noopener noreferrer">
                    {L.whatsapp}
                  </a>
                )}
              </header>
              <SupportChat key={selected.id} studentId={selected.id} viewerRole="owner" onRead={load} />
            </>
          ) : (
            <div className="bc-state bc-pick">{L.pickStudent}</div>
          )}
        </section>
      </div>
    </div>
  );
}

export default AdminSupport;