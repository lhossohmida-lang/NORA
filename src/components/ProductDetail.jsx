/**
 * ProductDetail — slide-up bottom sheet (luxury emerald/gold).
 *
 * The hero image shares a `layoutId` with the grid card, so opening the sheet
 * makes the cover expand up into place (and fly back on close). The grab
 * handle drives a drag-to-dismiss gesture without fighting body scroll, and
 * the textual content reveals in a soft stagger.
 *
 * Props:
 *   product, onClose, isFavorite, onToggleFav, onAddToCart
 */
import { useEffect, useState } from 'react';
import { motion, AnimatePresence, useDragControls } from 'framer-motion';
import {
  Heart, ShoppingBag, X, ChevronRight, ChevronLeft, ZoomIn, ZoomOut, Sparkles, Truck, ShieldCheck,
} from 'lucide-react';
import {
  backdrop, sheetPanel, staggerParent, staggerChild, shouldDismiss,
} from '../lib/motion.js';
import { isNewProduct } from './ClientStorefront.jsx';

const formatDZD = (n) =>
  new Intl.NumberFormat('ar-DZ', { maximumFractionDigits: 0 }).format(n || 0);

export default function ProductDetail({ product, onClose, isFavorite, onToggleFav, onAddToCart }) {
  const [active, setActive] = useState(0);
  const [zoomed, setZoomed] = useState(false);
  const dragControls = useDragControls();

  useEffect(() => {
    if (product) { setActive(0); setZoomed(false); }
  }, [product]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const images = product?.images || [];
  const next = () => setActive((i) => (i + 1) % images.length);
  const prev = () => setActive((i) => (i - 1 + images.length) % images.length);

  return (
    <AnimatePresence>
      {product && (
        <>
          <motion.div
            className="fixed inset-0 z-40 bg-forest/45 backdrop-blur-md"
            variants={backdrop} initial="hidden" animate="show" exit="exit"
            onClick={onClose}
          />
          <motion.div
            className="fixed inset-x-0 bottom-0 z-50 max-h-[94vh] overflow-y-auto overscroll-contain
                       rounded-t-[2.25rem] bg-ivory shadow-lux"
            variants={sheetPanel} initial="hidden" animate="show" exit="exit"
            drag="y"
            dragControls={dragControls}
            dragListener={false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={(_, info) => { if (shouldDismiss(info)) onClose(); }}
          >
            {/* Grab handle — the only drag surface, so body scroll stays free */}
            <div
              onPointerDown={(e) => dragControls.start(e)}
              className="sticky top-0 z-20 flex justify-center pt-3 pb-2 bg-gradient-to-b from-ivory to-transparent cursor-grab active:cursor-grabbing touch-none"
            >
              <div className="w-12 h-1.5 rounded-full bg-bark/15" />
            </div>

            <button
              onClick={onClose}
              className="absolute top-4 left-4 z-30 w-10 h-10 rounded-full glass-lux flex items-center justify-center active:scale-95"
              aria-label="إغلاق"
            >
              <X className="w-5 h-5 text-bark" />
            </button>

            <div className="relative aspect-square md:aspect-[4/3] bg-sand overflow-hidden">
              <motion.div layoutId={`pcard-${product.id}`} className="absolute inset-0">
                {images[active] ? (
                  <img
                    src={images[active]}
                    alt={product.nameAr}
                    className={`w-full h-full object-cover transition-transform duration-500 cursor-zoom-in ${zoomed ? 'scale-150 cursor-zoom-out' : ''}`}
                    onClick={() => setZoomed((z) => !z)}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-bark/25">
                    <Sparkles className="w-12 h-12" />
                  </div>
                )}
              </motion.div>

              {images.length > 1 && (
                <>
                  <button
                    onClick={prev}
                    className="absolute top-1/2 -translate-y-1/2 right-3 w-10 h-10 rounded-full glass-lux flex items-center justify-center"
                    aria-label="السابق"
                  >
                    <ChevronRight className="w-5 h-5 text-bark" />
                  </button>
                  <button
                    onClick={next}
                    className="absolute top-1/2 -translate-y-1/2 left-3 w-10 h-10 rounded-full glass-lux flex items-center justify-center"
                    aria-label="التالي"
                  >
                    <ChevronLeft className="w-5 h-5 text-bark" />
                  </button>
                  <div className="absolute bottom-3 inset-x-0 flex justify-center gap-1.5">
                    {images.map((_, i) => (
                      <span
                        key={i}
                        className={`h-1.5 rounded-full transition-all duration-300 ${i === active ? 'w-6 bg-gold' : 'w-1.5 bg-white/60'}`}
                      />
                    ))}
                  </div>
                </>
              )}

              <button
                onClick={() => setZoomed((z) => !z)}
                className="absolute bottom-3 right-3 w-10 h-10 rounded-full glass-lux flex items-center justify-center"
                aria-label={zoomed ? 'تكبير أقل' : 'تكبير الصورة'}
              >
                {zoomed ? <ZoomOut className="w-4 h-4 text-bark" /> : <ZoomIn className="w-4 h-4 text-bark" />}
              </button>
            </div>

            {images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto no-scrollbar px-5 py-3">
                {images.map((src, i) => (
                  <button
                    key={i}
                    onClick={() => setActive(i)}
                    className={`shrink-0 w-16 h-20 rounded-xl overflow-hidden border-2 transition ${
                      i === active ? 'border-gold' : 'border-transparent opacity-70'
                    }`}
                  >
                    <img src={src} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}

            <motion.div
              className="px-6 pb-8 pt-3 safe-bottom"
              variants={staggerParent(0.07, 0.12)} initial="hidden" animate="show"
            >
              <motion.div variants={staggerChild} className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  {isNewProduct(product) && (
                    <span className="inline-flex bg-gold-fill text-forest text-[11px] font-bold px-2.5 py-1 rounded-full shadow-gold mb-2">
                      جديد
                    </span>
                  )}
                  <h2 className="text-2xl font-bold text-bark leading-snug">{product.nameAr}</h2>
                  {product.nameEn && (
                    <p className="font-display italic text-bark/45 text-lg mt-0.5">{product.nameEn}</p>
                  )}
                </div>
                <button
                  onClick={onToggleFav}
                  className="w-11 h-11 rounded-full glass-lux flex items-center justify-center active:scale-95"
                  aria-label="مفضّلة"
                >
                  <Heart className={`w-5 h-5 ${isFavorite ? 'fill-gold text-gold' : 'text-bark/55'}`} />
                </button>
              </motion.div>

              <motion.div variants={staggerChild} className="mt-4 flex items-baseline gap-2">
                <span className="gold-text-static font-bold text-3xl">{formatDZD(product.price)}</span>
                <span className="text-sm text-bark/60">دج</span>
              </motion.div>

              {product.description && (
                <motion.p variants={staggerChild} className="text-bark/70 leading-relaxed mt-5 text-balance">
                  {product.description}
                </motion.p>
              )}

              <motion.div variants={staggerChild} className="grid grid-cols-2 gap-3 mt-7">
                <div className="rounded-2xl bg-white border border-black/[0.04] p-4 flex items-center gap-3">
                  <Truck className="w-5 h-5 text-emerald shrink-0" />
                  <div>
                    <p className="text-xs text-bark/50">التوصيل</p>
                    <p className="text-sm font-semibold mt-0.5">لكافة الولايات</p>
                  </div>
                </div>
                <div className="rounded-2xl bg-white border border-black/[0.04] p-4 flex items-center gap-3">
                  <ShieldCheck className="w-5 h-5 text-emerald shrink-0" />
                  <div>
                    <p className="text-xs text-bark/50">الدفع</p>
                    <p className="text-sm font-semibold mt-0.5">عند الاستلام</p>
                  </div>
                </div>
              </motion.div>

              <motion.button
                variants={staggerChild}
                whileTap={{ scale: 0.98 }}
                onClick={() => onAddToCart?.(product)}
                className="btn-gold has-shine w-full mt-7 py-4 text-base"
              >
                <ShoppingBag className="w-5 h-5" />
                أضيفي إلى السلّة
              </motion.button>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
