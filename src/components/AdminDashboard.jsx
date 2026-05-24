/**
 * AdminDashboard — back-office shell for Afnan.
 *
 * Layout
 *   ┌──────────┬──────────────────────────────────────┐
 *   │ Sidebar  │ Topbar                                │
 *   │          ├──────────────────────────────────────┤
 *   │ Overview │ KPIs / panel content                  │
 *   │ Orders   │                                       │
 *   │ Catalog  │                                       │
 *   │ AI Std.  │                                       │
 *   └──────────┴──────────────────────────────────────┘
 *
 * Panels (kept in this file because they share a lot of state and helpers):
 *   - OverviewPanel  → KPI cards + AI Studio quick-action + recent activity
 *   - OrdersPanel    → last 8 orders, empty state
 *   - ProductsPanel  → grid with edit/delete + opens EditProductModal
 *   - AIStudioPanel  → hub linking to /admin/new + writing tips
 *
 * AdminAIAssistant is mounted at the root so it floats above every panel.
 */
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, ShoppingBag, Package, Wand2, Search, LogOut,
  Plus, Pencil, Trash2, Loader2, Sparkles, TrendingUp, Image as ImageIcon,
  Eye, X, Save, ChevronLeft,
} from 'lucide-react';
import {
  collection, deleteDoc, doc, onSnapshot, orderBy, query, updateDoc, serverTimestamp,
} from 'firebase/firestore';
import { signOut, onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '../firebase.js';
import { PRODUCT_CATEGORIES, categoryLabel } from './ClientStorefront.jsx';
import { generateProductContent } from '../lib/openrouter.js';
import AdminAIAssistant from './AdminAIAssistant.jsx';

const formatDZD = (n) =>
  new Intl.NumberFormat('ar-DZ', { maximumFractionDigits: 0 }).format(n || 0);

const SECTIONS = [
  { key: 'overview', label: 'نظرة عامة', icon: LayoutDashboard },
  { key: 'orders',   label: 'الطلبات',  icon: ShoppingBag },
  { key: 'catalog',  label: 'الكتالوغ', icon: Package },
  { key: 'ai',       label: 'AI Studio', icon: Wand2 },
];

/* ------------------------------------------------------------------ *
 *  Live data hooks                                                    *
 * ------------------------------------------------------------------ */
function useCollection(name, opts = {}) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const q = opts.orderField
      ? query(collection(db, name), orderBy(opts.orderField, opts.direction || 'desc'))
      : collection(db, name);
    const unsub = onSnapshot(
      q,
      (snap) => { setItems(snap.docs.map((d) => ({ id: d.id, ...d.data() }))); setLoading(false); },
      () => setLoading(false),
    );
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name]);
  return { items, loading };
}

function thirtyDaysAgo() {
  const d = new Date(); d.setDate(d.getDate() - 30); return d;
}

/* ================================================================== *
 *  Main shell                                                         *
 * ================================================================== */
export default function AdminDashboard() {
  const [section, setSection] = useState('overview');
  const [search, setSearch] = useState('');
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  const { items: products, loading: prodLoading } = useCollection('products', { orderField: 'createdAt' });
  const { items: orders } = useCollection('orders', { orderField: 'createdAt' });
  const { items: chatMessages } = useCollection('chatMessages', { orderField: 'createdAt' });

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, setUser);
    return unsub;
  }, []);

  const revenue30 = useMemo(() => {
    const cutoff = thirtyDaysAgo();
    return orders
      .filter((o) => {
        const t = o.createdAt?.toDate?.() || (o.createdAt ? new Date(o.createdAt) : null);
        return t && t >= cutoff;
      })
      .reduce((s, o) => s + Number(o.total || 0), 0);
  }, [orders]);

  const handleSignOut = async () => {
    await signOut(auth);
    navigate('/admin/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-pearl text-ink">
      <div className="flex">
        <Sidebar section={section} onPick={setSection} onSignOut={handleSignOut} />

        <main className="flex-1 min-w-0">
          <Topbar
            search={search}
            onSearch={setSearch}
            user={user}
            onSignOut={handleSignOut}
          />

          <div className="px-5 md:px-8 py-6 pb-32">
            {section === 'overview' && (
              <OverviewPanel
                products={products}
                orders={orders}
                chatMessages={chatMessages}
                revenue30={revenue30}
              />
            )}
            {section === 'orders' && <OrdersPanel orders={orders} />}
            {section === 'catalog' && (
              <ProductsPanel
                products={products}
                loading={prodLoading}
                search={search}
              />
            )}
            {section === 'ai' && <AIStudioPanel />}
          </div>
        </main>
      </div>

      <AdminAIAssistant
        products={products}
        orders={orders}
        revenue={revenue30}
        customerMessages={chatMessages}
      />
    </div>
  );
}

/* ================================================================== *
 *  Sidebar                                                            *
 * ================================================================== */
function Sidebar({ section, onPick, onSignOut }) {
  return (
    <aside className="hidden md:flex w-64 shrink-0 min-h-screen bg-white/60 backdrop-blur-xl border-l border-cream flex-col">
      <div className="p-6 border-b border-cream">
        <Link to="/" className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-sage-blush flex items-center justify-center text-white">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <p className="font-display text-2xl leading-none">أفنان</p>
            <p className="text-[10px] text-ink/50 mt-0.5">لوحة الإدارة</p>
          </div>
        </Link>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {SECTIONS.map((s) => {
          const Icon = s.icon;
          const on = section === s.key;
          return (
            <button
              key={s.key}
              onClick={() => onPick(s.key)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium transition ${
                on ? 'bg-sage-blush text-white shadow-soft' : 'text-ink/70 hover:bg-cream'
              }`}
            >
              <Icon className="w-4 h-4" />
              {s.label}
            </button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-cream">
        <button
          onClick={onSignOut}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium text-ink/70 hover:bg-cream"
        >
          <LogOut className="w-4 h-4" />
          تسجيل الخروج
        </button>
      </div>
    </aside>
  );
}

/* ================================================================== *
 *  Topbar                                                             *
 * ================================================================== */
function Topbar({ search, onSearch, user, onSignOut }) {
  return (
    <div className="sticky top-0 z-20 glass border-b border-cream px-5 md:px-8 py-3 flex items-center gap-3">
      <Link to="/" className="md:hidden flex items-center gap-2 text-ink/70">
        <ChevronLeft className="w-4 h-4" />
      </Link>

      <div className="flex-1 relative max-w-md">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink/40" />
        <input
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="ابحثي في الكتالوغ..."
          className="w-full rounded-full bg-white/70 border border-white/70 pr-10 pl-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sage/40"
        />
      </div>

      <div className="flex items-center gap-2">
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/70">
          <div className="w-7 h-7 rounded-full bg-sage-blush text-white flex items-center justify-center text-xs font-bold">
            {(user?.email?.[0] || 'A').toUpperCase()}
          </div>
          <span className="text-xs text-ink/70 max-w-[140px] truncate" dir="ltr">{user?.email || 'admin'}</span>
        </div>
        <button
          onClick={onSignOut}
          className="md:hidden w-9 h-9 rounded-full bg-white/70 flex items-center justify-center"
          aria-label="خروج"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

/* ================================================================== *
 *  Overview                                                           *
 * ================================================================== */
function OverviewPanel({ products, orders, chatMessages, revenue30 }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">نظرة عامة</h1>
        <p className="text-ink/60 text-sm mt-1">ملخّص نشاط متجر أفنان</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KPI label="إيرادات آخر 30 يوم" value={`${formatDZD(revenue30)} دج`} icon={TrendingUp} accent="from-sage to-blush" />
        <KPI label="إجمالي الطلبات" value={orders.length} icon={ShoppingBag} accent="from-blush to-champagne" />
        <KPI label="المنتجات" value={products.length} icon={Package} accent="from-champagne to-sage" />
      </div>

      <Link
        to="/admin/new"
        className="block card p-6 bg-sage-blush text-white hover:shadow-bloom transition"
      >
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center">
            <Wand2 className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <p className="text-xs uppercase tracking-wider opacity-80">AI Studio</p>
            <p className="text-xl font-bold mt-0.5">أضيفي منتجاً جديداً بمساعدة الذكاء الاصطناعي</p>
            <p className="text-sm opacity-90 mt-1">ارفعي الصور، اكتبي كلمات مفتاحية، والـ AI يولّد الاسم والوصف.</p>
          </div>
          <Plus className="w-6 h-6 hidden md:block" />
        </div>
      </Link>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold">آخر الطلبات</h3>
            <span className="text-xs text-ink/50">{orders.length} طلب</span>
          </div>
          {orders.slice(0, 5).map((o) => (
            <div key={o.id} className="flex items-center justify-between py-2 border-b border-cream last:border-0">
              <div>
                <p className="text-sm font-semibold">{o.customerName || 'زبونة'}</p>
                <p className="text-xs text-ink/50">{(o.items?.length || 0)} قطعة</p>
              </div>
              <span className="text-sm font-bold gradient-text">{formatDZD(o.total)} دج</span>
            </div>
          ))}
          {orders.length === 0 && <p className="text-sm text-ink/50 py-4 text-center">لا توجد طلبات بعد</p>}
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold">رسائل الشات</h3>
            <span className="text-xs text-ink/50">{chatMessages.length} رسالة</span>
          </div>
          {chatMessages.slice(-5).reverse().map((m) => (
            <div key={m.id} className="py-2 border-b border-cream last:border-0">
              <p className="text-xs text-ink/50 mb-1">
                {m.role === 'user' ? 'زبونة' : 'الـ AI'} · {String(m.sessionId || '').slice(-6)}
              </p>
              <p className="text-sm text-ink line-clamp-2">{m.text}</p>
            </div>
          ))}
          {chatMessages.length === 0 && <p className="text-sm text-ink/50 py-4 text-center">لا توجد رسائل بعد</p>}
        </div>
      </div>
    </div>
  );
}

function KPI({ label, value, icon: Icon, accent }) {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between">
        <p className="text-xs text-ink/60">{label}</p>
        <div className={`w-9 h-9 rounded-2xl bg-gradient-to-br ${accent} text-white flex items-center justify-center`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <p className="text-2xl md:text-3xl font-bold mt-3">{value}</p>
    </div>
  );
}

/* ================================================================== *
 *  Orders panel                                                       *
 * ================================================================== */
function OrdersPanel({ orders }) {
  const recent = orders.slice(0, 8);
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">الطلبات</h1>
          <p className="text-ink/60 text-sm mt-1">إدارة طلبات الزبائن</p>
        </div>
        <span className="text-sm text-ink/50">{orders.length} إجمالاً</span>
      </div>

      {recent.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="w-16 h-16 mx-auto rounded-full bg-cream flex items-center justify-center mb-3">
            <ShoppingBag className="w-7 h-7 text-ink/40" />
          </div>
          <p className="font-bold">لا توجد طلبات حالياً</p>
          <p className="text-sm text-ink/60 mt-1">ستظهر هنا حال وصول أوّل طلب.</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="hidden md:grid grid-cols-12 gap-3 px-5 py-3 bg-cream/50 text-xs font-semibold text-ink/60">
            <div className="col-span-4">الزبونة</div>
            <div className="col-span-2">القطع</div>
            <div className="col-span-3">التاريخ</div>
            <div className="col-span-3 text-left">المبلغ</div>
          </div>
          {recent.map((o) => (
            <div key={o.id} className="grid grid-cols-12 gap-3 px-5 py-4 border-t border-cream items-center">
              <div className="col-span-12 md:col-span-4">
                <p className="font-semibold text-sm">{o.customerName || 'زبونة'}</p>
                <p className="text-xs text-ink/50">{o.phone || ''}</p>
              </div>
              <div className="col-span-4 md:col-span-2 text-sm">{o.items?.length || 0} قطعة</div>
              <div className="col-span-4 md:col-span-3 text-xs text-ink/60">
                {o.createdAt?.toDate?.()?.toLocaleDateString('ar-DZ') || '-'}
              </div>
              <div className="col-span-4 md:col-span-3 md:text-left">
                <span className="gradient-text font-bold">{formatDZD(o.total)} دج</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ================================================================== *
 *  Products panel + edit modal                                        *
 * ================================================================== */
function ProductsPanel({ products, loading, search }) {
  const [editing, setEditing] = useState(null);

  const filtered = useMemo(() => {
    const q = (search || '').trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) =>
      [p.nameAr, p.nameEn, p.description].filter(Boolean).some((s) => s.toLowerCase().includes(q)),
    );
  }, [products, search]);

  const remove = async (p) => {
    if (!confirm(`حذف "${p.nameAr}" نهائياً؟`)) return;
    await deleteDoc(doc(db, 'products', p.id));
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">الكتالوغ</h1>
          <p className="text-ink/60 text-sm mt-1">إدارة منتجات أفنان</p>
        </div>
        <Link to="/admin/new" className="btn-primary">
          <Plus className="w-4 h-4" />
          منتج جديد
        </Link>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="card animate-pulse">
              <div className="aspect-[3/4] bg-cream" />
              <div className="p-4 space-y-2">
                <div className="h-3 w-3/4 bg-cream rounded" />
                <div className="h-3 w-1/2 bg-cream rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="w-16 h-16 mx-auto rounded-full bg-cream flex items-center justify-center mb-3">
            <Package className="w-7 h-7 text-ink/40" />
          </div>
          <p className="font-bold">{search ? 'لا توجد نتائج' : 'الكتالوغ فاضي'}</p>
          <p className="text-sm text-ink/60 mt-1">
            {search ? 'جرّبي كلمة بحث أخرى.' : 'ابدئي بإضافة أوّل منتج لكِ.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map((p) => (
            <AdminProductCard
              key={p.id}
              product={p}
              onEdit={() => setEditing(p)}
              onDelete={() => remove(p)}
            />
          ))}
        </div>
      )}

      <EditProductModal product={editing} onClose={() => setEditing(null)} />
    </div>
  );
}

function AdminProductCard({ product, onEdit, onDelete }) {
  return (
    <div className="card group relative">
      <div className="aspect-[3/4] bg-cream overflow-hidden relative">
        {product.images?.[0] ? (
          <img src={product.images[0]} alt={product.nameAr} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-ink/30">
            <ImageIcon className="w-8 h-8" />
          </div>
        )}
        <span className="absolute top-2 right-2 glass-dark text-[10px] px-2 py-1 rounded-full">
          {categoryLabel(product.category)}
        </span>
      </div>
      <div className="p-3">
        <p className="font-semibold text-sm line-clamp-1">{product.nameAr}</p>
        <p className="gradient-text font-bold mt-1">{formatDZD(product.price)} دج</p>
        <div className="grid grid-cols-2 gap-2 mt-3">
          <button onClick={onEdit} className="flex items-center justify-center gap-1.5 py-2 rounded-xl bg-cream text-xs font-medium hover:bg-sage hover:text-white transition">
            <Pencil className="w-3 h-3" />
            تعديل
          </button>
          <button onClick={onDelete} className="flex items-center justify-center gap-1.5 py-2 rounded-xl bg-cream text-xs font-medium hover:bg-blush hover:text-white transition">
            <Trash2 className="w-3 h-3" />
            حذف
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 *  EditProductModal                                                   *
 * ------------------------------------------------------------------ */
function EditProductModal({ product, onClose }) {
  const [form, setForm] = useState({ nameAr: '', nameEn: '', price: 0, category: 'caftan', description: '' });
  const [busy, setBusy] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (product) {
      setForm({
        nameAr: product.nameAr || '',
        nameEn: product.nameEn || '',
        price: product.price || 0,
        category: product.category || 'caftan',
        description: product.description || '',
      });
      setError(null);
    }
  }, [product]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const aiFill = async () => {
    const keywords = form.nameAr || form.nameEn || categoryLabel(form.category);
    if (!keywords.trim()) { setError('اكتبي كلمة مفتاحية أو اختاري فئة أوّلاً.'); return; }
    setError(null);
    setAiBusy(true);
    try {
      const out = await generateProductContent(keywords);
      setForm((f) => ({
        ...f,
        nameAr: out.nameAr || f.nameAr,
        nameEn: out.nameEn || f.nameEn,
        description: out.description || f.description,
      }));
    } catch (err) {
      setError(err.message);
    } finally {
      setAiBusy(false);
    }
  };

  const save = async () => {
    setError(null);
    setBusy(true);
    try {
      await updateDoc(doc(db, 'products', product.id), {
        nameAr: form.nameAr.trim(),
        nameEn: form.nameEn.trim(),
        price: Number(form.price) || 0,
        category: form.category,
        description: form.description.trim(),
        updatedAt: serverTimestamp(),
      });
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AnimatePresence>
      {product && (
        <>
          <motion.div
            className="fixed inset-0 z-40 bg-ink/40 backdrop-blur-sm"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="fixed inset-x-0 bottom-0 md:inset-0 z-50 md:flex md:items-center md:justify-center md:p-6"
            initial={{ y: '100%', opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', stiffness: 320, damping: 36 }}
          >
            <div className="bg-pearl rounded-t-[2.5rem] md:rounded-3xl shadow-glass max-h-[88vh] md:max-w-2xl w-full overflow-y-auto">
              <div className="flex items-center justify-between px-6 py-4 border-b border-cream sticky top-0 bg-pearl">
                <h3 className="font-bold text-lg">تعديل المنتج</h3>
                <button onClick={onClose} className="w-9 h-9 rounded-full bg-white/70 flex items-center justify-center" aria-label="إغلاق">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                {product.images?.[0] && (
                  <div className="aspect-[3/2] rounded-2xl overflow-hidden bg-cream">
                    <img src={product.images[0]} alt="" className="w-full h-full object-cover" />
                  </div>
                )}

                <div>
                  <label className="label flex items-center justify-between">
                    <span>الاسم بالعربية</span>
                    <button
                      type="button"
                      onClick={aiFill}
                      disabled={aiBusy}
                      className="inline-flex items-center gap-1.5 text-xs px-3 py-1 rounded-full bg-sage-blush text-white disabled:opacity-50"
                    >
                      {aiBusy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                      توليد بـ AI
                    </button>
                  </label>
                  <input className="field" value={form.nameAr} onChange={(e) => set('nameAr', e.target.value)} />
                </div>

                <div>
                  <label className="label">Name (English)</label>
                  <input className="field" dir="ltr" value={form.nameEn} onChange={(e) => set('nameEn', e.target.value)} />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">السعر (دج)</label>
                    <input
                      type="number"
                      className="field"
                      value={form.price}
                      onChange={(e) => set('price', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="label">الفئة</label>
                    <select
                      className="field"
                      value={form.category}
                      onChange={(e) => set('category', e.target.value)}
                    >
                      {PRODUCT_CATEGORIES.map((c) => (
                        <option key={c.key} value={c.key}>{c.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="label">الوصف</label>
                  <textarea
                    rows={3}
                    className="field resize-none"
                    value={form.description}
                    onChange={(e) => set('description', e.target.value)}
                  />
                </div>

                {error && <p className="text-sm text-blush">{error}</p>}
              </div>

              <div className="px-6 py-4 border-t border-cream flex gap-3 sticky bottom-0 bg-pearl safe-bottom">
                <button onClick={onClose} className="btn-ghost flex-1">إلغاء</button>
                <button onClick={save} disabled={busy} className="btn-primary flex-1">
                  {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  حفظ
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/* ================================================================== *
 *  AI Studio panel                                                    *
 * ================================================================== */
function AIStudioPanel() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">AI Studio</h1>
        <p className="text-ink/60 text-sm mt-1">أدوات الذكاء الاصطناعي لإثراء كتالوغكِ</p>
      </div>

      <Link
        to="/admin/new"
        className="block card p-8 bg-sage-blush text-white hover:shadow-bloom transition group"
      >
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 rounded-3xl bg-white/20 backdrop-blur flex items-center justify-center group-hover:rotate-6 transition">
            <Wand2 className="w-7 h-7" />
          </div>
          <div className="flex-1">
            <p className="text-2xl font-bold">إنشاء منتج جديد بمساعدة الـ AI</p>
            <p className="text-sm opacity-90 mt-1">ارفعي الصور → اكتبي كلمات → الـ AI يولّد كل شيء</p>
          </div>
          <Plus className="w-6 h-6" />
        </div>
      </Link>

      <div className="grid md:grid-cols-3 gap-4">
        <Tip icon={Sparkles} title="كلمات مفتاحية دقيقة" body="استخدمي صفات مثل: 'قفطان مخمل ذهبي للأعراس' للحصول على أفضل توليد." />
        <Tip icon={ImageIcon} title="3-5 صور لكل منتج" body="صور بإضاءة طبيعية وخلفية بسيطة تعطي نتائج أحلى في الكتالوغ." />
        <Tip icon={Eye} title="راجعي قبل النشر" body="الـ AI يقترح فقط — أنتِ تقرّرين الاسم النهائي والوصف." />
      </div>
    </div>
  );
}

function Tip({ icon: Icon, title, body }) {
  return (
    <div className="card p-5">
      <div className="w-10 h-10 rounded-2xl bg-sage-blush text-white flex items-center justify-center mb-3">
        <Icon className="w-4 h-4" />
      </div>
      <p className="font-bold text-sm">{title}</p>
      <p className="text-xs text-ink/60 mt-1.5">{body}</p>
    </div>
  );
}
