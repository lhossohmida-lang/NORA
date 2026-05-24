/**
 * ProductDetail — slide-up bottom sheet with image gallery, zoom toggle,
 * add-to-cart and favorite controls.
 *
 * Props:
 *   product        — Firestore product doc (or null to close)
 *   onClose        — () => void
 *   isFavorite     — boolean
 *   onToggleFav    — () => void
 *   onAddToCart    — (product) => void
 */
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, ShoppingBag, X, ChevronRight, ChevronLeft, ZoomIn, ZoomOut, Sparkles } from 'lucide-react';

const formatDZD = (n) =>
  new Intl.NumberFormat('ar-DZ', { maximumFractionDigits: 0 }).format(n || 0);

export default function ProductDetail({ product, onClose, isFavorite, onToggleFav, onAddToCart }) {
  const [active, setActive] = useState(0);
  const [zoomed, setZoomed] = useState(false);

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
            className="fixed inset-0 z-40 bg-ink/40 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="fixed inset-x-0 bottom-0 z-50 max-h-[92vh] overflow-y-auto
                       rounded-t-[2.5rem] bg-pearl shadow-glass"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 36 }}
          >
            <div className="sticky top-0 z-10 flex justify-center pt-3 pb-2 bg-gradient-to-b from-pearl to-transparent">
              <div className="w-12 h-1.5 rounded-full bg-ink/15" />
            </div>

            <button
              onClick={onClose}
              className="absolute top-4 left-4 z-20 w-10 h-10 rounded-full glass flex items-center justify-center active:scale-95"
              aria-label="إغلاق"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="relative aspect-square md:aspect-[4/3] bg-cream overflow-hidden">
              {images[active] ? (
                <img
                  src={images[active]}
                  alt={product.nameAr}
                  className={`w-full h-full object-cover transition-transform duration-500 cursor-zoom-in ${zoomed ? 'scale-150 cursor-zoom-out' : ''}`}
                  onClick={() => setZoomed((z) => !z)}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-ink/30">
                  <Sparkles className="w-12 h-12" />
                </div>
              )}

              {images.length > 1 && (
                <>
                  <button
                    onClick={prev}
                    className="absolute top-1/2 -translate-y-1/2 right-3 w-10 h-10 rounded-full glass flex items-center justify-center"
                    aria-label="السابق"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                  <button
                    onClick={next}
                    className="absolute top-1/2 -translate-y-1/2 left-3 w-10 h-10 rounded-full glass flex items-center justify-center"
                    aria-label="التالي"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <div className="absolute bottom-3 inset-x-0 flex justify-center gap-1.5">
                    {images.map((_, i) => (
                      <span
                        key={i}
                        className={`h-1.5 rounded-full transition-all ${i === active ? 'w-6 bg-white' : 'w-1.5 bg-white/50'}`}
                      />
                    ))}
                  </div>
                </>
              )}

              <button
                onClick={() => setZoomed((z) => !z)}
                className="absolute bottom-3 right-3 w-10 h-10 rounded-full glass flex items-center justify-center"
                aria-label={zoomed ? 'تكبير أقل' : 'تكبير الصورة'}
              >
                {zoomed ? <ZoomOut className="w-4 h-4" /> : <ZoomIn className="w-4 h-4" />}
              </button>
            </div>

            {images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto no-scrollbar px-5 py-3">
                {images.map((src, i) => (
                  <button
                    key={i}
                    onClick={() => setActive(i)}
                    className={`shrink-0 w-16 h-20 rounded-xl overflow-hidden border-2 transition ${
                      i === active ? 'border-sage' : 'border-transparent opacity-70'
                    }`}
                  >
                    <img src={src} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}

            <div className="px-6 pb-8 pt-2 safe-bottom">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-ink leading-snug">{product.nameAr}</h2>
                  {product.nameEn && (
                    <p className="font-display italic text-ink/50 text-lg mt-0.5">{product.nameEn}</p>
                  )}
                </div>
                <button
                  onClick={onToggleFav}
                  className="w-11 h-11 rounded-full glass flex items-center justify-center"
                  aria-label="مفضّلة"
                >
                  <Heart className={`w-5 h-5 ${isFavorite ? 'fill-blush text-blush' : 'text-ink/60'}`} />
                </button>
              </div>

              <div className="mt-4 flex items-baseline gap-2">
                <span className="gradient-text font-bold text-3xl">{formatDZD(product.price)}</span>
                <span className="text-sm text-ink/60">دج</span>
              </div>

              {product.description && (
                <p className="text-ink/70 leading-relaxed mt-5 text-balance">{product.description}</p>
              )}

              <div className="grid grid-cols-2 gap-3 mt-8">
                <div className="rounded-2xl bg-white/70 border border-cream p-4">
                  <p className="text-xs text-ink/50">التوصيل</p>
                  <p className="text-sm font-semibold mt-1">إلى كافة الولايات</p>
                </div>
                <div className="rounded-2xl bg-white/70 border border-cream p-4">
                  <p className="text-xs text-ink/50">الدفع</p>
                  <p className="text-sm font-semibold mt-1">عند الاستلام</p>
                </div>
              </div>

              <button
                onClick={() => onAddToCart?.(product)}
                className="btn-primary w-full mt-6 py-4 text-base"
              >
                <ShoppingBag className="w-5 h-5" />
                أضيفي إلى السلّة
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
