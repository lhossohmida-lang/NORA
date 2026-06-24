/**
 * ClientStorefront — public-facing storefront for Afnan (luxury emerald/gold).
 *
 * Sections (top → bottom):
 *   SplashScreen   (cinematic gold intro, one shot per refresh)
 *   Header         (transparent over hero → glass on scroll)
 *   Hero           (full-bleed cinematic image, Ken-Burns + parallax,
 *                   line-by-line gold headline reveal)
 *   BrandStory     (scroll-revealed emerald story strip)
 *   CategoryChips  (horizontal scroll, sliding gold indicator)
 *   ProductGrid    (staggered reveal, 2 cols mobile / 4 desktop)
 *   BottomNav      (floating bar, sliding emerald indicator + lifted icon)
 *   Sheets         (Cart / Favorites / Profile / Categories — drag-to-dismiss)
 *   ProductDetail  (shared-element image expansion)
 *   AIChatWidget   (floating gold Sparkles button)
 *
 * Exports CATEGORIES (with 'all') and PRODUCT_CATEGORIES (without 'all').
 * The admin panel consumes both so the catalog stays in lockstep.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  motion, AnimatePresence, useScroll, useTransform, useDragControls, useReducedMotion,
} from 'framer-motion';
import {
  Search, Heart, ShoppingBag, User, Home, LayoutGrid,
  X, Trash2, Plus, Minus, Sparkles, Phone, MapPin, Shield, LogOut,
  ChevronLeft, Globe, Bell, BadgeDollarSign, ArrowLeft,
  Crown, Flower2, Sparkle, Gem, Moon, Gift, Diamond,
  Truck, ShieldCheck, Instagram, Facebook,
} from 'lucide-react';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db } from '../firebase.js';
import ProductGridCard from './ProductGridCard.jsx';
import ProductDetail from './ProductDetail.jsx';
import SplashScreen from './SplashScreen.jsx';
import AIChatWidget from './AIChatWidget.jsx';
import { StarGlyph, OrnateDivider, Zellige } from './Ornament.jsx';
import {
  EASE, SPRING, backdrop, sheetPanel, revealLine,
  staggerParent, staggerChild, fadeUp, shouldDismiss,
} from '../lib/motion.js';

/* ------------------------------------------------------------------ *
 *  Category catalog — shared with the admin panel                     *
 * ------------------------------------------------------------------ */
/* `icon` (emoji) is kept for the admin <select> dropdowns; the storefront
 * renders the lucide `Icon` component instead, per the no-emoji brief. */
export const CATEGORIES = [
  { key: 'all',        label: 'الكل',     icon: '✨', Icon: Sparkles },
  { key: 'caftan',     label: 'قفطان',    icon: '👑', Icon: Crown },
  { key: 'karakou',    label: 'كاراكو',   icon: '🌸', Icon: Flower2 },
  { key: 'blouza',     label: 'بلوزة',    icon: '💫', Icon: Sparkle },
  { key: 'fergani',    label: 'فرقاني',   icon: '💎', Icon: Gem },
  { key: 'evening',    label: 'سهرة',     icon: '🌙', Icon: Moon },
  { key: 'eid',        label: 'عيد',      icon: '🎀', Icon: Gift },
  { key: 'engagement', label: 'خطوبة',    icon: '💍', Icon: Diamond },
];

export const PRODUCT_CATEGORIES = CATEGORIES.filter((c) => c.key !== 'all');

export const categoryLabel = (key) =>
  CATEGORIES.find((c) => c.key === key)?.label || key;

const STORE_NAME = 'أفنان';
const TAGLINE = 'الفساتين الجزائرية الفاخرة';
// Looping hero film (PixVerse premium clip), optimized to a muted, faststart
// H.264 loop with a first-frame poster. The poster doubles as the reduced-motion
// still and as the placeholder until the video paints — no flash, no CLS.
const HERO_VIDEO = '/hero/hero-loop.mp4';
const HERO_POSTER = '/hero/hero-poster.jpg';

const formatDZD = (n) =>
  new Intl.NumberFormat('ar-DZ', { maximumFractionDigits: 0 }).format(n || 0);

/* ------------------------------------------------------------------ *
 *  localStorage-backed favorites + cart                               *
 * ------------------------------------------------------------------ */
const FAV_KEY = 'afnan_favorites';
const CART_KEY = 'afnan_cart';

function useFavorites() {
  const [ids, setIds] = useState(() => {
    try { return JSON.parse(localStorage.getItem(FAV_KEY)) || []; } catch { return []; }
  });
  useEffect(() => { localStorage.setItem(FAV_KEY, JSON.stringify(ids)); }, [ids]);
  return {
    ids,
    has: (id) => ids.includes(id),
    toggle: (id) => setIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])),
    clear: () => setIds([]),
  };
}

function useCart() {
  const [items, setItems] = useState(() => {
    try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; } catch { return []; }
  });
  useEffect(() => { localStorage.setItem(CART_KEY, JSON.stringify(items)); }, [items]);
  return {
    items,
    add: (product) => setItems((prev) => {
      const found = prev.find((i) => i.id === product.id);
      if (found) return prev.map((i) => i.id === product.id ? { ...i, qty: i.qty + 1 } : i);
      return [...prev, { id: product.id, nameAr: product.nameAr, price: product.price, image: product.images?.[0], qty: 1 }];
    }),
    setQty: (id, qty) => setItems((prev) =>
      prev.map((i) => i.id === id ? { ...i, qty: Math.max(1, qty) } : i)),
    remove: (id) => setItems((prev) => prev.filter((i) => i.id !== id)),
    clear: () => setItems([]),
    count: items.reduce((s, i) => s + i.qty, 0),
    total: items.reduce((s, i) => s + i.qty * (i.price || 0), 0),
  };
}

/* ------------------------------------------------------------------ *
 *  Firestore products — live subscription                             *
 * ------------------------------------------------------------------ */
function useProducts() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const q = query(collection(db, 'products'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setProducts(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
      (err) => { setError(err.message); setLoading(false); },
    );
    return unsub;
  }, []);

  // TEMP demo data (verification only) — ?demo in the URL shows sample cards
  const demo = typeof window !== 'undefined' && /[?&]demo/.test(window.location.search);
  if (demo && !loading && products.length === 0) {
    return { products: DEMO_PRODUCTS, loading: false, error: null };
  }
  return { products, loading, error };
}

const DEMO_PRODUCTS = [
  { id: 'd1', nameAr: 'قفطان زمردي فاخر', nameEn: 'Emerald Caftan', price: 28000, category: 'caftan', createdAt: new Date(), images: ['https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=600&q=80'] },
  { id: 'd2', nameAr: 'كاراكو مطرّز', nameEn: 'Karakou', price: 32000, category: 'karakou', createdAt: new Date(), images: ['https://images.unsplash.com/photo-1539008835657-9e8e9680c956?auto=format&fit=crop&w=600&q=80'] },
  { id: 'd3', nameAr: 'فستان سهرة ذهبي', nameEn: 'Evening Gown', price: 45000, category: 'evening', images: ['https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&w=600&q=80'] },
  { id: 'd4', nameAr: 'بلوزة وهرانية', nameEn: 'Blouza', price: 19000, category: 'blouza', images: ['https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?auto=format&fit=crop&w=600&q=80'] },
];

/* Honest "جديد" signal: an explicit flag if the catalog sets one, else a recent
 * createdAt (Firestore Timestamp or Date). No fabricated best-seller data. */
export function isNewProduct(product, days = 21) {
  if (!product) return false;
  if (product.isNew === true) return true;
  const raw = product.createdAt;
  if (!raw) return false;
  const d = raw?.toDate?.() ?? new Date(raw);
  return !Number.isNaN(d?.getTime?.()) && Date.now() - d.getTime() < days * 86400000;
}

/* ================================================================== *
 *  Main component                                                     *
 * ================================================================== */
export default function ClientStorefront() {
  const [showSplash, setShowSplash] = useState(true);
  const [scrolled, setScrolled] = useState(false);
  const [activeCat, setActiveCat] = useState('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [openSheet, setOpenSheet] = useState(null); // 'cart' | 'fav' | 'profile' | 'categories'
  const gridRef = useRef(null);

  const { products, loading, error } = useProducts();
  const favorites = useFavorites();
  const cart = useCart();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((p) => {
      const catOk = activeCat === 'all' || p.category === activeCat;
      const searchOk = !q || [p.nameAr, p.nameEn, p.description]
        .filter(Boolean).some((s) => s.toLowerCase().includes(q));
      return catOk && searchOk;
    });
  }, [products, activeCat, search]);

  const favProducts = useMemo(
    () => products.filter((p) => favorites.has(p.id)),
    [products, favorites.ids], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const scrollToGrid = () => {
    gridRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const navActive =
    openSheet === 'cart' ? 'cart'
      : openSheet === 'fav' ? 'fav'
        : openSheet === 'profile' ? 'profile'
          : openSheet === 'categories' ? 'categories'
            : 'home';

  return (
    <div className="lux-page min-h-screen pb-32">
      {showSplash && <SplashScreen onFinish={() => setShowSplash(false)} />}

      <Header
        scrolled={scrolled}
        cartCount={cart.count}
        favCount={favorites.ids.length}
        search={search}
        onSearch={setSearch}
        onOpenCart={() => setOpenSheet('cart')}
        onOpenFav={() => setOpenSheet('fav')}
      />

      <Hero onShopNow={scrollToGrid} />

      <BrandStory onExplore={scrollToGrid} />

      <CategoryChips active={activeCat} onChange={setActiveCat} onJumpToGrid={scrollToGrid} />

      <section ref={gridRef} className="max-w-7xl mx-auto px-4 md:px-8 mt-2 scroll-mt-24">
        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.6 }}
          className="mb-5"
        >
          <div className="flex items-baseline justify-between">
            <h2 className="text-xl md:text-2xl font-bold text-bark flex items-center gap-2.5">
              <span className="text-gold inline-flex"><StarGlyph className="w-4 h-4" /></span>
              {activeCat === 'all' ? 'كل القطع' : categoryLabel(activeCat)}
            </h2>
            <span className="text-xs text-bark/45">{filtered.length} قطعة</span>
          </div>
          <div className="lux-divider w-20 mt-3" />
        </motion.div>

        {error && <ErrorState message={error} />}
        {loading && !error && <GridSkeleton />}
        {!loading && !error && filtered.length === 0 && <EmptyState catLabel={activeCat === 'all' ? null : categoryLabel(activeCat)} />}

        {!loading && filtered.length > 0 && (
          <motion.section
            key={activeCat}
            variants={staggerParent(0.06)}
            initial="hidden"
            animate="show"
            className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-5"
          >
            {filtered.map((p) => (
              <ProductGridCard
                key={p.id}
                product={p}
                isFavorite={favorites.has(p.id)}
                onToggleFav={() => favorites.toggle(p.id)}
                onOpen={() => setSelected(p)}
                onAddToCart={(prod) => cart.add(prod)}
              />
            ))}
          </motion.section>
        )}
      </section>

      <Footer />

      <BottomNav
        active={navActive}
        cartCount={cart.count}
        favCount={favorites.ids.length}
        onHome={() => { setOpenSheet(null); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
        onCategories={() => setOpenSheet('categories')}
        onFav={() => setOpenSheet('fav')}
        onCart={() => setOpenSheet('cart')}
        onProfile={() => setOpenSheet('profile')}
      />

      <ProductDetail
        product={selected}
        onClose={() => setSelected(null)}
        isFavorite={selected ? favorites.has(selected.id) : false}
        onToggleFav={() => selected && favorites.toggle(selected.id)}
        onAddToCart={(p) => { cart.add(p); setSelected(null); setOpenSheet('cart'); }}
      />

      <CartSheet
        open={openSheet === 'cart'}
        items={cart.items}
        total={cart.total}
        onClose={() => setOpenSheet(null)}
        onInc={(id) => cart.setQty(id, (cart.items.find((i) => i.id === id)?.qty || 1) + 1)}
        onDec={(id) => cart.setQty(id, (cart.items.find((i) => i.id === id)?.qty || 1) - 1)}
        onRemove={cart.remove}
        onClear={cart.clear}
      />

      <FavoritesSheet
        open={openSheet === 'fav'}
        items={favProducts}
        onClose={() => setOpenSheet(null)}
        onOpen={(p) => { setOpenSheet(null); setSelected(p); }}
        onRemove={(id) => favorites.toggle(id)}
      />

      <ProfileSheet
        open={openSheet === 'profile'}
        onClose={() => setOpenSheet(null)}
      />

      <CategoriesSheet
        open={openSheet === 'categories'}
        active={activeCat}
        onPick={(k) => { setActiveCat(k); setOpenSheet(null); setTimeout(scrollToGrid, 220); }}
        onClose={() => setOpenSheet(null)}
      />

      <AIChatWidget />
    </div>
  );
}

/* ================================================================== *
 *  Header                                                             *
 * ================================================================== */
function Header({ scrolled, cartCount, favCount, search, onSearch, onOpenCart, onOpenFav }) {
  return (
    <header
      className={`fixed top-0 inset-x-0 z-30 transition-all duration-500 safe-top ${
        scrolled ? 'glass-lux shadow-lux-sm' : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-3 flex items-center gap-3">
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <img
            src="/logo.png"
            alt="أفنان"
            className="w-9 h-9 rounded-full object-cover ring-1 ring-gold/50"
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
          />
          <div className="leading-tight">
            <h1 className="font-display text-2xl gold-text-static">{STORE_NAME}</h1>
            <p className={`text-[10px] font-display italic -mt-1 tracking-[0.2em] transition-colors ${scrolled ? 'text-bark/45' : 'text-ivory/70'}`}>
              Afnan
            </p>
          </div>
        </Link>

        <div className="flex-1 relative max-w-md mx-auto">
          <Search className={`absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors ${scrolled ? 'text-bark/40' : 'text-ivory/70'}`} />
          <input
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="ابحثي عن فستان..."
            className={`w-full rounded-full pr-10 pl-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold/45 transition-all duration-500 ${
              scrolled
                ? 'bg-white/80 border border-black/[0.06] text-bark placeholder:text-bark/40'
                : 'bg-white/15 backdrop-blur-md border border-white/25 text-ivory placeholder:text-ivory/60'
            }`}
          />
        </div>

        <HeaderAction onClick={onOpenFav} scrolled={scrolled} count={favCount} label="المفضّلة">
          <Heart className="w-4 h-4" />
        </HeaderAction>
        <HeaderAction onClick={onOpenCart} scrolled={scrolled} count={cartCount} label="السلّة">
          <ShoppingBag className="w-4 h-4" />
        </HeaderAction>
      </div>
    </header>
  );
}

function HeaderAction({ onClick, scrolled, count, label, children }) {
  return (
    <button
      onClick={onClick}
      className={`relative w-11 h-11 rounded-full flex items-center justify-center transition active:scale-95 ${
        scrolled ? 'glass-lux text-bark' : 'glass-emerald text-ivory'
      }`}
      aria-label={label}
    >
      {children}
      {count > 0 && <CountBadge n={count} />}
    </button>
  );
}

function CountBadge({ n }) {
  return (
    <motion.span
      key={n}
      initial={{ scale: 0.4, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={SPRING.snappy}
      className="absolute -top-1 -left-1 min-w-[18px] h-[18px] px-1 rounded-full bg-gold-fill text-forest text-[10px] font-bold flex items-center justify-center shadow-gold"
    >
      {n}
    </motion.span>
  );
}

/* ================================================================== *
 *  Hero — cinematic, parallax, line-by-line gold reveal               *
 * ================================================================== */
function Hero({ onShopNow }) {
  const reduce = useReducedMotion();
  const videoRef = useRef(null);
  const { scrollY } = useScroll();
  const imgY = useTransform(scrollY, [0, 600], [0, 140]);
  const contentY = useTransform(scrollY, [0, 600], [0, 70]);
  const overlayOpacity = useTransform(scrollY, [0, 380], [1, 0.4]);

  useEffect(() => {
    // Safari/iOS occasionally ignore the autoplay attribute — nudge playback.
    if (!reduce) videoRef.current?.play?.().catch(() => {});
  }, [reduce]);

  return (
    <section className="relative h-[88vh] min-h-[560px] w-full overflow-hidden bg-silk-emerald">
      {/* Parallax film layer (sits on the emerald base, so a missing/failed
          video simply reveals the silk gradient instead of breaking). Motion-
          sensitive visitors get the still poster instead of the looping clip. */}
      <motion.div style={{ y: imgY }} className="absolute inset-0 -bottom-32">
        {reduce ? (
          <img
            src={HERO_POSTER}
            alt="فستان جزائري فاخر"
            className="w-full h-full object-cover object-center"
          />
        ) : (
          <video
            ref={videoRef}
            src={HERO_VIDEO}
            poster={HERO_POSTER}
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            aria-hidden="true"
            tabIndex={-1}
            className="w-full h-full object-cover object-center"
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
          />
        )}
      </motion.div>

      {/* Cinematic overlays */}
      <motion.div style={{ opacity: overlayOpacity }} className="absolute inset-0 bg-gradient-to-t from-forest via-forest/35 to-forest/55" />
      <div className="absolute inset-0 bg-gradient-to-b from-forest/40 via-transparent to-transparent" />

      <motion.div
        style={{ y: contentY }}
        className="relative h-full max-w-7xl mx-auto px-6 md:px-10 flex flex-col justify-end pb-24 md:pb-28"
      >
        <motion.span
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.8, ease: EASE }}
          className="inline-flex items-center gap-2 self-start px-4 py-1.5 rounded-full glass-emerald text-xs font-medium text-gold-soft mb-5"
        >
          <Sparkles className="w-3.5 h-3.5" />
          مجموعة موسم ٢٠٢٦
        </motion.span>

        <motion.h2
          variants={staggerParent(0.14, 0.55)}
          initial="hidden"
          animate="show"
          className="font-display text-[3.25rem] leading-[0.98] md:text-8xl text-ivory max-w-3xl"
        >
          <span className="block overflow-hidden">
            <motion.span variants={revealLine} className="block">الأناقة الجزائرية</motion.span>
          </span>
          <span className="block overflow-hidden pb-2">
            <motion.span variants={revealLine} className="block gold-text">بشكلٍ جديد</motion.span>
          </span>
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.15, duration: 0.8, ease: EASE }}
          className="text-ivory/80 mt-5 text-base md:text-xl max-w-md text-balance leading-relaxed"
        >
          قِطع مُختارة بعناية تجمع الموروث الجزائري الأصيل واللمسة العصرية — للأعراس والسهرات والعيد.
        </motion.p>

        <motion.button
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.35, duration: 0.7, ease: EASE }}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={onShopNow}
          className="btn-gold has-shine mt-8 self-start text-base px-8 py-3.5"
        >
          استكشفي المجموعة
          <ShoppingBag className="w-4 h-4" />
        </motion.button>
      </motion.div>

      {/* Scroll cue */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.7 }}
        transition={{ delay: 2 }}
        className="absolute bottom-6 inset-x-0 flex justify-center"
      >
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
          className="w-6 h-10 rounded-full border border-gold-soft/50 flex items-start justify-center p-1.5"
        >
          <span className="w-1 h-2 rounded-full bg-gold-soft/80" />
        </motion.div>
      </motion.div>
    </section>
  );
}

/* ================================================================== *
 *  Brand story strip — scroll-revealed                                *
 * ================================================================== */
function BrandStory({ onExplore }) {
  return (
    <section className="max-w-7xl mx-auto px-4 md:px-8 mt-10 md:mt-14">
      <motion.div
        variants={fadeUp}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.35 }}
        className="relative overflow-hidden rounded-[2rem] bg-emerald-deep-grad text-ivory px-7 py-9 md:px-14 md:py-12 shadow-lux"
      >
        <Zellige opacity={0.06} />
        <motion.div
          className="absolute -top-10 -left-10 w-48 h-48 rounded-full opacity-30"
          style={{ background: 'radial-gradient(closest-side, rgba(231,206,148,0.5), transparent)' }}
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
        />
        <div className="relative max-w-xl">
          <p className="font-display italic text-gold-soft tracking-[0.25em] text-sm">A Story of Authenticity</p>
          <h3 className="font-display text-4xl md:text-5xl gold-text mt-2">حكاية أصالة</h3>
          <OrnateDivider className="my-5" width="w-28" />
          <p className="text-ivory/80 leading-relaxed text-balance">
            من سهوب الأطلس إلى قاعات الأعراس، كل قطعة تُنسج بحبٍ وحرفية تحفظ روح التراث الجزائري
            وتمنحه لمسةً معاصرة تليق بكِ.
          </p>
          <button onClick={onExplore} className="btn-outline-gold mt-7">
            اكتشفي القصة
            <ArrowLeft className="w-4 h-4" />
          </button>
        </div>
      </motion.div>
    </section>
  );
}

/* ================================================================== *
 *  Category chips — sliding gold indicator                            *
 * ================================================================== */
function CategoryChips({ active, onChange, onJumpToGrid }) {
  const handleClick = (key) => {
    onChange(key);
    onJumpToGrid?.();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 mt-8 md:mt-12 mb-6">
      <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-1 px-1 py-1">
        {CATEGORIES.map((c) => {
          const on = active === c.key;
          return (
            <button
              key={c.key}
              onClick={() => handleClick(c.key)}
              className={`chip-lux relative ${on ? 'chip-lux-on' : 'chip-lux-off'} ${
                on ? '' : 'bg-white/70 border border-black/[0.05]'
              }`}
            >
              {on && (
                <motion.span
                  layoutId="chip-bg"
                  className="absolute inset-0 rounded-full bg-gold-fill shadow-gold"
                  transition={SPRING.pill}
                />
              )}
              <span className="relative z-10 flex items-center gap-1.5">
                <c.Icon className={`w-3.5 h-3.5 ${on ? 'text-forest' : 'text-gold-dark/70'}`} />
                {c.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ================================================================== *
 *  Grid placeholder / empty / error states                            *
 * ================================================================== */
function GridSkeleton() {
  return (
    <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-5">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="card-lux animate-pulse">
          <div className="aspect-[3/4] bg-sand" />
          <div className="p-4 space-y-2">
            <div className="h-3 w-3/4 bg-sand rounded" />
            <div className="h-3 w-1/2 bg-sand rounded" />
          </div>
        </div>
      ))}
    </section>
  );
}

function EmptyState({ catLabel }) {
  return (
    <motion.div variants={fadeUp} initial="hidden" animate="show" className="card-lux p-10 text-center">
      <div className="w-16 h-16 mx-auto rounded-full bg-emerald-deep-grad flex items-center justify-center text-gold-soft mb-4">
        <Sparkles className="w-7 h-7" />
      </div>
      <h3 className="font-bold text-lg text-bark">
        {catLabel ? `لا توجد قطع في "${catLabel}" حالياً` : 'الكتالوغ فاضي مؤقتاً'}
      </h3>
      <p className="text-bark/55 mt-2 text-sm">
        أضيفي القطع الجديدة من لوحة الإدارة وستظهر هنا فوراً.
      </p>
    </motion.div>
  );
}

function ErrorState({ message }) {
  return (
    <div className="card-lux p-8 text-center">
      <p className="text-gold-dark font-bold">حدث خطأ في تحميل المنتجات</p>
      <p className="text-bark/55 text-sm mt-2">{message}</p>
    </div>
  );
}

/* ================================================================== *
 *  Footer — closes the page on deep emerald, with the khatam texture, *
 *  an honest trust strip, contact and a discreet admin entrance.      *
 * ================================================================== */
function Footer() {
  // NOTE: phone/social are placeholders consistent with the rest of the app —
  // the shop owner replaces these with their real number and profile URLs.
  const PHONE = '0X XX XX XX XX';
  const SOCIALS = [
    { Icon: Instagram, label: 'انستغرام', href: 'https://instagram.com' },
    { Icon: Facebook, label: 'فيسبوك', href: 'https://facebook.com' },
  ];

  return (
    <footer className="max-w-7xl mx-auto px-4 md:px-8 mt-16 md:mt-24">
      <motion.div
        variants={fadeUp}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.25 }}
        className="relative overflow-hidden rounded-[2rem] bg-silk-emerald text-ivory shadow-lux"
      >
        <Zellige opacity={0.07} />

        <div className="relative px-7 py-10 md:px-14 md:py-14">
          <div className="text-center">
            <h2 className="font-display text-5xl md:text-6xl gold-text leading-none">{STORE_NAME}</h2>
            <p className="font-display italic text-gold-soft/80 tracking-[0.35em] text-sm mt-1">Afnan</p>
            <OrnateDivider className="mx-auto mt-5 mb-6" width="w-44" />
            <p className="text-ivory/75 max-w-md mx-auto text-balance leading-relaxed">
              {TAGLINE} — قِطعٌ مُختارة تجمع الموروث الجزائري الأصيل واللمسة العصرية.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-9">
            <FooterTrust icon={Truck} title="توصيل لكل الولايات" desc="٥٨ ولاية عبر الوطن" />
            <FooterTrust icon={ShieldCheck} title="الدفع عند الاستلام" desc="آمن وبدون مقدّم" />
            <FooterTrust icon={Sparkles} title="حرفية أصيلة" desc="تطريز وخامات مُنتقاة" />
          </div>

          <div className="mt-9 flex flex-col md:flex-row items-center justify-between gap-5">
            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-ivory/80">
              <a href={`tel:${PHONE.replace(/\s/g, '')}`} className="inline-flex items-center gap-2 hover:text-gold-soft transition">
                <Phone className="w-4 h-4 text-gold-soft" />
                <span dir="ltr">{PHONE}</span>
              </a>
              <span className="inline-flex items-center gap-2">
                <MapPin className="w-4 h-4 text-gold-soft" />
                الجزائر
              </span>
            </div>
            <div className="flex items-center gap-3">
              {SOCIALS.map(({ Icon, label, href }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={label}
                  className="w-11 h-11 rounded-full glass-emerald text-gold-soft flex items-center justify-center transition hover:bg-gold/15 active:scale-95"
                >
                  <Icon className="w-5 h-5" />
                </a>
              ))}
            </div>
          </div>
        </div>

        <div className="relative border-t border-white/10 px-7 md:px-14 py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-ivory/55">
          <span>© {new Date().getFullYear()} {STORE_NAME}. كل الحقوق محفوظة.</span>
          <Link to="/admin" className="inline-flex items-center gap-1.5 hover:text-gold-soft transition">
            <Shield className="w-3.5 h-3.5" />
            دخول الإدارة
          </Link>
        </div>
      </motion.div>
    </footer>
  );
}

function FooterTrust({ icon: Icon, title, desc }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-white/[0.06] border border-white/10 px-4 py-3.5">
      <span className="w-10 h-10 rounded-full bg-white/10 ring-1 ring-gold/40 text-gold-soft flex items-center justify-center shrink-0">
        <Icon className="w-5 h-5" />
      </span>
      <div className="min-w-0">
        <p className="font-semibold text-sm text-ivory leading-tight">{title}</p>
        <p className="text-xs text-ivory/60 mt-0.5">{desc}</p>
      </div>
    </div>
  );
}

/* ================================================================== *
 *  Bottom navigation — sliding emerald indicator + lifted icon        *
 * ================================================================== */
function BottomNav({ active, cartCount, favCount, onHome, onCategories, onFav, onCart, onProfile }) {
  const items = [
    { id: 'home', icon: Home, label: 'الرئيسية', onClick: onHome },
    { id: 'categories', icon: LayoutGrid, label: 'الفئات', onClick: onCategories },
    { id: 'fav', icon: Heart, label: 'المفضّلة', onClick: onFav, badge: favCount },
    { id: 'cart', icon: ShoppingBag, label: 'السلّة', onClick: onCart, badge: cartCount },
    { id: 'profile', icon: User, label: 'حسابي', onClick: onProfile },
  ];

  return (
    <nav className="fixed bottom-3 inset-x-3 z-30">
      <div className="glass-lux rounded-full px-2 py-1.5 flex items-center safe-bottom shadow-lux">
        {items.map(({ id, icon: Icon, label, onClick, badge }) => {
          const on = active === id;
          return (
            <button
              key={id}
              onClick={onClick}
              className="relative flex flex-col items-center justify-center gap-0.5 flex-1 py-2 rounded-full"
            >
              {on && (
                <motion.span
                  layoutId="nav-pill"
                  className="absolute inset-1 rounded-full bg-emerald-deep-grad shadow-lux-sm"
                  transition={SPRING.pill}
                />
              )}
              <motion.span
                animate={{ y: on ? -1 : 0, scale: on ? 1.05 : 1 }}
                transition={SPRING.soft}
                className={`relative z-10 flex flex-col items-center gap-0.5 transition-colors duration-300 ${
                  on ? 'text-gold-soft' : 'text-bark/55'
                }`}
              >
                <span className="relative">
                  <Icon className="w-5 h-5" />
                  {badge > 0 && (
                    <span className="absolute -top-1.5 -right-2 min-w-[15px] h-[15px] px-1 rounded-full bg-gold-fill text-forest text-[9px] font-bold flex items-center justify-center">
                      {badge}
                    </span>
                  )}
                </span>
                <span className="text-[10px] font-medium">{label}</span>
              </motion.span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

/* ================================================================== *
 *  Sheet shell (drag-to-dismiss) — shared by all bottom sheets        *
 * ================================================================== */
function SheetShell({ open, onClose, title, children, maxH = '88vh' }) {
  const dragControls = useDragControls();
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-40 bg-forest/45 backdrop-blur-md"
            variants={backdrop} initial="hidden" animate="show" exit="exit"
            onClick={onClose}
          />
          <motion.div
            className="fixed inset-x-0 bottom-0 z-50 flex flex-col rounded-t-[2.25rem] bg-ivory shadow-lux"
            style={{ maxHeight: maxH }}
            variants={sheetPanel} initial="hidden" animate="show" exit="exit"
            drag="y"
            dragControls={dragControls}
            dragListener={false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={(_, info) => { if (shouldDismiss(info)) onClose(); }}
          >
            <div
              onPointerDown={(e) => dragControls.start(e)}
              className="flex justify-center pt-3 pb-1 cursor-grab active:cursor-grabbing touch-none"
            >
              <div className="w-12 h-1.5 rounded-full bg-bark/15" />
            </div>
            <div className="flex items-center justify-between px-6 py-3 border-b border-black/[0.05]">
              <h3 className="text-lg font-bold text-bark">{title}</h3>
              <button onClick={onClose} className="w-9 h-9 rounded-full glass-lux flex items-center justify-center" aria-label="إغلاق">
                <X className="w-4 h-4 text-bark" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto overscroll-contain">{children}</div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function CartSheet({ open, items, total, onClose, onInc, onDec, onRemove, onClear }) {
  return (
    <SheetShell open={open} onClose={onClose} title="سلّة التسوّق">
      {items.length === 0 ? (
        <EmptySheet icon={ShoppingBag} text="سلّتكِ فاضية حالياً" />
      ) : (
        <>
          <motion.ul
            variants={staggerParent(0.06)} initial="hidden" animate="show"
            className="divide-y divide-black/[0.05]"
          >
            {items.map((i) => (
              <motion.li key={i.id} variants={staggerChild} className="flex gap-3 p-4">
                <div className="w-20 h-20 rounded-2xl overflow-hidden bg-sand shrink-0">
                  {i.image && <img src={i.image} alt="" className="w-full h-full object-cover" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm line-clamp-2 text-bark">{i.nameAr}</p>
                  <p className="gold-text-static font-bold mt-1">{formatDZD(i.price)} دج</p>
                  <div className="flex items-center gap-2 mt-2">
                    <button onClick={() => onDec(i.id)} className="w-7 h-7 rounded-full bg-emerald-deep-grad text-ivory flex items-center justify-center active:scale-90 transition">
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="text-sm font-bold w-6 text-center text-bark">{i.qty}</span>
                    <button onClick={() => onInc(i.id)} className="w-7 h-7 rounded-full bg-emerald-deep-grad text-ivory flex items-center justify-center active:scale-90 transition">
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                </div>
                <button onClick={() => onRemove(i.id)} className="w-9 h-9 rounded-full hover:bg-sand flex items-center justify-center text-bark/45 self-start transition" aria-label="حذف">
                  <Trash2 className="w-4 h-4" />
                </button>
              </motion.li>
            ))}
          </motion.ul>
          <div className="p-5 border-t border-black/[0.05] safe-bottom bg-ivory">
            <div className="flex items-baseline justify-between mb-4">
              <span className="text-bark/55">المجموع</span>
              <span className="text-2xl font-bold gold-text-static">{formatDZD(total)} دج</span>
            </div>
            <button className="btn-gold has-shine w-full py-4">
              <ShoppingBag className="w-4 h-4" />
              إتمام الطلب
            </button>
            <button onClick={onClear} className="w-full mt-2 text-sm text-bark/45 hover:text-bark py-2 transition">
              تفريغ السلّة
            </button>
          </div>
        </>
      )}
    </SheetShell>
  );
}

function FavoritesSheet({ open, items, onClose, onOpen, onRemove }) {
  return (
    <SheetShell open={open} onClose={onClose} title="المفضّلة">
      {items.length === 0 ? (
        <EmptySheet icon={Heart} text="لم تضيفي أي قطعة بعد" hint="اضغطي ♥ على القطع اللي عجبوكِ" />
      ) : (
        <motion.div
          variants={staggerParent(0.06)} initial="hidden" animate="show"
          className="grid grid-cols-2 gap-3 p-4"
        >
          {items.map((p) => (
            <motion.div key={p.id} variants={staggerChild} className="card-lux relative">
              <button onClick={() => onOpen(p)} className="block w-full text-right">
                <div className="aspect-[3/4] bg-sand overflow-hidden">
                  {p.images?.[0] && <img src={p.images[0]} alt={p.nameAr} className="w-full h-full object-cover" />}
                </div>
                <div className="p-3">
                  <p className="text-sm font-semibold line-clamp-1 text-bark">{p.nameAr}</p>
                  <p className="gold-text-static font-bold text-sm mt-1">{formatDZD(p.price)} دج</p>
                </div>
              </button>
              <button onClick={() => onRemove(p.id)} className="absolute top-2 left-2 w-8 h-8 rounded-full glass-lux flex items-center justify-center" aria-label="إزالة من المفضّلة">
                <Heart className="w-3.5 h-3.5 fill-gold text-gold" />
              </button>
            </motion.div>
          ))}
        </motion.div>
      )}
    </SheetShell>
  );
}

function ProfileSheet({ open, onClose }) {
  return (
    <SheetShell open={open} onClose={onClose} title="حسابي">
      <motion.div
        variants={staggerParent(0.07, 0.05)} initial="hidden" animate="show"
        className="p-6 space-y-4"
      >
        <motion.div variants={staggerChild} className="card-lux p-5 flex items-center gap-4 bg-emerald-deep-grad text-ivory border-none">
          <div className="w-14 h-14 rounded-full bg-white/10 ring-2 ring-gold/60 text-gold-soft flex items-center justify-center">
            <User className="w-6 h-6" />
          </div>
          <div>
            <p className="font-bold text-lg">مرحبا بكِ في {STORE_NAME}</p>
            <p className="text-xs text-ivory/70">{TAGLINE}</p>
          </div>
        </motion.div>

        <motion.div variants={staggerChild}>
          <p className="text-xs font-semibold text-bark/50 mb-2 px-1">إعدادات فاخرة</p>
          <div className="card-lux divide-y divide-black/[0.05]">
            <SettingRow icon={Globe} label="اللغة" value="العربية" />
            <SettingRow icon={BadgeDollarSign} label="العملة" value="دج" />
            <SettingRow icon={Bell} label="الإشعارات" value="مفعّلة" />
          </div>
        </motion.div>

        <motion.div variants={staggerChild} className="space-y-3">
          <InfoRow icon={Phone} label="الاتصال" value="0X XX XX XX XX" />
          <InfoRow icon={MapPin} label="الموقع" value="الجزائر — توصيل لكل الولايات" />
          <InfoRow icon={Shield} label="الدفع" value="آمن، عند الاستلام" />
        </motion.div>

        <motion.div variants={staggerChild}>
          <Link
            to="/admin"
            className="card-lux flex items-center gap-3 p-4 hover:bg-sand transition"
            onClick={onClose}
          >
            <div className="w-10 h-10 rounded-full bg-sand flex items-center justify-center">
              <Shield className="w-4 h-4 text-bark/60" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-sm text-bark">دخول الإدارة</p>
              <p className="text-xs text-bark/50">للموظفين فقط</p>
            </div>
            <LogOut className="w-4 h-4 text-bark/40 rotate-180" />
          </Link>
        </motion.div>
      </motion.div>
    </SheetShell>
  );
}

function SettingRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-3 p-4">
      <div className="w-9 h-9 rounded-full bg-sand flex items-center justify-center">
        <Icon className="w-4 h-4 text-emerald" />
      </div>
      <p className="flex-1 font-medium text-sm text-bark">{label}</p>
      <span className="text-xs font-semibold text-gold-dark bg-gold/10 px-3 py-1 rounded-full">{value}</span>
      <ChevronLeft className="w-4 h-4 text-bark/30" />
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }) {
  return (
    <div className="card-lux flex items-center gap-3 p-4">
      <div className="w-10 h-10 rounded-full bg-sand flex items-center justify-center">
        <Icon className="w-4 h-4 text-emerald" />
      </div>
      <div className="flex-1">
        <p className="text-xs text-bark/50">{label}</p>
        <p className="font-semibold text-sm text-bark">{value}</p>
      </div>
    </div>
  );
}

function CategoriesSheet({ open, active, onPick, onClose }) {
  return (
    <SheetShell open={open} onClose={onClose} title="الفئات">
      <motion.div
        variants={staggerParent(0.05)} initial="hidden" animate="show"
        className="grid grid-cols-2 gap-3 p-5"
      >
        {CATEGORIES.map((c) => {
          const on = active === c.key;
          return (
            <motion.button
              key={c.key}
              variants={staggerChild}
              whileTap={{ scale: 0.97 }}
              onClick={() => onPick(c.key)}
              className={`relative h-32 rounded-3xl overflow-hidden flex flex-col items-center justify-center gap-2.5 text-ivory bg-emerald-deep-grad shadow-lux-sm transition ${
                on ? 'ring-2 ring-gold' : ''
              }`}
            >
              <Zellige opacity={0.07} />
              <div
                className="absolute -top-6 -right-6 w-24 h-24 rounded-full opacity-25"
                style={{ background: 'radial-gradient(closest-side, rgba(231,206,148,0.6), transparent)' }}
              />
              <span className="relative z-10 w-12 h-12 rounded-full bg-white/10 ring-1 ring-gold/45 flex items-center justify-center text-gold-soft">
                <c.Icon className="w-6 h-6" />
              </span>
              <p className="font-bold relative z-10">{c.label}</p>
              {on && <span className="absolute bottom-2 inset-x-0 mx-auto w-8 lux-divider" />}
            </motion.button>
          );
        })}
      </motion.div>
    </SheetShell>
  );
}

function EmptySheet({ icon: Icon, text, hint }) {
  return (
    <div className="p-12 text-center">
      <div className="w-16 h-16 mx-auto rounded-full bg-sand flex items-center justify-center mb-3">
        <Icon className="w-7 h-7 text-bark/35" />
      </div>
      <p className="text-bark/60">{text}</p>
      {hint && <p className="text-xs text-bark/40 mt-1">{hint}</p>}
    </div>
  );
}
