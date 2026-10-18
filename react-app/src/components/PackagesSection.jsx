/* ============================================================
   📦 PackagesSection — الباقات للزوار والطلاب
   - الباقات العادية بتظهر للكل
   - الباقة المربوطة بكوبون بتظهر بس لما حد يدخل الكود
   - الباقة ممكن تبقى لأكتر من مرحلة، وفيه فلتر بالمرحلة
   حطه في Home.jsx مكان قسم الباقات القديم:  <PackagesSection />
   ============================================================ */
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../services/supabase';
import { packageLevelIds } from '../utils/packages';
import { useCouponPackages } from '../hooks/useCouponPackages';
import CouponBox from './CouponBox';

function PackagesSection() {
  const [packages, setPackages] = useState([]);
  const [levels, setLevels] = useState([]);
  const [whatsapp, setWhatsapp] = useState('');
  const [loading, setLoading] = useState(true);
  const [levelFilter, setLevelFilter] = useState('all');
  const [search, setSearch] = useState('');
  const coupon = useCouponPackages();

  useEffect(() => {
    async function load() {
      const [pRes, lRes, sRes] = await Promise.all([
        supabase.from('packages').select('*').eq('is_active', true).eq('coupon_required', false).order('price'),
        supabase.from('grade_levels').select('id,name_ar').order('sort_order'),
        supabase.from('settings').select('whatsapp_number').eq('id', 1).maybeSingle(),
      ]);
      setPackages(pRes.data || []);
      setLevels(lRes.data || []);
      setWhatsapp(sRes.data?.whatsapp_number || '');
      setLoading(false);
    }
    load();
  }, []);

  const unlockedIds = useMemo(() => new Set(coupon.unlocked.map((p) => String(p.id))), [coupon.unlocked]);

  const visible = useMemo(() => {
    const map = new Map();
    [...coupon.unlocked, ...packages].forEach((p) => map.set(String(p.id), p));
    let list = [...map.values()];
    if (levelFilter !== 'all') list = list.filter((p) => packageLevelIds(p).includes(levelFilter));
    const q = search.trim().toLowerCase();
    if (q) list = list.filter((p) => `${p.name_ar || ''} ${p.name_en || ''} ${p.description_ar || ''}`.toLowerCase().includes(q));
    return list;
  }, [packages, coupon.unlocked, levelFilter, search]);

  const levelName = (id) => levels.find((l) => String(l.id) === String(id))?.name_ar;

  function subscribeLink(p) {
    if (!whatsapp) return null;
    const msg = `السلام عليكم، عايز أشترك في باقة "${p.name_ar}"${coupon.activeCode && unlockedIds.has(String(p.id)) ? ` (كوبون ${coupon.activeCode})` : ''}`;
    return `https://wa.me/${whatsapp}?text=${encodeURIComponent(msg)}`;
  }

  return (
    <section className="block" id="packages">
      <div className="container">
        <div className="section-head">
          <h2>الباقات</h2>
          <p>اشتراك واحد بيفتحلك كل كورسات مرحلتك.</p>
        </div>

        <CouponBox coupon={coupon} />

        <div className="search-box pkg-search">
          <input
            type="text"
            placeholder="🔍 ابحث عن باقة..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {levels.length > 1 && (
          <div className="level-tabs" role="tablist">
            <button type="button" className={levelFilter === 'all' ? 'active' : ''} onClick={() => setLevelFilter('all')}>الكل</button>
            {levels.map((l) => (
              <button key={l.id} type="button" className={levelFilter === String(l.id) ? 'active' : ''} onClick={() => setLevelFilter(String(l.id))}>
                {l.name_ar}
              </button>
            ))}
          </div>
        )}

        {loading ? (
          <div className="grid grid-3">
            {[1, 2, 3].map((n) => <div className="card skeleton-card" key={n}><div className="sk-thumb" /><div className="sk-line" /><div className="sk-line short" /></div>)}
          </div>
        ) : visible.length === 0 ? (
          <div className="empty-state">مفيش باقات متاحة دلوقتي</div>
        ) : (
          <div className="grid grid-3">
            {visible.map((p) => {
              const link = subscribeLink(p);
              const special = unlockedIds.has(String(p.id));
              return (
                <div className="card pkg-card" key={p.id}>
                  {special && <span className="pkg-ribbon">🎟️ باقة الكوبون</span>}
                  <h3>{p.name_ar}</h3>
                  <div className="pkg-levels">
                    {packageLevelIds(p).map((id) => (
                      <span className="level-chip" key={id}>{levelName(id) || '—'}</span>
                    ))}
                  </div>
                  <div className="price">
                    {Number(p.price).toLocaleString('ar-EG')} <small>ج.م / {p.duration_days} يوم</small>
                  </div>
                  <p className="desc">{p.description_ar}</p>
                  {link ? (
                    <a className="btn btn-gold btn-block" href={link} target="_blank" rel="noopener noreferrer">اشترك على واتساب</a>
                  ) : (
                    <button type="button" className="btn btn-ghost btn-block" disabled>تواصل مع الميس للاشتراك</button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

export default PackagesSection;