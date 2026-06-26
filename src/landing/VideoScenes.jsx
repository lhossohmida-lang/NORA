/**
 * VideoScenes — the cinematic, video-driven landing engine.
 *
 * Stacks every scene's <SceneVideo> full-screen and cross-fades between them as
 * the visitor advances. Navigation: mouse wheel (one scene per gesture, with an
 * ~850ms lock so it never skips), clickable side dots (jump anywhere), keyboard
 * (↑/↓ + RTL-aware ←/→, Home/End, Space), and touch swipe on mobile. A top
 * progress bar, a scene counter, a play/pause control and a first-scene scroll
 * hint round it out. Reduced-motion is honored (posters instead of autoplay,
 * and framer transforms are dropped globally via <MotionConfig reducedMotion>).
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
  ShoppingBag, ArrowLeft, Plus, ChevronDown, Play, Pause,
  MessageCircle, Instagram, Store, Quote,
} from 'lucide-react';
import SceneVideo from './SceneVideo.jsx';
import { StarGlyph, OrnateDivider } from '../components/Ornament.jsx';
import { EASE, revealLine, staggerParent } from '../lib/motion.js';

const STEP_LOCK_MS = 850;
const AR = '٠١٢٣٤٥٦٧٨٩';
const toAr = (n) => String(n).replace(/\d/g, (d) => AR[+d]);
const formatDZD = (n) =>
  new Intl.NumberFormat('ar-DZ', { maximumFractionDigits: 0 }).format(n || 0);

const LINK_ICONS = { whatsapp: MessageCircle, instagram: Instagram, shop: Store };

const overlayV = {
  hidden: (d) => ({ opacity: 0, y: 28 * (d || 1) }),
  show: {
    opacity: 1, y: 0,
    transition: { duration: 0.6, ease: EASE, when: 'beforeChildren', staggerChildren: 0.07, delayChildren: 0.1 },
  },
  exit: (d) => ({ opacity: 0, y: -18 * (d || 1), transition: { duration: 0.3, ease: EASE } }),
};
const childV = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: EASE } },
};

export default function VideoScenes({ scenes, products = [], onAddToCart }) {
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [paused, setPaused] = useState(false);
  const reduced = useReducedMotion();

  const count = scenes.length;
  const lockRef = useRef(false);
  const visitedRef = useRef(new Set([0]));
  const touchRef = useRef(null);
  const containerRef = useRef(null);

  const lock = () => {
    lockRef.current = true;
    setTimeout(() => { lockRef.current = false; }, STEP_LOCK_MS);
  };

  const step = useCallback((dir) => {
    if (lockRef.current) return;
    lock();
    setIndex((cur) => {
      const next = Math.max(0, Math.min(count - 1, cur + dir));
      if (next !== cur) setDirection(dir);
      return next;
    });
  }, [count]);

  const goTo = useCallback((target) => {
    if (lockRef.current || target === index) return;
    lock();
    setDirection(target > index ? 1 : -1);
    setIndex(Math.max(0, Math.min(count - 1, target)));
  }, [index, count]);

  // Track visited scenes so a clip, once loaded, is never torn down + re-buffered.
  useEffect(() => { visitedRef.current.add(index); }, [index]);

  // Lock the page: the landing is a full-screen deck, not a scrollable document.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  // Wheel → advance/retreat one scene (non-passive so we can preventDefault).
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return undefined;
    const onWheel = (e) => {
      e.preventDefault();
      if (Math.abs(e.deltaY) < 6) return;
      step(e.deltaY > 0 ? 1 : -1);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [step]);

  // Keyboard — vertical arrows + RTL-aware horizontal arrows, Home/End, Space.
  useEffect(() => {
    const onKey = (e) => {
      if (['ArrowDown', 'PageDown', ' ', 'Spacebar'].includes(e.key)) { e.preventDefault(); step(1); }
      else if (['ArrowUp', 'PageUp'].includes(e.key)) { e.preventDefault(); step(-1); }
      else if (e.key === 'ArrowLeft') step(1);      // RTL: forward is leftward
      else if (e.key === 'ArrowRight') step(-1);
      else if (e.key === 'Home') goTo(0);
      else if (e.key === 'End') goTo(count - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [step, goTo, count]);

  const onTouchStart = (e) => { touchRef.current = e.touches[0].clientY; };
  const onTouchEnd = (e) => {
    if (touchRef.current == null) return;
    const dy = touchRef.current - e.changedTouches[0].clientY;
    if (Math.abs(dy) > 48) step(dy > 0 ? 1 : -1); // swipe up → next
    touchRef.current = null;
  };

  const scene = scenes[index];
  const isLoaded = (i) => Math.abs(i - index) <= 1 || visitedRef.current.has(i);

  return (
    <section
      ref={containerRef}
      tabIndex={0}
      dir="rtl"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      aria-roledescription="عرض شرائح"
      aria-label="عرض سينمائي لمتجر أفنان"
      className="fixed inset-0 h-[100dvh] w-full overflow-hidden bg-forest text-ivory outline-none select-none"
    >
      {/* Stacked, cross-fading video layers */}
      {scenes.map((s, i) => (
        <SceneVideo
          key={s.id}
          scene={s}
          active={i === index}
          isNext={i === index + 1}
          load={isLoaded(i)}
          reduced={reduced}
          paused={paused}
        />
      ))}

      {/* Active scene overlay */}
      <div className="relative z-10 h-full max-w-7xl mx-auto px-6 md:px-12 flex flex-col justify-end pb-24 md:pb-28">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={scene.id}
            custom={direction}
            variants={overlayV}
            initial="hidden"
            animate="show"
            exit="exit"
            className="max-w-2xl"
          >
            <SceneOverlay scene={scene} products={products} onAddToCart={onAddToCart} />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Top progress bar */}
      <div className="fixed top-0 inset-x-0 h-1 bg-ivory/10 z-30">
        <motion.div
          className="h-full bg-gold-fill"
          animate={{ width: `${((index + 1) / count) * 100}%` }}
          transition={{ duration: 0.5, ease: EASE }}
        />
      </div>

      {/* Side dots (RTL start = right) */}
      <nav
        aria-label="التنقّل بين المشاهد"
        className="fixed right-3 md:right-5 top-1/2 -translate-y-1/2 z-30 flex flex-col items-center gap-3"
      >
        {scenes.map((s, i) => {
          const on = i === index;
          return (
            <button
              key={s.id}
              onClick={() => goTo(i)}
              aria-label={`المشهد ${toAr(i + 1)}: ${s.eyebrow}`}
              aria-current={on ? 'true' : undefined}
              className="group relative flex items-center justify-center w-6 h-6"
            >
              <span
                className={`rounded-full transition-all duration-300 drop-shadow-[0_1px_3px_rgba(0,0,0,0.6)] ${
                  on ? 'w-2.5 h-2.5 bg-gold shadow-gold' : 'w-1.5 h-1.5 bg-ivory/70 group-hover:bg-ivory'
                }`}
              />
            </button>
          );
        })}
      </nav>

      {/* Scene counter */}
      <div className="fixed left-4 md:left-6 top-5 z-30 font-display text-sm tracking-[0.3em] text-ivory/70">
        <span className="text-gold-soft">{toAr(index + 1)}</span>
        <span className="mx-1 text-ivory/30">/</span>
        {toAr(count)}
      </div>

      {/* Play / pause control */}
      <button
        onClick={() => setPaused((p) => !p)}
        aria-label={paused ? 'تشغيل الخلفية' : 'إيقاف الخلفية'}
        className="fixed left-4 md:left-6 bottom-5 z-30 w-11 h-11 rounded-full glass-emerald text-gold-soft flex items-center justify-center transition active:scale-95"
      >
        {paused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
      </button>

      {/* Scroll hint (first scene only) */}
      <AnimatePresence>
        {index === 0 && (
          <motion.button
            onClick={() => step(1)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.85 }}
            exit={{ opacity: 0 }}
            transition={{ delay: 1.4, duration: 0.6 }}
            className="fixed bottom-6 inset-x-0 mx-auto z-30 flex flex-col items-center gap-1 text-ivory/75 w-max"
            aria-label="المشهد التالي"
          >
            <span className="text-[11px] tracking-[0.25em]">مرّري للأسفل</span>
            <motion.span animate={{ y: [0, 7, 0] }} transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}>
              <ChevronDown className="w-5 h-5 text-gold-soft" />
            </motion.span>
          </motion.button>
        )}
      </AnimatePresence>
    </section>
  );
}

/* ================================================================== *
 *  Per-scene overlay content                                          *
 * ================================================================== */
function SceneOverlay({ scene, products, onAddToCart }) {
  return (
    <>
      <motion.div variants={childV} className="flex items-center gap-2.5 mb-4 text-gold-soft">
        <StarGlyph className="w-4 h-4" />
        <span className="text-xs md:text-sm font-medium tracking-[0.25em] uppercase">{scene.eyebrow}</span>
      </motion.div>

      <motion.h1
        variants={staggerParent(0.12, 0.05)}
        initial="hidden"
        animate="show"
        className="font-display font-semibold leading-[1.02] text-[2.75rem] md:text-7xl text-ivory"
      >
        {scene.title.map((line, i) => (
          <span key={i} className="block overflow-hidden pb-1">
            <motion.span variants={revealLine} className={`block ${i === scene.title.length - 1 ? 'gold-text' : ''}`}>
              {line}
            </motion.span>
          </span>
        ))}
      </motion.h1>

      {scene.description && (
        <motion.p variants={childV} className="mt-4 text-ivory/80 text-base md:text-lg max-w-md leading-relaxed text-balance">
          {scene.description}
        </motion.p>
      )}

      {/* Kind-specific extras */}
      {scene.kind === 'collections' && (
        <motion.div variants={childV} className="mt-6 flex flex-wrap gap-2.5">
          {scene.categories?.map((c) => (
            <Link key={c.label} to={c.href} className="btn-outline-gold text-sm px-4 py-2">
              {c.label}
            </Link>
          ))}
        </motion.div>
      )}

      {scene.kind === 'craft' && (
        <motion.div variants={childV} className="mt-6 flex flex-wrap gap-2">
          {['الفتلة', 'المجبود', 'الصرمة'].map((t) => (
            <span key={t} className="px-4 py-1.5 rounded-full border border-gold/40 text-gold-soft text-sm">
              {t}
            </span>
          ))}
        </motion.div>
      )}

      {scene.kind === 'products' && (
        <motion.div variants={childV} className="mt-6">
          <ProductStrip products={products} onAddToCart={onAddToCart} />
        </motion.div>
      )}

      {scene.kind === 'testimonials' && (
        <motion.div variants={childV} className="mt-6 grid sm:grid-cols-2 gap-3 max-w-3xl">
          {scene.testimonials?.slice(0, 3).map((t) => (
            <figure key={t.name} className="glass-emerald rounded-2xl p-4">
              <Quote className="w-5 h-5 text-gold-soft mb-2" />
              <blockquote className="text-sm text-ivory/85 leading-relaxed">{t.quote}</blockquote>
              <figcaption className="mt-2 text-xs text-gold-soft/90">{t.name}</figcaption>
            </figure>
          ))}
        </motion.div>
      )}

      {/* Primary CTA */}
      {scene.cta && (
        <motion.div variants={childV} className="mt-8 flex items-center gap-3">
          <Link to={scene.cta.href} className="btn-gold has-shine text-base px-7 py-3.5">
            {scene.cta.label}
            {scene.kind === 'cta' ? <ArrowLeft className="w-4 h-4" /> : <ShoppingBag className="w-4 h-4" />}
          </Link>

          {scene.kind === 'cta' && scene.links && (
            <div className="flex items-center gap-2">
              {scene.links.map((l) => {
                const Icon = LINK_ICONS[l.icon] || Store;
                const isInternal = l.href.startsWith('/');
                const cls = 'w-11 h-11 rounded-full glass-emerald text-gold-soft flex items-center justify-center transition hover:bg-gold/15 active:scale-95';
                return isInternal ? (
                  <Link key={l.label} to={l.href} aria-label={l.label} className={cls}><Icon className="w-5 h-5" /></Link>
                ) : (
                  <a key={l.label} href={l.href} target="_blank" rel="noreferrer" aria-label={l.label} className={cls}><Icon className="w-5 h-5" /></a>
                );
              })}
            </div>
          )}
        </motion.div>
      )}
    </>
  );
}

function ProductStrip({ products, onAddToCart }) {
  const items = (products || []).slice(0, 4);
  if (items.length === 0) {
    return <p className="text-ivory/60 text-sm">المنتجات تظهر هنا فور إضافتها من لوحة الإدارة.</p>;
  }
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 max-w-2xl">
      {items.map((p) => (
        <div key={p.id} className="glass-emerald rounded-2xl overflow-hidden">
          <Link to="/shop" className="block aspect-[3/4] bg-forest/40">
            {p.images?.[0] && <img src={p.images[0]} alt={p.nameAr} loading="lazy" className="w-full h-full object-cover" />}
          </Link>
          <div className="p-2.5">
            <p className="text-[11px] text-ivory line-clamp-1">{p.nameAr}</p>
            <div className="flex items-center justify-between mt-1.5">
              <span className="text-gold-soft text-xs font-bold">{formatDZD(p.price)} دج</span>
              <button
                onClick={() => onAddToCart?.(p)}
                aria-label={`أضيفي ${p.nameAr} إلى السلّة`}
                className="w-7 h-7 rounded-full bg-gold-fill text-forest flex items-center justify-center active:scale-90 transition"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
