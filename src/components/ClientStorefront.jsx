/**
 * ClientStorefront — public-facing storefront for Afnan.
 *
 * Sections (top → bottom):
 *   SplashScreen   (one shot per refresh, fades after 4s)
 *   Header         (transparent → glass on scroll)
 *   Hero           (editorial image, brand promise)
 *   CategoryChips  (horizontal scroll, filters the grid)
 *   ProductGrid    (2 cols mobile / 4 cols desktop)
 *   BottomNav      (home, categories, favorites, cart, profile)
 *   Sheets         (Cart / Favorites / Profile — slide up)
 *   ProductDetail  (slide-up bottom sheet)
 *   AIChatWidget   (floating Sparkles button)
 *
 * Exports CATEGORIES (with 'all') and PRODUCT_CATEGORIES (without 'all').
 * The admin panel consumes both so the catalog stays in lockstep.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Heart, ShoppingBag, User, Home, LayoutGrid,
  X, Trash2, Plus, Minus, Sparkles, Phone, MapPin, Shield, LogOut,
} from 'lucide-react';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db } from '../firebase.js';
import ProductGridCard from './ProductGridCard.jsx';
import ProductDetail from './ProductDetail.jsx';
import SplashScreen from './SplashScreen.jsx';
import AIChatWidget from './AIChatWidget.jsx';

/* ------------------------------------------------------------------ *
 *  Category catalog — shared with the admin panel                     *
 * ------------------------------------------------------------------ */
export const CATEGORIES = [
  { key: 'all',        label: 'الكل',     icon: '✨' },
  { key: 'caftan',     label: 'قفطان',    icon: '👑' },
  { key: 'karakou',    label: 'كاراكو',   icon: '🌸' },
  { key: 'blouza',     label: 'بلوزة',    icon: '💫' },
  { key: 'fergani',    label: 'فرقاني',   icon: '💎' },
  { key: 'evening',    label: 'سهرة',     icon: '🌙' },
  { key: 'eid',        label: 'عيد',      icon: '🎀' },
  { key: 'engagement', label: 'خطوبة',    icon: '💍' },
];

export const PRODUCT_CATEGORIES = CATEGORIES.filter((c) => c.key !== 'all');

export const categoryLabel = (key) =>
  CATEGORIES.find((c) => c.key === key)?.label || key;

const STORE_NAME = 'أفنان';
const TAGLINE = 'الفساتين الجزائرية الفاخرة';
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

  return { products, loading, error };
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

  return (
    <div className="min-h-screen bg-pearl text-ink pb-32">
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

      <CategoryChips active={activeCat} onChange={setActiveCat} onJumpToGrid={scrollToGrid} />

      <section ref={gridRef} className="max-w-7xl mx-auto px-4 md:px-8 mt-2">
        <div className="flex items-baseline justify-between mb-4">
          <h2 className="text-xl md:text-2xl font-bold">
            {activeCat === 'all' ? 'كل القطع' : categoryLabel(activeCat)}
          </h2>
          <span className="text-xs text-ink/50">{filtered.length} قطعة</span>
        </div>

        {error && <ErrorState message={error} />}
        {loading && !error && <GridSkeleton />}
        {!loading && !error && filtered.length === 0 && <EmptyState catLabel={activeCat === 'all' ? null : categoryLabel(activeCat)} />}

        {!loading && filtered.length > 0 && (
          <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-5">
            {filtered.map((p, i) => (
              <ProductGridCard
                key={p.id}
                product={p}
                index={i}
                isFavorite={favorites.has(p.id)}
                onToggleFav={() => favorites.toggle(p.id)}
                onOpen={() => setSelected(p)}
              />
            ))}
          </section>
        )}
      </section>

      <BottomNav
        cartCount={cart.count}
        favCount={favorites.ids.length}
        onHome={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
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
        onPick={(k) => { setActiveCat(k); setOpenSheet(null); setTimeout(scrollToGrid, 200); }}
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
      className={`sticky top-0 z-30 transition-all duration-300 safe-top ${
        scrolled ? 'glass shadow-glass' : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-3 flex items-center gap-3">
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <div className="w-9 h-9 rounded-full bg-sage-blush flex items-center justify-center text-white shadow-soft">
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="leading-tight">
            <h1 className="font-display text-xl text-ink">{STORE_NAME}</h1>
            <p className="text-[10px] text-ink/50 font-display italic -mt-1">Afnan</p>
          </div>
        </Link>

        <div className="flex-1 relative max-w-md mx-auto">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink/40" />
          <input
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="ابحثي عن فستان..."
            className="w-full rounded-full bg-white/70 backdrop-blur border border-white/70 pr-10 pl-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sage/40"
          />
        </div>

        <button
          onClick={onOpenFav}
          className="relative w-10 h-10 rounded-full glass flex items-center justify-center"
          aria-label="المفضّلة"
        >
          <Heart className="w-4 h-4" />
          {favCount > 0 && <CountBadge n={favCount} />}
        </button>
        <button
          onClick={onOpenCart}
          className="relative w-10 h-10 rounded-full glass flex items-center justify-center"
          aria-label="السلّة"
        >
          <ShoppingBag className="w-4 h-4" />
          {cartCount > 0 && <CountBadge n={cartCount} />}
        </button>
      </div>
    </header>
  );
}

function CountBadge({ n }) {
  return (
    <span className="absolute -top-1 -left-1 min-w-[18px] h-[18px] px-1 rounded-full bg-sage-blush text-white text-[10px] font-bold flex items-center justify-center">
      {n}
    </span>
  );
}

/* ================================================================== *
 *  Hero                                                               *
 * ================================================================== */
function Hero({ onShopNow }) {
  return (
    <section className="relative max-w-7xl mx-auto px-4 md:px-8 pt-4 md:pt-8">
      <div className="relative rounded-[2rem] md:rounded-[3rem] overflow-hidden bg-cream shadow-glass">
        <div className="grid md:grid-cols-2 items-stretch">
          <div className="relative aspect-[5/4] md:aspect-auto md:min-h-[460px] order-2 md:order-1">
            <img
              src="https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=1200&q=80"
              alt="فستان جزائري فاخر"
              className="absolute inset-0 w-full h-full object-cover"
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
            <div className="absolute inset-0 bg-gradient-to-t md:bg-gradient-to-l from-cream via-cream/40 to-transparent" />
          </div>

          <div className="relative z-10 p-7 md:p-12 flex flex-col justify-center order-1 md:order-2">
            <motion.span
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 self-start px-3 py-1 rounded-full bg-white/80 backdrop-blur text-xs font-medium text-ink/70 mb-4"
            >
              <Sparkles className="w-3 h-3 text-sage" />
              مجموعة موسم ٢٠٢٦
            </motion.span>
            <motion.h2
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="font-display text-4xl md:text-6xl text-ink leading-[1.05]"
            >
              فساتين جزائرية <br />
              <span className="gradient-text">تروي حكاية</span>
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-ink/70 mt-4 text-base md:text-lg max-w-md text-balance"
            >
              قِطع مُختارة بعناية تجمع بين الموروث الجزائري الأصيل واللمسة العصرية —
              للأعراس، السهرات، والعيد.
            </motion.p>
            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              onClick={onShopNow}
              className="btn-primary mt-6 self-start text-base"
            >
              تسوّقي الآن
              <ShoppingBag className="w-4 h-4" />
            </motion.button>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ================================================================== *
 *  Category chips                                                     *
 * ================================================================== */
function CategoryChips({ active, onChange, onJumpToGrid }) {
  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 mt-6 md:mt-10 mb-6">
      <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-1 px-1 py-1">
        {CATEGORIES.map((c) => (
          <button
            key={c.key}
            onClick={() => { onChange(c.key); onJumpToGrid?.(); }}
            className={`chip ${active === c.key ? 'chip-on' : 'chip-off'}`}
          >
            <span className="mr-1">{c.icon}</span>
            {c.label}
          </button>
        ))}
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
        <div key={i} className="card animate-pulse">
          <div className="aspect-[3/4] bg-cream" />
          <div className="p-4 space-y-2">
            <div className="h-3 w-3/4 bg-cream rounded" />
            <div className="h-3 w-1/2 bg-cream rounded" />
          </div>
        </div>
      ))}
    </section>
  );
}

function EmptyState({ catLabel }) {
  return (
    <div className="card p-10 text-center">
      <div className="w-16 h-16 mx-auto rounded-full bg-sage-blush flex items-center justify-center text-white mb-4">
        <Sparkles className="w-7 h-7" />
      </div>
      <h3 className="font-bold text-lg">
        {catLabel ? `لا توجد قطع في "${catLabel}" حالياً` : 'الكتالوغ فاضي مؤقتاً'}
      </h3>
      <p className="text-ink/60 mt-2 text-sm">
        أضيفي القطع الجديدة من لوحة الإدارة وستظهر هنا فوراً.
      </p>
    </div>
  );
}

function ErrorState({ message }) {
  return (
    <div className="card p-8 text-center border-blush/30">
      <p className="text-blush font-bold">حدث خطأ في تحميل المنتجات</p>
      <p className="text-ink/60 text-sm mt-2">{message}</p>
    </div>
  );
}

/* ================================================================== *
 *  Bottom navigation                                                  *
 * ================================================================== */
function BottomNav({ cartCount, favCount, onHome, onCategories, onFav, onCart, onProfile }) {
  const Item = ({ icon: Icon, label, onClick, badge }) => (
    <button onClick={onClick} className="relative flex flex-col items-center gap-1 flex-1 py-2 text-ink/70 active:scale-95 transition">
      <Icon className="w-5 h-5" />
      <span className="text-[10px] font-medium">{label}</span>
      {badge > 0 && (
        <span className="absolute top-1 right-1/2 translate-x-4 min-w-[16px] h-4 px-1 rounded-full bg-sage-blush text-white text-[9px] font-bold flex items-center justify-center">
          {badge}
        </span>
      )}
    </button>
  );

  return (
    <nav className="fixed bottom-3 inset-x-3 z-30">
      <div className="glass rounded-full px-2 py-1 flex items-center safe-bottom">
        <Item icon={Home} label="الرئيسية" onClick={onHome} />
        <Item icon={LayoutGrid} label="الفئات" onClick={onCategories} />
        <Item icon={Heart} label="المفضّلة" onClick={onFav} badge={favCount} />
        <Item icon={ShoppingBag} label="السلّة" onClick={onCart} badge={cartCount} />
        <Item icon={User} label="حسابي" onClick={onProfile} />
      </div>
    </nav>
  );
}

/* ================================================================== *
 *  Sheets (cart / favorites / profile / categories)                   *
 * ================================================================== */
function SheetShell({ open, onClose, title, children }) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-40 bg-ink/40 backdrop-blur-sm"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="fixed inset-x-0 bottom-0 z-50 max-h-[88vh] flex flex-col rounded-t-[2.5rem] bg-pearl shadow-glass"
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 36 }}
          >
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-12 h-1.5 rounded-full bg-ink/15" />
            </div>
            <div className="flex items-center justify-between px-6 py-3 border-b border-cream">
              <h3 className="text-lg font-bold">{title}</h3>
              <button onClick={onClose} className="w-9 h-9 rounded-full bg-white/70 flex items-center justify-center" aria-label="إغلاق">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">{children}</div>
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
        <div className="p-10 text-center">
          <div className="w-16 h-16 mx-auto rounded-full bg-cream flex items-center justify-center mb-3">
            <ShoppingBag className="w-7 h-7 text-ink/40" />
          </div>
          <p className="text-ink/60">سلّتكِ فاضية حالياً</p>
        </div>
      ) : (
        <>
          <ul className="divide-y divide-cream">
            {items.map((i) => (
              <li key={i.id} className="flex gap-3 p-4">
                <div className="w-20 h-20 rounded-2xl overflow-hidden bg-cream shrink-0">
                  {i.image && <img src={i.image} alt="" className="w-full h-full object-cover" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm line-clamp-2">{i.nameAr}</p>
                  <p className="gradient-text font-bold mt-1">{formatDZD(i.price)} دج</p>
                  <div className="flex items-center gap-2 mt-2">
                    <button onClick={() => onDec(i.id)} className="w-7 h-7 rounded-full bg-cream flex items-center justify-center">
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="text-sm font-bold w-6 text-center">{i.qty}</span>
                    <button onClick={() => onInc(i.id)} className="w-7 h-7 rounded-full bg-cream flex items-center justify-center">
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                </div>
                <button onClick={() => onRemove(i.id)} className="w-9 h-9 rounded-full hover:bg-cream flex items-center justify-center text-ink/50 self-start" aria-label="حذف">
                  <Trash2 className="w-4 h-4" />
                </button>
              </li>
            ))}
          </ul>
          <div className="p-5 border-t border-cream safe-bottom">
            <div className="flex items-baseline justify-between mb-4">
              <span className="text-ink/60">المجموع</span>
              <span className="text-2xl font-bold gradient-text">{formatDZD(total)} دج</span>
            </div>
            <button className="btn-primary w-full py-4">
              <ShoppingBag className="w-4 h-4" />
              إتمام الطلب
            </button>
            <button onClick={onClear} className="w-full mt-2 text-sm text-ink/50 hover:text-ink py-2">
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
        <div className="p-10 text-center">
          <div className="w-16 h-16 mx-auto rounded-full bg-cream flex items-center justify-center mb-3">
            <Heart className="w-7 h-7 text-ink/40" />
          </div>
          <p className="text-ink/60">لم تضيفي أي قطعة بعد</p>
          <p className="text-xs text-ink/40 mt-1">اضغطي ❤️ على القطع اللي عجبوكِ</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 p-4">
          {items.map((p) => (
            <div key={p.id} className="card relative">
              <button onClick={() => onOpen(p)} className="block w-full text-right">
                <div className="aspect-[3/4] bg-cream overflow-hidden">
                  {p.images?.[0] && <img src={p.images[0]} alt={p.nameAr} className="w-full h-full object-cover" />}
                </div>
                <div className="p-3">
                  <p className="text-sm font-semibold line-clamp-1">{p.nameAr}</p>
                  <p className="gradient-text font-bold text-sm mt-1">{formatDZD(p.price)} دج</p>
                </div>
              </button>
              <button onClick={() => onRemove(p.id)} className="absolute top-2 left-2 w-8 h-8 rounded-full glass flex items-center justify-center" aria-label="إزالة من المفضّلة">
                <Heart className="w-3.5 h-3.5 fill-blush text-blush" />
              </button>
            </div>
          ))}
        </div>
      )}
    </SheetShell>
  );
}

function ProfileSheet({ open, onClose }) {
  return (
    <SheetShell open={open} onClose={onClose} title="حسابي">
      <div className="p-6 space-y-4">
        <div className="card p-5 flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-sage-blush text-white flex items-center justify-center">
            <User className="w-6 h-6" />
          </div>
          <div>
            <p className="font-bold">مرحبا بكِ في {STORE_NAME}</p>
            <p className="text-xs text-ink/50">{TAGLINE}</p>
          </div>
        </div>

        <InfoRow icon={Phone} label="الاتصال" value="0X XX XX XX XX" />
        <InfoRow icon={MapPin} label="الموقع" value="الجزائر — توصيل لكل الولايات" />
        <InfoRow icon={Shield} label="الدفع" value="آمن، عند الاستلام" />

        <Link
          to="/admin"
          className="card flex items-center gap-3 p-4 hover:bg-cream transition"
          onClick={onClose}
        >
          <div className="w-10 h-10 rounded-full bg-cream flex items-center justify-center">
            <Shield className="w-4 h-4 text-ink/60" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-sm">دخول الإدارة</p>
            <p className="text-xs text-ink/50">للموظفين فقط</p>
          </div>
          <LogOut className="w-4 h-4 text-ink/40 rotate-180" />
        </Link>
      </div>
    </SheetShell>
  );
}

function InfoRow({ icon: Icon, label, value }) {
  return (
    <div className="card flex items-center gap-3 p-4">
      <div className="w-10 h-10 rounded-full bg-cream flex items-center justify-center">
        <Icon className="w-4 h-4 text-ink/60" />
      </div>
      <div className="flex-1">
        <p className="text-xs text-ink/50">{label}</p>
        <p className="font-semibold text-sm">{value}</p>
      </div>
    </div>
  );
}

function CategoriesSheet({ open, active, onPick, onClose }) {
  return (
    <SheetShell open={open} onClose={onClose} title="الفئات">
      <div className="grid grid-cols-2 gap-3 p-5">
        {CATEGORIES.map((c) => (
          <button
            key={c.key}
            onClick={() => onPick(c.key)}
            className={`card p-5 text-center transition ${active === c.key ? 'ring-2 ring-sage' : ''}`}
          >
            <div className="text-3xl mb-2">{c.icon}</div>
            <p className="font-bold">{c.label}</p>
          </button>
        ))}
      </div>
    </SheetShell>
  );
}
