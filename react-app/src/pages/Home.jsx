/* ============================================================
   🏠 Home.jsx — الصفحة الرئيسية
   ------------------------------------------------------------
   - Hero (قسم ترحيبي)
   - Search (بحث)
   - Levels (المراحل الدراسية)
   - Packages (الباقات)
   - كل البيانات من Supabase
   ============================================================ */
import { useEffect, useState } from 'react';
import { getLevels, getPackages, getCourseCount } from '../services/api';
import { useAuth } from '../context/AuthContext';

function Home() {
  const { setShowAuthModal, user } = useAuth();
  const [levels, setLevels] = useState([]);
  const [packages, setPackages] = useState([]);
  const [courseCount, setCourseCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  /* ============================================================
     جلب البيانات من Supabase
     ============================================================ */
  useEffect(() => {
    async function loadData() {
      try {
        const [levelsData, packagesData, count] = await Promise.all([
          getLevels(),
          getPackages(),
          getCourseCount(),
        ]);
        setLevels(levelsData);
        setPackages(packagesData);
        setCourseCount(count);
      } catch (err) {
        console.error('❌ خطأ في جلب البيانات:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  /* ============================================================
     فلترة الباقات حسب البحث
     ============================================================ */
  const filteredPackages = packages.filter((p) =>
    (p.name_ar || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  /* ============================================================
     اشتراك عبر واتساب
     ============================================================ */
  function subscribeViaWhatsApp(packageName) {
    const number = '201000000000'; /* ← غيّر الرقم ده */
    const text = `أهلاً، أنا عايز/ة أشترك في باقة "${packageName}"`;
    window.open(`https://wa.me/${number}?text=${encodeURIComponent(text)}`, '_blank');
  }

  return (
    <div id="view-public">

      {/* ============================================================
          HERO
          ============================================================ */}
      <section className="hero">
        <div className="container row">
          <div className="hero-copy">
            <span className="eyebrow-pill">
              منصة تعليمية بإشراف مس. شيرهان علي
            </span>
            <h1>الإنجليزي يبقى سهل وبسيط مع مس. شيرهان</h1>
            <p className="lead">
              كورسات مرتبة على حسب مرحلتك الدراسية، سلسلة فيديوهات لكل كورس،
              ومتابعة مباشرة.
            </p>
            <div className="hero-actions">
              {!user && (
                <button
                  className="btn btn-gold"
                  onClick={() => setShowAuthModal(true)}
                >
                  تسجيل الدخول
                </button>
              )}
              <a className="btn btn-outline" href="#packages">
                شوف الباقات
              </a>
            </div>
          </div>

          <div className="hero-visual">
            <div className="stat">
              <span>مراحل دراسية</span>
              <b>{loading ? '—' : levels.length}</b>
            </div>
            <div className="stat">
              <span>كورسات</span>
              <b>{loading ? '—' : courseCount}</b>
            </div>
            <div className="stat">
              <span>باقات اشتراك</span>
              <b>{loading ? '—' : packages.length}</b>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          SEARCH
          ============================================================ */}
      <section className="block" id="search-section" style={{ padding: '30px 0' }}>
        <div className="container">
          <div className="search-box">
            <input
              type="text"
              placeholder="🔍 ابحث في الكورسات..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </section>

      {/* ============================================================
          LEVELS
          ============================================================ */}
      <section className="block" id="levels">
        <div className="container">
          <div className="section-head">
            <h2>المراحل الدراسية</h2>
          </div>
          <div className="grid grid-4">
            {loading ? (
              <div className="empty-state" style={{ gridColumn: '1/-1' }}>
                جاري التحميل...
              </div>
            ) : levels.length === 0 ? (
              <div className="empty-state" style={{ gridColumn: '1/-1' }}>
                لسه مفيش مراحل
              </div>
            ) : (
              levels.map((lv, i) => (
                <div className="card level-card" key={lv.id}>
                  <div className="lv-num">{i + 1}</div>
                  <h3>{lv.name_ar}</h3>
                  <p style={{ color: 'var(--ink-soft)', fontSize: '13px', marginTop: '6px' }}>
                    {lv.name_en}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* ============================================================
          PACKAGES
          ============================================================ */}
      <section className="block" id="packages" style={{ background: 'var(--paper-2)' }}>
        <div className="container">
          <div className="section-head">
            <h2>باقات الاشتراك</h2>
          </div>
          <div className="grid grid-3">
            {loading ? (
              <div className="empty-state" style={{ gridColumn: '1/-1' }}>
                جاري التحميل...
              </div>
            ) : filteredPackages.length === 0 ? (
              <div className="empty-state" style={{ gridColumn: '1/-1' }}>
                {searchQuery ? 'مفيش نتايج للبحث' : 'لسه مفيش باقات'}
              </div>
            ) : (
              filteredPackages.map((p) => (
                <div className="card pkg-card" key={p.id}>
                  <h3>{p.name_ar}</h3>
                  <div className="price">
                    {p.price}{' '}
                    <small>ج.م / {p.duration_days} يوم</small>
                  </div>
                  <p className="desc">{p.description_ar || ''}</p>
                  <button
                    className="btn btn-teal btn-block"
                    onClick={() => subscribeViaWhatsApp(p.name_ar)}
                  >
                    اشترك
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