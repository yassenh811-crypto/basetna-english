/* ============================================================
   🏠 Home.jsx — الصفحة الرئيسية (عربي / English)
   ------------------------------------------------------------
   جديد:
   - خانة كوبون اختيارية: الباقة المربوطة بكوبون بتظهر بس لما حد يدخل الكود
   - الباقة ممكن تبقى لأكتر من مرحلة (شارات + فلتر بالمرحلة)
   - رقم واتساب بقى بيتجاب من الإعدادات (كان رقم ثابت غلط)
   ============================================================ */
import { useEffect, useMemo, useState } from 'react';
import { getLevels, getPackages, getCourseCount } from '../services/api';
import { supabase } from '../services/supabase';
import { useAuth } from '../context/AuthContext';
import { useT } from '../i18n/useT';
import { packageLevelIds } from '../utils/packages';
import { useCouponPackages } from '../hooks/useCouponPackages';
import CouponBox from '../components/CouponBox';
import DemoVideo from '../components/DemoVideo';

/* الباقات العامة (من غير الباقات المخفية بكوبون) */
async function loadPublicPackages() {
  const { data, error } = await supabase
    .from('packages')
    .select('*')
    .eq('is_active', true)
    .eq('coupon_required', false)
    .order('price', { ascending: true });
  if (!error && data) return data;
  /* لسه ماشغلتش coupons.sql: ارجع للطريقة القديمة */
  const fallback = await getPackages();
  return (fallback || []).filter((p) => !p.coupon_required);
}

const COUPON_LABELS = {
  ar: {
    title: '🎟️ عندك كوبون؟',
    optional: '(اختياري)',
    placeholder: 'يرجى إدخال الكوبون (اختياري)',
    apply: 'تفعيل',
    activePrefix: '🎟️ كوبون',
    activeSuffix: 'مفعّل',
    cancel: 'إلغاء',
    okOne: (p) => `✅ اتفتحت لك باقة: ${p.name_ar}`,
    okMany: (n) => `✅ اتفتحت لك ${n} باقات`,
    invalid: 'الكوبون ده غير صحيح أو منتهي',
    error: 'حصلت مشكلة، جرّب تاني',
  },
  en: {
    title: '🎟️ Have a coupon?',
    optional: '(optional)',
    placeholder: 'Enter your coupon (optional)',
    apply: 'Apply',
    activePrefix: '🎟️ Coupon',
    activeSuffix: 'applied',
    cancel: 'Remove',
    okOne: (p) => `✅ Package unlocked: ${p.name_en || p.name_ar}`,
    okMany: (n) => `✅ ${n} packages unlocked`,
    invalid: 'This coupon is invalid or expired',
    error: 'Something went wrong, please try again',
  },
};

function Home() {
  const { setShowAuthModal, user } = useAuth();
  const { t, field, lang } = useT();
  const [levels, setLevels] = useState([]);
  const [packages, setPackages] = useState([]);
  const [courseCount, setCourseCount] = useState(0);
  const [whatsapp, setWhatsapp] = useState('');
  const [demo, setDemo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [levelFilter, setLevelFilter] = useState('all');
  const coupon = useCouponPackages();

  useEffect(() => {
    async function loadData() {
      try {
        const [levelsData, packagesData, count, settingsRes] = await Promise.all([
          getLevels(),
          loadPublicPackages(),
          getCourseCount(),
          supabase.from('settings').select('*').eq('id', 1).maybeSingle(),
        ]);
        setLevels(levelsData);
        setPackages(packagesData);
        setCourseCount(count);
        setWhatsapp(settingsRes?.data?.whatsapp_number || '');
        const s = settingsRes?.data;
        setDemo(
          s?.demo_video_url
            ? { url: s.demo_video_url, type: s.demo_video_type || 'youtube', title: s.demo_video_title || '', cover: s.demo_video_cover || '' }
            : null
        );
      } catch (err) {
        console.error('❌ خطأ في جلب البيانات:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const L = COUPON_LABELS[lang === 'en' ? 'en' : 'ar'];
  const allLabel = lang === 'en' ? 'All' : 'الكل';
  const ribbon = lang === 'en' ? '🎟️ Coupon package' : '🎟️ باقة الكوبون';

  const unlockedIds = useMemo(() => new Set(coupon.unlocked.map((p) => String(p.id))), [coupon.unlocked]);
  const levelById = useMemo(() => {
    const m = new Map();
    levels.forEach((lv) => m.set(String(lv.id), lv));
    return m;
  }, [levels]);

  /* الباقات اللي هتظهر: المفتوحة بالكوبون + العامة، بعد البحث والفلتر */
  const q = searchQuery.trim().toLowerCase();
  const filteredPackages = useMemo(() => {
    const map = new Map();
    [...coupon.unlocked, ...packages].forEach((p) => map.set(String(p.id), p));
    let list = [...map.values()];
    if (levelFilter !== 'all') list = list.filter((p) => packageLevelIds(p).includes(levelFilter));
    if (q) list = list.filter((p) => `${p.name_ar || ''} ${p.name_en || ''}`.toLowerCase().includes(q));
    return list;
  }, [packages, coupon.unlocked, levelFilter, q]);

  function subscribeViaWhatsApp(p) {
    if (!whatsapp) {
      alert(lang === 'en' ? '⚠️ WhatsApp number is not set yet' : '⚠️ رقم واتساب لم يُضف بعد');
      return;
    }
    let text = t('waMsg', { name: field(p, 'name') });
    if (coupon.activeCode && unlockedIds.has(String(p.id))) {
      text += lang === 'en' ? ` (coupon ${coupon.activeCode})` : ` (كوبون ${coupon.activeCode})`;
    }
    window.open(`https://wa.me/${whatsapp}?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
  }

  const steps = [
    { title: t('how1'), desc: t('how1d') },
    { title: t('how2'), desc: t('how2d') },
    { title: t('how3'), desc: t('how3d') },
  ];

  return (
    <div id="view-public">
      {/* HERO */}
      <section className="hero">
        <div className="container row">
          <div className="hero-copy">
            <span className="eyebrow-pill">{t('heroEyebrow')}</span>
            <h1>{t('heroTitle')}</h1>
            <p className="lead">{t('heroLead')}</p>
            <div className="hero-actions">
              {!user && (
                <button className="btn btn-gold" onClick={() => setShowAuthModal(true)}>
                  {t('login')}
                </button>
              )}
              <a className="btn btn-outline" href="#packages">{t('seePackages')}</a>
            </div>
          </div>

          <div className="hero-visual">
            {/* الجملة الإنجليزية دايماً LTR حتى في الصفحة العربية */}
            <div className="bt-note">
              <span className="bt-note-label">{t('tipLabel')}</span>
              <p className="bt-sentence" dir="ltr" lang="en">
                She <mark className="bt-mark">has studied</mark> English for 3 years.
              </p>
              <div className="bt-tags">
                <span className="bt-tag" dir="ltr" lang="en">Present Perfect</span>
                <span className="bt-tag" dir="ltr" lang="en">{t('tipRule')}</span>
              </div>
              <small className="bt-hint">{t('tipHint')}</small>
            </div>

            <div className="bt-stats">
              <div className="bt-stat"><b>{loading ? '—' : levels.length}</b><span>{t('statLevels')}</span></div>
              <div className="bt-stat"><b>{loading ? '—' : courseCount}</b><span>{t('statCourses')}</span></div>
              <div className="bt-stat"><b>{loading ? '—' : packages.length}</b><span>{t('statPackages')}</span></div>
            </div>
          </div>
        </div>
      </section>

      {/* فيديو تجريبي (بيظهر لو الأدمن حط رابط) */}
      {demo && <DemoVideo demo={demo} lang={lang} />}

      {/* LEVELS */}
      <section className="block" id="levels">
        <div className="container">
          <div className="section-head">
            <div>
              <h2>{t('levelsTitle')}</h2>
              <p className="section-sub">{t('levelsSub')}</p>
            </div>
          </div>
          <div className="grid grid-4">
            {loading ? (
              <div className="empty-state" style={{ gridColumn: '1/-1' }}>{t('loading')}</div>
            ) : levels.length === 0 ? (
              <div className="empty-state" style={{ gridColumn: '1/-1' }}>{t('noLevels')}</div>
            ) : (
              levels.map((lv, i) => (
                <div className="card level-card" key={lv.id}>
                  <div className="lv-num">{i + 1}</div>
                  <h3>{field(lv, 'name')}</h3>
                  {/* الاسم باللغة التانية كعنوان فرعي */}
                  <p className="level-alt" lang={lang === 'ar' ? 'en' : 'ar'}>
                    {lang === 'ar' ? lv.name_en : lv.name_ar}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS — ترتيب خطوات حقيقي */}
      <section className="block how" id="how">
        <div className="container">
          <div className="section-head"><h2>{t('howTitle')}</h2></div>
          <div className="grid grid-3">
            {steps.map((s, i) => (
              <div className="card bt-step" key={i}>
                <span className="bt-step-num">{i + 1}</span>
                <h3>{s.title}</h3>
                <p>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PACKAGES */}
      <section className="block" id="packages" style={{ background: 'var(--paper-2)' }}>
        <div className="container">
          <div className="section-head">
            <div>
              <h2>{t('packagesTitle')}</h2>
              <p className="section-sub">{t('packagesSub')}</p>
            </div>
          </div>

          {/* خانة الكوبون (اختياري) */}
          <CouponBox coupon={coupon} labels={L} />

          <div className="search-box bt-pkg-search">
            <input
              type="text"
              aria-label={t('searchPlaceholder')}
              placeholder={t('searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* فلتر المراحل */}
          {levels.length > 1 && (
            <div className="level-tabs" role="tablist">
              <button type="button" className={levelFilter === 'all' ? 'active' : ''} onClick={() => setLevelFilter('all')}>
                {allLabel}
              </button>
              {levels.map((lv) => (
                <button
                  key={lv.id}
                  type="button"
                  className={levelFilter === String(lv.id) ? 'active' : ''}
                  onClick={() => setLevelFilter(String(lv.id))}
                >
                  {field(lv, 'name')}
                </button>
              ))}
            </div>
          )}

          <div className="grid grid-3">
            {loading ? (
              <div className="empty-state" style={{ gridColumn: '1/-1' }}>{t('loading')}</div>
            ) : filteredPackages.length === 0 ? (
              <div className="empty-state" style={{ gridColumn: '1/-1' }}>
                {searchQuery || levelFilter !== 'all' ? t('noResults') : t('noPackages')}
              </div>
            ) : (
              filteredPackages.map((p) => (
                <div className="card pkg-card" key={p.id}>
                  {unlockedIds.has(String(p.id)) && <span className="pkg-ribbon">{ribbon}</span>}
                  <h3>{field(p, 'name')}</h3>
                  <div className="pkg-levels">
                    {packageLevelIds(p).map((id) => {
                      const lv = levelById.get(id);
                      return lv ? <span className="level-chip" key={id}>{field(lv, 'name')}</span> : null;
                    })}
                  </div>
                  <div className="price">
                    {p.price} <small>{t('priceUnit', { days: p.duration_days })}</small>
                  </div>
                  <p className="desc">{field(p, 'description')}</p>
                  <button className="btn btn-teal btn-block" onClick={() => subscribeViaWhatsApp(p)}>
                    {t('subscribe')}
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

export default Home;