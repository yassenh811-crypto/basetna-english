/* ============================================================
   🏠 Home.jsx — الصفحة الرئيسية (عربي / English)
   ------------------------------------------------------------
   الشكل: نفس تركيب الموقع المرجعي (هيرو بلوحة «اللاب»، شريط الخطوات، كروت المراحل
   برسم توضيحي، الباقات، بانر ختامي) — والمحتوى والنصوص بتاعة بسّطنا الإنجليزي.
   التغييرات:
   - شلنا الكوبونات والخصم خالص (خانة الكوبون + الباقات المربوطة بكوبون)
   - زرار «اشترك» بيفتح نافذة الدفع بالتحويل: رقم التحويل، وبعدها الاسم
     وصورة التحويل (إجباري). مفيش واتساب في الاشتراك.
   ============================================================ */
import { useEffect, useMemo, useState } from 'react';
import { getLevels, getPackages, getCourseCount } from '../services/api';
import { supabase } from '../services/supabase';
import { useAuth } from '../context/AuthContext';
import { useT } from '../i18n/useT';
import { payLabels } from '../i18n/payLabels';
import { packageLevelIds } from '../utils/packages';
import DemoVideo from '../components/DemoVideo';
import PurchaseModal from '../components/payments/PurchaseModal';

/* الباقات اللي بتظهر للناس.
   (الباقات القديمة اللي كانت مخفية بكوبون لسه مخفية، احذفيها من لوحة الباقات) */
async function loadPublicPackages() {
  const { data, error } = await supabase
    .from('packages')
    .select('*')
    .eq('is_active', true)
    .eq('coupon_required', false)
    .order('price', { ascending: true });
  if (!error && data) return data;
  const fallback = await getPackages();
  return (fallback || []).filter((p) => !p.coupon_required);
}

function Home() {
  const { setShowAuthModal, user } = useAuth();
  const { t, field, lang } = useT();
  const P = payLabels(lang);
  const [levels, setLevels] = useState([]);
  const [packages, setPackages] = useState([]);
  const [courseCount, setCourseCount] = useState(0);
  const [demo, setDemo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [levelFilter, setLevelFilter] = useState('all');
  const [buying, setBuying] = useState(null);
  const [labPlaying, setLabPlaying] = useState(false);

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

  const allLabel = lang === 'en' ? 'All' : 'الكل';
  const isEn = lang === 'en';
  const lab = {
    top: 'THE ENGLISH LAB',
    step: '01 / UNDERSTAND',
    translation: isEn ? 'She has been studying English for 3 years.' : 'هي بتدرس إنجليزي بقالها 3 سنين.',
    caption: isEn ? 'Understand the rule. Then use it.' : 'افهم القاعدة. وبعدين استخدمها.',
    sub: 'GRAMMAR → SPEAKING → CONFIDENCE',
    try: isEn ? 'Try it' : 'جرّب',
  };
  const glyphs = ['Hi!', 'Aa', 'ABC', '123'];

  const levelById = useMemo(() => {
    const m = new Map();
    levels.forEach((lv) => m.set(String(lv.id), lv));
    return m;
  }, [levels]);

  /* الباقات بعد البحث والفلتر */
  const q = searchQuery.trim().toLowerCase();
  const filteredPackages = useMemo(() => {
    let list = [...packages];
    if (levelFilter !== 'all') list = list.filter((p) => packageLevelIds(p).includes(levelFilter));
    if (q) list = list.filter((p) => `${p.name_ar || ''} ${p.name_en || ''}`.toLowerCase().includes(q));
    return list;
  }, [packages, levelFilter, q]);

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

          <div className={`hero-visual hero-lab ${labPlaying ? 'playing' : ''}`}>
            <div className="lab-top">
              <span>{lab.top}</span>
              <span>{lab.step}</span>
            </div>

            <div className="lab-stage">
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
                <div className="bt-translation" aria-live="polite">{lab.translation}</div>
              </div>

              <div className="bt-stats">
                <div className="bt-stat"><b>{loading ? '—' : levels.length}</b><span>{t('statLevels')}</span></div>
                <div className="bt-stat"><b>{loading ? '—' : courseCount}</b><span>{t('statCourses')}</span></div>
                <div className="bt-stat"><b>{loading ? '—' : packages.length}</b><span>{t('statPackages')}</span></div>
              </div>
            </div>

            <div className="lab-bottom">
              <span>
                <strong>{lab.caption}</strong>
                <br />
                <small>{lab.sub}</small>
              </span>
              <button type="button" className="lab-button" onClick={() => setLabPlaying(true)}>
                {lab.try}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* فيديو تجريبي (بيظهر لو الأدمن حط رابط) */}
      {demo && <DemoVideo demo={demo} lang={lang} />}

      {/* شريط الخطوات (إزاي الموقع شغّال) */}
      <div className="container" id="how">
        <div className="track-strip">
          {steps.map((st, i) => (
            <div key={i}>
              <span className="number">{String(i + 1).padStart(2, '0')} —</span>
              <span>
                {st.title}
                <small>{st.desc}</small>
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* LEVELS */}
      <section className="block" id="levels">
        <div className="container">
          <div className="section-head">
            <div>
              <div className="eyebrow">LEARNING PATHS</div>
              <h2>{t('levelsTitle')}</h2>
              <p className="section-sub">{t('levelsSub')}</p>
            </div>
            <a className="text-btn" href="#packages">{t('seePackages')}</a>
          </div>
          <div className="grid grid-3">
            {loading ? (
              <div className="empty-state" style={{ gridColumn: '1/-1' }}>{t('loading')}</div>
            ) : levels.length === 0 ? (
              <div className="empty-state" style={{ gridColumn: '1/-1' }}>{t('noLevels')}</div>
            ) : (
              levels.map((lv, i) => (
                <article className="card level-card" key={lv.id}>
                  <div className={`level-art lv-${i % 3}`}>
                    <div className="level-caption">
                      <span>LEVEL {String(i + 1).padStart(2, '0')}</span>
                      <b>{field(lv, 'name')}</b>
                      <small>{lang === 'ar' ? lv.name_en : lv.name_ar}</small>
                    </div>
                    <div className="level-diagram" aria-hidden="true">
                      <div className="mini-card">
                        <b>{glyphs[i % glyphs.length]}</b>
                        <i /><i />
                        <span className="mc-check">✓</span>
                      </div>
                    </div>
                  </div>
                  <div className="card-body">
                    <h3>{field(lv, 'name')}</h3>
                    {/* الاسم باللغة التانية كعنوان فرعي */}
                    <p className="level-alt" lang={lang === 'ar' ? 'en' : 'ar'}>
                      {lang === 'ar' ? lv.name_en : lv.name_ar}
                    </p>
                  </div>
                </article>
              ))
            )}
          </div>
        </div>
      </section>

      {/* PACKAGES */}
      <section className="block" id="packages">
        <div className="container">
          <div className="section-head">
            <div>
              <div className="eyebrow">PACKAGES</div>
              <h2>{t('packagesTitle')}</h2>
              <p className="section-sub">{P.packagesSub}</p>
            </div>
          </div>

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
                  <button className="btn btn-teal btn-block" onClick={() => setBuying(p)}>
                    {P.subscribeBtn}
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* بانر ختامي */}
      <div className="container">
        <div className="banner">
          <div>
            <span className="badge">{isEn ? 'Your learning space' : 'مساحتك للتعلّم'}</span>
            <h2 style={{ marginTop: 10 }}>{isEn ? 'Every step counts. Start today.' : 'كل خطوة بتفرق. ابدأ النهارده.'}</h2>
            <p>{isEn ? 'Courses organized by your stage, with direct follow-up from Miss Sherhan.' : 'كورسات مرتبة على حسب مرحلتك، ومتابعة مباشرة من مس شيرهان.'}</p>
          </div>
          <div>
            <a className="btn btn-gold" href="#packages">{t('seePackages')}</a>
          </div>
        </div>
      </div>

      {buying && <PurchaseModal pkg={buying} levels={levels} onClose={() => setBuying(null)} />}
    </div>
  );
}

export default Home;